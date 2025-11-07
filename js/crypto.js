// crypto-old.js → nomi: encryptOld / decryptOld
// (esattamente il tuo crypto.js originale, solo rinominato e corretto per base64 URL-safe)

async function deriveKeyOld(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw', passwordBuffer, 'PBKDF2', false, ['deriveBits', 'deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 1000000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptOld(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyOld(password, salt);
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data))
    );
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    return arrayBufferToBase64(result.buffer);  // Usa base64 URL-safe
}

async function decryptOld(encryptedBase64, password) {
    const data = base64ToArrayBuffer(encryptedBase64);  // Gestisce base64 URL-safe
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    const key = await deriveKeyOld(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, key, encrypted
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
}

// Funzione base64 URL-safe (corretta per evitare problemi con + / =)
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Funzione inversa per base64 URL-safe
function base64ToArrayBuffer(base64) {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

// Esportazione globale
window.encryptOld = encryptOld;
window.decryptOld = decryptOld;