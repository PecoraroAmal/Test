// Variabili globali
let loadedData = null;
let uploadedFile = null;
let uploadedFileName = null;

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
        decryptPassword.addEventListener('keypress', e => {
            if (e.key === 'Enter') openFile();
        });
    }

    // Gestione drag and drop e click per upload file
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', e => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload({ target: { files: [file] } });
        });
        uploadZone.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
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

    if (file.size > 500 * 1024) {  // Limite 0.5 MB coerente con messaggio
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

    reader.readAsText(file);  // Leggi come testo
}

// Apertura e decrittazione file
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
        // STEP 1: Prova V2 (inizia con AA, AQ, Ag, Aw in base64url)
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
            // STEP 2: Prova vecchio formato (V1)
            try {
                rawData = await decryptOld(uploadedFile, password);
                fileType = 'Old (V1 - compatibility)';
            } catch (e2) {
                // STEP 3: Non criptato, prova JSON semplice
                try {
                    rawData = JSON.parse(uploadedFile);
                    fileType = 'Unencrypted (plain text)';
                } catch (e3) {
                    throw new Error('Wrong password, corrupted file or unsupported format');
                }
            }
        }

        // Validazione struttura
        if (!validateJSONStructure(rawData)) {
            throw new Error('Invalid file structure (missing passwords/cards/wallets)');
        }

        // Caricamento dati con fallback array vuoti
        loadedData = {
            passwords: Array.isArray(rawData.passwords) ? rawData.passwords : [],
            cards: Array.isArray(rawData.cards) ? rawData.cards : [],
            wallets: Array.isArray(rawData.wallets) ? rawData.wallets : []
        };

        // Aggiungi ID se mancanti (usa crypto.randomUUID per modernità)
        ['passwords', 'cards', 'wallets'].forEach(section => {
            loadedData[section].forEach(item => {
                if (!item.id) item.id = crypto.randomUUID();
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

// Ordinamento dati alfabetico
function sortData() {
    if (!loadedData) return;
    loadedData.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    loadedData.cards?.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    loadedData.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

// Visualizzazione dati
function displayData(data) {
    displayPasswords(data.passwords);
    displayCards(data.cards ?? []);  // Fallback array vuoto
    displayWallets(data.wallets);
}

// Visualizzazione password
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

// Visualizzazione carte (simile, con campi specifici)
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

// Visualizzazione wallet (simile)
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

// Toggle visibilità contenuti sensibili
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

// Copia in clipboard con fallback
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

// Filtraggio dati basato su input ricerca e filtri
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

    // Filtro password
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

    // Filtro carte
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

    // Filtro wallet
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

// Popolamento filtri
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

// Mostra messaggio toast
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

// Escape HTML per prevenire XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle sezione (nascondi/mostra tutto)
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