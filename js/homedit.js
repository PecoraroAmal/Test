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
    console.log('handleFileUpload triggered', event);
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

export function displayData(data, isEditMode = false) {
    displayPasswords(data.passwords || [], isEditMode);
    displayCards(data.cards || [], isEditMode);
    displayWallets(data.wallets || [], isEditMode);
}

function displayPasswords(items, isEditMode) {
    const container = document.getElementById('passwordContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <p>No passwords saved</p>
            </div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.dataset.id = item.id;
        card.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(item.platform)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="username">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'username', 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'password', 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">URL</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(item.url || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Category</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(item.category || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'notes', 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
        if (isEditMode) {
            card.innerHTML += `
                <div class="edit-buttons">
                    <button class="btn btn-edit" onclick="editItem('${item.id}', 'password')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'password')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
        }
        container.appendChild(card);
    });
}

function displayCards(items, isEditMode) {
    const container = document.getElementById('cardContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <p>No cards saved</p>
            </div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.dataset.id = item.id;
        card.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(item.issuer)}</h3>
            <div class="field-container">
                <label class="field-label">PAN</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="pan">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'pan', 'PAN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Expiry</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="expiryDate">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'expiryDate', 'Expiry Date')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">CVV</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="cvv">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'cvv', 'CVV')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">PIN</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="pin">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'pin', 'PIN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Network</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(item.network || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'notes', 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
        if (isEditMode) {
            card.innerHTML += `
                <div class="edit-buttons">
                    <button class="btn btn-edit" onclick="editItem('${item.id}', 'card')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'card')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
        }
        container.appendChild(card);
    });
}

function displayWallets(items, isEditMode) {
    const container = document.getElementById('walletContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <p>No wallets saved</p>
            </div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.dataset.id = item.id;
        card.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(item.wallet)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="username">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'username', 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'password', 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Key</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="key">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'key', 'Key')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Address</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="address">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'address', 'Address')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Type</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(item.type || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="homedit.toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="homedit.copyToClipboard(this, 'notes', 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
        if (isEditMode) {
            card.innerHTML += `
                <div class="edit-buttons">
                    <button class="btn btn-edit" onclick="editItem('${item.id}', 'wallet')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'wallet')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
        }
        container.appendChild(card);
    });
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

export function filterData() {
    const passwordSearchInput = document.getElementById('passwordSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const cardSearchInput = document.getElementById('cardSearchInput');
    const circuitFilter = document.getElementById('circuitFilter');
    const walletSearchInput = document.getElementById('walletSearchInput');
    const typeFilter = document.getElementById('typeFilter');

    if (!passwordSearchInput || !categoryFilter || !cardSearchInput || !circuitFilter || !walletSearchInput || !typeFilter) return;

    const passwordSearch = passwordSearchInput.value.toLowerCase();
    const category = categoryFilter.value.toLowerCase();
    const cardSearch = cardSearchInput.value.toLowerCase();
    const circuit = circuitFilter.value.toLowerCase();
    const walletSearch = walletSearchInput.value.toLowerCase();
    const type = typeFilter.value.toLowerCase();

    const filteredPasswords = nonSensitiveData.passwords.filter(pwd => {
        const searchMatch = !passwordSearch || 
            pwd.platform.toLowerCase().includes(passwordSearch) ||
            (pwd.url && pwd.url.toLowerCase().includes(passwordSearch)) ||
            (pwd.category && pwd.category.toLowerCase().includes(passwordSearch));

        const categoryMatch = !category || 
            (pwd.category && pwd.category.toLowerCase() === category);

        return searchMatch && categoryMatch;
    }).sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));

    const filteredCards = nonSensitiveData.cards.filter(card => {
        const searchMatch = !cardSearch || 
            card.issuer.toLowerCase().includes(cardSearch) ||
            (card.network && card.network.toLowerCase().includes(cardSearch));

        const circuitMatch = !circuit || 
            (card.network && card.network.toLowerCase() === circuit);

        return searchMatch && circuitMatch;
    }).sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));

    const filteredWallets = nonSensitiveData.wallets.filter(wallet => {
        const searchMatch = !walletSearch || 
            wallet.wallet.toLowerCase().includes(walletSearch) ||
            (wallet.type && wallet.type.toLowerCase().includes(walletSearch));

        const typeMatch = !type || 
            (wallet.type && wallet.type.toLowerCase() === type);

        return searchMatch && typeMatch;
    }).sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));

    displayPasswords(filteredPasswords, !!document.getElementById('addPasswordBtn'));
    displayCards(filteredCards, !!document.getElementById('addCardBtn'));
    displayWallets(filteredWallets, !!document.getElementById('addWalletBtn'));
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

export function initUploadZone() {
    console.log('initUploadZone called');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
        console.log('fileInput listener added');
    } else {
        console.error('fileInput not found');
    }

    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', e => {
            console.log('dragover');
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            console.log('dragleave');
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', e => {
            console.log('drop', e.dataTransfer.files);
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload({ target: { files: [file] } });
        });
        uploadZone.addEventListener('click', () => {
            console.log('uploadZone click');
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
    } else {
        console.error('uploadZone not found');
    }
}