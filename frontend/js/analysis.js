/**
 * AI Analysis Module
 */
const Analysis = {
  providers: [],
  models: [],

  async init() {
    await this.loadProviders();
    this.setupEventListeners();
  },

  async loadProviders() {
    try {
      const [providerData, modelData] = await Promise.all([
        api.getProviders(),
        api.getModels()
      ]);

      this.providers = providerData.providers;
      this.models = modelData.models;

      const providerSelect = document.getElementById('analysisProvider');
      if (providerSelect) {
        providerSelect.innerHTML = '<option value="">Select provider...</option>';
        for (const p of this.providers) {
          if (p.available) {
            providerSelect.innerHTML += `<option value="${p.name}">${p.label}</option>`;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  },

  setupEventListeners() {
    // Provider change -> update models
    const providerSelect = document.getElementById('analysisProvider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        this.updateModelSelect(providerSelect.value);
      });
    }

    // Preview prompt
    const previewBtn = document.getElementById('previewPromptBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewPrompt());
    }

    // Test single
    const testBtn = document.getElementById('testSingleBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testSingle());
    }

    // Run batch
    const batchBtn = document.getElementById('runBatchBtn');
    if (batchBtn) {
      batchBtn.addEventListener('click', () => this.runBatch());
    }
  },

  updateModelSelect(providerName) {
    const modelSelect = document.getElementById('analysisModel');
    if (!modelSelect) return;

    modelSelect.innerHTML = '<option value="">Default</option>';
    const providerModels = this.models.filter(m => m.provider === providerName);
    for (const m of providerModels) {
      modelSelect.innerHTML += `<option value="${m.id}" ${m.isDefault ? 'selected' : ''}>${m.id}</option>`;
    }
  },

  getFormData() {
    return {
      projectId: document.getElementById('analysisProject').value,
      provider: document.getElementById('analysisProvider').value,
      model: document.getElementById('analysisModel').value || undefined,
      pico_question: document.getElementById('picoQuestion').value,
      inclusion_criteria: document.getElementById('inclusionCriteria').value,
      exclusion_criteria: document.getElementById('exclusionCriteria').value
    };
  },

  async previewPrompt() {
    const data = this.getFormData();
    if (!data.pico_question) {
      notify.warning('PICO question is required');
      return;
    }

    try {
      // Get a sample article from the project
      const projectData = await api.getProject(data.projectId, 1, 1);
      const sampleArticle = projectData.articles[0] || { title: 'Sample Title', abstract: 'Sample Abstract' };

      const result = await api.previewPrompt({
        article: sampleArticle,
        pico_question: data.pico_question,
        inclusion_criteria: data.inclusion_criteria,
        exclusion_criteria: data.exclusion_criteria
      });

      document.getElementById('promptPreviewContent').textContent = result.prompt;
      UI.showModal('promptPreviewModal');
    } catch (error) {
      notify.error('Preview failed: ' + error.message);
    }
  },

  async testSingle() {
    const data = this.getFormData();
    if (!data.projectId || !data.provider || !data.pico_question) {
      notify.warning('Project, provider, and PICO question are required');
      return;
    }

    const btn = document.getElementById('testSingleBtn');
    UI.setLoading(btn, true);

    try {
      // Get first article from project
      const projectData = await api.getProject(data.projectId, 1, 1);
      if (!projectData.articles.length) {
        notify.warning('No articles in the project to test');
        return;
      }

      const article = projectData.articles[0];
      const result = await api.screenSingle({
        article,
        provider: data.provider,
        model: data.model,
        pico_question: data.pico_question,
        inclusion_criteria: data.inclusion_criteria,
        exclusion_criteria: data.exclusion_criteria
      });

      const r = result.result;
      const container = document.getElementById('singleTestContent');

      // Build inclusion/exclusion evaluation HTML
      let evalHtml = '';
      if (r.inclusion_evaluation && r.inclusion_evaluation.length) {
        evalHtml += '<div class="mt-2"><strong>Inclusion Criteria Evaluation:</strong><ul class="eval-list">';
        for (const ev of r.inclusion_evaluation) {
          const icon = ev.status === 'met' ? '✅' : ev.status === 'unmet' ? '❌' : '❓';
          evalHtml += `<li>${icon} <em>${UI.escapeHtml(ev.criterion)}</em> → <strong>${ev.status}</strong></li>`;
        }
        evalHtml += '</ul></div>';
      }
      if (r.exclusion_evaluation && r.exclusion_evaluation.length) {
        evalHtml += '<div class="mt-1"><strong>Exclusion Criteria Evaluation:</strong><ul class="eval-list">';
        for (const ev of r.exclusion_evaluation) {
          const icon = ev.status === 'met' ? '❌' : ev.status === 'unmet' ? '✅' : '❓';
          evalHtml += `<li>${icon} <em>${UI.escapeHtml(ev.criterion)}</em> → <strong>${ev.status}</strong></li>`;
        }
        evalHtml += '</ul></div>';
      }

      // Token usage
      let tokenHtml = '';
      if (r.usage) {
        tokenHtml = `<div class="result-item"><span class="label">Tokens:</span><span>${r.usage.promptTokens || '?'} in / ${r.usage.completionTokens || '?'} out (${r.usage.totalTokens || '?'} total)</span></div>`;
      }

      container.innerHTML = `
        <div class="test-result">
          <h4>${UI.escapeHtml(UI.truncate(article.title, 80))}</h4>
          <div class="result-grid">
            <div class="result-item">
              <span class="label">Decision:</span>
              <span class="badge badge-${r.decision === 'include' ? 'success' : (r.decision === 'maybe' ? 'warning' : 'danger')}">${r.decision}</span>
            </div>
            <div class="result-item">
              <span class="label">Model:</span>
              <span>${r.model} (${r.provider})</span>
            </div>
            ${tokenHtml}
          </div>
          <div class="result-reasoning">
            <strong>Rationale:</strong>
            <p>${UI.escapeHtml(r.rationale || r.reasoning || '')}</p>
          </div>
          ${evalHtml}
        </div>
      `;
      UI.showModal('singleTestModal');
      notify.success('Test completed!');
    } catch (error) {
      notify.error('Test failed: ' + error.message);
    } finally {
      UI.setLoading(btn, false, '🧪 Test Single');
    }
  },

  async runBatch() {
    const data = this.getFormData();
    if (!data.projectId || !data.provider || !data.pico_question) {
      notify.warning('Project, provider, and PICO question are required');
      return;
    }

    if (!confirm('This will screen all pending articles in the project using AI. Continue?')) return;

    const btn = document.getElementById('runBatchBtn');
    UI.setLoading(btn, true);

    const batchDiv = document.getElementById('batchProgress');
    batchDiv.style.display = 'block';

    try {
      const response = await api.batchScreen(data);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              this.handleBatchEvent(event);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      notify.error('Batch analysis failed: ' + error.message);
    } finally {
      UI.setLoading(btn, false, '🚀 Run Full Analysis');
    }
  },

  handleBatchEvent(event) {
    const progressBar = document.getElementById('batchProgressBar');
    const stats = document.getElementById('batchStats');
    const results = document.getElementById('batchResults');

    switch (event.type) {
      case 'start':
        stats.innerHTML = `<p>Starting analysis of ${event.total} articles...</p>`;
        results.innerHTML = '';
        break;

      case 'progress': {
        const pct = Math.round((event.completed / event.total) * 100);
        progressBar.style.width = pct + '%';
        progressBar.textContent = pct + '%';

        stats.innerHTML = `
          <p>Progress: ${event.completed}/${event.total} | 
          ✅ Include: ${event.included} | 
          ❌ Exclude: ${event.excluded}</p>
        `;

        const c = event.current;
        let tokenInfo = '';
        if (c.usage) {
          tokenInfo = `<span class="text-sm text-muted" style="margin-left:8px;">Tokens: ${c.usage.promptTokens || 0}↑ ${c.usage.completionTokens || 0}↓</span>`;
        }
        results.innerHTML = `
          <div class="batch-result-item ${c.decision === 'include' ? 'result-include' : 'result-exclude'}">
            <strong>${UI.escapeHtml(UI.truncate(c.title, 70))}</strong>
            <span class="badge badge-${c.decision === 'include' ? 'success' : c.decision === 'exclude' ? 'danger' : 'warning'}">${c.decision}</span>
            ${tokenInfo}
            <p class="text-sm">${UI.escapeHtml(UI.truncate(c.rationale || '', 150))}</p>
          </div>
        ` + results.innerHTML;
        break;
      }

      case 'complete':
        notify.success(`Analysis complete! ${event.included} included, ${event.excluded} excluded out of ${event.total} articles.`);
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        stats.innerHTML = `
          <p><strong>Completed!</strong> ${event.completed}/${event.total} | 
          ✅ Include: ${event.included} | 
          ❌ Exclude: ${event.excluded}</p>
        `;
        break;

      case 'error':
        results.innerHTML = `
          <div class="batch-result-item result-error">
            <strong>Error</strong> on article ${event.articleId || event.recordId}: ${UI.escapeHtml(event.error)}
          </div>
        ` + results.innerHTML;
        break;

      case 'fatal_error':
        notify.error('Fatal error: ' + event.error);
        break;
    }
  }
};
