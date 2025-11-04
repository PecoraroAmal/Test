// edit.js - Editing view, uses shared functions from homedit.js

document.addEventListener('DOMContentLoaded', () => {
    // Event listeners (shared setup + edit-specific)
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    const decryptBtn = document.getElementById('decryptBtn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', () => openFile(true)); // true for edit mode
    }
    const passwordSearchInput = document.getElementById('passwordSearchInput');
    if (passwordSearchInput) {
        passwordSearchInput.addEventListener('input', () => filterData(true));
    }
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => filterData(true));
    }
    const cardSearchInput = document.getElementById('cardSearchInput');
    if (cardSearchInput) {
        cardSearchInput.addEventListener('input', () => filterData(true));
    }
    const circuitFilter = document.getElementById('circuitFilter');
    if (circuitFilter) {
        circuitFilter.addEventListener('change', () => filterData(true));
    }
    const walletSearchInput = document.getElementById('walletSearchInput');
    if (walletSearchInput) {
        walletSearchInput.addEventListener('input', () => filterData(true));
    }
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => filterData(true));
    }
    const decryptPassword = document.getElementById('decryptPassword');
    if (decryptPassword) {
        decryptPassword.addEventListener('keypress', e => {
            if (e.key === 'Enter') openFile(true);
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

    // Handle drag and drop and click for file upload (con debug logs per verificare)
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation(); // Aggiunto stopPropagation per prevenire bubbling che potrebbe interferire
            uploadZone.classList.add('drag-over');
            console.log('Drag over uploadZone in edit'); // Debug
        });
        uploadZone.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('drag-over');
            console.log('Drag leave uploadZone in edit'); // Debug
        });
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation(); // Aggiunto stopPropagation per assicurare che l'evento sia gestito solo qui
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                console.log('File dropped in edit:', file.name); // Debug
                handleFileUpload({ target: { files: [file] } });
            } else {
                console.warn('No file in drop event in edit'); // Debug
            }
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

// Add password (implementato completamente, crea modal, separa public/sensitive, encrypt)
async function addPassword() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Password</h2>
            <div class="form-group">
                <label>Platform</label>
                <input type="text" id="addPlatform" placeholder="Platform">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="addUsername" placeholder="Username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <div class="password-group">
                    <input type="text" id="addPassword" placeholder="Password">
                    <button class="btn btn-secondary" id="generatePwd">Generate</button>
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="addNotes" placeholder="Notes"></textarea>
            </div>
            <div class="form-group">
                <label>URL</label>
                <input type="text" id="addUrl" placeholder="URL">
            </div>
            <div class="form-group">
                <label>Category</label>
                <input type="text" id="addCategory" placeholder="Category">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-primary" id="saveAddPwd">Save</button>
                <button class="btn btn-secondary" id="cancelAddPwd">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('generatePwd').addEventListener('click', () => {
        document.getElementById('addPassword').value = generateRandomPassword();
    });

    document.getElementById('saveAddPwd').addEventListener('click', async () => {
        const id = generateUniqueId();
        const publicData = {
            id,
            platform: document.getElementById('addPlatform').value,
            url: document.getElementById('addUrl').value,
            category: document.getElementById('addCategory').value
        };
        const sensitiveData = {
            username: document.getElementById('addUsername').value,
            password: document.getElementById('addPassword').value,
            notes: document.getElementById('addNotes').value
        };
        loadedPublicData.passwords.push(publicData);
        loadedSensitiveData.set(id, await encryptSensitive(sensitiveData, sessionKey));
        sortData();
        displayData(true);
        populateFilters();
        showMessage('Password added successfully!', 'success');
        document.body.removeChild(modal);
    });

    document.getElementById('cancelAddPwd').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Add card (implementato simile a addPassword)
async function addCard() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Card</h2>
            <div class="form-group">
                <label>Issuer</label>
                <input type="text" id="addIssuer" placeholder="Issuer">
            </div>
            <div class="form-group">
                <label>PAN</label>
                <input type="text" id="addPan" placeholder="PAN">
            </div>
            <div class="form-group">
                <label>Expiry Date</label>
                <input type="text" id="addExpiry" placeholder="MM/YY">
            </div>
            <div class="form-group">
                <label>CVV</label>
                <input type="text" id="addCvv" placeholder="CVV">
            </div>
            <div class="form-group">
                <label>PIN</label>
                <input type="text" id="addPin" placeholder="PIN">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="addNotes" placeholder="Notes"></textarea>
            </div>
            <div class="form-group">
                <label>Network</label>
                <input type="text" id="addNetwork" placeholder="Network (e.g., Visa)">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-primary" id="saveAddCard">Save</button>
                <button class="btn btn-secondary" id="cancelAddCard">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('saveAddCard').addEventListener('click', async () => {
        const id = generateUniqueId();
        const publicData = {
            id,
            issuer: document.getElementById('addIssuer').value,
            network: document.getElementById('addNetwork').value
        };
        const sensitiveData = {
            pan: document.getElementById('addPan').value,
            expiryDate: document.getElementById('addExpiry').value,
            cvv: document.getElementById('addCvv').value,
            pin: document.getElementById('addPin').value,
            notes: document.getElementById('addNotes').value
        };
        loadedPublicData.cards.push(publicData);
        loadedSensitiveData.set(id, await encryptSensitive(sensitiveData, sessionKey));
        sortData();
        displayData(true);
        populateFilters();
        showMessage('Card added successfully!', 'success');
        document.body.removeChild(modal);
    });

    document.getElementById('cancelAddCard').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Add wallet (implementato simile)
