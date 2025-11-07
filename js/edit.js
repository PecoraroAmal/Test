let loadedData = { passwords: [], cards: [], wallets: [] };
let uploadedFile = null;
let uploadedFileName = null;

// Genera ID univoco (usa crypto.randomUUID per standard e sicurezza)
function generateUniqueId() {
    try {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {
        // ignore
    }
    // Fallback: RFC4122 v4-like using getRandomValues if available
    try {
        if (window.crypto && crypto.getRandomValues) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20,12)}`;
        }
    } catch (e) {
        // ignore
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
}

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    // Listener per input e filtri
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    const decryptBtn = document.getElementById('decryptBtn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', openFile);
    }
    const passwordSearchInput = document.getElementById('passwordSearchInput');
    if (passwordSearchInput) {
        passwordSearchInput.addEventListener('input', filterData);
    }
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterData);
    }
    const cardSearchInput = document.getElementById('cardSearchInput');
    if (cardSearchInput) {
        cardSearchInput.addEventListener('input', filterData);
    }
    const circuitFilter = document.getElementById('circuitFilter');
    if (circuitFilter) {
        circuitFilter.addEventListener('change', filterData);
    }
    const walletSearchInput = document.getElementById('walletSearchInput');
    if (walletSearchInput) {
        walletSearchInput.addEventListener('input', filterData);
    }
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', filterData);
    }
    const decryptPassword = document.getElementById('decryptPassword');
    if (decryptPassword) {
        decryptPassword.addEventListener('keydown', e => {
            if (e.key === 'Enter') openFile();
        });
    }
    const downloadPlainBtn = document.getElementById('downloadPlainBtn');
    if (downloadPlainBtn) {
        downloadPlainBtn.addEventListener('click', () => downloadFile(false));
    }
    const downloadEncryptedBtn = document.getElementById('downloadEncryptedBtn');
    if (downloadEncryptedBtn) {
        downloadEncryptedBtn.addEventListener('click', () => downloadFile(true));
    }
    const addPasswordBtn = document.getElementById('addPasswordBtn');
    if (addPasswordBtn) {
        addPasswordBtn.addEventListener('click', addPassword);
    }
    const addCardBtn = document.getElementById('addCardBtn');
    if (addCardBtn) {
        addCardBtn.addEventListener('click', addCard);
    }
    const addWalletBtn = document.getElementById('addWalletBtn');
    if (addWalletBtn) {
        addWalletBtn.addEventListener('click', addWallet);
    }

    // Gestione drag and drop e click per upload
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
            uploadZone.addEventListener('dragenter', e => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });

            uploadZone.addEventListener('dragover', e => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                uploadZone.classList.add('drag-over');
            });

            uploadZone.addEventListener('dragleave', e => {
                if (e.target === uploadZone) {
                    uploadZone.classList.remove('drag-over');
                }
            });

            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.remove('drag-over');
                const files = e.dataTransfer?.files || (e.target?.files);
                const file = files?.[0];
                if (file) handleFileUpload({ target: { files: [file] } });
            });

            uploadZone.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
    }

    // Gestione toggle sezioni
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => toggleSection('passwordContainer', togglePasswordBtn));
    }
    const toggleCardBtn = document.getElementById('toggleCardBtn');
    if (toggleCardBtn) {
        toggleCardBtn.addEventListener('click', () => toggleSection('cardContainer', toggleCardBtn));
    }
    const toggleWalletBtn = document.getElementById('toggleWalletBtn');
    if (toggleWalletBtn) {
        toggleWalletBtn.addEventListener('click', () => toggleSection('walletContainer', toggleWalletBtn));
    }
});

// Gestione upload file
function handleFileUpload(event) {
    const files = event.target?.files || event.dataTransfer?.files;
    const file = files?.[0];

    if (!file) {
        showMessage('No file selected', 'error');
        return;
    }

    if (file.size > 500 * 1024) {  // Corretto a 0.5 MB
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

// Apertura e decrittazione file (simile a home.js)
async function openFile() {
    if (!uploadedFile) {
        showMessage('Select a valid JSON file first', 'error');
        return;
    }

    const password = document.getElementById('decryptPassword')?.value.trim() || '';
    const btn = document.getElementById('decryptBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
    }

    let rawData = null;
    let fileType = 'unknown';

    try {
        // STEP 1: Prova V2
        try {
            const preview = uploadedFile.trim().slice(0, 10);
            const isV2 = preview.startsWith('AA') || preview.startsWith('AQ') || preview.startsWith('Ag') || preview.startsWith('Aw');

            if (isV2) {
                rawData = await decryptV2(uploadedFile, password);
                fileType = 'New (V2 - advanced encryption)';
            } else {
                throw new Error('Not V2');
            }
        } catch (e) {
            // STEP 2: Prova V1
            try {
                rawData = await decryptOld(uploadedFile, password);
                fileType = 'Old (V1 - compatibility)';
            } catch (e2) {
                // STEP 3: JSON semplice
                try {
                    rawData = JSON.parse(uploadedFile);
                    fileType = 'Unencrypted (plain text)';
                } catch (e3) {
                    throw new Error('Wrong password, corrupted file or unsupported format');
                }
            }
        }

        // Validazione
        if (!validateJSONStructure(rawData)) {
            throw new Error('Invalid file structure (missing passwords/cards/wallets)');
        }

        // Caricamento con fallback
        loadedData = {
            passwords: Array.isArray(rawData.passwords) ? rawData.passwords : [],
            cards: Array.isArray(rawData.cards) ? rawData.cards : [],
            wallets: Array.isArray(rawData.wallets) ? rawData.wallets : []
        };

        // Aggiungi ID se mancanti
        ['passwords', 'cards', 'wallets'].forEach(section => {
            loadedData[section].forEach(item => {
                if (!item.id) item.id = generateUniqueId();
            });
        });

        sortData();
        displayData(loadedData);
        populateFilters(loadedData);

        // Pulizia UI
        document.getElementById('decryptPassword').value = '';
        uploadedFile = uploadedFileName = null;
        document.getElementById('fileInput').value = '';
        document.querySelector('.file-name')?.textContent = '';

        showMessage(`File opened successfully! (${fileType})`, 'success');
    } catch (err) {
        console.error('Opening error:', err);
        const msg = password 
            ? 'Wrong password or corrupted file' 
            : 'Invalid file. If encrypted, enter the password';
        showMessage(msg, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-unlock"></i> Open File';
        }
    }
}

// Validazione struttura JSON
function validateJSONStructure(data) {
    return data && typeof data === 'object' &&
           (data.passwords === undefined || Array.isArray(data.passwords)) &&
           (data.cards === undefined || Array.isArray(data.cards)) &&
           (data.wallets === undefined || Array.isArray(data.wallets));
}

// Ordinamento alfabetico
function sortData() {
    if (!loadedData) return;
    loadedData.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    loadedData.cards?.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    loadedData.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

// Visualizzazione dati con bottoni edit/delete
function displayData(data) {
    displayPasswords(data.passwords);
    displayCards(data.cards ?? []);
    displayWallets(data.wallets);
}

function displayPasswords(passwords) {
    const container = document.getElementById('passwordContainer');
    if (!container) return;

    container.innerHTML = '';
    if (passwords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <p>No passwords saved</p>
            </div>
        `;
        return;
    }

    passwords.forEach(pwd => {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${escapeHtml(pwd.platform)}</h3>
                <div class="action-buttons">
                    <button class="btn btn-icon edit-btn" onclick="editItem('password', '${pwd.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-btn" onclick="deleteItem('password', '${pwd.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.username)}" data-field="username">${escapeHtml(pwd.username)}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(pwd.username)}', 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(pwd.password)}" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">URL</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.url || '-')}" data-field="url">${escapeHtml(pwd.url || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(pwd.url || '-')}', 'URL')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(pwd.notes || '-')}" data-field="notes">${pwd.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Category</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.category || '-')}" data-field="category">${escapeHtml(pwd.category || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function displayCards(cards) {
    const container = document.getElementById('cardContainer');
    if (!container) return;

    container.innerHTML = '';
    if (cards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <p>No cards saved</p>
            </div>
        `;
        return;
    }

    cards.forEach(card => {
        const cardElem = document.createElement('div');
        cardElem.className = 'data-card';
        cardElem.innerHTML = `
            <div class="card-header">
                <h3>${escapeHtml(card.issuer)}</h3>
                <div class="action-buttons">
                    <button class="btn btn-icon edit-btn" onclick="editItem('card', '${card.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-btn" onclick="deleteItem('card', '${card.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">PAN</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(card.pan)}" data-field="pan">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'PAN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Expiry Date</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(card.expiryDate)}" data-field="expiryDate">${escapeHtml(card.expiryDate)}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(card.expiryDate)}', 'Expiry Date')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">CVV</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(card.cvv)}" data-field="cvv">••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'CVV')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">PIN</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(card.pin)}" data-field="pin">••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'PIN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(card.notes || '-')}" data-field="notes">${card.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Network</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(card.network || '-')}" data-field="network">${escapeHtml(card.network || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(cardElem);
    });
}

