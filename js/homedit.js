// homedit.js

export let nonSensitiveData = { passwords: [], cards: [], wallets: [] };
export let sensitiveData = {};
export let masterKey = null;
export let loadedData = null;
export let uploadedFile = null;
export let uploadedFileName = null;

export function generateUniqueId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
    });
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function showMessage(text, type) {
    const oldMessage = document.querySelector('.toast-message');
    if (oldMessage) oldMessage.remove();

    const message = document.createElement('div');
    message.className = `toast-message toast-${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : 
                     type === 'error' ? 'var(--danger)' : 
                     'var(--primary-color)'};
        color: white;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

export function handleFileUpload(event) {
    const files = event.target?.files || event.dataTransfer?.files;
    const file = files?.[0];

    if (!file) {
        showMessage('No file selected', 'error');
        return;
    }

    if (file.size > 500 * 1024) {
        showMessage('File too large (max 0.5 MB). Keep under ~3,000 passwords.', 'error');
        if (event.target) event.target.value = '';
        return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('Error: please select a valid .json file', 'error');
        if (event.target) event.target.value = '';
        return;
    }

    uploadedFileName = file.name;
    const reader = new FileReader();

    reader.onerror = () => {
        showMessage('Error reading the file', 'error');
        uploadedFile = null;
        uploadedFileName = null;
        if (event.target) event.target.value = '';
    };

    reader.onload = (e) => {
        try {
            uploadedFile = e.target.result;

            const fileNameElement = document.querySelector('.file-name');
            if (fileNameElement) {
                fileNameElement.textContent = uploadedFileName;
            }

            showMessage('File uploaded successfully. Click "Open File" to continue.', 'info');
        } catch (err) {
            showMessage('Error processing the file', 'error');
            uploadedFile = null;
            uploadedFileName = null;
            if (event.target) event.target.value = '';
        }
    };

    reader.readAsText(file);
}

export function validateJSONStructure(data) {
    return data && typeof data === 'object' &&
           (data.passwords === undefined || Array.isArray(data.passwords)) &&
           (data.cards === undefined || Array.isArray(data.cards)) &&
           (data.wallets === undefined || Array.isArray(data.wallets));
}

export function sortData(data) {
    if (!data) return;
    data.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    data.cards?.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    data.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

export function toggleSection(containerId, button) {
    const container = document.getElementById(containerId);
    if (container) {
        const isHidden = container.classList.contains('hidden');
        container.classList.toggle('hidden');
        button.innerHTML = isHidden ? 
            `<i class="fas fa-eye-slash"></i> Hide ${containerId.replace('Container', '')}` :
            `<i class="fas fa-eye"></i> Show ${containerId.replace('Container', '')}`;
    }
}

export async function openFile(isEditMode = false) {
    if (!uploadedFile) {
        showMessage('Select a valid JSON file first', 'error');
        return;
    }

    let password = document.getElementById('decryptPassword')?.value || '';
    const btn = document.getElementById('decryptBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
    }

    try {
        let data;
        try {
            if (password) {
                data = await decryptData(uploadedFile, password);
            } else {
                data = JSON.parse(uploadedFile);
            }
        } catch (e) {
            throw new Error('Error parsing or decrypting JSON: ' + e.message);
        }

        if (!validateJSONStructure(data)) throw new Error('Invalid JSON structure');

        loadedData = {
            passwords: Array.isArray(data.passwords) ? data.passwords : [],
            cards: Array.isArray(data.cards) ? data.cards : [],
            wallets: Array.isArray(data.wallets) ? data.wallets : []
        };

        if (!password) {
            const promptPassword = prompt('Enter an optional password to protect sensitive data in memory (leave blank for no protection):');
            if (promptPassword) {
                password = promptPassword;
            }
        }

        if (password) {
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            masterKey = await deriveKey(password, salt);
        } else {
            masterKey = null;
        }

        nonSensitiveData = { passwords: [], cards: [], wallets: [] };
        sensitiveData = {};

        loadedData.passwords.forEach(item => {
            if (!item.id) item.id = generateUniqueId();
            nonSensitiveData.passwords.push({
                id: item.id,
                platform: item.platform,
                category: item.category || '',
                url: item.url || ''
            });
            const sens = {
                username: item.username || '',
                password: item.password || '',
                notes: item.notes || ''
            };
            storeSensitive(item.id, sens, masterKey);
        });

        loadedData.cards.forEach(item => {
            if (!item.id) item.id = generateUniqueId();
            nonSensitiveData.cards.push({
                id: item.id,
                issuer: item.issuer,
                network: item.network || ''
            });
            const sens = {
                pan: item.pan || '',
                expiryDate: item.expiryDate || '',
                cvv: item.cvv || '',
                pin: item.pin || '',
                notes: item.notes || ''
            };
            storeSensitive(item.id, sens, masterKey);
        });

        loadedData.wallets.forEach(item => {
            if (!item.id) item.id = generateUniqueId();
            nonSensitiveData.wallets.push({
                id: item.id,
                wallet: item.wallet,
                type: item.type || ''
            });
            const sens = {
                username: item.username || '',
                password: item.password || '',
                key: item.key || '',
                address: item.address || '',
                notes: item.notes || ''
            };
            storeSensitive(item.id, sens, masterKey);
        });

        sortData(nonSensitiveData);
        displayData(nonSensitiveData, isEditMode);
        populateFilters(nonSensitiveData);

        if (document.getElementById('decryptPassword')) {
            document.getElementById('decryptPassword').value = '';
        }
        uploadedFile = null;
        uploadedFileName = null;
        if (document.getElementById('fileInput')) {
            document.getElementById('fileInput').value = '';
        }
        const fileNameElement = document.querySelector('.file-name');
        if (fileNameElement) {
            fileNameElement.textContent = '';
        }

        showMessage('File opened successfully!', 'success');
    } catch (error) {
        console.error('File opening error:', error);
        showMessage(password ? 
            'Incorrect password or corrupted file' : 
            'Invalid file. If encrypted, enter the password', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-unlock"></i> Open File';
        }
    }
}

async function storeSensitive(id, sensObj, key) {
    if (!key) {
        sensitiveData[id] = JSON.stringify(sensObj);
        return;
    }
    const encrypted = await encryptItem(sensObj, key);
    sensitiveData[id] = encrypted;
}

async function encryptItem(dataObj, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(dataObj);
    const dataBuffer = encoder.encode(dataString);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);

    return result;
}

async function decryptItem(encrypted, key) {
    if (typeof encrypted === 'string') {
        return JSON.parse(encrypted);
    }
    const iv = encrypted.slice(0, 12);
    const encData = encrypted.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encData
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}

export async function toggleVisibility(button) {
    const parent = button.closest('.field-container');
    const span = parent?.querySelector('.hidden-content');
    if (!span) return;

    const id = button.closest('.preview-card-item').dataset.id;
    const field = span.dataset.field;
    const isHidden = span.textContent === '••••••••••••' || span.textContent === '-';

    if (isHidden) {
        try {
            const sens = await decryptItem(sensitiveData[id], masterKey);
            const value = sens[field] || '-';
            if (value !== '-') {
                span.textContent = value;
                button.innerHTML = '<i class="fas fa-eye-slash"></i>';
            }
        } catch (err) {
            showMessage('Error decrypting data', 'error');
        }
    } else {
        span.textContent = '••••••••••••';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

export async function copyToClipboard(button, field, type) {
    const id = button.closest('.preview-card-item').dataset.id;
    try {
        const sens = await decryptItem(sensitiveData[id], masterKey);
        const text = sens[field] || '';
        if (!text) return;

        await navigator.clipboard.writeText(text);
        showMessage(`${type} copied to clipboard!`, 'success');
    } catch (err) {
        showMessage('Error during copying', 'error');
    }
}

export function fallbackCopy(text, onSuccess, onError) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const result = document.execCommand('copy');
        if (result) {
            onSuccess();
        } else {
            onError();
        }
    } catch (err) {
        onError();
    }

    document.body.removeChild(textarea);
}

export function populateFilters(data) {
    populateCategoryFilter(data);
    populateCircuitFilter(data);
    populateTypeFilter(data);
}

function populateCategoryFilter(data) {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    const categories = new Set();
    data.passwords.forEach(pwd => {
        if (pwd.category) categories.add(pwd.category);
    });

    select.innerHTML = '<option value="">All categories</option>';
    Array.from(categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function populateCircuitFilter(data) {
    const select = document.getElementById('circuitFilter');
    if (!select) return;

    const networks = new Set();
    data.cards.forEach(card => {
        if (card.network) networks.add(card.network);
    });

    select.innerHTML = '<option value="">All networks</option>';
    Array.from(networks).sort().forEach(circ => {
        const option = document.createElement('option');
        option.value = circ;
        option.textContent = circ;
        select.appendChild(option);
    });
}

function populateTypeFilter(data) {
    const select = document.getElementById('typeFilter');
    if (!select) return;

    const types = new Set();
    data.wallets.forEach(wallet => {
        if (wallet.type) types.add(wallet.type);
    });

    select.innerHTML = '<option value="">All types</option>';
    Array.from(types).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });
}

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
            iterations: 1000000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return arrayBufferToBase64(result);
}

async function decryptData(encryptedData, password) {
    try {
        const data = base64ToArrayBuffer(encryptedData);
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);
        
        const key = await deriveKey(password, salt);
        
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

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}