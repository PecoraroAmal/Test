// Shared functions for home.js and edit.js

// Global variables
let loadedPublicData = { passwords: [], cards: [], wallets: [] };
let loadedSensitiveData = new Map();
let sessionKey = null; // Will be set in openFile
let uploadedFile = null;
let uploadedFileName = null;

// Function to generate a unique ID (shared, but mainly used in edit)
function generateUniqueId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
    });
}

// Handle file upload (shared)
function handleFileUpload(event) {
    const files = event.target?.files || event.dataTransfer?.files;
    const file = files?.[0];

    if (!file) {
        showMessage('No file selected', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
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

// Open file (shared, with separation of sensitive data)
// Aggiunto check per vecchi file encrypted senza password
async function openFile(isEditMode = false) {
    if (!uploadedFile) {
        showMessage('Select a valid JSON file first', 'error');
        return;
    }
    
    const password = document.getElementById('decryptPassword')?.value || '';
    const btn = document.getElementById('decryptBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
    }
    
    try {
        let data;
        try {
            if (!password) {
                // Prova prima a parse come JSON plain
                try {
                    data = JSON.parse(uploadedFile);
                } catch (parseErr) {
                    // Se fallisce parse e sembra base64/encrypted, suggerisci password
                    if (uploadedFile.trim().match(/^[A-Za-z0-9+/=]+$/)) {
                        throw new Error('File seems encrypted. Please enter the password to decrypt.');
                    } else {
                        throw parseErr;
                    }
                }
            } else {
                data = await decryptData(uploadedFile, password);
            }
        } catch (e) {
            console.error('Parsing/decrypting error:', e);
            throw new Error('Error parsing or decrypting JSON: ' + e.message);
        }
        
        if (!validateJSONStructure(data)) throw new Error('Invalid JSON structure');
        
        // Generate session key: from password if provided, else random
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        sessionKey = await deriveKeySensitive(password || arrayBufferToBase64(window.crypto.getRandomValues(new Uint8Array(32))), salt);
        
        // Separate public and sensitive data
        loadedPublicData = {
            passwords: [],
            cards: [],
            wallets: []
        };
        loadedSensitiveData.clear();
        
        // Process passwords
        (Array.isArray(data.passwords) ? data.passwords : []).forEach(async pwd => {
            const id = pwd.id || generateUniqueId();
            const publicPwd = {
                id,
                platform: pwd.platform || '',
                url: pwd.url || '',
                category: pwd.category || ''
            };
            const sensitivePwd = {
                username: pwd.username || '',
                password: pwd.password || '',
                notes: pwd.notes || ''
            };
            loadedPublicData.passwords.push(publicPwd);
            loadedSensitiveData.set(id, await encryptSensitive(sensitivePwd, sessionKey)); // Await per async
        });
        
        // Process cards
        (Array.isArray(data.cards) ? data.cards : []).forEach(async card => {
            const id = card.id || generateUniqueId();
            const publicCard = {
                id,
                issuer: card.issuer || '',
                network: card.network || ''
            };
            const sensitiveCard = {
                pan: card.pan || '',
                expiryDate: card.expiryDate || '',
                cvv: card.cvv || '',
                pin: card.pin || '',
                notes: card.notes || ''
            };
            loadedPublicData.cards.push(publicCard);
            loadedSensitiveData.set(id, await encryptSensitive(sensitiveCard, sessionKey));
        });
        
        // Process wallets
        (Array.isArray(data.wallets) ? data.wallets : []).forEach(async wallet => {
            const id = wallet.id || generateUniqueId();
            const publicWallet = {
                id,
                wallet: wallet.wallet || '',
                type: wallet.type || ''
            };
            const sensitiveWallet = {
                username: wallet.username || '',
                password: wallet.password || '',
                key: wallet.key || '',
                address: wallet.address || '',
                notes: wallet.notes || ''
            };
            loadedPublicData.wallets.push(publicWallet);
            loadedSensitiveData.set(id, await encryptSensitive(sensitiveWallet, sessionKey));
        });
        
        sortData();
        displayData(isEditMode);
        populateFilters();
        
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

// Validate JSON structure (shared)
function validateJSONStructure(data) {
    return data && typeof data === 'object' &&
           (data.passwords === undefined || Array.isArray(data.passwords)) &&
           (data.cards === undefined || Array.isArray(data.cards)) &&
           (data.wallets === undefined || Array.isArray(data.wallets));
}

// Sort data (shared, sorts public data)
function sortData() {
    loadedPublicData.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    loadedPublicData.cards.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    loadedPublicData.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

// Toggle section (shared)
function toggleSection(containerId, button) {
    const container = document.getElementById(containerId);
    if (container) {
        const isHidden = container.classList.contains('hidden');
        container.classList.toggle('hidden');
        button.innerHTML = isHidden ? 
            `<i class="fas fa-eye-slash"></i> Hide ${containerId.replace('Container', '')}s` :
            `<i class="fas fa-eye"></i> Show ${containerId.replace('Container', '')}s`;
    }
}

// Display data (shared, with isEditMode for editable UI)
function displayData(isEditMode = false) {
    displayPasswords(loadedPublicData.passwords, isEditMode);
    displayCards(loadedPublicData.cards, isEditMode);
    displayWallets(loadedPublicData.wallets, isEditMode);
}

// Display passwords (shared, decrypt on demand, editable if isEditMode)
// Riordinato: Username > Password > Notes > URL > Category
function displayPasswords(passwords, isEditMode) {
    const container = document.getElementById('passwordContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!passwords.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <p>No passwords saved</p>
            </div>`;
        return;
    }

    passwords.forEach(pwd => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.dataset.id = pwd.id;
        card.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(pwd.platform)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="username">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${pwd.id}', 'passwords')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${pwd.id}', 'passwords', 'username')">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${isEditMode ? `<button class="btn btn-icon edit-btn" onclick="editItem('${pwd.id}', 'password')"><i class="fas fa-edit"></i></button>` : ''}
                    ${isEditMode ? `<button class="btn btn-icon delete-btn" onclick="deleteItem('${pwd.id}', 'password')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${pwd.id}', 'passwords')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${pwd.id}', 'passwords', 'password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${pwd.id}', 'passwords')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${pwd.id}', 'passwords', 'notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">URL</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(pwd.url || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${pwd.url}', 'URL')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Category</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(pwd.category || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Display cards (unchanged)
function displayCards(cards, isEditMode) {
    const container = document.getElementById('cardContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!cards.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <p>No cards saved</p>
            </div>`;
        return;
    }

    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'preview-card-item';
        item.dataset.id = card.id;
        item.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(card.issuer)}</h3>
            <div class="field-container">
                <label class="field-label">PAN</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="pan">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${card.id}', 'cards')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${card.id}', 'cards', 'pan')">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${isEditMode ? `<button class="btn btn-icon edit-btn" onclick="editItem('${card.id}', 'card')"><i class="fas fa-edit"></i></button>` : ''}
                    ${isEditMode ? `<button class="btn btn-icon delete-btn" onclick="deleteItem('${card.id}', 'card')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Expiry</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="expiryDate">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${card.id}', 'cards')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${card.id}', 'cards', 'expiryDate')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${card.id}', 'cards')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${card.id}', 'cards', 'cvv')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${card.id}', 'cards')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${card.id}', 'cards', 'pin')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${card.id}', 'cards')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${card.id}', 'cards', 'notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Network</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(card.network || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Display wallets (unchanged)
function displayWallets(wallets, isEditMode) {
    const container = document.getElementById('walletContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!wallets.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <p>No wallets saved</p>
            </div>`;
        return;
    }

    wallets.forEach(wallet => {
        const item = document.createElement('div');
        item.className = 'preview-card-item';
        item.dataset.id = wallet.id;
        item.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(wallet.wallet)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="username">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${wallet.id}', 'wallets')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${wallet.id}', 'wallets', 'username')">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${isEditMode ? `<button class="btn btn-icon edit-btn" onclick="editItem('${wallet.id}', 'wallet')"><i class="fas fa-edit"></i></button>` : ''}
                    ${isEditMode ? `<button class="btn btn-icon delete-btn" onclick="deleteItem('${wallet.id}', 'wallet')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${wallet.id}', 'wallets')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${wallet.id}', 'wallets', 'password')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${wallet.id}', 'wallets')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${wallet.id}', 'wallets', 'key')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${wallet.id}', 'wallets')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${wallet.id}', 'wallets', 'address')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, '${wallet.id}', 'wallets')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${wallet.id}', 'wallets', 'notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Type</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${escapeHtml(wallet.type || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Toggle visibility (shared, decrypts on demand)
async function toggleVisibility(button, id, type) {
    const parent = button.closest('.field-container');
    const span = parent.querySelector('.hidden-content');
    if (!span) return;

    const field = span.dataset.field;
    const isHidden = span.textContent === '••••••••••••';

    if (isHidden) {
        try {
            const encrypted = loadedSensitiveData.get(id);
            const sensitive = await decryptSensitive(encrypted, sessionKey);
            const value = sensitive[field] || '-';
            span.textContent = escapeHtml(value);
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } catch (err) {
            showMessage('Error decrypting data', 'error');
        }
    } else {
        span.textContent = '••••••••••••';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Copy to clipboard (shared, decrypts on demand)
async function copyToClipboard(id, type, field) {
    try {
        const encrypted = loadedSensitiveData.get(id);
        const sensitive = await decryptSensitive(encrypted, sessionKey);
        const text = sensitive[field] || '';
        if (!text) return;

        await navigator.clipboard.writeText(text);
        showMessage(`${field} copied to clipboard!`, 'success');
    } catch (err) {
        showMessage('Error during copying', 'error');
    }
}

// Filter data (shared, filters on public data only)
function filterData(isEditMode = false) {
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
    const walletType = typeFilter.value.toLowerCase();
    
    // Filter passwords (on public fields)
    const filteredPasswords = loadedPublicData.passwords.filter(pwd => {
        const searchMatch = !passwordSearch || 
            pwd.platform.toLowerCase().includes(passwordSearch) ||
            (pwd.url && pwd.url.toLowerCase().includes(passwordSearch)) ||
            (pwd.category && pwd.category.toLowerCase().includes(passwordSearch));
        
        const categoryMatch = !category || 
            (pwd.category && pwd.category.toLowerCase() === category);
        
        return searchMatch && categoryMatch;
    }).sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    
    // Filter cards
    const filteredCards = loadedPublicData.cards.filter(card => {
        const searchMatch = !cardSearch || 
            card.issuer.toLowerCase().includes(cardSearch) ||
            (card.network && card.network.toLowerCase().includes(cardSearch));
        
        const circuitMatch = !circuit || 
            (card.network && card.network.toLowerCase() === circuit);
        
        return searchMatch && circuitMatch;
    }).sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    
    // Filter wallets
    const filteredWallets = loadedPublicData.wallets.filter(wallet => {
        const searchMatch = !walletSearch || 
            wallet.wallet.toLowerCase().includes(walletSearch) ||
            (wallet.type && wallet.type.toLowerCase().includes(walletSearch));
        
        const typeMatch = !walletType || 
            (wallet.type && wallet.type.toLowerCase() === walletType);
        
        return searchMatch && typeMatch;
    }).sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
    
    displayPasswords(filteredPasswords, isEditMode);
    displayCards(filteredCards, isEditMode);
    displayWallets(filteredWallets, isEditMode);
}

// Populate filters (shared, uses public data)
function populateFilters() {
    populateCategoryFilter();
    populateCircuitFilter();
    populateTypeFilter();
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    const categories = new Set();
    loadedPublicData.passwords.forEach(pwd => {
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

function populateCircuitFilter() {
    const select = document.getElementById('circuitFilter');
    if (!select) return;
    
    const networks = new Set();
    loadedPublicData.cards.forEach(card => {
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

function populateTypeFilter() {
    const select = document.getElementById('typeFilter');
    if (!select) return;
    
    const types = new Set();
    loadedPublicData.wallets.forEach(wallet => {
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

// Show message (shared)
function showMessage(text, type) {
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

// Escape HTML (shared)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export as globals for vanilla JS compatibility
window.generateUniqueId = generateUniqueId;
window.handleFileUpload = handleFileUpload;
window.openFile = openFile;
window.validateJSONStructure = validateJSONStructure;
window.sortData = sortData;
window.toggleSection = toggleSection;
window.displayData = displayData;
window.displayPasswords = displayPasswords;
window.displayCards = displayCards;
window.displayWallets = displayWallets;
window.toggleVisibility = toggleVisibility;
window.copyToClipboard = copyToClipboard;
window.filterData = filterData;
window.populateFilters = populateFilters;
window.populateCategoryFilter = populateCategoryFilter;
window.populateCircuitFilter = populateCircuitFilter;
window.populateTypeFilter = populateTypeFilter;
window.showMessage = showMessage;
window.escapeHtml = escapeHtml;