function displayWallets(wallets) {
    const container = document.getElementById('walletContainer');
    if (!container) return;

    container.innerHTML = '';
    if (wallets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <p>No wallets saved</p>
            </div>
        `;
        return;
    }

    wallets.forEach(wallet => {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${escapeHtml(wallet.wallet)}</h3>
                <div class="action-buttons">
                    <button class="btn btn-icon edit-btn" onclick="editItem('wallet', '${wallet.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-btn" onclick="deleteItem('wallet', '${wallet.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(wallet.username || '-')}" data-field="username">${escapeHtml(wallet.username || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(wallet.username || '-')}', 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(wallet.password)}" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Key</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(wallet.key || '-')}" data-field="key">${wallet.key ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Key')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Address</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(wallet.address || '-')}" data-field="address">${escapeHtml(wallet.address || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(wallet.address || '-')}', 'Address')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content" data-value="${escapeHtml(wallet.notes || '-')}" data-field="notes">${wallet.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.hidden-content').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Type</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(wallet.type || '-')}" data-field="type">${escapeHtml(wallet.type || '-')}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Toggle visibilità (simile a home.js)
function toggleVisibility(button) {
    const parent = button.closest('.field-container');
    const span = parent?.querySelector('.hidden-content');
    if (!span) return;

    const value = span.dataset.value;
    const isHidden = span.textContent === '••••••••••••' || span.textContent === '••••' || span.textContent === '-';

    if (isHidden && value !== '-') {
        span.textContent = value;
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        span.textContent = value && value !== '-' ? (span.textContent.length > 4 ? '••••••••••••' : '••••') : '-';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Copia in clipboard (simile a home.js)
function copyToClipboard(text, type) {
    if (text === '-') return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showMessage(`${type} copied to clipboard!`, 'success'))
            .catch(() => showMessage('Error during copying', 'error'));
    } else {
        fallbackCopy(text, 
            () => showMessage(`${type} copied to clipboard!`, 'success'),
            () => showMessage('Error during copying', 'error')
        );
    }
}

function fallbackCopy(text, onSuccess, onError) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        if (document.execCommand('copy')) {
            onSuccess();
        } else {
            onError();
        }
    } catch (err) {
        onError();
    }

    document.body.removeChild(textarea);
}

// Filtraggio dati (simile a home.js)
function filterData() {
    if (!loadedData) return;

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

    const filteredPasswords = loadedData.passwords.filter(pwd => {
        const searchMatch = !passwordSearch || 
            pwd.platform.toLowerCase().includes(passwordSearch) ||
            pwd.username.toLowerCase().includes(passwordSearch) ||
            pwd.password.toLowerCase().includes(passwordSearch) ||
            (pwd.url && pwd.url.toLowerCase().includes(passwordSearch)) ||
            (pwd.notes && pwd.notes.toLowerCase().includes(passwordSearch)) ||
            (pwd.category && pwd.category.toLowerCase().includes(passwordSearch));

        const categoryMatch = !category || 
            (pwd.category && pwd.category.toLowerCase() === category);

        return searchMatch && categoryMatch;
    }).sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));

    const filteredCards = (loadedData.cards ?? []).filter(card => {
        const searchMatch = !cardSearch || 
            card.issuer.toLowerCase().includes(cardSearch) ||
            card.pan.toLowerCase().includes(cardSearch) ||
            card.expiryDate.toLowerCase().includes(cardSearch) ||
            card.cvv.toLowerCase().includes(cardSearch) ||
            card.pin.toLowerCase().includes(cardSearch) ||
            (card.network && card.network.toLowerCase().includes(cardSearch)) ||
            (card.notes && card.notes.toLowerCase().includes(cardSearch));

        const circuitMatch = !circuit || 
            (card.network && card.network.toLowerCase() === circuit);

        return searchMatch && circuitMatch;
    }).sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));

    const filteredWallets = loadedData.wallets.filter(wallet => {
        const searchMatch = !walletSearch || 
            wallet.wallet.toLowerCase().includes(walletSearch) ||
            (wallet.username && wallet.username.toLowerCase().includes(walletSearch)) ||
            wallet.password.toLowerCase().includes(walletSearch) ||
            (wallet.key && wallet.key.toLowerCase().includes(walletSearch)) ||
            (wallet.address && wallet.address.toLowerCase().includes(walletSearch)) ||
            (wallet.type && wallet.type.toLowerCase().includes(walletSearch)) ||
            (wallet.notes && wallet.notes.toLowerCase().includes(walletSearch));

        const typeMatch = !type || 
            (wallet.type && wallet.type.toLowerCase() === type);

        return searchMatch && typeMatch;
    }).sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));

    displayPasswords(filteredPasswords);
    displayCards(filteredCards);
    displayWallets(filteredWallets);
}

// Popolamento filtri (simile a home.js)
function populateFilters(data) {
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
    (data.cards ?? []).forEach(card => {
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

// Download file (crittato o plain)
async function downloadFile(encrypted) {
    if (!loadedData) {
        showMessage('No data to save', 'error');
        return;
    }

    const password = document.getElementById('encryptPassword')?.value || '';
    
    if (encrypted && password.length < 8) {
        showMessage('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        let content;
        if (encrypted) {
            showMessage('Encrypting...', 'info');
            content = await encryptV2(loadedData, password);  // Usa V2
        } else {
            content = JSON.stringify(loadedData, null, 2);
        }
        
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passwords${encrypted ? '_encrypted' : ''}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('File downloaded successfully!', 'success');
    } catch (error) {
        console.error('Saving error:', error);
        showMessage('Error during saving: ' + error.message, 'error');
    }
}

// Genera password random
function generateRandomPassword(length = 16) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?éèçò°ùà§';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < length; i++) {
        password += characters[array[i] % characters.length];
    }
    return password;
}

// Aggiungi password (modale)
function addPassword() {
    showEditModal('password', null);
}

// Aggiungi card
function addCard() {
    showEditModal('card', null);
}

// Aggiungi wallet
function addWallet() {
    showEditModal('wallet', null);
}

// Modifica item (modale)
function editItem(type, id) {
    const item = findItemById(type, id);
    if (!item) return;
    showEditModal(type, item);
}

// Trova item per ID
function findItemById(type, id) {
    if (type === 'password') return loadedData.passwords.find(p => p.id === id);
    if (type === 'card') return loadedData.cards?.find(c => c.id === id);
    if (type === 'wallet') return loadedData.wallets.find(w => w.id === id);
    return null;
}

// Mostra modale edit/add
function showEditModal(type, item) {
    const isAdd = !item;
    const title = isAdd ? `Add ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            <form id="editForm">
                ${getFormFields(type, item)}
                <div class="btn-container">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector('#editForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveItem(type, item?.id, form);
        document.body.removeChild(modal);
    });

    const cancelBtn = modal.querySelector('#cancelBtn');
    cancelBtn.addEventListener('click', () => document.body.removeChild(modal));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    });

    // Aggiungi listener per generate password se password field
    if (type === 'password' || type === 'wallet') {
        const genBtn = form.querySelector('#generatePasswordBtn');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const pwdInput = form.querySelector('#password');
                if (pwdInput) pwdInput.value = generateRandomPassword();
            });
        }
    }
}

