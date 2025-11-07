// Global variables
let loadedData = { "passwords": [], "cards": [], "wallets": [] };
let uploadedFile = null;
let uploadedFileName = null;

// Function to generate a unique ID
function generateUniqueId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
    });
}

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

// Handle file upload
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

    // Leggi come testo
    reader.readAsText(file);
}

// Open file
async function openFile() {
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
            data = password ? 
                await decryptData(uploadedFile, password) : 
                JSON.parse(uploadedFile);
        } catch (e) {
            throw new Error('Error parsing or decrypting JSON: ' + e.message);
        }
        
        if (!validateJSONStructure(data)) throw new Error('Invalid JSON structure');
        
        // Initialize missing sections with empty arrays
        loadedData = {
            passwords: Array.isArray(data.passwords) ? data.passwords : [],
            cards: Array.isArray(data.cards) ? data.cards : [],
            wallets: Array.isArray(data.wallets) ? data.wallets : []
        };
        
        // Add unique IDs if not present
        loadedData.passwords.forEach(pwd => {
            if (!pwd.id) pwd.id = generateUniqueId();
        });
        loadedData.cards.forEach(card => {
            if (!card.id) card.id = generateUniqueId();
        });
        loadedData.wallets.forEach(wallet => {
            if (!wallet.id) wallet.id = generateUniqueId();
        });
        
        sortData();
        displayData(loadedData);
        populateFilters(loadedData);
        
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

// Validate JSON structure
function validateJSONStructure(data) {
    // Check that data is an object and each section, if present, is an array
    return data && typeof data === 'object' &&
           (data.passwords === undefined || Array.isArray(data.passwords)) &&
           (data.cards === undefined || Array.isArray(data.cards)) &&
           (data.wallets === undefined || Array.isArray(data.wallets));
}

// Sort data
function sortData() {
    if (!loadedData) return;
    loadedData.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    loadedData.cards?.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    loadedData.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

// Function to handle section toggling
function toggleSection(containerId, button) {
    const container = document.getElementById(containerId);
    if (container) {
        const isHidden = container.classList.contains('hidden');
        container.classList.toggle('hidden');
        button.innerHTML = isHidden ? 
            `<i class="fas fa-eye-slash"></i> Hide ${containerId.replace('Container', '')}` :
            `<i class="fas fa-eye"></i> Show ${containerId.replace('Container', '')}`;
    }
}

// Display all data
function displayData(data) {
    displayPasswords(data.passwords);
    displayCards(data.cards || []);
    displayWallets(data.wallets);
}

// Display passwords
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
    
    passwords.forEach((pwd, index) => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.innerHTML = `
            <h3 class="editable-field scrollable-text" data-value="${escapeHtml(pwd.platform)}" data-field="platform" data-id="${pwd.id}" data-type="password">${escapeHtml(pwd.platform)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(pwd.username)}" data-field="username" data-id="${pwd.id}" data-type="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(pwd.password)}" data-field="password" data-id="${pwd.id}" data-type="password">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(pwd.notes || '-')}" data-field="notes" data-id="${pwd.id}" data-type="password" data-notes="true">${pwd.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">URL</label>
                <div class="content-wrapper">
                    <span href="${escapeHtml(pwd.url || '#')}" class="editable-field url-field scrollable-text" data-value="${escapeHtml(pwd.url || '-')}" data-field="url" data-id="${pwd.id}" data-type="password" target="_blank" rel="noopener noreferrer">${escapeHtml(pwd.url || '-')}</span>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Category</label>
                <div class="content-wrapper">
                    <span class="editable-field scrollable-text" data-value="${escapeHtml(pwd.category || '-')}" data-field="category" data-id="${pwd.id}" data-type="password">${escapeHtml(pwd.category || '-')}</span>
                </div>
            </div>
            <div class="btn-container">
                <button class="btn btn-danger" onclick="showDeleteModal('${pwd.id}', 'password')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    addEditableEventListeners();
}

// Display cards
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
    
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'preview-card-item';
        cardElement.innerHTML = `
            <h3 class="editable-field scrollable-text" data-value="${escapeHtml(card.issuer)}" data-field="issuer" data-id="${card.id}" data-type="card">${escapeHtml(card.issuer)}</h3>    
            <div class="field-container">
                <label class="field-label">PAN</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(card.pan)}" data-field="pan" data-id="${card.id}" data-type="card">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'PAN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Expiry Date</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(card.expiryDate)}" data-field="expiryDate" data-id="${card.id}" data-type="card">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Expiry Date')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">CVV/CVC2</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(card.cvv)}" data-field="cvv" data-id="${card.id}" data-type="card">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'CVV/CVC2')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">PIN</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(card.pin)}" data-field="pin" data-id="${card.id}" data-type="card">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'PIN')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(card.notes || '-')}" data-field="notes" data-id="${card.id}" data-type="card" data-notes="true">${card.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Network</label>
                <div class="content-wrapper">
                    <span class="editable-field scrollable-text" data-value="${escapeHtml(card.network || '-')}" data-field="network" data-id="${card.id}" data-type="card">${escapeHtml(card.network || '-')}</span>
                </div>
            </div>
            <div class="btn-container">
                <button class="btn btn-danger" onclick="showDeleteModal('${card.id}', 'card')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(cardElement);
    });

    addEditableEventListeners();
}

