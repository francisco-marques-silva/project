class BaseSearcher {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  isAvailable() {
    return true;
  }

  async search(query, options = {}) {
    throw new Error('search() must be implemented by subclass');
  }

  normalizeArticle(raw) {
    return {
      title: raw.title || '',
      abstract: raw.abstract || '',
      authors: raw.authors || '',
      journal: raw.journal || '',
      year: raw.year || null,
      doi: raw.doi || '',
      pmid: raw.pmid || '',
      scopus_id: raw.scopus_id || '',
      wos_id: raw.wos_id || '',
      publication_type: raw.publication_type || '',
      keywords: raw.keywords || '',
      url: raw.url || '',
      volume: raw.volume || '',
      issue: raw.issue || '',
      pages: raw.pages || '',
      issn: raw.issn || '',
      language: raw.language || '',
      source_database: this.name
    };
  }
}

module.exports = BaseSearcher;
