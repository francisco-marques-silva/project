/**
 * History Module
 */
const History = {
  async load() {
    await Promise.all([this.loadSearchHistory(), this.loadTokenUsage()]);
  },

  clearTokenFilter() {
    const fromEl = document.getElementById('tokenDateFrom');
    const toEl = document.getElementById('tokenDateTo');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    this.loadTokenUsage();
  },

  async loadTokenUsage() {
    try {
      const from = document.getElementById('tokenDateFrom')?.value || undefined;
      const to = document.getElementById('tokenDateTo')?.value || undefined;
      const data = await api.getTokenUsage(from, to);
      const container = document.getElementById('tokenUsageSummary');
      const content = document.getElementById('tokenUsageContent');
      if (!container || !content) return;

      container.style.display = 'block';
      if (!data.usage || data.usage.length === 0) {
        content.innerHTML = '<p class="text-muted">No token usage found for the selected period.</p>';
        return;
      }

      const totals = data.usage.reduce((acc, u) => {
        acc.prompt += u.prompt_tokens;
        acc.completion += u.completion_tokens;
        acc.total += u.total_tokens;
        acc.count += u.count;
        return acc;
      }, { prompt: 0, completion: 0, total: 0, count: 0 });

      let html = `<table class="data-table" style="font-size:0.9em;">
        <thead><tr><th>Model</th><th>Screenings</th><th>Input Tokens</th><th>Output Tokens</th><th>Total Tokens</th></tr></thead><tbody>`;

      for (const u of data.usage) {
        html += `<tr>
          <td><strong>${UI.escapeHtml(u.model)}</strong></td>
          <td>${u.count.toLocaleString()}</td>
          <td>${u.prompt_tokens.toLocaleString()}</td>
          <td>${u.completion_tokens.toLocaleString()}</td>
          <td>${u.total_tokens.toLocaleString()}</td>
        </tr>`;
      }

      html += `<tr style="font-weight:bold;border-top:2px solid var(--border);">
        <td>Total</td>
        <td>${totals.count.toLocaleString()}</td>
        <td>${totals.prompt.toLocaleString()}</td>
        <td>${totals.completion.toLocaleString()}</td>
        <td>${totals.total.toLocaleString()}</td>
      </tr>`;

      html += '</tbody></table>';
      content.innerHTML = html;
      container.style.display = 'block';
    } catch (error) {
      console.error('Failed to load token usage:', error);
    }
  },

  async loadSearchHistory() {
    try {
      const data = await api.getSearchHistory();
      const container = document.getElementById('historyContent');
      if (!container) return;

      if (!data.history || data.history.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No search history yet.</p></div>';
        return;
      }

      let html = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Query</th>
              <th>Database</th>
              <th>Results</th>
              <th>Times Used</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

      for (const entry of data.history) {
        const dbs = Array.isArray(entry.databases) ? entry.databases.join(', ') : (entry.databases || '');
        html += `
          <tr>
            <td>${UI.escapeHtml(UI.truncate(entry.query_text || '', 80))}</td>
            <td><span class="badge">${UI.escapeHtml(dbs)}</span></td>
            <td>${entry.results_count || 0}</td>
            <td>${entry.search_count || 1}</td>
            <td>${UI.formatDate(entry.updated_at)}</td>
            <td>
              <button class="btn btn-xs btn-outline" onclick="History.reuse('${UI.escapeHtml(entry.query_text || '').replace(/'/g, '\\\'')}')" title="Reuse query">🔄</button>
              <button class="btn btn-xs btn-danger" onclick="History.remove('${entry.id}')" title="Delete">🗑️</button>
            </td>
          </tr>
        `;
      }

      html += '</tbody></table>';
      container.innerHTML = html;
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  },

  reuse(query) {
    // Navigate to search and fill in the query
    UI.showSection('search');
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) queryInput.value = query;
  },

  async remove(id) {
    if (!confirm('Delete this history entry?')) return;
    try {
      await api.deleteSearchHistory(id);
      notify.success('History entry deleted');
      this.load();
    } catch (error) {
      notify.error(error.message);
    }
  }
};
