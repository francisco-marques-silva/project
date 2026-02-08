const axios = require('axios');
const BaseSearcher = require('./baseSearcher');
const config = require('../core/config');

class EmbaseSearcher extends BaseSearcher {
  constructor() {
    super('embase', config.databases.embase);
    this.baseUrl = config.databases.embase.baseUrl;
    this.apiKey = config.databases.embase.apiKey;
    this.instToken = config.databases.embase.instToken;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Embase API key not configured');
    }

    const { yearStart, yearEnd, maxResults = 100 } = options;

    let searchQuery = `TITLE-ABS-KEY(${query})`;
    if (yearStart || yearEnd) {
      const start = yearStart || 1900;
      const end = yearEnd || new Date().getFullYear();
      searchQuery += ` AND PUBYEAR > ${start - 1} AND PUBYEAR < ${end + 1}`;
    }

    // Embase uses Scopus API with content=embase
    const articles = [];
    let startIndex = 0;
    const pageSize = Math.min(maxResults, 25);
    let totalCount = 0;

    const headers = {
      'X-ELS-APIKey': this.apiKey,
      'Accept': 'application/json'
    };
    if (this.instToken) {
      headers['X-ELS-Insttoken'] = this.instToken;
    }

    while (articles.length < maxResults) {
      const response = await axios.get(this.baseUrl, {
        headers,
        params: {
          query: searchQuery,
          start: startIndex,
          count: pageSize,
          sort: '-date',
          content: 'embase'
        },
        timeout: 30000
      });

      const data = response.data['search-results'];
      totalCount = parseInt(data['opensearch:totalResults'] || '0');
      const entries = data.entry || [];

      if (entries.length === 0) break;

      for (const entry of entries) {
        if (articles.length >= maxResults) break;

        let authors = '';
        if (entry.author) {
          const authorArr = Array.isArray(entry.author) ? entry.author : [entry.author];
          authors = authorArr.map(a => a['authname'] || '').join('; ');
        }

        articles.push(this.normalizeArticle({
          title: entry['dc:title'] || '',
          abstract: entry['dc:description'] || '',
          authors,
          journal: entry['prism:publicationName'] || '',
          year: entry['prism:coverDate'] ? parseInt(entry['prism:coverDate'].substring(0, 4)) : null,
          doi: entry['prism:doi'] || '',
          scopus_id: entry['dc:identifier']?.replace('SCOPUS_ID:', '') || '',
          publication_type: entry.subtypeDescription || '',
          volume: entry['prism:volume'] || '',
          issue: entry['prism:issueIdentifier'] || '',
          pages: entry['prism:pageRange'] || '',
          issn: entry['prism:issn'] || ''
        }));
      }

      startIndex += pageSize;
      if (startIndex >= totalCount) break;
    }

    return { articles, totalCount };
  }
}

module.exports = EmbaseSearcher;
