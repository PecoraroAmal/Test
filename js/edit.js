// edit.js
import * as homedit from './homedit.js';

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', homedit.handleFileUpload);
    }

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
            if (file) homedit.handleFileUpload({ target: { files: [file] } });
        });
        uploadZone.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
    }

    const decryptBtn = document.getElementById('decryptBtn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', () => homedit.openFile(true));
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
            if (e.key === 'Enter') homedit.openFile(true);
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
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => homedit.toggleSection('passwordContainer', togglePasswordBtn));
    }
    const toggleCardBtn = document.getElementById('toggleCardBtn');
    if (toggleCardBtn) {
        toggleCardBtn.addEventListener('click', () => homedit.toggleSection('cardContainer', toggleCardBtn));
    }
    const toggleWalletBtn = document.getElementById('toggleWalletBtn');
    if (toggleWalletBtn) {
        toggleWalletBtn.addEventListener('click', () => homedit.toggleSection('walletContainer', toggleWalletBtn));
    }
});

function addPassword() {
    const id = homedit.generateUniqueId();
    const nonSens = { id, platform: 'New', category: '', url: '' };
    const sens = { username: '', password: generateRandomPassword(), notes: '' };
    homedit.nonSensitiveData.passwords.push(nonSens);
    storeSensitive(id, sens, homedit.masterKey);
    homedit.sortData(homedit.nonSensitiveData);
    displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
}

function addCard() {
    const id = homedit.generateUniqueId();
    const nonSens = { id, issuer: 'New', network: '' };
    const sens = { pan: '', expiryDate: '', cvv: '', pin: '', notes: '' };
    homedit.nonSensitiveData.cards.push(nonSens);
    storeSensitive(id, sens, homedit.masterKey);
    homedit.sortData(homedit.nonSensitiveData);
    displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
}

function addWallet() {
    const id = homedit.generateUniqueId();
    const nonSens = { id, wallet: 'New', type: '' };
    const sens = { username: '', password: '', key: '', address: '', notes: '' };
    homedit.nonSensitiveData.wallets.push(nonSens);
    storeSensitive(id, sens, homedit.masterKey);
    homedit.sortData(homedit.nonSensitiveData);
    displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
}

async function editItem(id, type) {
    try {
        let nonSensArray;
        switch (type) {
            case 'password': nonSensArray = homedit.nonSensitiveData.passwords; break;
            case 'card': nonSensArray = homedit.nonSensitiveData.cards; break;
            case 'wallet': nonSensArray = homedit.nonSensitiveData.wallets; break;
        }
        const itemIndex = nonSensArray.findIndex(i => i.id === id);
        if (itemIndex === -1) return;

        const sens = await decryptItem(homedit.sensitiveData[id], homedit.masterKey);
        // Implementa modal per edit, poi aggiorna nonSensArray[itemIndex] e ri-critta sens
        // Esempio placeholder: assumi newSens aggiornato dal modal
        storeSensitive(id, newSens, homedit.masterKey);
        homedit.sortData(homedit.nonSensitiveData);
        displayData(homedit.nonSensitiveData, true);
        homedit.populateFilters(homedit.nonSensitiveData);
    } catch (err) {
        homedit.showMessage('Error editing item', 'error');
    }
}

function deleteItem(id, type) {
    let array;
    switch (type) {
        case 'password': array = homedit.nonSensitiveData.passwords; break;
        case 'card': array = homedit.nonSensitiveData.cards; break;
        case 'wallet': array = homedit.nonSensitiveData.wallets; break;
    }
    const index = array.findIndex(i => i.id === id);
    if (index > -1) array.splice(index, 1);
    delete homedit.sensitiveData[id];
    displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
    homedit.showMessage(`${type} deleted successfully!`, 'success');
}

