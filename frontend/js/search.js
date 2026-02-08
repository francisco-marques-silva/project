/**
 * Search Module
 */
const SearchModule = {
  databases: [],

  async init() {
    await this.loadDatabases();
    await this.loadProjectsDropdown();
    this.setupEventListeners();
  },

  async loadDatabases() {
    try {
      const data = await api.getAvailableDatabases();
      this.databases = data.databases;

      const container = document.getElementById('databaseCheckboxes');
      if (!container) return;

      container.innerHTML = this.databases.map(db => `
        <label class="checkbox-label">
          <input type="checkbox" name="database" value="${db.name}"
            ${db.name === 'pubmed' ? 'checked' : ''}
            ${!db.available ? 'disabled' : ''}>
          ${db.label} ${!db.available ? '(no API key)' : ''}
        </label>
      `).join('');
    } catch (error) {
      console.error('Failed to load databases:', error);
    }
  },

  async loadProjectsDropdown() {
    try {
      const data = await api.getProjects();
      const selects = [document.getElementById('searchProject'), document.getElementById('analysisProject')];

      for (const select of selects) {
        if (!select) continue;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select a project...</option>';
        for (const p of data.spreadsheets) {
          select.innerHTML += `<option value="${p.id}">${UI.escapeHtml(p.name)} (${p.article_count || 0} articles)</option>`;
        }
        if (currentVal) select.value = currentVal;
      }
    } catch (error) {
      console.error('Failed to load projects for dropdown:', error);
    }
  },

  setupEventListeners() {
    const form = document.getElementById('searchForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.performSearch();
      });
    }
  },

  async performSearch() {
    const query = document.getElementById('searchQuery').value;
    const yearStart = document.getElementById('yearStart').value;
    const yearEnd = document.getElementById('yearEnd').value;
    const maxResults = document.getElementById('maxResults').value;
    const projectId = document.getElementById('searchProject').value;
    const btn = document.getElementById('searchBtn');

    if (!query || !projectId) {
      notify.warning('Please fill in the search query and select a project.');
      return;
    }

    const selectedDbs = Array.from(document.querySelectorAll('input[name="database"]:checked'))
      .map(cb => cb.value);

    if (selectedDbs.length === 0) {
      notify.warning('Please select at least one database.');
      return;
    }

    UI.setLoading(btn, true);

    try {
      const result = await api.searchDatabases({
        query,
        databases: selectedDbs,
        yearStart: yearStart || undefined,
        yearEnd: yearEnd || undefined,
        maxResults: parseInt(maxResults) || 100,
        projectId
      });

      this.displaySearchResults(result);
      notify.success(`Search completed: ${result.totalArticles} articles found`);
      await this.loadProjectsDropdown();
    } catch (error) {
      notify.error('Search failed: ' + error.message);
    } finally {
      UI.setLoading(btn, false, '🔍 Search');
    }
  },

  displaySearchResults(result) {
    const container = document.getElementById('searchResults');
    const content = document.getElementById('searchResultsContent');
    if (!container || !content) return;

    container.style.display = 'block';

    let html = `<p><strong>Query:</strong> ${UI.escapeHtml(result.query)} | <strong>Total:</strong> ${result.totalArticles} articles</p>`;

    for (const [db, data] of Object.entries(result.results)) {
      html += `<div class="card mt-2">`;
      html += `<h4>${db.toUpperCase()}</h4>`;

      if (data.error) {
        html += `<p class="text-error">${UI.escapeHtml(data.error)}</p>`;
      } else {
        html += `<p>Found: ${data.totalFound} | Retrieved: ${data.retrieved} | New: ${data.savedNew} | Duplicates: ${data.duplicates}</p>`;

        if (data.articles && data.articles.length > 0) {
          html += `<table class="data-table"><thead><tr><th>Title</th><th>Authors</th><th>Year</th><th>Journal</th></tr></thead><tbody>`;
          for (const article of data.articles.slice(0, 10)) {
            html += `<tr>
              <td>${UI.escapeHtml(UI.truncate(article.title, 80))}</td>
              <td>${UI.escapeHtml(UI.truncate(article.authors, 50))}</td>
              <td>${article.year || '-'}</td>
              <td>${UI.escapeHtml(UI.truncate(article.journal, 40))}</td>
            </tr>`;
          }
          html += `</tbody></table>`;
          if (data.articles.length > 10) {
            html += `<p class="text-muted">Showing first 10 of ${data.articles.length} articles. View all in Projects.</p>`;
          }
        }
      }
      html += `</div>`;
    }

    content.innerHTML = html;
  }
};
