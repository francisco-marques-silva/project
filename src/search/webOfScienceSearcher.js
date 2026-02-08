const axios = require('axios');
const BaseSearcher = require('./baseSearcher');
const config = require('../core/config');

class WebOfScienceSearcher extends BaseSearcher {
  constructor() {
    super('wos', config.databases.wos);
    this.baseUrl = config.databases.wos.baseUrl;
    this.apiKey = config.databases.wos.apiKey;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Web of Science API key not configured');
    }

    const { yearStart, yearEnd, maxResults = 100 } = options;

    let searchQuery = query;
    if (yearStart || yearEnd) {
      const start = yearStart || 1900;
      const end = yearEnd || new Date().getFullYear();
      searchQuery = `TS=(${query}) AND PY=(${start}-${end})`;
    } else {
      searchQuery = `TS=(${query})`;
    }

    const articles = [];
    let page = 1;
    const pageSize = Math.min(maxResults, 50);
    let totalCount = 0;

    while (articles.length < maxResults) {
      const response = await axios.get(`${this.baseUrl}/documents`, {
        headers: {
          'X-ApiKey': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: searchQuery,
          limit: pageSize,
          page: page,
          db: 'WOS',
          sortField: 'PY+D'
        },
        timeout: 30000
      });

      const data = response.data;
      totalCount = data.metadata?.total || 0;
      const hits = data.hits || [];

      if (hits.length === 0) break;

      for (const hit of hits) {
        if (articles.length >= maxResults) break;

        let authors = '';
        if (hit.names?.authors) {
          authors = hit.names.authors.map(a => a.displayName || a.wosStandard || '').join('; ');
        }

        let keywords = '';
        if (hit.keywords?.authorKeywords) {
          keywords = hit.keywords.authorKeywords.join('; ');
        }

        articles.push(this.normalizeArticle({
          title: hit.title || '',
          abstract: hit.abstract || '',
          authors,
          journal: hit.source?.sourceTitle || '',
          year: hit.source?.publishYear ? parseInt(hit.source.publishYear) : null,
          doi: hit.identifiers?.doi || '',
          wos_id: hit.uid || '',
          publication_type: hit.docType || '',
          keywords,
          volume: hit.source?.volume || '',
          issue: hit.source?.issue || '',
          pages: hit.source?.pages ? hit.source.pages.range || '' : '',
          issn: hit.source?.issn || ''
        }));
      }

      page++;
      if (articles.length >= totalCount) break;
    }

    return { articles, totalCount };
  }
}

module.exports = WebOfScienceSearcher;
