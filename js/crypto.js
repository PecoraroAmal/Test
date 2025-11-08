// crypto.js – Versione 3.1 (GitHub Pages 100% funzionante + whenCryptoReady garantita)
(() => {
    'use strict';

    const VERSION = { CURRENT: 3, V2: 2, V1: 1 };
    const SALT_LENGTH = 32;
    const IV_LENGTH = 12;
    const ARGON2 = { time: 3, memory: 65536, parallelism: 4, hashLen: 32, type: null };

    let argon2 = null;
    let argon2Ready = false;
    let resolveReady, rejectReady;
    const readyPromise = new Promise((res, rej) => {
        resolveReady = res;
        rejectReady = rej;
    });

    // ------------------------------------------------------------
    // 1. RISOLUZIONE AUTOMATICA DEL PERCORSO (GitHub Pages safe)
    // ------------------------------------------------------------
    const getBasePath = () => {
        const script = document.currentScript;
        if (script) {
            const src = script.src;
            return src.substring(0, src.lastIndexOf('/') + 1);
        }
        // fallback per casi rari (es. worker o import)
        const fallback = location.href.includes('github.io')
            ? '/Test/js/'   // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
            : 'js/';
        return fallback.replace('//', '/');
    };
    const basePath = getBasePath();

    // ------------------------------------------------------------
    // 2. Base64 URL-safe (robusto)
    // ------------------------------------------------------------
    const base64UrlEncode = arr => btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const base64UrlDecode = str => {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = str.length % 4;
        if (pad) str += '==='.slice(pad);
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    };

    // ------------------------------------------------------------
    // 3. Caricamento Argon2 con fallback e logging chiaro
    // ------------------------------------------------------------
    const loadArgon2 = () => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = basePath + 'argon2.min.js';
            script.async = true;

            script.onload = () => {
                if (typeof loadArgon2Module !== 'function') {
                    return reject(new Error('argon2.min.js caricato ma loadArgon2Module non definito'));
                }
                loadArgon2Module({
                    wasmUrl: basePath + 'argon2.wasm',
                    onAbort: reject
                }).then(mod => {
                    argon2 = mod;
                    ARGON2.type = mod.ArgonType.Argon2id;
                    argon2Ready = true;
                    console.log('Argon2id pronto (v3)');
                    resolveReady(mod);
                    resolve(mod);
                }).catch(err => {
                    console.error('Errore caricamento argon2.wasm:', err);
                    reject(err);
                    rejectReady(err);
                });
            };

            script.onerror = () => {
                const msg = `Impossibile caricare argon2.min.js\nPercorso provato: ${script.src}\n` +
                            `Assicurati che i file siano in:\n${basePath}\n` +
                            `- argon2.min.js\n- argon2.wasm`;
                console.error(msg);
                reject(new Error(msg));
                rejectReady(new Error(msg));
            };

            document.head.appendChild(script);
        });
    };

    // Avvia il caricamento subito
    loadArgon2().catch(() => { /* già gestito sopra */ });

    // ------------------------------------------------------------
    // 4. Derivazione chiavi
    // ------------------------------------------------------------
    const deriveKeyArgon2 = async (password, salt) => {
        if (!argon2Ready) await readyPromise;
        const enc = new TextEncoder();
        const result = await argon2.hash({
            pass: enc.encode(password),
            salt: salt,
            time: ARGON2.time,
            mem: ARGON2.memory,
            parallelism: ARGON2.parallelism,
            hashLen: ARGON2.hashLen,
            type: ARGON2.type
        });
        return crypto.subtle.importKey('raw', result.hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
    };

    const deriveKeyPBKDF2 = async (password, salt, iterations, hashName) => {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations, hash: hashName },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    };

    // ------------------------------------------------------------
    // 5. encryptData
    // ------------------------------------------------------------
    window.encryptData = async (data, password) => {
        if (!password || password === '') throw new Error('Password obbligatoria');
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const key = await deriveKeyArgon2(password, salt);
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));

        const out = new Uint8Array(1 + SALT_LENGTH + IV_LENGTH + ciphertext.length);
        out.set([VERSION.CURRENT], 0);
        out.set(salt, 1);
        out.set(iv, 1 + SALT_LENGTH);
        out.set(ciphertext, 1 + SALT_LENGTH + IV_LENGTH);

        return base64UrlEncode(out);
    };

    // ------------------------------------------------------------
    // 6. decryptData (retrocompatibilità V1/V2/V3)
    // ------------------------------------------------------------
    window.decryptData = async (encryptedBase64, password) => {
        if (!password || password === '') throw new Error('Password obbligatoria');

        let data;
        try { data = base64UrlDecode(encryptedBase64); }
        catch { throw new Error('Base64 non valido'); }

        if (data.length < 45) throw new Error('Dati troppo corti');

        const version = data[0];
        let salt, iv, ciphertext, key;

        if (version === VERSION.CURRENT) {
            salt = data.slice(1, 1 + SALT_LENGTH);
            iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
            ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
            key = await deriveKeyArgon2(password, salt);

        } else if (version === VERSION.V2) {
            salt = data.slice(1, 1 + SALT_LENGTH);
            iv = data.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
            ciphertext = data.slice(1 + SALT_LENGTH + IV_LENGTH);
            key = await deriveKeyPBKDF2(password, salt, 800_000, 'SHA-512');

        } else if (version === VERSION.V1) {
            // Formato vecchio: nessun byte versione, salt 16 byte
            const compat = data.slice(1);
            if (compat.length < 28 + 16) throw new Error('Formato V1 non valido');
            salt = compat.slice(0, 16);
            iv = compat.slice(16, 28);
            ciphertext = compat.slice(28);
            key = await deriveKeyPBKDF2(password, salt, 1_000_000, 'SHA-256');

        } else {
            throw new Error('Versione non supportata');
        }

        try {
            const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            throw new Error('Password errata o dati corrotti');
        }
    };

    // ------------------------------------------------------------
    // 7. Funzioni pubbliche di stato (ORA SEMPRE DEFINITE)
    // ------------------------------------------------------------
    window.isCryptoReady = () => argon2Ready;
    window.whenCryptoReady = () => readyPromise;

    // Facoltativo: messaggio di debug quando tutto è pronto
    readyPromise.then(() => {
        console.log('Crittografia completamente pronta (Argon2id v3)');
    }).catch(err => {
        console.error('Crittografia NON disponibile:', err);
    });

})();