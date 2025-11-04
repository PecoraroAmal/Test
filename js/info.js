document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadExample');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadSample);
    }
});

async function downloadSample() {
    const sampleJson = {
        "passwords": [
            {
                "platform": "Amazon",
                "username": "",
                "password": "",
                "notes": "Main Amazon account",
                "url": "https://amazon.it",
                "category": "Shopping"
            },
            {
                "platform": "eBay",
                "username": "",
                "password": "",
                "notes": "Account for online purchases",
                "url": "https://ebay.com",
                "category": "Shopping"
            },
            {
                "platform": "AliExpress",
                "username": "",
                "password": "",
                "notes": "International purchases",
                "url": "https://aliexpress.com",
                "category": "Shopping"
            },
            {
                "platform": "Etsy",
                "username": "",
                "password": "",
                "notes": "Purchases of handmade products",
                "url": "https://etsy.com",
                "category": "Shopping"
            },
            {
                "platform": "Zalando",
                "username": "",
                "password": "",
                "notes": "Fashion purchases",
                "url": "https://zalando.com",
                "category": "Shopping"
            },
            {
                "platform": "Shein",
                "username": "",
                "password": "",
                "notes": "Affordable clothing",
                "url": "https://shein.com",
                "category": "Shopping"
            },
            {
                "platform": "Facebook",
                "username": "",
                "password": "",
                "notes": "Personal account",
                "url": "https://facebook.com",
                "category": "Social"
            },
            {
                "platform": "Instagram",
                "username": "",
                "password": "",
                "notes": "Account for photos and stories",
                "url": "https://instagram.com",
                "category": "Social"
            },
            {
                "platform": "LinkedIn",
                "username": "",
                "password": "",
                "notes": "Professional profile",
                "url": "https://linkedin.com",
                "category": "Social"
            },
            {
                "platform": "X",
                "username": "",
                "password": "",
                "notes": "Account for microblogging",
                "url": "https://x.com",
                "category": "Social"
            },
            {
                "platform": "TikTok",
                "username": "",
                "password": "",
                "notes": "Account for short videos",
                "url": "https://tiktok.com",
                "category": "Social"
            },
            {
                "platform": "Snapchat",
                "username": "",
                "password": "",
                "notes": "Account for snaps and stories",
                "url": "https://snapchat.com",
                "category": "Social"
            },
            {
                "platform": "Reddit",
                "username": "",
                "password": "",
                "notes": "Account for forums and discussions",
                "url": "https://reddit.com",
                "category": "Social"
            },
            {
                "platform": "Discord",
                "username": "",
                "password": "",
                "notes": "Account for gaming communities",
                "url": "https://discord.com",
                "category": "Social"
            },
            {
                "platform": "Pinterest",
                "username": "",
                "password": "",
                "notes": "Account for inspirations",
                "url": "https://pinterest.com",
                "category": "Social"
            },
            {
                "platform": "Netflix",
                "username": "",
                "password": "",
                "notes": "Main streaming account",
                "url": "https://netflix.com",
                "category": "Streaming"
            },
            {
                "platform": "Spotify",
                "username": "",
                "password": "",
                "notes": "Account for music",
                "url": "https://spotify.com",
                "category": "Streaming"
            },
            {
                "platform": "Disney+",
                "username": "",
                "password": "",
                "notes": "Account for Disney movies and series",
                "url": "https://disneyplus.com",
                "category": "Streaming"
            },
            {
                "platform": "Generic Bank",
                "username": "",
                "password": "",
                "notes": "Main checking account",
                "url": "https://generic-bank.com",
                "category": "Banking"
            },
            {
                "platform": "Apple ID",
                "username": "",
                "password": "",
                "notes": "Main Apple account",
                "url": "https://appleid.apple.com",
                "category": "Tech"
            },
            {
                "platform": "Phone",
                "username": "",
                "password": "",
                "notes": "Phone unlock code",
                "url": "",
                "category": "Devices"
            }
        ],
        "cards": [
            {
                "issuer": "Generic Bank",
                "pan": "1111222233334444",
                "expiryDate": "09/27",
                "cvv": "012",
                "pin": "0123",
                "notes": "Generic debit card",
                "network": "MasterCard",
            }
        ],
        "wallets": [
            {
                "wallet": "MetaMask",
                "username": "",
                "password": "",
                "key": "5KQwrPbwdL6PhXujlW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
                "address": "0x742d35Cc6634C0032925a3b844Bc454e4438f44e",
                "notes": "Main ETH wallet",
                "type": "Crypto"
            },
            {
                "wallet": "Apple Wallet",
                "username": "",
                "password": "",
                "key": "",
                "address": "",
                "notes": "Apple Pay and cards",
                "type": "Cards"
            },
            {
                "wallet": "Samsung Pay",
                "username": "",
                "password": "",
                "key": "",
                "address": "",
                "notes": "Samsung Pay and associated cards",
                "type": "Cards"
            },
            {
                "wallet": "Google Pay",
                "username": "",
                "password": "",
                "key": "",
                "address": "",
                "notes": "Google Pay and digital cards",
                "type": "Cards"
            }
        ]
    };

    try {
        const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'Test_sample.json';
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showMessage('Sample file downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error during download:', error);
        showMessage('Error downloading the file', 'error');
    }
}

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
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
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