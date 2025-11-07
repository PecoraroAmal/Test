const FORMAT_VERSION = 2;
const OLD_FORMAT_VERSION = 1;
const ITERATIONS_NEW = 800000;
const SALT_LENGTH_NEW = 32;
const IV_LENGTH = 12;

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
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_NEW));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKeyNew(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, encoded
    ));
    const result = new Uint8Array(1 + SALT_LENGTH_NEW + IV_LENGTH + ciphertext.byteLength);
    result.set([FORMAT_VERSION], 0);
    result.set(salt, 1);
    result.set(iv, 1 + SALT_LENGTH_NEW);
    result.set(ciphertext, 1 + SALT_LENGTH_NEW + IV_LENGTH);
    return uint8ToBase64Url(result);
}

async function decryptData(encryptedBase64, password) {
    let data;
    try {
        data = base64UrlToUint8(encryptedBase64);
    } catch (e) {
        throw new Error("Base64 non valido");
    }
    if (data.length < 30) throw new Error("Dati corrotti");
    const version = data[0];
    if (version === FORMAT_VERSION) {
        const salt = data.slice(1, 1 + SALT_LENGTH_NEW);
        const iv = data.slice(1 + SALT_LENGTH_NEW, 1 + SALT_LENGTH_NEW + IV_LENGTH);
        const ciphertext = data.slice(1 + SALT_LENGTH_NEW + IV_LENGTH);
        const key = await deriveKeyNew(password, salt);
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv }, key, ciphertext
            );
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            throw new Error("Password errata o dati corrotti");
        }
    }
    const compatibleData = (version === OLD_FORMAT_VERSION) ? data.slice(1) : data;
    const salt = compatibleData.slice(0, 16);
    const iv = compatibleData.slice(16, 28);
    const ciphertext = compatibleData.slice(28);
    const key = await deriveKeyOld(password, salt);
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv }, key, ciphertext
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        throw new Error("Password errata o dati vecchi corrotti");
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