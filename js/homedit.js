// Global variables
let loadedData = { "passwords": [], "cards": [], "wallets": [] };
let sensitiveData = { "passwords": {}, "cards": {}, "wallets": {} };
let sessionKey = null;
let uploadedFile = null;
let uploadedFileName = null;

// Function to generate a unique ID
function generateUniqueId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
    });
}

// Generate session key for encrypting sensitive fields in memory
async function generateSessionKey() {
    return window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Encrypt sensitive fields using session key
async function encryptSensitive(data, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(JSON.stringify(data))
    );
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    return result;
}

// Decrypt sensitive fields using session key
async function decryptSensitive(encryptedData, key) {
    const iv = encryptedData.slice(0, 12);
    const encrypted = encryptedData.slice(12);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}

// Separate data into non-sensitive and sensitive (encrypted with session key)
async function separateData(rawData) {
    sessionKey = await generateSessionKey();
    const data = {
        passwords: Array.isArray(rawData.passwords) ? rawData.passwords : [],
        cards: Array.isArray(rawData.cards) ? rawData.cards : [],
        wallets: Array.isArray(rawData.wallets) ? rawData.wallets : []
    };

    loadedData.passwords = [];
    sensitiveData.passwords = {};
    for (const pwd of data.passwords) {
        const id = pwd.id || generateUniqueId();
        loadedData.passwords.push({
            id,
            platform: pwd.platform || '',
            username: pwd.username || '',
            url: pwd.url || '',
            category: pwd.category || '',
            notes: pwd.notes || ''
        });
        const sensitive = { password: pwd.password || '' };
        sensitiveData.passwords[id] = await encryptSensitive(sensitive, sessionKey);
    }

    loadedData.cards = [];
    sensitiveData.cards = {};
    for (const card of data.cards) {
        const id = card.id || generateUniqueId();
        loadedData.cards.push({
            id,
            issuer: card.issuer || '',
            network: card.network || '',
            notes: card.notes || ''
        });
        const sensitive = {
            pan: card.pan || '',
            expiryDate: card.expiryDate || '',
            cvv: card.cvv || '',
            pin: card.pin || ''
        };
        sensitiveData.cards[id] = await encryptSensitive(sensitive, sessionKey);
    }

    loadedData.wallets = [];
    sensitiveData.wallets = {};
    for (const wallet of data.wallets) {
        const id = wallet.id || generateUniqueId();
        loadedData.wallets.push({
            id,
            wallet: wallet.wallet || '',
            username: wallet.username || '',
            address: wallet.address || '',
            type: wallet.type || '',
            notes: wallet.notes || ''
        });
        const sensitive = {
            password: wallet.password || '',
            key: wallet.key || ''
        };
        sensitiveData.wallets[id] = await encryptSensitive(sensitive, sessionKey);
    }

    sortData();
}

// Recombine data for saving (decrypt sensitive fields)
async function recombineData() {
    const fullData = { passwords: [], cards: [], wallets: [] };

    for (const pwd of loadedData.passwords) {
        const sensitive = await decryptSensitive(sensitiveData.passwords[pwd.id], sessionKey);
        fullData.passwords.push({ ...pwd, password: sensitive.password });
    }

    for (const card of loadedData.cards) {
        const sensitive = await decryptSensitive(sensitiveData.cards[card.id], sessionKey);
        fullData.cards.push({
            ...card,
            pan: sensitive.pan,
            expiryDate: sensitive.expiryDate,
            cvv: sensitive.cvv,
            pin: sensitive.pin
        });
    }

    for (const wallet of loadedData.wallets) {
        const sensitive = await decryptSensitive(sensitiveData.wallets[wallet.id], sessionKey);
        fullData.wallets.push({
            ...wallet,
            password: sensitive.password,
            key: sensitive.key
        });
    }

    return fullData;
}

// Handle file upload
function handleFileUpload(event) {
    const files = event.target?.files || event.dataTransfer?.files;
    const file = files?.[0];

    if (!file) {
        showMessage('No file selected', 'error');
        return;
    }

    if (file.size > 512000) { // 0.5 MB
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
        
        await separateData(data);
        
        displayData();
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

// Validate JSON structure
function validateJSONStructure(data) {
    return data && typeof data === 'object' &&
           (data.passwords === undefined || Array.isArray(data.passwords)) &&
           (data.cards === undefined || Array.isArray(data.cards)) &&
           (data.wallets === undefined || Array.isArray(data.wallets));
}

// Sort data
function sortData() {
    loadedData.passwords.sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    loadedData.cards.sort((a, b) => a.issuer.localeCompare(b.issuer, 'en', { sensitivity: 'base' }));
    loadedData.wallets.sort((a, b) => a.wallet.localeCompare(b.wallet, 'en', { sensitivity: 'base' }));
}

// Toggle section
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
            (pwd.url && pwd.url.toLowerCase().includes(passwordSearch)) ||
            (pwd.notes && pwd.notes.toLowerCase().includes(passwordSearch)) ||
            (pwd.category && pwd.category.toLowerCase().includes(passwordSearch));
        
        const categoryMatch = !category || 
            (pwd.category && pwd.category.toLowerCase() === category);
        
        return searchMatch && categoryMatch;
    }).sort((a, b) => a.platform.localeCompare(b.platform, 'en', { sensitivity: 'base' }));
    
    // Filter cards
    const filteredCards = loadedData.cards.filter(card => {
        const searchMatch = !cardSearch || 
            card.issuer.toLowerCase().includes(cardSearch) ||
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
function populateFilters() {
    populateCategoryFilter();
    populateCircuitFilter();
    populateTypeFilter();
}

// Populate category filter for passwords
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    const categories = new Set();
    loadedData.passwords.forEach(pwd => {
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
function populateCircuitFilter() {
    const select = document.getElementById('circuitFilter');
    if (!select) return;
    
    const networks = new Set();
    loadedData.cards.forEach(card => {
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
function populateTypeFilter() {
    const select = document.getElementById('typeFilter');
    if (!select) return;
    
    const types = new Set();
    loadedData.wallets.forEach(wallet => {
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

// Utility to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}