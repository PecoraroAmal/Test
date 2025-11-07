const V = 3;
const OLD_V2 = 2;
const OLD_V1 = 1;
const SALT = 32;
const IV = 12;
let argon2Mod = null;

async function loadArgon2() {
    if (argon2Mod) return argon2Mod;
    const { loadArgon2Module } = await import('./lib/argon2.min.js');
    argon2Mod = await loadArgon2Module({ 
        wasmUrl: './lib/argon2.wasm',
        onAbort: () => { throw new Error('Argon2 fallito') }
    });
    return argon2Mod;
}

async function deriveKeyArgon2(password, salt) {
    const mod = await loadArgon2();
    const result = await mod.hash({
        pass: password,
        salt: salt,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 4,
        type: mod.ArgonType.Argon2id
    });
    return crypto.subtle.importKey('raw', result.hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function deriveKeyNew(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 800000, hash: 'SHA-512' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function deriveKeyOld(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 1000000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT));
    const iv = crypto.getRandomValues(new Uint8Array(IV));
    const key = await deriveKeyArgon2(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
    const result = new Uint8Array(1 + SALT + IV + ciphertext.byteLength);
    result.set([V], 0);
    result.set(salt, 1);
    result.set(iv, 1 + SALT);
    result.set(ciphertext, 1 + SALT + IV);
    return uint8ToBase64Url(result);
}

async function decryptData(encryptedBase64, password) {
    const data = base64UrlToUint8(encryptedBase64);
    if (data.length < 45) throw new Error('Dati corrotti');
    const version = data[0];

    if (version === V) {
        const salt = data.slice(1, 1 + SALT);
        const iv = data.slice(1 + SALT, 1 + SALT + IV);
        const ciphertext = data.slice(1 + SALT + IV);
        const key = await deriveKeyArgon2(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }

    if (version === OLD_V2) {
        const salt = data.slice(1, 1 + SALT);
        const iv = data.slice(1 + SALT, 1 + SALT + IV);
        const ciphertext = data.slice(1 + SALT + IV);
        const key = await deriveKeyNew(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }

    const compat = (version === OLD_V1) ? data.slice(1) : data;
    const salt = compat.slice(0, 16);
    const iv = compat.slice(16, 28);
    const ciphertext = compat.slice(28);
    const key = await deriveKeyOld(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

function uint8ToBase64Url(arr) {
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlToUint8(str) {
    const b = str.replace(/-/g, '+').replace(/_/g, '/');
    const p = b + '='.repeat((4 - b.length % 4) % 4);
    return Uint8Array.from(atob(p), c => c.charCodeAt(0));
}

function zeroPassword(pass) {
    if (typeof pass === 'string') {
        const buf = new Uint8Array(pass.length);
        crypto.getRandomValues(buf);
        for (let i = 0; i < pass.length; i++) pass = pass.slice(0, i) + String.fromCharCode(buf[i]) + pass.slice(i + 1);
    }
}

window.encryptData = encryptData;
window.decryptData = decryptData;
window.zeroPassword = zeroPassword;