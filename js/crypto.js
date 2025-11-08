// crypto.js - Versione 3 con Argon2id + retrocompatibilità V1/V2
// Funziona su GitHub Pages (stessi file in /js/: crypto.js, argon2.min.js,_ATTACK argon2.wasm)

const VERSION = {
    CURRENT: 3,
    V2_PBKDF2_SHA512: 2,
    V1_PBKDF2_SHA256: 1
};

const SALT_LENGTH = 32;  // 256 bit
const IV_LENGTH = 12;    // 96 bit (standard AES-GCM)
const ARGON2 = {
    time: 3,
    memory: 65536,       // 64 MiB
    parallelism: 4,
    hashLen: 32,
    type: null           // sarà inizializzato dopo il caricamento
};

let argon2 = null;
let argon2Ready = false;

const base64UrlEncode = (uint8Array) => {
    return btoa(String.fromCharCode(...uint8Array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const base64UrlDecode = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = str.length % 4;
    if (padding) str += '==='.slice(0, 4 - padding);
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
};

// Caricamento sicuro di argon2.wasm (stessa cartella)
const loadArgon2 = () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'argon2.min.js';
        script.onload = () => {
            if (typeof loadArgon2Module !== 'function') {
                reject(new Error('argon2.min.js non ha caricato correttamente loadArgon2Module'));
                return;
            }
            loadArgon2Module({
                wasmUrl: 'argon2.wasm',
                onAbort: reject
            }).then(mod => {
                argon2 = mod;
                ARGON2.type = mod.ArgonType.Argon2id;
                argon2Ready = true;
                resolve(mod);
            }).catch(err => {
                console.error('Errore caricamento Argon2 WASM:', err);
                reject(err);
            });
        };
        script.onerror = () => reject(new Error('Impossibile caricare argon2.min.js'));
        document.head.appendChild(script);
    });
};

// Inizia il caricamento in background
const argon2Promise = loadArgon2();

// Derivazione chiave con Argon2id (versione attuale)
async function deriveKeyArgon2(password, salt) {
    if (!argon2Ready) await argon2Promise;
    const encoder = new TextEncoder();
    const result = await argon2.hash({
        pass: encoder.encode(password),
        salt: salt,
        time: ARGON2.time,
        mem: ARGON2.memory,
        parallelism: ARGON2.parallelism,
        hashLen: ARGON2.hashLen,
        type: ARGON2.type
    });
    return crypto.subtle.importKey('raw', result.hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// Derivazione chiave con PBKDF2 (per retrocompatibilità)
async function deriveKeyPBKDF2(password, salt, iterations, hashName) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: hashName
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Crittografia dati (versione corrente: Argon2id)
async function encryptData(data, password) {
    if (typeof password !== 'string' || password.length === 0) {
        throw new Error('Password richiesta e non vuota');
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKeyArgon2(password, salt);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedData
        )
    );

    const result = new Uint8Array(1 + SALT_LENGTH + IV_LENGTH + ciphertext.length);
    result.set([VERSION.CURRENT], 0);
    result.set(salt, 1);
    result.set(iv, 1 + SALT_LENGTH);
    result.set(ciphertext, 1 + SALT_LENGTH + IV_LENGTH);

    return base64UrlEncode(result);
}

// Decrittografia con supporto retrocompatibilità
async function decryptData(encryptedBase64, password) {
    if (typeof password !== 'string' || password.length === 0) {
        throw new Error('Password richiesta');
    }

    let data;
    try {
        data = base64UrlDecode(encryptedBase64);
    } catch (e) {
        throw new Error('Formato dati non valido (Base64 corrotto)');
    }

    if (data.length < 1 + SALT_LENGTH + IV_LENGTH + 16) {
        throw new Error('Dati troppo corti: file corrotto o password errata');
    }

    const version = data[0];
    let salt, iv, ciphertext, key;

    if (version === VERSION.CURRENT) {
        // Versione 3: Argon2id
        salt = data.slice(1, 1 + SALT_LENGTH);
        iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
        ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
        key = await deriveKeyArgon2(password, salt);

    } else if (version === VERSION.V2_PBKDF2_SHA512) {
        // Versione 2: PBKDF2-SHA512 con 800k iterazioni
        salt = data.slice(1, 1 + SALT_LENGTH);
        iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
        ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
        key = await deriveKeyPBKDF2(password, salt, 800_000, 'SHA-512');

    } else if (version === VERSION.V1_PBKDF2_SHA256) {
        // Versione 1: formato vecchio (senza byte versione, salt 16, iv 12)
        const compat = data.slice(1); // rimuove il byte versione (ignorato in V1)
        if (compat.length < 16 + 12 + 16) throw new Error('Formato V1 non valido');
        salt = compat.slice(0, 16);
        iv = compat.slice(16, 28);
        ciphertext = compat.slice(28);
        key = await deriveKeyPBKDF2(password, salt, 1_000_000, 'SHA-256');

    } else {
        throw new Error('Versione crittografica non supportata');
    }

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (e) {
        throw new Error('Decifratura fallita: password errata o dati corrotti');
    }
}

// Esportazione globale
window.encryptData = encryptData;
window.decryptData = decryptData;

// Opzionale: stato di inizializzazione
window.isCryptoReady = () => argon2Ready;
window.whenCryptoReady = () => argon2Promise;