/**
 * UI Utilities
 */
const UI = {
  /**
   * Show/hide sections
   */
  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(sectionId + 'Section');
    if (section) section.style.display = 'block';

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
  },

  /**
   * Show/hide modal
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  /**
   * Format date
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  /**
   * Truncate text
   */
  truncate(text, maxLength = 100) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  },

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Create pagination
   */
  createPagination(containerId, currentPage, totalPages, callback) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = '';
    if (currentPage > 1) {
      html += `<button class="btn btn-sm btn-outline" data-page="${currentPage - 1}">← Prev</button>`;
    }
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
      html += `<button class="btn btn-sm btn-outline" data-page="${currentPage + 1}">Next →</button>`;
    }

    container.innerHTML = html;
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => callback(parseInt(btn.dataset.page)));
    });
  },

  /**
   * Setup modal close buttons
   */
  setupModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  },

  /**
   * Loading state for button
   */
  setLoading(btn, loading, originalText) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = '⏳ Loading...';
    } else {
      btn.disabled = false;
      btn.textContent = originalText || btn.dataset.originalText || 'Submit';
    }
  }
};
