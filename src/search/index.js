const PubMedSearcher = require('./pubmedSearcher');
const ScopusSearcher = require('./scopusSearcher');
const WebOfScienceSearcher = require('./webOfScienceSearcher');
const EmbaseSearcher = require('./embaseSearcher');

const searchers = {
  pubmed: new PubMedSearcher(),
  scopus: new ScopusSearcher(),
  wos: new WebOfScienceSearcher(),
  embase: new EmbaseSearcher()
};

function getSearcher(name) {
  return searchers[name] || null;
}

function getAvailableSearchers() {
  return Object.entries(searchers).map(([name, searcher]) => ({
    name,
    available: searcher.isAvailable(),
    label: {
      pubmed: 'PubMed',
      scopus: 'Scopus',
      wos: 'Web of Science',
      embase: 'Embase'
    }[name] || name
  }));
}

module.exports = { getSearcher, getAvailableSearchers, searchers };
