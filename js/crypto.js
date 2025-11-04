// crypto.js - Updated with Argon2 and sensitive data functions

// Function to derive a key with PBKDF2 (fallback and for file decryption, 1M iterations)
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 1000000, // Mantieni 1M per retrocompatibilità file vecchi
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Function to derive key with Argon2
async function deriveKeyArgon2(password, salt) {
    const hash = await window.argon2.hash({
        pass: password,
        salt: salt,  // Uint8Array raw
        type: window.argon2.ArgonType.Argon2id,
        mem: 65536,
        parallelism: 4,
        iterations: 3,
        hashLen: 32
    });
    return window.crypto.subtle.importKey(
        'raw',
        hash.hash,  // Uint8Array raw
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
    );
}

// Derive key for sensitive data (PBKDF2 con 100k iterations per velocità)
async function deriveKeySensitive(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000, // Ridotto a 100k per sensibili in memoria
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Function to encrypt data (uses Argon2, adds tag)
async function encryptData(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyArgon2(password, salt);
    
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + encrypted
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return 'argon2:' + arrayBufferToBase64(result);
}

// Function to decrypt data (checks tag, fallback to PBKDF2)
async function decryptData(encryptedData, password) {
    try {
        let data, useArgon2 = false;
        if (encryptedData.startsWith('argon2:')) {
            encryptedData = encryptedData.slice(7);
            useArgon2 = true;
        }
        data = base64ToArrayBuffer(encryptedData);
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);
        
        const key = useArgon2 ? await deriveKeyArgon2(password, salt) : await deriveKey(password, salt);
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        const decoder = new TextDecoder();
        const dataString = decoder.decode(decrypted);
        return JSON.parse(dataString);
    } catch (error) {
        throw new Error('Decryption error: incorrect password or corrupted file');
    }
}

// Encrypt sensitive object (per ID, uses sessionKey)
async function encryptSensitive(dataObj, sessionKey) {  // Rendi async per consistency
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(dataObj));
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        sessionKey,
        dataBuffer
    );
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    return arrayBufferToBase64(result);
}

// Decrypt sensitive (per ID)
async function decryptSensitive(encryptedBase64, sessionKey) {
    const data = base64ToArrayBuffer(encryptedBase64);
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        sessionKey,
        encrypted
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}