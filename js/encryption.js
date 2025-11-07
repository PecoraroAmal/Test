// crypto-v2.js → encryptV2 / decryptV2
// STANDALONE – NO ARGON2 – PBKDF2 600k iter – Envelope + Authenticated Data
// Riconoscimento immediato V2 grazie a header strutturato

const CONFIG = {
    version: 2,
    kdf: { iterations: 600000, hash: 'SHA-256' },
    aead: { name: 'AES-GCM', ivBytes: 12 },
    fileKeyBytes: 32
};

const dec = new TextDecoder();
const enc = new TextEncoder();

// Utility
function u32ToBytesBE(n) {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, n, false); // false = Big Endian
    return new Uint8Array(buf);
}

function bytesToU32BE(bytes) {
    return new DataView(bytes.buffer).getUint32(0, false);
}

function concatUint8Arrays(...arrays) {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.byteLength;
    }
    return result;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

// Deriva chiave da password
async function deriveAesKeyFromPassword(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: CONFIG.kdf.iterations,
            hash: CONFIG.kdf.hash
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// ======================= ENCRYPT =======================
async function encryptV2(data, password) {
    if (!password) throw new Error('Password richiesta');

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const fileIv = crypto.getRandomValues(new Uint8Array(CONFIG.aead.ivBytes));
    const keyIv = crypto.getRandomValues(new Uint8Array(CONFIG.aead.ivBytes));

    // 1. Chiave file casuale
    const fileKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // 2. Wrappa la chiave file con chiave derivata
    const wrappingKey = await deriveAesKeyFromPassword(password, salt);
    const wrappedKey = await crypto.subtle.wrapKey(
        'raw',
        fileKey,
        wrappingKey,
        { name: 'AES-GCM', iv: keyIv }
    );

    // 3. Cifra i dati
    const plaintext = enc.encode(JSON.stringify(data));
    const fileCipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: fileIv },
        fileKey,
        plaintext
    );

    // 4. Header strutturato
    const header = {
        v: CONFIG.version,
        kdf: {
            salt: arrayBufferToBase64(salt.buffer),
            iterations: CONFIG.kdf.iterations,
            hash: CONFIG.kdf.hash
        },
        aead: {
            name: CONFIG.aead.name,
            ivBytes: CONFIG.aead.ivBytes
        }
    };

    const headerJson = JSON.stringify(header);
    const headerBytes = enc.encode(headerJson);
    const headerLenBytes = u32ToBytesBE(headerBytes.byteLength);

    // 5. Pacchetto finale: [len][header][fileIv][fileCipher][keyIv][wrappedKey]
    const packageBuf = concatUint8Arrays(
        headerLenBytes,
        headerBytes,
        fileIv,
        new Uint8Array(fileCipher),
        keyIv,
        new Uint8Array(wrappedKey)
    );

    return arrayBufferToBase64(packageBuf.buffer);
}

// ======================= DECRYPT =======================
async function decryptV2(base64Package, password) {
    const pkgBuf = new Uint8Array(base64ToArrayBuffer(base64Package));

    if (pkgBuf.byteLength < 4) throw new Error('Pacchetto troppo piccolo');

    // 1. Leggi lunghezza header
    const headerLen = bytesToU32BE(pkgBuf.slice(0, 4));
    let offset = 4;

    if (pkgBuf.byteLength < 4 + headerLen + CONFIG.aead.ivBytes * 2) {
        throw new Error('Pacchetto malformato');
    }

    // 2. Leggi header
    const headerBytes = pkgBuf.slice(offset, offset + headerLen);
    offset += headerLen;
    const headerJson = dec.decode(headerBytes);
    const header = JSON.parse(headerJson);

    if (header.v !== CONFIG.version) {
        throw new Error('Versione non supportata: ' + header.v);
    }

    // 3. Estrai IV e dati
    const fileIv = pkgBuf.slice(offset, offset + CONFIG.aead.ivBytes);
    offset += CONFIG.aead.ivBytes;

    const wrappedKeyLen = CONFIG.fileKeyBytes + 16; // 32 + tag 16
    const wrappedKeyOffset = pkgBuf.byteLength - wrappedKeyLen;
    const keyIvOffset = wrappedKeyOffset - CONFIG.aead.ivBytes;

    const fileCipher = pkgBuf.slice(offset, keyIvOffset);
    const keyIv = pkgBuf.slice(keyIvOffset, wrappedKeyOffset);
    const wrappedKey = pkgBuf.slice(wrappedKeyOffset);

    // 4. Deriva chiave wrapping
    const salt = base64ToArrayBuffer(header.kdf.salt);
    const wrappingKey = await deriveAesKeyFromPassword(password, salt);

    // 5. Unwrap chiave file
    let fileKeyRaw;
    try {
        const fileKeyBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: keyIv, additionalData: headerBytes },
            wrappingKey,
            wrappedKey
        );
        fileKeyRaw = new Uint8Array(fileKeyBuf);
    } catch (e) {
        throw new Error('Password errata o pacchetto corrotto');
    }

    // 6. Decifra dati
    const subtleFileKey = await crypto.subtle.importKey(
        'raw', fileKeyRaw.buffer, 'AES-GCM', false, ['decrypt']
    );

    let plaintextBuf;
    try {
        plaintextBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: fileIv, additionalData: headerBytes },
            subtleFileKey,
            fileCipher
        );
    } catch (e) {
        throw new Error('Dati corrotti o parametri errati');
    }

    const jsonString = dec.decode(plaintextBuf);
    return JSON.parse(jsonString);
}

// ======================= ESPORTAZIONE =======================
window.encryptV2 = encryptV2;
window.decryptV2 = decryptV2;

console.log('crypto-v2.js PRO caricato → PBKDF2 + Envelope + AD + Header strutturato');