// Campi form per tipo
function getFormFields(type, item) {
    if (type === 'password') {
        return `
            <div class="form-group">
                <label for="platform">Platform</label>
                <input type="text" id="platform" value="${escapeHtml(item?.platform || '')}" required>
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" value="${escapeHtml(item?.username || '')}" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-with-btn">
                    <input type="text" id="password" value="${escapeHtml(item?.password || '')}" required>
                    <button type="button" id="generatePasswordBtn" class="btn btn-secondary"><i class="fas fa-random"></i> Generate</button>
                </div>
            </div>
            <div class="form-group">
                <label for="url">URL</label>
                <input type="url" id="url" value="${escapeHtml(item?.url || '')}">
            </div>
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes">${escapeHtml(item?.notes || '')}</textarea>
            </div>
            <div class="form-group">
                <label for="category">Category</label>
                <input type="text" id="category" value="${escapeHtml(item?.category || '')}">
            </div>
        `;
    } else if (type === 'card') {
        return `
            <div class="form-group">
                <label for="issuer">Issuer</label>
                <input type="text" id="issuer" value="${escapeHtml(item?.issuer || '')}" required>
            </div>
            <div class="form-group">
                <label for="pan">PAN</label>
                <input type="text" id="pan" value="${escapeHtml(item?.pan || '')}" required>
            </div>
            <div class="form-group">
                <label for="expiryDate">Expiry Date</label>
                <input type="text" id="expiryDate" value="${escapeHtml(item?.expiryDate || '')}" required placeholder="MM/YY">
            </div>
            <div class="form-group">
                <label for="cvv">CVV</label>
                <input type="text" id="cvv" value="${escapeHtml(item?.cvv || '')}" required>
            </div>
            <div class="form-group">
                <label for="pin">PIN</label>
                <input type="text" id="pin" value="${escapeHtml(item?.pin || '')}" required>
            </div>
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes">${escapeHtml(item?.notes || '')}</textarea>
            </div>
            <div class="form-group">
                <label for="network">Network</label>
                <input type="text" id="network" value="${escapeHtml(item?.network || '')}">
            </div>
        `;
    } else if (type === 'wallet') {
        return `
            <div class="form-group">
                <label for="wallet">Wallet</label>
                <input type="text" id="wallet" value="${escapeHtml(item?.wallet || '')}" required>
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" value="${escapeHtml(item?.username || '')}">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-with-btn">
                    <input type="text" id="password" value="${escapeHtml(item?.password || '')}" required>
                    <button type="button" id="generatePasswordBtn" class="btn btn-secondary"><i class="fas fa-random"></i> Generate</button>
                </div>
            </div>
            <div class="form-group">
                <label for="key">Key</label>
                <textarea id="key">${escapeHtml(item?.key || '')}</textarea>
            </div>
            <div class="form-group">
                <label for="address">Address</label>
                <input type="text" id="address" value="${escapeHtml(item?.address || '')}">
            </div>
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes">${escapeHtml(item?.notes || '')}</textarea>
            </div>
            <div class="form-group">
                <label for="type">Type</label>
                <input type="text" id="type" value="${escapeHtml(item?.type || '')}">
            </div>
        `;
    }
    return '';
}

