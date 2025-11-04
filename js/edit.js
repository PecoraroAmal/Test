// edit.js - Editing view, uses shared functions from homedit.js

// Global variables specific to edit (loadedPublicData and loadedSensitiveData are in homedit.js)

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

    // Handle drag and drop and click for file upload (same as home)
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

// Add password (edit-specific)
function addPassword() {
    // Implement modal for adding new password
    // Generate ID, add to loadedPublicData and encrypt sensitive to loadedSensitiveData
    // Then call displayData(true) and populateFilters()
    showMessage('Add password functionality to be implemented', 'info');
    // Placeholder: Actual implementation would create modal, collect data, separate public/sensitive, encrypt, push, sort, display
}

// Similar for addCard, addWallet

// Edit item (edit-specific)
async function editItem(id, type) {
    // Decrypt sensitive, show modal with public + decrypted sensitive
    // On save, update public, re-encrypt sensitive
    // Then sortData(), displayData(true), populateFilters()
    showMessage('Edit functionality to be implemented', 'info');
}

// Delete item (edit-specific)
function deleteItem(id, type) {
    // Remove from loadedPublicData and loadedSensitiveData
    // Then displayData(true), populateFilters()
    showMessage('Delete functionality to be implemented', 'info');
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
        
        for (const pwd of loadedPublicData.passwords) {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(pwd.id), sessionKey);
            fullData.passwords.push({ ...pwd, ...sensitive });
        }
        for (const card of loadedPublicData.cards) {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(card.id), sessionKey);
            fullData.cards.push({ ...card, ...sensitive });
        }
        for (const wallet of loadedPublicData.wallets) {
            const sensitive = await decryptSensitive(loadedSensitiveData.get(wallet.id), sessionKey);
            fullData.wallets.push({ ...wallet, ...sensitive });
        }
        
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