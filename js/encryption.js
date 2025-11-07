// crypto-v2.js  →  nomi: encryptV2 / decryptV2
// 100% standalone – funziona anche offline

const V2 = 2;

async function deriveKeyV2(password, salt) {
    // Prova Argon2id, se non c’è usa PBKDF2 (600k iter)
    if (window.argon2id) {
        const enc = new TextEncoder();
        const res = await window.argon2id({
            pass: enc.encode(password),
            salt: salt,
            mem: 19456, iterations: 2, parallelism: 1, hashLen: 32, type: 2
        });
        return crypto.subtle.importKey('raw', res.hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
    }
    // fallback PBKDF2 forte
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptV2(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dataKey = await crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt','decrypt']);
    const wrapKey = await deriveKeyV2(password, salt);
    const wrapped = await crypto.subtle.wrapKey('raw', dataKey, wrapKey, {name:'AES-GCM', iv});

    const encrypted = await crypto.subtle.encrypt(
        {name:'AES-GCM', iv},
        dataKey,
        new TextEncoder().encode(JSON.stringify(data))
    );

    const header = {v:V2, s:[...salt], i:[...iv], w:[...new Uint8Array(wrapped)]};
    const hBin = new TextEncoder().encode(JSON.stringify(header));
    const len = new Uint32Array([hBin.byteLength]);

    const out = new Uint8Array(4 + hBin.byteLength + encrypted.byteLength);
    out.set(new Uint8Array(len.buffer), 0);
    out.set(new Uint8Array(hBin), 4);
    out.set(new Uint8Array(encrypted), 4 + hBin.byteLength);

    return btoa(String.fromCharCode(...out))
        .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function decryptV2(enc, password) {
    let base64 = enc.replace(/-/g,'+').replace(/_/g,'/');
    while (base64.length % 4) base64 += '=';
    const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const hlen = new DataView(data.buffer).getUint32(0);
    const header = JSON.parse(new TextDecoder().decode(data.slice(4, 4+hlen)));
    if (header.v !== V2) throw new Error('Versione non supportata');

    const salt = new Uint8Array(header.s);
    const iv = new Uint8Array(header.i);
    const wk = new Uint8Array(header.w);
    const ct = data.slice(4 + hlen);

    const unwrapKey = await deriveKeyV2(password, salt);
    const dataKey = await crypto.subtle.unwrapKey(
        'raw', wk, unwrapKey,
        {name:'AES-GCM', iv: new Uint8Array(12)}, // IV non serve per unwrap
        'AES-GCM', false, ['decrypt']
    );

    const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, dataKey, ct);
    return JSON.parse(new TextDecoder().decode(plain));
}

// Esportazione globale
window.encryptV2 = encryptV2;
window.decryptV2 = decryptV2;
console.log('crypto-v2.js caricato (V2 + envelope)');