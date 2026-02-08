/**
 * Spreadsheets/Projects Module — handles project CRUD, article management, upload/download
 */
const Spreadsheets = {
  currentProject: null,
  currentPage: 1,

  async init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Create project
    const createBtn = document.getElementById('createProjectBtn');
    if (createBtn) createBtn.addEventListener('click', () => UI.showModal('createProjectModal'));

    const createForm = document.getElementById('createProjectForm');
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createProject();
      });
    }

    // Back to projects
    const backBtn = document.getElementById('backToProjects');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        document.getElementById('projectDetails').style.display = 'none';
        document.getElementById('projectList').style.display = 'block';
        this.currentProject = null;
        this.loadProjects();
      });
    }

    // Upload toggle
    const uploadBtn = document.getElementById('uploadToProject');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        const form = document.getElementById('uploadForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });
    }

    const uploadFileBtn = document.getElementById('uploadFileBtn');
    if (uploadFileBtn) uploadFileBtn.addEventListener('click', () => this.uploadFile());

    // Download
    const downloadBtn = document.getElementById('downloadProject');
    if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadProject());

    // Delete project
    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteProject());

    // Add article button -> show modal
    const addBtn = document.getElementById('addArticleBtn');
    if (addBtn) addBtn.addEventListener('click', () => UI.showModal('addArticleModal'));

    // Add article form submit
    const addForm = document.getElementById('addArticleForm');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addArticle();
      });
    }

    // Search articles
    const searchInput = document.getElementById('articleSearch');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentPage = 1;
          if (this.currentProject) this.loadProjectDetails(this.currentProject.id);
        }, 300);
      });
    }
  },

  async loadProjects() {
    try {
      const data = await api.getProjects();
      const container = document.getElementById('projectList');
      if (!container) return;

      if (!data.spreadsheets || data.spreadsheets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No projects yet. Create your first project to get started!</p></div>';
        return;
      }

      container.innerHTML = data.spreadsheets.map(p => `
        <div class="project-card" data-id="${p.id}">
          <div class="project-card-header">
            <h3>${UI.escapeHtml(p.name)}</h3>
            <span class="badge">${p.article_count || 0} articles</span>
          </div>
          <p class="text-muted">${UI.escapeHtml(UI.truncate(p.description || 'No description', 150))}</p>
          ${p.research_question ? `<p class="text-sm"><strong>Question:</strong> ${UI.escapeHtml(UI.truncate(p.research_question, 100))}</p>` : ''}
          <div class="project-card-footer">
            <small class="text-muted">${UI.formatDate(p.updated_at)}</small>
            ${p.screening_count ? `<span class="badge badge-info">${p.screening_count} screenings</span>` : ''}
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => this.openProject(card.dataset.id));
      });
    } catch (error) {
      notify.error('Failed to load projects: ' + error.message);
    }
  },

  async createProject() {
    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    const research_question = document.getElementById('projectQuestion').value;

    if (!name) { notify.warning('Project name is required'); return; }

    try {
      await api.createProject({ name, description, research_question });
      UI.hideModal('createProjectModal');
      document.getElementById('createProjectForm').reset();
      notify.success('Project created!');
      this.loadProjects();
      SearchModule.loadProjectsDropdown();
    } catch (error) {
      notify.error('Failed to create project: ' + error.message);
    }
  },

  async openProject(id) {
    try {
      document.getElementById('projectList').style.display = 'none';
      document.getElementById('projectDetails').style.display = 'block';
      await this.loadProjectDetails(id);
    } catch (error) {
      notify.error('Failed to open project: ' + error.message);
    }
  },

  async loadProjectDetails(id) {
    const search = document.getElementById('articleSearch')?.value || '';

    try {
      const data = await api.getProject(id, this.currentPage, 50, search);
      this.currentProject = data.project;

      document.getElementById('projectDetailName').textContent = data.project.name;
      document.getElementById('projectDetailDesc').textContent = data.project.description || '';
      document.getElementById('projectDetailQuestion').textContent = data.project.research_question
        ? `Research Question: ${data.project.research_question}` : '';
      document.getElementById('articleCount').textContent = `${data.total} articles`;

      // Determine which columns have data
      const cols = [
        { key: 'title', label: 'Title', always: true },
        { key: 'authors', label: 'Authors' },
        { key: 'year', label: 'Year' },
        { key: 'journal', label: 'Journal' },
        { key: 'doi', label: 'DOI' },
        { key: 'source', label: 'Source' },
        { key: 'screening_status', label: 'Status', always: true }
      ];

      const activeCols = cols.filter(col => {
        if (col.always) return true;
        return data.articles.some(a => a[col.key] && String(a[col.key]).trim() !== '' && a[col.key] !== '-');
      });

      // Build table header dynamically
      const thead = document.querySelector('#articlesTable thead tr');
      thead.innerHTML = activeCols.map(c => `<th>${c.label}</th>`).join('') + '<th>Actions</th>';

      const tbody = document.getElementById('articlesBody');
      if (data.articles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${activeCols.length + 1}" class="text-center text-muted">No articles found. Use Search to add articles, upload a file, or add manually.</td></tr>`;
      } else {
        tbody.innerHTML = data.articles.map(a => {
          let cells = '';
          for (const col of activeCols) {
            if (col.key === 'title') {
              cells += `<td class="td-title" title="${UI.escapeHtml(a.title)}">${UI.escapeHtml(UI.truncate(a.title, 60))}</td>`;
            } else if (col.key === 'screening_status') {
              const s = a.screening_status || 'pending';
              const badge = s === 'include' ? 'success' : s === 'exclude' ? 'danger' : s === 'maybe' ? 'warning' : 'default';
              cells += `<td><span class="badge badge-${badge}">${s}</span></td>`;
            } else if (col.key === 'source') {
              cells += `<td><span class="badge badge-sm">${a.source || '-'}</span></td>`;
            } else if (col.key === 'doi') {
              const doi = a.doi || '-';
              cells += `<td>${doi !== '-' ? `<a href="https://doi.org/${doi}" target="_blank" title="${doi}">${UI.truncate(doi, 20)}</a>` : '-'}</td>`;
            } else if (col.key === 'authors') {
              cells += `<td>${UI.escapeHtml(UI.truncate(a.authors || '', 40))}</td>`;
            } else if (col.key === 'journal') {
              cells += `<td>${UI.escapeHtml(UI.truncate(a.journal || '', 30))}</td>`;
            } else {
              cells += `<td>${a[col.key] || '-'}</td>`;
            }
          }
          return `<tr>${cells}<td>
            <button class="btn btn-xs btn-outline" onclick="Spreadsheets.viewArticle('${a.id}')">👁️</button>
            <button class="btn btn-xs btn-danger" onclick="Spreadsheets.removeArticle('${a.id}')">🗑️</button>
          </td></tr>`;
        }).join('');
      }

      UI.createPagination('articlesPagination', data.page, data.totalPages, (page) => {
        this.currentPage = page;
        this.loadProjectDetails(id);
      });
    } catch (error) {
      notify.error('Failed to load project details: ' + error.message);
    }
  },

  async viewArticle(articleId) {
    try {
      const data = await api.getProject(this.currentProject.id, 1, 1000);
      const article = data.articles.find(a => a.id === articleId);
      if (!article) { notify.warning('Article not found'); return; }

      const modal = document.getElementById('viewArticleModal');
      if (modal) {
        document.getElementById('viewTitle').textContent = article.title || 'N/A';
        document.getElementById('viewAuthors').textContent = article.authors || 'N/A';
        document.getElementById('viewJournal').textContent = [article.journal, article.year, article.volume ? `Vol. ${article.volume}` : '', article.issue ? `(${article.issue})` : '', article.pages].filter(Boolean).join(', ');
        document.getElementById('viewDoi').textContent = article.doi || 'N/A';
        document.getElementById('viewDoi').href = article.doi ? `https://doi.org/${article.doi}` : '#';
        document.getElementById('viewPmid').textContent = article.pmid || 'N/A';
        document.getElementById('viewAbstract').textContent = article.abstract || 'No abstract available.';
        document.getElementById('viewKeywords').textContent = article.keywords || 'N/A';
        document.getElementById('viewStatus').textContent = article.screening_status || 'pending';
        document.getElementById('viewSource').textContent = article.source || 'N/A';

        // Load screening results
        const screeningDiv = document.getElementById('viewScreeningResults');
        if (screeningDiv) {
          screeningDiv.innerHTML = '<p class="text-muted">Loading screening results...</p>';
          try {
            const data = await api.getArticleScreening(articleId);
            const screenings = data.screenings || [];
            if (screenings.length > 0) {
              screeningDiv.innerHTML = screenings.map((s, i) => {
                let html = `<div class="screening-result" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">`;
                html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
                html += `<strong>Screening #${i + 1}</strong>`;
                const badge = s.decision === 'include' ? 'success' : s.decision === 'exclude' ? 'danger' : 'warning';
                html += `<span class="badge badge-${badge}">${s.decision}</span>`;
                html += `</div>`;
                html += `<p style="margin:4px 0;"><strong>Model:</strong> ${s.model_name || 'N/A'}</p>`;
                html += `<p style="margin:4px 0;"><strong>Rationale:</strong> ${s.reasoning || 'N/A'}</p>`;
                html += `<p style="margin:4px 0;font-size:0.85em;color:var(--text-secondary);">${new Date(s.created_at).toLocaleString()}</p>`;

                // Token usage
                if (s.prompt_tokens || s.completion_tokens) {
                  html += `<div style="margin-top:6px;padding:6px 10px;background:var(--bg-secondary);border-radius:6px;font-size:0.85em;">`;
                  html += `<strong>Tokens:</strong> Input: ${s.prompt_tokens || 0} | Output: ${s.completion_tokens || 0} | Total: ${s.total_tokens || 0}`;
                  html += `</div>`;
                }

                // Inclusion evaluation
                if (s.inclusion_evaluation && s.inclusion_evaluation.length > 0) {
                  html += `<div style="margin-top:8px;"><strong style="color:var(--success);">Inclusion Criteria:</strong><ul style="margin:4px 0 0 16px;">`;
                  s.inclusion_evaluation.forEach(ev => {
                    const icon = ev.status === 'met' ? '✅' : ev.status === 'not_met' ? '❌' : '❓';
                    html += `<li>${icon} ${UI.escapeHtml(ev.criterion)} — <em>${ev.status}</em></li>`;
                  });
                  html += `</ul></div>`;
                }

                // Exclusion evaluation
                if (s.exclusion_evaluation && s.exclusion_evaluation.length > 0) {
                  html += `<div style="margin-top:8px;"><strong style="color:var(--danger);">Exclusion Criteria:</strong><ul style="margin:4px 0 0 16px;">`;
                  s.exclusion_evaluation.forEach(ev => {
                    const icon = ev.status === 'met' ? '❌' : ev.status === 'not_met' ? '✅' : '❓';
                    html += `<li>${icon} ${UI.escapeHtml(ev.criterion)} — <em>${ev.status}</em></li>`;
                  });
                  html += `</ul></div>`;
                }

                html += `</div>`;
                return html;
              }).join('');
            } else {
              screeningDiv.innerHTML = '<p class="text-muted">No screening results yet.</p>';
            }
          } catch (err) {
            screeningDiv.innerHTML = '<p class="text-muted">Could not load screening results.</p>';
          }
        }

        UI.showModal('viewArticleModal');
      }
    } catch (error) {
      notify.error(error.message);
    }
  },

  editProject() {
    if (!this.currentProject) return;
    document.getElementById('editProjectName').value = this.currentProject.name || '';
    document.getElementById('editProjectDesc').value = this.currentProject.description || '';
    document.getElementById('editProjectQuestion').value = this.currentProject.research_question || '';
    UI.showModal('editProjectModal');
  },

  async saveProjectEdits() {
    if (!this.currentProject) return;
    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();
    const research_question = document.getElementById('editProjectQuestion').value.trim();
    if (!name) { notify.warning('Project name is required'); return; }

    const btn = document.getElementById('saveProjectEditBtn');
    UI.setLoading(btn, true);
    try {
      await api.updateProject(this.currentProject.id, {
        action: 'update-project', name, description, research_question
      });
      UI.hideModal('editProjectModal');
      notify.success('Project updated');
      this.loadProjectDetails(this.currentProject.id);
    } catch (error) {
      notify.error('Failed to update project: ' + error.message);
    } finally {
      UI.setLoading(btn, false, '💾 Save');
    }
  },

  async removeArticle(articleId) {
    if (!confirm('Remove this article from the project?')) return;
    try {
      await api.updateProject(this.currentProject.id, { action: 'delete', articleId });
      notify.success('Article removed');
      this.loadProjectDetails(this.currentProject.id);
    } catch (error) {
      notify.error('Failed to remove article: ' + error.message);
    }
  },

  async uploadFile() {
    const fileInput = document.getElementById('uploadFileInput');
    if (!fileInput.files.length) { notify.warning('Please select a file'); return; }

    const btn = document.getElementById('uploadFileBtn');
    UI.setLoading(btn, true);

    try {
      const result = await api.uploadToProject(this.currentProject.id, fileInput.files[0]);
      notify.success(result.message);
      fileInput.value = '';
      document.getElementById('uploadForm').style.display = 'none';
      this.loadProjectDetails(this.currentProject.id);
    } catch (error) {
      notify.error('Upload failed: ' + error.message);
    } finally {
      UI.setLoading(btn, false, '📤 Upload');
    }
  },

  downloadProject() {
    if (!this.currentProject) return;
    const token = localStorage.getItem('auth_token');
    window.open(`/api/spreadsheets/${this.currentProject.id}/download?token=${token}`, '_blank');
  },

  async deleteProject() {
    if (!this.currentProject) return;
    if (!confirm(`Delete project "${this.currentProject.name}" and ALL associated data?\n\nThis includes all articles, searches, and screening results. This cannot be undone.`)) return;

    try {
      await api.deleteProject(this.currentProject.id);
      notify.success('Project deleted');
      document.getElementById('projectDetails').style.display = 'none';
      document.getElementById('projectList').style.display = 'block';
      this.currentProject = null;
      this.loadProjects();
      SearchModule.loadProjectsDropdown();
    } catch (error) {
      notify.error('Failed to delete project: ' + error.message);
    }
  },

  async addArticle() {
    const articleData = {
      title: document.getElementById('addTitle').value,
      authors: document.getElementById('addAuthors').value,
      year: document.getElementById('addYear').value,
      journal: document.getElementById('addJournal').value,
      doi: document.getElementById('addDoi').value,
      pmid: document.getElementById('addPmid').value,
      abstract: document.getElementById('addAbstract').value,
      keywords: document.getElementById('addKeywords').value,
      url: document.getElementById('addUrl').value,
      publication_type: document.getElementById('addPubType').value,
      volume: document.getElementById('addVolume').value,
      issue: document.getElementById('addIssue').value,
      pages: document.getElementById('addPages').value,
      language: document.getElementById('addLanguage').value
    };

    if (!articleData.title) { notify.warning('Title is required'); return; }
    if (!articleData.abstract) { notify.warning('Abstract is required'); return; }

    try {
      await api.updateProject(this.currentProject.id, { action: 'add', articleData });
      UI.hideModal('addArticleModal');
      document.getElementById('addArticleForm').reset();
      notify.success('Article added successfully!');
      this.loadProjectDetails(this.currentProject.id);
    } catch (error) {
      notify.error('Failed to add article: ' + error.message);
    }
  }
};
