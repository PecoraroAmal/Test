const V = 3;
const OLD_V2 = 2;
const OLD_V1 = 1;
const SALT = 32;
const IV = 12;

let argon2Module = null;
let argon2Ready = false;

const argon2ReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'argon2.min.js';
    script.onload = () => {
        loadArgon2Module({
            wasmUrl: 'argon2.wasm',
            onAbort: reject
        }).then(mod => {
            argon2Module = mod;
            argon2Ready = true;
            resolve(mod);
        }).catch(reject);
    };
    script.onerror = reject;
    document.head.appendChild(script);
});

async function deriveKeyArgon2(password, salt) {
    if (!argon2Ready) await argon2ReadyPromise;
    const result = await argon2Module.hash({
        pass: password,
        salt: salt,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 4,
        type: argon2Module.ArgonType.Argon2id
    });
    return crypto.subtle.importKey('raw', result.hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function deriveKeyPBKDF2(password, salt, iterations, hashName) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: hashName },
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
    const result = new Uint8Array(1 + SALT + IV + ciphertext.length);
    result.set([V], 0);
    result.set(salt, 1);
    result.set(iv, 1 + SALT);
    result.set(ciphertext, 1 + SALT + IV);
    return btoa(String.fromCharCode(...result))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function decryptData(encryptedBase64, password) {
    const data = Uint8Array.from(atob(encryptedBase64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((4 - encryptedBase64.length % 4) % 4)), c => c.charCodeAt(0));
    if (data.length < 45) throw new Error('File corrotto o password errata');
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
        const key = await deriveKeyPBKDF2(password, salt, 800000, 'SHA-512');
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
    const compat = version === OLD_V1 ? data.slice(1) : data;
    const salt = compat.slice(0, 16);
    const iv = compat.slice(16, 28);
    const ciphertext = compat.slice(28);
    const key = await deriveKeyPBKDF2(password, salt, 1000000, 'SHA-256');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

function zeroPassword(pass) {
    if (typeof pass === 'string') {
        const buf = new Uint8Array(pass.length);
        crypto.getRandomValues(buf);
        for (let i = 0; i < pass.length; i++) {
            pass = pass.slice(0, i) + String.fromCharCode(buf[i]) + pass.slice(i + 1);
        }
    }
}

window.encryptData = encryptData;
window.decryptData = decryptData;
window.zeroPassword = zeroPassword;