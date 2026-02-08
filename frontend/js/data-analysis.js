/**
 * Data Analysis Page
 */
const DataAnalysisPage = {
  currentDataset: null,

  async init() {
    this.setupEventListeners();
    await this.loadDatasets();
  },

  setupEventListeners() {
    const uploadBtn = document.getElementById('uploadDatasetBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => UI.showModal('uploadDatasetModal'));
    }

    const form = document.getElementById('uploadDatasetForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.uploadDataset();
      });
    }

    const backBtn = document.getElementById('backToDatasets');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        document.getElementById('datasetViewer').style.display = 'none';
        document.getElementById('datasetsList').style.display = 'block';
      });
    }

    const deleteBtn = document.getElementById('deleteDatasetBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteDataset());
    }

    // Setup modal close
    UI.setupModals();
  },

  async loadDatasets() {
    try {
      const data = await api.getDatasets();
      const container = document.getElementById('datasetsList');
      if (!container) return;

      if (!data.datasets || data.datasets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No datasets yet. Upload a CSV or XLSX file to get started.</p></div>';
        return;
      }

      container.innerHTML = data.datasets.map(d => `
        <div class="project-card" data-id="${d.id}">
          <div class="project-card-header">
            <h3>${UI.escapeHtml(d.name)}</h3>
            <span class="badge">${d.row_count} rows</span>
          </div>
          <p class="text-muted">${UI.escapeHtml(d.description || 'No description')}</p>
          <p class="text-sm">Columns: ${(d.columns || []).slice(0, 5).join(', ')}${(d.columns || []).length > 5 ? '...' : ''}</p>
          <small class="text-muted">${UI.formatDate(d.created_at)}</small>
        </div>
      `).join('');

      container.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => this.openDataset(card.dataset.id));
      });
    } catch (error) {
      notify.error('Failed to load datasets: ' + error.message);
    }
  },

  async uploadDataset() {
    const name = document.getElementById('datasetName').value;
    const description = document.getElementById('datasetDescription').value;
    const fileInput = document.getElementById('datasetFile');

    if (!fileInput.files.length) {
      notify.warning('Please select a file');
      return;
    }

    try {
      await api.uploadDataset(name, description, fileInput.files[0]);
      UI.hideModal('uploadDatasetModal');
      document.getElementById('uploadDatasetForm').reset();
      notify.success('Dataset uploaded!');
      this.loadDatasets();
    } catch (error) {
      notify.error('Upload failed: ' + error.message);
    }
  },

  async openDataset(id) {
    try {
      const data = await api.getDataset(id);
      this.currentDataset = data.dataset;

      document.getElementById('datasetsList').style.display = 'none';
      document.getElementById('datasetViewer').style.display = 'block';
      document.getElementById('datasetViewerName').textContent = data.dataset.name;

      const columns = data.dataset.columns || [];
      const rows = data.dataset.data || [];

      const thead = document.getElementById('datasetTableHead');
      thead.innerHTML = '<tr>' + columns.map(c => `<th>${UI.escapeHtml(c)}</th>`).join('') + '</tr>';

      const tbody = document.getElementById('datasetTableBody');
      tbody.innerHTML = rows.slice(0, 100).map(row =>
        '<tr>' + columns.map(c => `<td>${UI.escapeHtml(String(row[c] || ''))}</td>`).join('') + '</tr>'
      ).join('');

      if (rows.length > 100) {
        tbody.innerHTML += `<tr><td colspan="${columns.length}" class="text-center text-muted">Showing first 100 of ${rows.length} rows</td></tr>`;
      }
    } catch (error) {
      notify.error('Failed to load dataset: ' + error.message);
    }
  },

  async deleteDataset() {
    if (!this.currentDataset) return;
    if (!confirm(`Delete dataset "${this.currentDataset.name}"?`)) return;

    try {
      await api.deleteDataset(this.currentDataset.id);
      notify.success('Dataset deleted');
      document.getElementById('datasetViewer').style.display = 'none';
      document.getElementById('datasetsList').style.display = 'block';
      this.loadDatasets();
    } catch (error) {
      notify.error('Failed to delete: ' + error.message);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DataAnalysisPage.init();
});