// Salva item da form
function saveItem(type, id, form) {
    const newItem = {};
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        newItem[input.id] = input.value.trim();
    });

    if (type === 'password') {
        if (id) {
            const index = loadedData.passwords.findIndex(p => p.id === id);
            if (index !== -1) loadedData.passwords[index] = { ...loadedData.passwords[index], ...newItem };
        } else {
            newItem.id = generateUniqueId();
            loadedData.passwords.push(newItem);
        }
    } else if (type === 'card') {
        if (id) {
            const index = loadedData.cards?.findIndex(c => c.id === id);
            if (index !== -1) loadedData.cards[index] = { ...loadedData.cards[index], ...newItem };
        } else {
            newItem.id = generateUniqueId();
            loadedData.cards.push(newItem);
        }
    } else if (type === 'wallet') {
        if (id) {
            const index = loadedData.wallets.findIndex(w => w.id === id);
            if (index !== -1) loadedData.wallets[index] = { ...loadedData.wallets[index], ...newItem };
        } else {
            newItem.id = generateUniqueId();
            loadedData.wallets.push(newItem);
        }
    }

    sortData();
    displayData(loadedData);
    populateFilters(loadedData);
    showMessage('Item saved successfully!', 'success');
}

// Elimina item con conferma
function deleteItem(type, id) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this item?</p>
            <div class="btn-container">
                <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const confirmBtn = modal.querySelector('#confirmDeleteBtn');
    confirmBtn.addEventListener('click', () => {
        if (type === 'password') {
            loadedData.passwords = loadedData.passwords.filter(p => p.id !== id);
            showMessage('Password deleted successfully!', 'success');
        } else if (type === 'card') {
            loadedData.cards = loadedData.cards?.filter(c => c.id !== id);
            showMessage('Card deleted successfully!', 'success');
        } else if (type === 'wallet') {
            loadedData.wallets = loadedData.wallets.filter(w => w.id !== id);
            showMessage('Wallet deleted successfully!', 'success');
        }
        displayData(loadedData);
        populateFilters(loadedData);
        document.body.removeChild(modal);
    });

    const cancelBtn = modal.querySelector('#cancelBtn');
    cancelBtn.addEventListener('click', () => document.body.removeChild(modal));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    });
}

// Toggle sezione (simile a home.js)
function toggleSection(containerId, button) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isHidden = button.innerHTML.includes('eye-slash');
    const spans = container.querySelectorAll('.hidden-content');

    spans.forEach(span => {
        const value = span.dataset.value;
        if (isHidden) {
            span.textContent = value && value !== '-' ? (span.textContent.length > 4 ? '••••••••••••' : '••••') : '-';
        } else {
            span.textContent = value;
        }
    });

    const icons = container.querySelectorAll('.toggle-password i');
    icons.forEach(icon => {
        icon.className = isHidden ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    button.innerHTML = isHidden 
        ? '<i class="fas fa-eye-slash"></i> Hide All' 
        : '<i class="fas fa-eye"></i> Show All';
}

// Mostra messaggio toast (simile a home.js)
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

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}