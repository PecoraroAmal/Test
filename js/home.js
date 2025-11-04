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
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.url || '-')}" data-field="url">${escapeHtml(pwd.url || '-')}</span>
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
                    <span class="scrollable-text" data-value="${escapeHtml(pwd.notes || '-')}" data-notes="true">${escapeHtml(pwd.notes || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(pwd.notes)}', 'Notes')">
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
                <label class="field-label">Network</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(card.network || '-')}" data-field="network">${escapeHtml(card.network || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="scrollable-text" data-value="${escapeHtml(card.notes || '-')}" data-notes="true">${escapeHtml(card.notes || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(card.notes)}', 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
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
                    <span class="scrollable-text" data-value="${escapeHtml(wallet.notes || '-')}" data-notes="true">${escapeHtml(wallet.notes || '-')}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard('${escapeHtml(wallet.notes)}', 'Notes')">
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

// Handles visibility of sensitive content
async function toggleVisibility(button, type, id, field) {
    const parent = button.closest('.field-container');
    const span = parent?.querySelector('.hidden-content');
    if (!span) return;

    const isHidden = span.textContent === '••••••••••••';

    if (isHidden) {
        const sensitive = await decryptSensitive(sensitiveData[type][id], sessionKey);
        const value = sensitive[field] || '-';
        span.textContent = value;
        span.dataset.value = value;
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        span.textContent = '••••••••••••';
        delete span.dataset.value;
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