const FORMAT_VERSION = 3;
const OLD_FORMAT_VERSION_NEW = 2;
const OLD_FORMAT_VERSION_OLD = 1;
const ITERATIONS_NEW = 800000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;

let argon2Module = null;
let argon2Ready = false;

const getScriptPath = () => {
    if (typeof import.meta !== 'undefined' && import.meta.url) return new URL('.', import.meta.url).pathname;
    const scripts = document.querySelectorAll('script[src]');
    for (let s of scripts) if (s.src.includes('crypto.js')) return new URL('.', s.src).pathname;
    return '/js/';
};

const loadArgon2 = () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getScriptPath() + 'argon2.js';
    script.async = true;
    script.onload = () => {
        if (typeof loadArgon2Module !== 'function') return reject(new Error('loadArgon2Module missing'));
        loadArgon2Module({wasmUrl: getScriptPath() + 'argon2.wasm'}).then(mod => {
            argon2Module = mod;
            argon2Ready = true;
            resolve(mod);
        }).catch(reject);
    };
    script.onerror = () => reject(new Error('Failed to load argon2.js'));
    document.head.appendChild(script);
});

const argon2Promise = loadArgon2();

async function deriveKeyArgon2(password, salt) {
    if (!argon2Ready) await argon2Promise;
    const enc = new TextEncoder();
    const result = await argon2Module.hash({
        pass: enc.encode(password),
        salt: salt,
        time: 3,
        mem: 65536,
        parallelism: 4,
        hashLen: 32,
        type: argon2Module.ArgonType.Argon2id
    });
    const hash = result.hash instanceof ArrayBuffer ? new Uint8Array(result.hash) : result.hash;
    return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function deriveKeyNew(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: ITERATIONS_NEW, hash: "SHA-512" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function deriveKeyOld(password, salt) {
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

async function encryptData(data, password) {
    try { await argon2Promise; } catch (e) { throw new Error('Argon2 failed: ' + e.message); }
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKeyArgon2(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, encoded
    ));
    const result = new Uint8Array(1 + SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
    result.set([FORMAT_VERSION], 0);
    result.set(salt, 1);
    result.set(iv, 1 + SALT_LENGTH);
    result.set(ciphertext, 1 + SALT_LENGTH + IV_LENGTH);
    return uint8ToBase64Url(result);
}

async function decryptData(encryptedBase64, password) {
    let data;
    try {
        data = base64UrlToUint8(encryptedBase64);
    } catch (e) {
        throw new Error("Invalid Base64");
    }
    if (data.length < 30) throw new Error("Corrupted data");
    const version = data[0];
    let salt, iv, ciphertext, key;
    if (version === FORMAT_VERSION) {
        salt = data.slice(1, 1 + SALT_LENGTH);
        iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
        ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
        key = await deriveKeyArgon2(password, salt);
    } else if (version === OLD_FORMAT_VERSION_NEW) {
        salt = data.slice(1, 1 + SALT_LENGTH);
        iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
        ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
        key = await deriveKeyNew(password, salt);
    } else {
        const compatibleData = (version === OLD_FORMAT_VERSION_OLD) ? data.slice(1) : data;
        salt = compatibleData.slice(0, 16);
        iv = compatibleData.slice(16, 28);
        ciphertext = compatibleData.slice(28);
        key = await deriveKeyOld(password, salt);
    }
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

window.encryptData = encryptData;
window.decryptData = decryptData;
window.zeroPassword = zeroPassword;
window.isCryptoReady = () => argon2Ready;
window.whenCryptoReady = () => argon2Promise;