// Display wallets
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
    
    wallets.forEach((wallet, index) => {
        const card = document.createElement('div');
        card.className = 'preview-card-item';
        card.innerHTML = `
            <h3 class="editable-field scrollable-text" data-value="${escapeHtml(wallet.wallet)}" data-field="wallet" data-id="${wallet.id}" data-type="wallet">${escapeHtml(wallet.wallet)}</h3>
            <div class="field-container">
                <label class="field-label">Username</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(wallet.username)}" data-field="username" data-id="${wallet.id}" data-type="wallet">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Username')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Password</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(wallet.password)}" data-field="password" data-id="${wallet.id}" data-type="wallet">••••••••••••</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Password')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Key</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(wallet.key || '-')}" data-field="key" data-id="${wallet.id}" data-type="wallet" data-key="true">${wallet.key ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Key')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Address</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(wallet.address || '-')}" data-field="address" data-id="${wallet.id}" data-type="wallet" data-address="true">${wallet.address ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Address')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Notes</label>
                <div class="content-wrapper">
                    <span class="editable-field hidden-content scrollable-text" data-value="${escapeHtml(wallet.notes || '-')}" data-field="notes" data-id="${wallet.id}" data-type="wallet" data-notes="true">${wallet.notes ? '••••••••••••' : '-'}</span>
                </div>
                <div class="button-group">
                    <button class="btn btn-icon toggle-password" onclick="toggleVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon copy-btn" onclick="copyToClipboard(this.closest('.field-container').querySelector('.editable-field').dataset.value, 'Notes')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="field-container">
                <label class="field-label">Type</label>
                <div class="content-wrapper">
                    <span class="editable-field scrollable-text" data-value="${escapeHtml(wallet.type || '-')}" data-field="type" data-id="${wallet.id}" data-type="wallet">${escapeHtml(wallet.type || '-')}</span>
                </div>
            </div>
            <div class="btn-container">
                <button class="btn btn-danger" onclick="showDeleteModal('${wallet.id}', 'wallet')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    addEditableEventListeners();
}

// Add event listeners to all editable fields
function addEditableEventListeners() {
    document.querySelectorAll('.editable-field').forEach(field => {
        field.removeEventListener('click', handleFieldEdit);
        field.addEventListener('click', handleFieldEdit);
    });
}

// Handle field editing with confirmation
function handleFieldEdit(event) {
    const element = event.target;
    if (element.tagName !== 'SPAN' && element.tagName !== 'A' && element.tagName !== 'H3') return;

    const value = element.dataset.value;
    const field = element.dataset.field;
    const id = element.dataset.id;
    const type = element.dataset.type;

    // Create container for input and buttons
    const container = document.createElement('div');
    container.className = 'edit-field-container';

    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value === '-' ? '' : value;
    input.className = 'input-field';
    container.appendChild(input);

    // Create Confirm and Cancel buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group edit-buttons';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary btn-icon';
    confirmBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
    confirmBtn.title = 'Confirm edit';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-icon';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.title = 'Cancel';
    buttonGroup.appendChild(confirmBtn);
    buttonGroup.appendChild(cancelBtn);
    container.appendChild(buttonGroup);

    // Handle confirmation with modal
    confirmBtn.addEventListener('click', () => {
        const newValue = input.value.trim();
        
        // Show confirmation modal
        showEditConfirmationModal(value, newValue, () => {
            applyEdit(element, container, newValue, field, id, type);
        }, () => {
            cancelEdit(element, container, value, field, id, type);
        });
    });

    // Handle cancellation
    cancelBtn.addEventListener('click', () => {
        cancelEdit(element, container, value, field, id, type);
    });

    // Handle keyboard input
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });

    // Replace the element with the container
    element.replaceWith(container);
    input.focus();
    input.select();
}

// Show edit confirmation modal
function showEditConfirmationModal(oldValue, newValue, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Confirm Edit';
    modalContent.appendChild(title);
    
    const message = document.createElement('p');
    message.innerHTML = `Do you want to save this change?<br><br><strong>From:</strong> ${escapeHtml(oldValue || '-')}<br><strong>To:</strong> ${escapeHtml(newValue || '-')}`;
    modalContent.appendChild(message);
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    
    const confirmBtnModal = document.createElement('button');
    confirmBtnModal.className = 'btn btn-primary';
    confirmBtnModal.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
    
    const cancelBtnModal = document.createElement('button');
    cancelBtnModal.className = 'btn btn-secondary';
    cancelBtnModal.innerHTML = '<i class="fas fa-times"></i> Cancel';
    
    btnContainer.appendChild(confirmBtnModal);
    btnContainer.appendChild(cancelBtnModal);
    modalContent.appendChild(btnContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    confirmBtnModal.addEventListener('click', () => {
        document.body.removeChild(modal);
        onConfirm();
    });
    
    cancelBtnModal.addEventListener('click', () => {
        document.body.removeChild(modal);
        onCancel();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            onCancel();
        }
    });
}

// Apply the edit to the field
function applyEdit(originalElement, container, newValue, field, id, type) {
    const isSensitive = field === 'username' || field === 'password' || field === 'notes' || 
                       field === 'pan' || field === 'expiryDate' || 
                       field === 'cvv' || field === 'pin' || field === 'username' || 
                       field === 'key' || field === 'address';
    
    if (field === 'url') {
        const newElement = document.createElement('a');
        newElement.href = newValue || '#';
        newElement.className = 'editable-field url-field scrollable-text';
        newElement.dataset.value = newValue || '-';
        newElement.dataset.field = field;
        newElement.dataset.id = id;
        newElement.dataset.type = type;
        newElement.textContent = newValue || '-';
        newElement.target = '_blank';
        newElement.rel = 'noopener noreferrer';
        container.replaceWith(newElement);
    } else {
        const tagName = originalElement.tagName === 'H3' ? 'h3' : 'span';
        const newElement = document.createElement(tagName);
        newElement.textContent = isSensitive && newValue ? '••••••••••••' : (newValue || '-');
        newElement.dataset.value = newValue || '-';
        newElement.dataset.field = field;
        newElement.dataset.id = id;
        newElement.dataset.type = type;
        newElement.className = `editable-field scrollable-text${isSensitive ? ' hidden-content' : ''}${field === 'url' ? ' url-field' : ''}`;
        if (isSensitive && (field === 'notes' || field === 'key' || field === 'address')) {
            newElement.dataset[field] = 'true';
        }
        container.replaceWith(newElement);
    }

    // Update the data
    if (type === 'password') {
        editPassword(id, field, newValue);
    } else if (type === 'card') {
        editCard(id, field, newValue);
    } else if (type === 'wallet') {
        editWallet(id, field, newValue);
    }

    addEditableEventListeners();
    showMessage('Edit saved successfully!', 'success');
}

// Cancel the edit
function cancelEdit(originalElement, container, value, field, id, type) {
    if (field === 'url') {
        const newElement = document.createElement('a');
        newElement.href = value || '#';
        newElement.className = 'editable-field url-field scrollable-text';
        newElement.dataset.value = value || '-';
        newElement.dataset.field = field;
        newElement.dataset.id = id;
        newElement.dataset.type = type;
        newElement.textContent = value || '-';
        newElement.target = '_blank';
        newElement.rel = 'noopener noreferrer';
        container.replaceWith(newElement);
    } else {
        const tagName = originalElement.tagName === 'H3' ? 'h3' : 'span';
        const newElement = document.createElement(tagName);
        const isSensitive = field === 'username' || field === 'password' || field === 'notes' || 
                            field === 'pan' || field === 'expiryDate' || 
                            field === 'cvv' || field === 'pin' || field === 'username' || 
                            field === 'key' || field === 'address';
        newElement.textContent = isSensitive && value !== '-' ? '••••••••••••' : (value || '-');
        newElement.dataset.value = value || '-';
        newElement.dataset.field = field;
        newElement.dataset.id = id;
        newElement.dataset.type = type;
        newElement.className = `editable-field scrollable-text${isSensitive ? ' hidden-content' : ''}${field === 'url' ? ' url-field' : ''}`;
        if (isSensitive && (field === 'notes' || field === 'key' || field === 'address')) {
            newElement.dataset[field] = 'true';
        }
        container.replaceWith(newElement);
    }

    addEditableEventListeners();
}

// Handle hidden content
function toggleVisibility(button) {
    const parent = button.closest('.field-container');
    const span = parent?.querySelector('.hidden-content');
    if (!span) return;

    const value = span.dataset.value;
    const isHidden = span.textContent === '••••••••••••' || span.textContent === '-';
    
    if (isHidden && value !== '-') {
        span.textContent = value;
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        span.textContent = value && value !== '-' ? '••••••••••••' : '-';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Copy to clipboard
function copyToClipboard(text, type) {
    if (text === '-') return;
    navigator.clipboard.writeText(text)
        .then(() => showMessage(`${type} copied to clipboard!`, 'success'))
        .catch(() => showMessage('Error during copying', 'error'));
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

// Add password
function addPassword() {
    const newPassword = {
        platform: '-',
        username: '',
        password: generateRandomPassword(),
        notes: '',
        url: '',
        category: '',
        id: generateUniqueId()
    };
    loadedData.passwords.push(newPassword);
    sortData();
    displayData(loadedData);
    populateFilters(loadedData);
    showMessage('New password added! Click on fields to edit them.', 'success');
}

// Add card
function addCard() {
    if (!loadedData.cards) loadedData.cards = [];
    const newCard = {
        issuer: '-',
        pan: '',
        expiryDate: '',
        cvv: '',
        pin: '',
        notes: '',
        network: '',
        id: generateUniqueId()
    };
    loadedData.cards.push(newCard);
    sortData();
    displayData(loadedData);
    populateFilters(loadedData);
    showMessage('New card added! Click on fields to edit them.', 'success');
}

// Add wallet
function addWallet() {
    const newWallet = {
        wallet: '-',
        username: '',
        password: generateRandomPassword(),
        key: '',
        address: '',
        notes: '',
        type: '',
        id: generateUniqueId(),
    };
    loadedData.wallets.push(newWallet);
    sortData();
    displayData(loadedData);
    populateFilters(loadedData);
    showMessage('New wallet added! Click on fields to edit them.', 'success');
}

// Edit password
function editPassword(id, field, value) {
    const password = loadedData.passwords.find(pwd => pwd.id === id);
    if (password) {
        password[field] = value;
        populateFilters(loadedData);
        sortData();
        displayData(loadedData);
    }
}

// Edit card
function editCard(id, field, value) {
    if (loadedData.cards) {
        const card = loadedData.cards.find(card => card.id === id);
        if (card) {
            card[field] = value;
            populateFilters(loadedData);
            sortData();
            displayData(loadedData);
        }
    }
}

// Edit wallet
function editWallet(id, field, value) {
    const wallet = loadedData.wallets.find(wallet => wallet.id === id);
    if (wallet) {
        wallet[field] = value;
        populateFilters(loadedData);
        sortData();
        displayData(loadedData);
    }
}

// Show modal for confirming deletion
function showDeleteModal(id, type) {
    let itemName = '';
    if (type === 'password') {
        const pwd = loadedData.passwords.find(pwd => pwd.id === id);
        itemName = pwd?.platform || 'Password';
    } else if (type === 'card') {
        const card = loadedData.cards.find(card => card.id === id);
        itemName = card?.issuer || 'Card';
    } else if (type === 'wallet') {
        const wallet = loadedData.wallets.find(wallet => wallet.id === id);
        itemName = wallet?.wallet || 'Wallet';
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Confirm Deletion';
    modalContent.appendChild(title);
    
    const message = document.createElement('p');
    message.innerHTML = `Are you sure you want to delete <strong>"${escapeHtml(itemName)}"</strong>?<br><br>This action cannot be undone.`;
    modalContent.appendChild(message);
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
    
    btnContainer.appendChild(confirmBtn);
    btnContainer.appendChild(cancelBtn);
    modalContent.appendChild(btnContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    confirmBtn.addEventListener('click', () => {
        if (type === 'password') {
            loadedData.passwords = loadedData.passwords.filter(pwd => pwd.id !== id);
            showMessage('Password deleted successfully!', 'success');
        } else if (type === 'card') {
            loadedData.cards = loadedData.cards.filter(card => card.id !== id);
            showMessage('Card deleted successfully!', 'success');
        } else if (type === 'wallet') {
            loadedData.wallets = loadedData.wallets.filter(wallet => wallet.id !== id);
            showMessage('Wallet deleted successfully!', 'success');
        }
        displayData(loadedData);
        populateFilters(loadedData);
        document.body.removeChild(modal);
    });

    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Filter data
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
    
    // Filter passwords
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
    
    // Filter cards
    const filteredCards = (loadedData.cards || []).filter(card => {
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
    
    // Filter wallets
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

// Populate all filters
function populateFilters(data) {
    populateCategoryFilter(data);
    populateCircuitFilter(data);
    populateTypeFilter(data);
}

// Populate category filter for passwords
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

// Populate network filter for cards
function populateCircuitFilter(data) {
    const select = document.getElementById('circuitFilter');
    if (!select) return;
    
    const networks = new Set();
    (data.cards || []).forEach(card => {
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

// Populate type filter for wallets
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

// Download file
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
            content = await encryptData(loadedData, password);
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

// Utility to show toast messages
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

// Utility to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}