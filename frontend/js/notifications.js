/**
 * Toast notification system
 */
class Notifications {
  constructor() {
    this.container = document.getElementById('toastContainer');
  }

  show(message, type = 'info', duration = 4000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    this.container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-fade');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  success(message) { this.show(message, 'success'); }
  error(message) { this.show(message, 'error', 6000); }
  warning(message) { this.show(message, 'warning'); }
  info(message) { this.show(message, 'info'); }
}

const notify = new Notifications();
