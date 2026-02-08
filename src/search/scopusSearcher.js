const axios = require('axios');
const BaseSearcher = require('./baseSearcher');
const config = require('../core/config');

class ScopusSearcher extends BaseSearcher {
  constructor() {
    super('scopus', config.databases.scopus);
    this.baseUrl = config.databases.scopus.baseUrl;
    this.apiKey = config.databases.scopus.apiKey;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Scopus API key not configured');
    }

    const { yearStart, yearEnd, maxResults = 100 } = options;

    let searchQuery = query;
    if (yearStart || yearEnd) {
      const start = yearStart || 1900;
      const end = yearEnd || new Date().getFullYear();
      searchQuery = `TITLE-ABS-KEY(${query}) AND PUBYEAR > ${start - 1} AND PUBYEAR < ${end + 1}`;
    } else {
      searchQuery = `TITLE-ABS-KEY(${query})`;
    }

    const articles = [];
    let startIndex = 0;
    const pageSize = Math.min(maxResults, 25);
    let totalCount = 0;

    while (articles.length < maxResults) {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'X-ELS-APIKey': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          query: searchQuery,
          start: startIndex,
          count: pageSize,
          sort: '-date'
        },
        timeout: 30000
      });

      const data = response.data['search-results'];
      totalCount = parseInt(data['opensearch:totalResults'] || '0');
      const entries = data.entry || [];

      if (entries.length === 0) break;

      for (const entry of entries) {
        if (articles.length >= maxResults) break;

        const doi = entry['prism:doi'] || '';
        const scopusId = entry['dc:identifier']?.replace('SCOPUS_ID:', '') || '';
        
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
          doi,
          scopus_id: scopusId,
          publication_type: entry.subtypeDescription || entry.subtype || '',
          volume: entry['prism:volume'] || '',
          issue: entry['prism:issueIdentifier'] || '',
          pages: entry['prism:pageRange'] || '',
          issn: entry['prism:issn'] || '',
          url: entry.link?.find(l => l['@ref'] === 'scopus')?.['@href'] || ''
        }));
      }

      startIndex += pageSize;
      if (startIndex >= totalCount) break;
    }

    return { articles, totalCount };
  }
}

module.exports = ScopusSearcher;
