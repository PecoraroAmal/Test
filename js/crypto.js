const FORMAT_VERSION = 3; // Nuovo formato con Argon2
const PBKDF2_V2_FORMAT = 2;
const PBKDF2_V1_FORMAT = 1;

// Parametri Argon2
const ARGON2_SALT_LENGTH = 32;
const ARGON2_TIME_COST = 3;        // numero di iterazioni
const ARGON2_MEMORY_COST = 65536;  // 64 MB (in KB)
const ARGON2_PARALLELISM = 1;      // per browser è meglio 1
const ARGON2_HASH_LENGTH = 32;     // lunghezza output in bytes

// Parametri legacy
const ITERATIONS_V2 = 800000;
const SALT_LENGTH_V2 = 32;
const IV_LENGTH = 12;

let argon2Instance = null;
let argon2LoadPromise = null;

// Carica Argon2 da CDN
async function loadArgon2() {
    // Se già caricato, ritorna l'istanza
    if (argon2Instance) return argon2Instance;
    
    // Se già in caricamento, aspetta il completamento
    if (argon2LoadPromise) return argon2LoadPromise;
    
    argon2LoadPromise = (async () => {
        try {
            // Carica lo script da unpkg
            if (typeof argon2 === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/argon2-browser@1.18.0/dist/argon2-bundled.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Argon2 from CDN'));
                    document.head.appendChild(script);
                });
            }
            
            // Verifica che argon2 sia disponibile
            if (typeof argon2 === 'undefined') {
                throw new Error('Argon2 module not loaded');
            }
            
            argon2Instance = argon2;
            return argon2Instance;
        } catch (e) {
            console.error('Error loading Argon2:', e);
            argon2LoadPromise = null; // Reset per permettere retry
            throw new Error('Failed to initialize Argon2: ' + e.message);
        }
    })();
    
    return argon2LoadPromise;
}

// Deriva chiave usando Argon2id
async function deriveKeyArgon2(password, salt) {
    const argon2Module = await loadArgon2();
    
    try {
        // Converti password in Uint8Array se necessario
        const passwordBytes = typeof password === 'string' 
            ? new TextEncoder().encode(password) 
            : password;
        
        // Usa Argon2id per derivare la chiave
        const result = await argon2Module.hash({
            pass: passwordBytes,
            salt: salt,
            time: ARGON2_TIME_COST,
            mem: ARGON2_MEMORY_COST,
            parallelism: ARGON2_PARALLELISM,
            hashLen: ARGON2_HASH_LENGTH,
            type: argon2Module.ArgonType.Argon2id
        });
        
        // Importa l'hash come chiave AES-GCM
        return crypto.subtle.importKey(
            "raw",
            result.hash,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    } catch (e) {
        console.error('Argon2 derivation error:', e);
        throw new Error('Failed to derive key with Argon2');
    }
}

// Deriva chiave usando PBKDF2 (formato v2)
async function deriveKeyPBKDF2v2(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: ITERATIONS_V2, hash: "SHA-512" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// Deriva chiave usando PBKDF2 (formato v1 - legacy)
async function deriveKeyPBKDF2v1(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 1000000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// Cripta i dati usando Argon2 (nuovo formato v3)
async function encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(ARGON2_SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKeyArgon2(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, encoded
    ));
    
    // Formato: [version(1)] [salt(32)] [iv(12)] [ciphertext]
    const result = new Uint8Array(1 + ARGON2_SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
    result.set([FORMAT_VERSION], 0);
    result.set(salt, 1);
    result.set(iv, 1 + ARGON2_SALT_LENGTH);
    result.set(ciphertext, 1 + ARGON2_SALT_LENGTH + IV_LENGTH);
    
    return uint8ToBase64Url(result);
}

// Decripta i dati con supporto per tutti i formati (v3, v2, v1, legacy)
async function decryptData(encryptedBase64, password) {
    let data;
    try {
        data = base64UrlToUint8(encryptedBase64);
    } catch (e) {
        throw new Error("Invalid Base64");
    }
    
    if (data.length < 30) throw new Error("Corrupted data");
    
    const version = data[0];
    
    // Formato v3 - Argon2
    if (version === FORMAT_VERSION) {
        const salt = data.slice(1, 1 + ARGON2_SALT_LENGTH);
        const iv = data.slice(1 + ARGON2_SALT_LENGTH, 1 + ARGON2_SALT_LENGTH + IV_LENGTH);
        const ciphertext = data.slice(1 + ARGON2_SALT_LENGTH + IV_LENGTH);
        const key = await deriveKeyArgon2(password, salt);
        
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv }, key, ciphertext
            );
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            throw new Error("Incorrect password or corrupted data");
        }
    }
    
    // Formato v2 - PBKDF2 con SHA-512
    if (version === PBKDF2_V2_FORMAT) {
        const salt = data.slice(1, 1 + SALT_LENGTH_V2);
        const iv = data.slice(1 + SALT_LENGTH_V2, 1 + SALT_LENGTH_V2 + IV_LENGTH);
        const ciphertext = data.slice(1 + SALT_LENGTH_V2 + IV_LENGTH);
        const key = await deriveKeyPBKDF2v2(password, salt);
        
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv }, key, ciphertext
            );
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            throw new Error("Incorrect password or corrupted data");
        }
    }
    
    // Formato v1 e legacy - PBKDF2 con SHA-256
    const compatibleData = (version === PBKDF2_V1_FORMAT) ? data.slice(1) : data;
    const salt = compatibleData.slice(0, 16);
    const iv = compatibleData.slice(16, 28);
    const ciphertext = compatibleData.slice(28);
    const key = await deriveKeyPBKDF2v1(password, salt);
    
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv }, key, ciphertext
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        throw new Error("Incorrect password or corrupted data");
    }
}

function uint8ToBase64Url(arr) {
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlToUint8(str) {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function zeroPassword(pass) {
    if (typeof pass !== 'string') return;
    const buf = new Uint8Array(pass.length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < pass.length; i++) {
        pass = pass.slice(0, i) + String.fromCharCode(buf[i]) + pass.slice(i + 1);
    }
}

// Espone le funzioni pubbliche
window.encryptData = encryptData;
window.decryptData = decryptData;
window.zeroPassword = zeroPassword;