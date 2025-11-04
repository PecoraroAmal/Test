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