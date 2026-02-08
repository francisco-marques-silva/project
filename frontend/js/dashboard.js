/**
 * Dashboard Module
 */
const Dashboard = {
  async loadStats() {
    try {
      const data = await api.getStats();
      const stats = data.stats;
      document.getElementById('statProjects').textContent = stats.projects || 0;
      document.getElementById('statSearches').textContent = stats.searches || 0;
      document.getElementById('statArticles').textContent = stats.articles || 0;
      document.getElementById('statScreenings').textContent = stats.screenings || 0;
      document.getElementById('statRequests').textContent = stats.apiRequests || 0;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  },

  async loadActivity() {
    try {
      const data = await api.getActivity(15);
      const feed = document.getElementById('activityFeed');
      
      if (!data.activities || data.activities.length === 0) {
        feed.innerHTML = '<p class="text-muted">No recent activity. Start by creating a project!</p>';
        return;
      }

      feed.innerHTML = data.activities.map(a => `
        <div class="activity-item">
          <span class="activity-icon">${
            a.type === 'search' ? '🔍' :
            a.type === 'screening' ? '🤖' :
            a.type === 'project' ? '📁' : '📋'
          }</span>
          <div class="activity-content">
            <strong>${UI.escapeHtml(a.description)}</strong>
            <p>${UI.escapeHtml(a.details)}</p>
            <small class="text-muted">${UI.formatDate(a.timestamp)}</small>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  },

  init() {
    this.loadStats();
    this.loadActivity();
  }
};
