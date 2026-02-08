/**
 * Portal page initialization
 */
const Portal = {
  init() {
    if (!localStorage.getItem('auth_token')) {
      window.location.href = '/login';
      return;
    }

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) userDisplay.textContent = localStorage.getItem('user_name') || 'User';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login';
      });
    }

    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.navigateTo(section);
      });
    });

    UI.setupModals();
    this.navigateTo('dashboard');
  },

  async navigateTo(section) {
    UI.showSection(section);

    switch (section) {
      case 'dashboard':
        Dashboard.init();
        break;
      case 'projects':
        await Spreadsheets.loadProjects();
        break;
      case 'search':
        await SearchModule.init();
        break;
      case 'analysis':
        await Analysis.init();
        await SearchModule.loadProjectsDropdown();
        break;
      case 'history':
        await History.load();
        break;
    }
  }
};