async function addWallet() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add Wallet</h2>
            <div class="form-group">
                <label>Wallet Name</label>
                <input type="text" id="addWalletName" placeholder="Wallet Name">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="addUsername" placeholder="Username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="text" id="addPassword" placeholder="Password">
            </div>
            <div class="form-group">
                <label>Key</label>
                <textarea id="addKey" placeholder="Key"></textarea>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" id="addAddress" placeholder="Address">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="addNotes" placeholder="Notes"></textarea>
            </div>
            <div class="form-group">
                <label>Type</label>
                <input type="text" id="addType" placeholder="Type (e.g., Crypto)">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-primary" id="saveAddWallet">Save</button>
                <button class="btn btn-secondary" id="cancelAddWallet">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('saveAddWallet').addEventListener('click', async () => {
        const id = generateUniqueId();
        const publicData = {
            id,
            wallet: document.getElementById('addWalletName').value,
            type: document.getElementById('addType').value
        };
        const sensitiveData = {
            username: document.getElementById('addUsername').value,
            password: document.getElementById('addPassword').value,
            key: document.getElementById('addKey').value,
            address: document.getElementById('addAddress').value,
            notes: document.getElementById('addNotes').value
        };
        loadedPublicData.wallets.push(publicData);
        loadedSensitiveData.set(id, await encryptSensitive(sensitiveData, sessionKey));
        sortData();
        displayData(true);
        populateFilters();
        showMessage('Wallet added successfully!', 'success');
        document.body.removeChild(modal);
    });

    document.getElementById('cancelAddWallet').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Edit item (implementato, decrypt, modal prefilled, update public/re-encrypt sensitive)
