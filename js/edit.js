// Initialization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
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
    // Handle section toggling
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

    // Handle drag and drop and click for file upload
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
});

// Displays all data in their respective sections
function displayData() {
    displayPasswords(loadedData.passwords);
    displayCards(loadedData.cards);
    displayWallets(loadedData.wallets);
}

// Displays passwords in the dedicated section
function displayPasswords(passwords) {
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
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.username)}" data-field="username">${escapeHtml(pwd.username || '-')}</span>
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
                    <span class="hidden-content scrollable-text" data-field="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'passwords', '${pwd.id}', 'password')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'passwords', '${pwd.id}', 'password', 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">URL</label>
                <div class="content-wrapper">
                    <a href="${escapeHtml(pwd.url || '#')}" class="scrollable-text" target="_blank" rel="noopener noreferrer">${escapeHtml(pwd.url || '-')}</a>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(pwd.url)}', 'URL')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes" data-notes="true">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'passwords', '${pwd.id}', 'notes')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'passwords', '${pwd.id}', 'notes', 'Notes')">
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
            <div class="action-buttons">
                <button class="btn btn-primary btn-edit" onclick="editItem('passwords', '${pwd.id}', this.closest('.preview-card-item'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-delete" onclick="confirmDelete('passwords', '${pwd.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Displays cards in the dedicated section
function displayCards(cards) {
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
        const cardElem = document.createElement('div');
        cardElem.className = 'preview-card-item';
        cardElem.dataset.id = card.id;
        cardElem.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(card.issuer)}</h3>
            <div class="field-container">
                <label class="field-label">PAN</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="pan">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'cards', '${card.id}', 'pan')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'cards', '${card.id}', 'pan', 'PAN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Expiry Date</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="expiryDate">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'cards', '${card.id}', 'expiryDate')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'cards', '${card.id}', 'expiryDate', 'Expiry Date')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'cards', '${card.id}', 'cvv')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'cards', '${card.id}', 'cvv', 'CVV')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'cards', '${card.id}', 'pin')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'cards', '${card.id}', 'pin', 'PIN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes" data-notes="true">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'cards', '${card.id}', 'notes')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'cards', '${card.id}', 'notes', 'Notes')">
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
            <div class="action-buttons">
                <button class="btn btn-primary btn-edit" onclick="editItem('cards', '${card.id}', this.closest('.preview-card-item'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-delete" onclick="confirmDelete('cards', '${card.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(cardElem);
    });
}

