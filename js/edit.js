import * as homedit from './homedit.js';

// Global variables (shared via import)

// Initialization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners (shared ones use homedit)
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', homedit.handleFileUpload);
    }
    const decryptBtn = document.getElementById('decryptBtn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', () => homedit.openFile(true)); // Edit mode
    }
    const passwordSearchInput = document.getElementById('passwordSearchInput');
    if (passwordSearchInput) {
        passwordSearchInput.addEventListener('input', homedit.filterData);
    }
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', homedit.filterData);
    }
    const cardSearchInput = document.getElementById('cardSearchInput');
    if (cardSearchInput) {
        cardSearchInput.addEventListener('input', homedit.filterData);
    }
    const circuitFilter = document.getElementById('circuitFilter');
    if (circuitFilter) {
        circuitFilter.addEventListener('change', homedit.filterData);
    }
    const walletSearchInput = document.getElementById('walletSearchInput');
    if (walletSearchInput) {
        walletSearchInput.addEventListener('input', homedit.filterData);
    }
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', homedit.filterData);
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
    // Handle section toggling
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
            if (file) homedit.handleFileUpload({ target: { files: [file] } });
        });
        uploadZone.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
    }
});

// Add new password
function addPassword() {
    // Implement modal for adding new, then push to nonSensitiveData and sensitiveData
    // For example:
    const id = homedit.generateUniqueId();
    // Collect data from modal...
    // Example placeholder
    const nonSens = { id, platform: 'New', category: '', url: '' };
    const sens = { username: '', password: generateRandomPassword(), notes: '' };
    homedit.nonSensitiveData.passwords.push(nonSens);
    storeSensitive(id, sens, homedit.masterKey); // Use helper from homedit
    homedit.sortData(homedit.nonSensitiveData);
    homedit.displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
}

// Similar for addCard, addWallet...

// Edit item (decrypt, edit, re-encrypt)
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
        // Show modal with nonSens and sens fields for editing
        // After save, update nonSensArray[itemIndex] with new non-sens
        // Re-store sensitive with new sens
        storeSensitive(id, newSens, homedit.masterKey);
        homedit.sortData(homedit.nonSensitiveData);
        homedit.displayData(homedit.nonSensitiveData, true);
        homedit.populateFilters(homedit.nonSensitiveData);
    } catch (err) {
        homedit.showMessage('Error editing item', 'error');
    }
}

// Delete item
function deleteItem(id, type) {
    // Confirm modal
    let array;
    switch (type) {
        case 'password': array = homedit.nonSensitiveData.passwords; break;
        case 'card': array = homedit.nonSensitiveData.cards; break;
        case 'wallet': array = homedit.nonSensitiveData.wallets; break;
    }
    const index = array.findIndex(i => i.id === id);
    if (index > -1) array.splice(index, 1);
    delete homedit.sensitiveData[id];
    homedit.displayData(homedit.nonSensitiveData, true);
    homedit.populateFilters(homedit.nonSensitiveData);
    homedit.showMessage(`${type} deleted successfully!`, 'success');
}

// Download file (reconstruct full data by decrypting sensitive)
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
        // Reconstruct full loadedData
        const fullData = { passwords: [], cards: [], wallets: [] };
        for (const pwd of homedit.nonSensitiveData.passwords) {
            const sens = await decryptItem(homedit.sensitiveData[pwd.id], homedit.masterKey);
            fullData.passwords.push({ ...pwd, ...sens });
        }
        // Similar for cards and wallets...

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

// Generate random password
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