async function downloadFile(encrypted) {
    if (!homedit.nonSensitiveData) {
        homedit.showMessage('No data to save', 'error');
        return;
    }

    const password = document.getElementById('encryptPassword')?.value || '';
    
    if (encrypted && password.length < 8) {
        homedit.showMessage('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const fullData = { passwords: [], cards: [], wallets: [] };
        for (const pwd of homedit.nonSensitiveData.passwords) {
            const sens = await decryptItem(homedit.sensitiveData[pwd.id], homedit.masterKey);
            fullData.passwords.push({ ...pwd, ...sens });
        }
        for (const card of homedit.nonSensitiveData.cards) {
            const sens = await decryptItem(homedit.sensitiveData[card.id], homedit.masterKey);
            fullData.cards.push({ ...card, ...sens });
        }
        for (const wallet of homedit.nonSensitiveData.wallets) {
            const sens = await decryptItem(homedit.sensitiveData[wallet.id], homedit.masterKey);
            fullData.wallets.push({ ...wallet, ...sens });
        }

        let content;
        if (encrypted) {
            homedit.showMessage('Encrypting...', 'info');
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
        
        homedit.showMessage('File downloaded successfully!', 'success');
    } catch (error) {
        console.error('Saving error:', error);
        homedit.showMessage('Error during saving: ' + error.message, 'error');
    }
}

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

function displayData(data, isEditMode = false) {
    displayPasswords(data.passwords || []);
    displayCards(data.cards || []);
    displayWallets(data.wallets || []);
}

function displayPasswords(items) {
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
            <h3 class="scrollable-text">${homedit.escapeHtml(item.platform)}</h3>
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
                    <span class="scrollable-text">${homedit.escapeHtml(item.url || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Category</label>
                <div class="content-wrapper">
                    <span class="scrollable-text">${homedit.escapeHtml(item.category || '-')}</span>
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
            <div class="edit-buttons">
                <button class="btn btn-edit" onclick="editItem('${item.id}', 'password')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'password')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function displayCards(items) {
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
            <h3 class="scrollable-text">${homedit.escapeHtml(item.issuer)}</h3>
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
                    <span class="scrollable-text">${homedit.escapeHtml(item.network || '-')}</span>
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
            <div class="edit-buttons">
                <button class="btn btn-edit" onclick="editItem('${item.id}', 'card')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'card')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function displayWallets(items) {
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
            <h3 class="scrollable-text">${homedit.escapeHtml(item.wallet)}</h3>
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
                    <span class="scrollable-text">${homedit.escapeHtml(item.type || '-')}</span>
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
            <div class="edit-buttons">
                <button class="btn btn-edit" onclick="editItem('${item.id}', 'wallet')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-delete" onclick="deleteItem('${item.id}', 'wallet')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterData() {
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

    const filteredPasswords = homedit.nonSensitiveData.passwords.filter(pwd => {
        const searchMatch = !passwordSearch || 
            pwd.platform.toLowerCase().includes(passwordSearch) ||
            (pwd.url && pwd.url.toLowerCase().includes(passwordSearch)) ||
            (pwd.category && pwd.category.toLowerCase().includes(passwordSearch));

        const categoryMatch = !category || 
            (pwd.category && pwd.category.toLowerCase() === category);

        return searchMatch && categoryMatch;
    }).sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));

    const filteredCards = homedit.nonSensitiveData.cards.filter(card => {
        const searchMatch = !cardSearch || 
            card.issuer.toLowerCase().includes(cardSearch) ||
            (card.network && card.network.toLowerCase().includes(cardSearch));

        const circuitMatch = !circuit || 
            (card.network && card.network.toLowerCase() === circuit);

        return searchMatch && circuitMatch;
    }).sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));

    const filteredWallets = homedit.nonSensitiveData.wallets.filter(wallet => {
        const searchMatch = !walletSearch || 
            wallet.wallet.toLowerCase().includes(walletSearch) ||
            (wallet.type && wallet.type.toLowerCase().includes(walletSearch));

        const typeMatch = !type || 
            (wallet.type && wallet.type.toLowerCase() === type);

        return searchMatch && typeMatch;
    }).sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));

    displayPasswords(filteredPasswords);
    displayCards(filteredCards);
    displayWallets(filteredWallets);
}