// Displays wallets in the dedicated section
function displayWallets(wallets) {
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
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.dataset.id = wallet.id;
        card.innerHTML = `
            <h3 class="scrollable-text">${escapeHtml(wallet.wallet)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(wallet.username || '-')}" data-field="username">${escapeHtml(wallet.username || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(wallet.username)}', 'Username')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'wallets', '${wallet.id}', 'password')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'wallets', '${wallet.id}', 'password', 'Password')">
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
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'wallets', '${wallet.id}', 'key')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'wallets', '${wallet.id}', 'key', 'Key')">
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
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(wallet.address)}', 'Address')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="hidden-content scrollable-text" data-field="notes" data-notes="true">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this, 'wallets', '${wallet.id}', 'notes')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copySensitive(this, 'wallets', '${wallet.id}', 'notes', 'Notes')">
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
            <div class="action-buttons">
                <button class="btn btn-primary btn-edit" onclick="editItem('wallets', '${wallet.id}', this.closest('.preview-card-item'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-delete" onclick="confirmDelete('wallets', '${wallet.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Handles visibility of sensitive content
async function toggleVisibility(button, type, id, field) {
    const parent = button.closest('.field-container');
    const span = parent?.querySelector('.hidden-content');
    if (!span) return;

    const isHidden = span.textContent === '••••••••••••' || span.textContent === '-';

    if (isHidden) {
        const sensitive = await decryptSensitive(sensitiveData[type][id], sessionKey);
        const value = sensitive[field] || '-';
        span.textContent = value;
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        span.textContent = '••••••••••••';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Copies sensitive text to clipboard
async function copySensitive(button, type, id, field, label) {
    const sensitive = await decryptSensitive(sensitiveData[type][id], sessionKey);
    const text = sensitive[field] || '-';
    if (text === '-') return;
    navigator.clipboard.writeText(text)
        .then(() => showMessage(`${label} copied to clipboard!`, 'success'))
        .catch(() => showMessage('Error during copying', 'error'));
}

// Copies non-sensitive text to clipboard
function copyToClipboard(text, label) {
    if (text === '-' || !text) return;
    navigator.clipboard.writeText(text)
        .then(() => showMessage(`${label} copied to clipboard!`, 'success'))
        .catch(() => showMessage('Error during copying', 'error'));
}

// Add new password
async function addPassword() {
    const modal = createModal('Add Password');
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Password</h2>
            <form id="addPasswordForm">
                <div class="form-group">
                    <label for="platform">Platform</label>
                    <input type="text" id="platform" required>
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="text" id="password" required>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('password').value = generateRandomPassword();">Generate</button>
                </div>
                <div class="form-group">
                    <label for="url">URL</label>
                    <input type="url" id="url">
                </div>
                <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea id="notes"></textarea>
                </div>
                <div class="form-group">
                    <label for="category">Category</label>
                    <input type="text" id="category">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="btn btn-primary">Add</button>
                    <button type="button" class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = document.getElementById('addPasswordForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = generateUniqueId();
        const newPwd = {
            id,
            platform: document.getElementById('platform').value,
            username: document.getElementById('username').value,
            url: document.getElementById('url').value,
            category: document.getElementById('category').value
        };
        const sensitive = { 
            password: document.getElementById('password').value,
            notes: document.getElementById('notes').value
        };
        loadedData.passwords.push(newPwd);
        sensitiveData.passwords[id] = await encryptSensitive(sensitive, sessionKey);
        sortData();
        displayData();
        populateFilters();
        showMessage('Password added successfully!', 'success');
        document.body.removeChild(modal);
    });
}

// Add new card
async function addCard() {
    const modal = createModal('Add Card');
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Card</h2>
            <form id="addCardForm">
                <div class="form-group">
                    <label for="issuer">Issuer</label>
                    <input type="text" id="issuer" required>
                </div>
                <div class="form-group">
                    <label for="pan">PAN</label>
                    <input type="text" id="pan" required>
                </div>
                <div class="form-group">
                    <label for="expiryDate">Expiry Date</label>
                    <input type="text" id="expiryDate" required>
                </div>
                <div class="form-group">
                    <label for="cvv">CVV</label>
                    <input type="text" id="cvv" required>
                </div>
                <div class="form-group">
                    <label for="pin">PIN</label>
                    <input type="text" id="pin">
                </div>
                <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea id="notes"></textarea>
                </div>
                <div class="form-group">
                    <label for="network">Network</label>
                    <input type="text" id="network">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="btn btn-primary">Add</button>
                    <button type="button" class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = document.getElementById('addCardForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = generateUniqueId();
        const newCard = {
            id,
            issuer: document.getElementById('issuer').value,
            network: document.getElementById('network').value
        };
        const sensitive = {
            pan: document.getElementById('pan').value,
            expiryDate: document.getElementById('expiryDate').value,
            cvv: document.getElementById('cvv').value,
            pin: document.getElementById('pin').value,
            notes: document.getElementById('notes').value
        };
        loadedData.cards.push(newCard);
        sensitiveData.cards[id] = await encryptSensitive(sensitive, sessionKey);
        sortData();
        displayData();
        populateFilters();
        showMessage('Card added successfully!', 'success');
        document.body.removeChild(modal);
    });
}

// Add new wallet
async function addWallet() {
    const modal = createModal('Add Wallet');
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Wallet</h2>
            <form id="addWalletForm">
                <div class="form-group">
                    <label for="wallet">Wallet</label>
                    <input type="text" id="wallet" required>
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="text" id="password">
                </div>
                <div class="form-group">
                    <label for="key">Key</label>
                    <input type="text" id="key">
                </div>
                <div class="form-group">
                    <label for="address">Address</label>
                    <input type="text" id="address">
                </div>
                <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea id="notes"></textarea>
                </div>
                <div class="form-group">
                    <label for="type">Type</label>
                    <input type="text" id="type">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="btn btn-primary">Add</button>
                    <button type="button" class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = document.getElementById('addWalletForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = generateUniqueId();
        const newWallet = {
            id,
            wallet: document.getElementById('wallet').value,
            username: document.getElementById('username').value,
            address: document.getElementById('address').value,
            type: document.getElementById('type').value
        };
        const sensitive = {
            password: document.getElementById('password').value,
            key: document.getElementById('key').value,
            notes: document.getElementById('notes').value
        };
        loadedData.wallets.push(newWallet);
        sensitiveData.wallets[id] = await encryptSensitive(sensitive, sessionKey);
        sortData();
        displayData();
        populateFilters();
        showMessage('Wallet added successfully!', 'success');
        document.body.removeChild(modal);
    });
}

// Edit item in-line
async function editItem(type, id, cardElem) {
    const fields = cardElem.querySelectorAll('.field-container');
    const actionButtons = cardElem.querySelector('.action-buttons');
    actionButtons.innerHTML = `
        <button class="btn btn-primary btn-save" onclick="saveItem('${type}', '${id}', this.closest('.preview-card-item'))">
            <i class="fas fa-save"></i> Save
        </button>
        <button class="btn btn-secondary btn-cancel" onclick="cancelEdit('${type}', '${id}', this.closest('.preview-card-item'))">
            <i class="fas fa-undo"></i> Cancel
        </button>
    `;

    for (const field of fields) {
        const label = field.querySelector('.field-label').textContent.toLowerCase().replace(/\s/g, '');
        const contentWrapper = field.querySelector('.content-wrapper');
        const buttonGroup = field.querySelector('.button-group');
        buttonGroup.style.display = 'none';

        let value;
        if (contentWrapper.querySelector('span.hidden-content')) {
            const sensitive = await decryptSensitive(sensitiveData[type][id], sessionKey);
            value = sensitive[label] || '';
            contentWrapper.innerHTML = `<input type="text" class="edit-input" value="${escapeHtml(value)}" data-field="${label}">`;
        } else if (contentWrapper.querySelector('a')) {
            value = contentWrapper.querySelector('a').href;
            contentWrapper.innerHTML = `<input type="url" class="edit-input" value="${escapeHtml(value)}" data-field="${label}">`;
        } else {
            value = contentWrapper.querySelector('span').textContent;
            if (label === 'notes') {
                contentWrapper.innerHTML = `<textarea class="edit-input" data-field="${label}">${escapeHtml(value)}</textarea>`;
            } else {
                contentWrapper.innerHTML = `<input type="text" class="edit-input" value="${escapeHtml(value)}" data-field="${label}">`;
            }
        }
    }

    // For platform/issuer/wallet (h3)
    const header = cardElem.querySelector('h3');
    const headerLabel = type === 'passwords' ? 'platform' : type === 'cards' ? 'issuer' : 'wallet';
    const headerValue = header.textContent;
    header.innerHTML = `<input type="text" class="edit-input" value="${escapeHtml(headerValue)}" data-field="${headerLabel}">`;
}

// Save edited item
async function saveItem(type, id, cardElem) {
    const inputs = cardElem.querySelectorAll('.edit-input');
    let nonSensitive = loadedData[type].find(item => item.id === id);
    let sensitiveObj = await decryptSensitive(sensitiveData[type][id], sessionKey);

    for (const input of inputs) {
        const field = input.dataset.field;
        const value = input.value;
        if (['password', 'notes', 'pan', 'expirydate', 'cvv', 'pin', 'key'].includes(field.toLowerCase())) {
            sensitiveObj[field] = value;
        } else {
            nonSensitive[field] = value;
        }
    }

    sensitiveData[type][id] = await encryptSensitive(sensitiveObj, sessionKey);
    sortData();
    displayData();
    populateFilters();
    showMessage('Item updated successfully!', 'success');
}

// Cancel edit
function cancelEdit(type, id, cardElem) {
    displayData(); // Re-render to cancel
}

// Confirm delete
function confirmDelete(type, id) {
    const modal = createModal('Confirm Delete');
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this item?</p>
            <div class="modal-buttons">
                <button class="btn btn-danger" onclick="deleteItem('${type}', '${id}', this.closest('.modal'))">Delete</button>
                <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Delete item
function deleteItem(type, id, modal) {
    loadedData[type] = loadedData[type].filter(item => item.id !== id);
    delete sensitiveData[type][id];
    displayData();
    populateFilters();
    showMessage('Item deleted successfully!', 'success');
    document.body.removeChild(modal);
}

// Create modal
function createModal(title) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    return modal;
}

// Generate a random password
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

// Download file
async function downloadFile(encrypted) {
    if (!loadedData.passwords.length && !loadedData.cards.length && !loadedData.wallets.length) {
        showMessage('No data to save', 'error');
        return;
    }

    const password = document.getElementById('encryptPassword')?.value || '';
    
    if (encrypted && password.length < 8) {
        showMessage('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const fullData = await recombineData();
        let content;
        if (encrypted) {
            showMessage('Encrypting...', 'info');
            content = await encryptData(fullData, password);
        } else {
            content = JSON.stringify(fullData, null, 2);
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