async function editItem(id, type) {
    let publicData, sensitiveData;
    switch (type) {
        case 'password':
            publicData = loadedPublicData.passwords.find(p => p.id === id);
            sensitiveData = await decryptSensitive(loadedSensitiveData.get(id), sessionKey);
            break;
        case 'card':
            publicData = loadedPublicData.cards.find(c => c.id === id);
            sensitiveData = await decryptSensitive(loadedSensitiveData.get(id), sessionKey);
            break;
        case 'wallet':
            publicData = loadedPublicData.wallets.find(w => w.id === id);
            sensitiveData = await decryptSensitive(loadedSensitiveData.get(id), sessionKey);
            break;
        default:
            return;
    }

    if (!publicData || !sensitiveData) {
        showMessage('Item not found', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    let innerHTML = '<div class="modal-content"><h2>Edit Item</h2>';

    if (type === 'password') {
        innerHTML += `
            <div class="form-group">
                <label>Platform</label>
                <input type="text" id="editPlatform" value="${escapeHtml(publicData.platform)}">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="editUsername" value="${escapeHtml(sensitiveData.username)}">
            </div>
            <div class="form-group">
                <label>Password</label>
                <div class="password-group">
                    <input type="text" id="editPassword" value="${escapeHtml(sensitiveData.password)}">
                    <button class="btn btn-secondary" id="generatePwd">Generate</button>
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="editNotes">${escapeHtml(sensitiveData.notes)}</textarea>
            </div>
            <div class="form-group">
                <label>URL</label>
                <input type="text" id="editUrl" value="${escapeHtml(publicData.url)}">
            </div>
            <div class="form-group">
                <label>Category</label>
                <input type="text" id="editCategory" value="${escapeHtml(publicData.category)}">
            </div>
        `;
    } else if (type === 'card') {
        innerHTML += `
            <div class="form-group">
                <label>Issuer</label>
                <input type="text" id="editIssuer" value="${escapeHtml(publicData.issuer)}">
            </div>
            <div class="form-group">
                <label>PAN</label>
                <input type="text" id="editPan" value="${escapeHtml(sensitiveData.pan)}">
            </div>
            <div class="form-group">
                <label>Expiry Date</label>
                <input type="text" id="editExpiry" value="${escapeHtml(sensitiveData.expiryDate)}">
            </div>
            <div class="form-group">
                <label>CVV</label>
                <input type="text" id="editCvv" value="${escapeHtml(sensitiveData.cvv)}">
            </div>
            <div class="form-group">
                <label>PIN</label>
                <input type="text" id="editPin" value="${escapeHtml(sensitiveData.pin)}">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="editNotes">${escapeHtml(sensitiveData.notes)}</textarea>
            </div>
            <div class="form-group">
                <label>Network</label>
                <input type="text" id="editNetwork" value="${escapeHtml(publicData.network)}">
            </div>
        `;
    } else if (type === 'wallet') {
        innerHTML += `
            <div class="form-group">
                <label>Wallet Name</label>
                <input type="text" id="editWalletName" value="${escapeHtml(publicData.wallet)}">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="editUsername" value="${escapeHtml(sensitiveData.username)}">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="text" id="editPassword" value="${escapeHtml(sensitiveData.password)}">
            </div>
            <div class="form-group">
                <label>Key</label>
                <textarea id="editKey">${escapeHtml(sensitiveData.key)}</textarea>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" id="editAddress" value="${escapeHtml(sensitiveData.address)}">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="editNotes">${escapeHtml(sensitiveData.notes)}</textarea>
            </div>
            <div class="form-group">
                <label>Type</label>
                <input type="text" id="editType" value="${escapeHtml(publicData.type)}">
            </div>
        `;
    }

    innerHTML += `
            <div class="modal-buttons">
                <button class="btn btn-primary" id="saveEdit">Save</button>
                <button class="btn btn-secondary" id="cancelEdit">Cancel</button>
            </div>
        </div>
    `;
    modal.innerHTML = innerHTML;
    document.body.appendChild(modal);

    if (type === 'password') {
        document.getElementById('generatePwd').addEventListener('click', () => {
            document.getElementById('editPassword').value = generateRandomPassword();
        });
    }

    document.getElementById('saveEdit').addEventListener('click', async () => {
        let updatedPublic = {};
        let updatedSensitive = {};
        if (type === 'password') {
            updatedPublic = {
                platform: document.getElementById('editPlatform').value,
                url: document.getElementById('editUrl').value,
                category: document.getElementById('editCategory').value
            };
            updatedSensitive = {
                username: document.getElementById('editUsername').value,
                password: document.getElementById('editPassword').value,
                notes: document.getElementById('editNotes').value
            };
            Object.assign(publicData, updatedPublic);
        } else if (type === 'card') {
            updatedPublic = {
                issuer: document.getElementById('editIssuer').value,
                network: document.getElementById('editNetwork').value
            };
            updatedSensitive = {
                pan: document.getElementById('editPan').value,
                expiryDate: document.getElementById('editExpiry').value,
                cvv: document.getElementById('editCvv').value,
                pin: document.getElementById('editPin').value,
                notes: document.getElementById('editNotes').value
            };
            Object.assign(publicData, updatedPublic);
        } else if (type === 'wallet') {
            updatedPublic = {
                wallet: document.getElementById('editWalletName').value,
                type: document.getElementById('editType').value
            };
            updatedSensitive = {
                username: document.getElementById('editUsername').value,
                password: document.getElementById('editPassword').value,
                key: document.getElementById('editKey').value,
                address: document.getElementById('editAddress').value,
                notes: document.getElementById('editNotes').value
            };
            Object.assign(publicData, updatedPublic);
        }
        loadedSensitiveData.set(id, await encryptSensitive(updatedSensitive, sessionKey));
        sortData();
        displayData(true);
        populateFilters();
        showMessage('Item updated successfully!', 'success');
        document.body.removeChild(modal);
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Delete item (implementato, modal conferma, rimuovi da public/sensitive)
function deleteItem(id, type) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this item?</p>
            <div class="modal-buttons">
                <button class="btn btn-danger" id="confirmDelete">Delete</button>
                <button class="btn btn-secondary" id="cancelDelete">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (type === 'password') {
            loadedPublicData.passwords = loadedPublicData.passwords.filter(p => p.id !== id);
        } else if (type === 'card') {
            loadedPublicData.cards = loadedPublicData.cards.filter(c => c.id !== id);
        } else if (type === 'wallet') {
            loadedPublicData.wallets = loadedPublicData.wallets.filter(w => w.id !== id);
        }
        loadedSensitiveData.delete(id);
        displayData(true);
        populateFilters();
        showMessage('Item deleted successfully!', 'success');
        document.body.removeChild(modal);
    });

    document.getElementById('cancelDelete').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Download file (edit-specific, reconstruct full data by decrypting)
async function downloadFile(encrypted) {
    if (!loadedPublicData) {
        showMessage('No data to save', 'error');
        return;
    }

    const password = document.getElementById('encryptPassword')?.value || '';
    
    if (encrypted && password.length < 8) {
        showMessage('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        // Reconstruct full data
        const fullData = {
            passwords: [],
            cards: [],
            wallets: []
        };
        
        await Promise.all(loadedPublicData.passwords.map(async (pwd) => {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(pwd.id), sessionKey);
            fullData.passwords.push({ ...pwd, ...sensitive });
        }));
        await Promise.all(loadedPublicData.cards.map(async (card) => {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(card.id), sessionKey);
            fullData.cards.push({ ...card, ...sensitive });
        }));
        await Promise.all(loadedPublicData.wallets.map(async (wallet) => {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(wallet.id), sessionKey);
            fullData.wallets.push({ ...wallet, ...sensitive });
        }));
        
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

// Generate random password (edit-specific)
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