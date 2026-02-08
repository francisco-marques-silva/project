/**
 * API Communication Layer
 */
class API {
  constructor() {
    this.baseUrl = '';
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  getHeaders(isJson = true) {
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async request(method, url, data = null, options = {}) {
    const config = {
      method,
      headers: this.getHeaders(!options.isFormData),
    };

    if (data) {
      if (options.isFormData) {
        config.body = data;
        delete config.headers['Content-Type'];
        config.headers['Authorization'] = `Bearer ${this.getToken()}`;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    const response = await fetch(`${this.baseUrl}${url}`, config);

    // Only redirect on 401 if it's NOT an auth endpoint (login/register)
    if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_name');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (options.stream) return response;

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed with status ${response.status}`);
    return result;
  }

  // Auth
  login(email, password) { return this.request('POST', '/api/auth/login', { email, password }); }
  register(data) { return this.request('POST', '/api/auth/register', data); }
  getMe() { return this.request('GET', '/api/auth/me'); }

  // Dashboard
  getStats() { return this.request('GET', '/api/dashboard/stats'); }
  getProfile() { return this.request('GET', '/api/dashboard/profile'); }
  getActivity(limit = 20) { return this.request('GET', `/api/dashboard/activity?limit=${limit}`); }
  getTokenUsage(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return this.request('GET', `/api/dashboard/token-usage${qs ? '?' + qs : ''}`);
  }

  // Projects
  getProjects() { return this.request('GET', '/api/spreadsheets/list'); }
  getProject(id, page = 1, limit = 50, search = '') {
    return this.request('GET', `/api/spreadsheets/${id}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  }
  createProject(data) { return this.request('POST', '/api/spreadsheets/create', data); }
  updateProject(id, data) { return this.request('POST', `/api/spreadsheets/${id}/update`, data); }
  deleteProject(id) { return this.request('DELETE', `/api/spreadsheets/${id}`); }
  getArticleScreening(articleId) { return this.request('GET', `/api/spreadsheets/article/${articleId}/screening`); }
  uploadToProject(projectId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    return this.request('POST', '/api/spreadsheets/upload', formData, { isFormData: true });
  }

  // Databases
  getAvailableDatabases() { return this.request('GET', '/api/databases/available'); }
  getPublicationTypes() { return this.request('GET', '/api/databases/publication-types'); }
  searchDatabases(data) { return this.request('POST', '/api/databases/search', data); }
  getSearchHistory() { return this.request('GET', '/api/databases/history'); }
  deleteSearchHistory(id) { return this.request('DELETE', `/api/databases/history/${id}`); }

  // Analysis
  getProviders() { return this.request('GET', '/api/analysis/providers'); }
  getModels() { return this.request('GET', '/api/analysis/models'); }
  testConnection(provider) { return this.request('POST', '/api/analysis/test-connection', { provider }); }
  previewPrompt(data) { return this.request('POST', '/api/analysis/preview-prompt', data); }
  screenSingle(data) { return this.request('POST', '/api/analysis/single', data); }
  batchScreen(data) { return this.request('POST', '/api/analysis/batch-screen', data, { stream: true }); }

  // Config
  getStatus() { return this.request('GET', '/api/config/status'); }

  // Data Analysis
  getDatasets() { return this.request('GET', '/api/data-analysis/datasets'); }
  getDataset(id) { return this.request('GET', `/api/data-analysis/datasets/${id}`); }
  uploadDataset(name, description, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    return this.request('POST', '/api/data-analysis/upload', formData, { isFormData: true });
  }
  deleteDataset(id) { return this.request('DELETE', `/api/data-analysis/datasets/${id}`); }
}

const api = new API();
