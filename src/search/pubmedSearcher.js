const axios = require('axios');
const xml2js = require('xml2js');
const BaseSearcher = require('./baseSearcher');
const config = require('../core/config');

class PubMedSearcher extends BaseSearcher {
  constructor() {
    super('pubmed', config.databases.pubmed);
    this.baseUrl = config.databases.pubmed.baseUrl;
    this.apiKey = config.databases.pubmed.apiKey;
  }

  isAvailable() {
    return true; // PubMed works without API key
  }

  async search(query, options = {}) {
    const { yearStart, yearEnd, maxResults = 100, publicationTypes } = options;
    
    let searchQuery = query;
    
    // Add year filter
    if (yearStart || yearEnd) {
      const start = yearStart || 1900;
      const end = yearEnd || new Date().getFullYear();
      searchQuery += ` AND ${start}:${end}[dp]`;
    }
    
    // Add publication type filter
    if (publicationTypes && publicationTypes.length > 0) {
      const ptFilter = publicationTypes.map(pt => `"${pt}"[pt]`).join(' OR ');
      searchQuery += ` AND (${ptFilter})`;
    }

    // Step 1: ESearch to get IDs
    const searchParams = {
      db: 'pubmed',
      term: searchQuery,
      retmax: maxResults,
      retmode: 'json',
      usehistory: 'y'
    };
    if (this.apiKey) searchParams.api_key = this.apiKey;

    const searchResponse = await axios.get(`${this.baseUrl}/esearch.fcgi`, {
      params: searchParams,
      timeout: 30000
    });

    const searchResult = searchResponse.data;
    const idList = searchResult.esearchresult?.idlist || [];
    const totalCount = parseInt(searchResult.esearchresult?.count || '0');

    if (idList.length === 0) {
      return { articles: [], totalCount: 0 };
    }

    // Step 2: EFetch to get details
    const fetchParams = {
      db: 'pubmed',
      id: idList.join(','),
      retmode: 'xml',
      rettype: 'abstract'
    };
    if (this.apiKey) fetchParams.api_key = this.apiKey;

    const fetchResponse = await axios.get(`${this.baseUrl}/efetch.fcgi`, {
      params: fetchParams,
      timeout: 60000
    });

    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const xmlData = await parser.parseStringPromise(fetchResponse.data);

    let articles = [];
    let pubmedArticles = xmlData?.PubmedArticleSet?.PubmedArticle;
    if (!pubmedArticles) return { articles: [], totalCount: 0 };
    if (!Array.isArray(pubmedArticles)) pubmedArticles = [pubmedArticles];

    for (const article of pubmedArticles) {
      try {
        const medlineCitation = article.MedlineCitation;
        const articleData = medlineCitation?.Article;
        if (!articleData) continue;

        const pmid = medlineCitation?.PMID?._ || medlineCitation?.PMID || '';
        
        // Title
        const title = articleData.ArticleTitle?._ || articleData.ArticleTitle || '';
        
        // Abstract
        let abstract = '';
        const abstractText = articleData.Abstract?.AbstractText;
        if (abstractText) {
          if (Array.isArray(abstractText)) {
            abstract = abstractText.map(a => {
              const label = a.Label ? `${a.Label}: ` : '';
              const text = a._ || a;
              return label + text;
            }).join(' ');
          } else {
            abstract = abstractText._ || abstractText;
          }
        }

        // Authors
        let authors = '';
        const authorList = articleData.AuthorList?.Author;
        if (authorList) {
          const authorArr = Array.isArray(authorList) ? authorList : [authorList];
          authors = authorArr.map(a => {
            if (a.CollectiveName) return a.CollectiveName;
            return [a.LastName, a.ForeName].filter(Boolean).join(' ');
          }).join('; ');
        }

        // Journal
        const journal = articleData.Journal?.Title || articleData.Journal?.ISOAbbreviation || '';
        
        // Year
        const pubDate = articleData.Journal?.JournalIssue?.PubDate;
        let year = null;
        if (pubDate) {
          year = parseInt(pubDate.Year) || parseInt(pubDate.MedlineDate?.substring(0, 4)) || null;
        }

        // DOI
        let doi = '';
        const elocationIds = articleData.ELocationID;
        if (elocationIds) {
          const ids = Array.isArray(elocationIds) ? elocationIds : [elocationIds];
          const doiObj = ids.find(e => e.EIdType === 'doi');
          doi = doiObj?._ || doiObj || '';
        }

        // Volume, Issue, Pages
        const journalIssue = articleData.Journal?.JournalIssue;
        const volume = journalIssue?.Volume || '';
        const issue = journalIssue?.Issue || '';
        const pages = articleData.Pagination?.MedlinePgn || '';

        // ISSN
        const issn = articleData.Journal?.ISSN?._ || articleData.Journal?.ISSN || '';

        // Language
        const language = articleData.Language || '';

        // Publication type
        let publicationType = '';
        const ptList = articleData.PublicationTypeList?.PublicationType;
        if (ptList) {
          const pts = Array.isArray(ptList) ? ptList : [ptList];
          publicationType = pts.map(pt => pt._ || pt).join('; ');
        }

        // Keywords
        let keywords = '';
        const meshHeadings = medlineCitation?.MeshHeadingList?.MeshHeading;
        if (meshHeadings) {
          const headings = Array.isArray(meshHeadings) ? meshHeadings : [meshHeadings];
          keywords = headings.map(h => h.DescriptorName?._ || h.DescriptorName || '').filter(Boolean).join('; ');
        }

        articles.push(this.normalizeArticle({
          title, abstract, authors, journal, year, doi,
          pmid: String(pmid),
          publication_type: publicationType,
          keywords, volume, issue, pages, issn,
          language: Array.isArray(language) ? language[0] : language,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        }));
      } catch (err) {
        console.error('Error parsing PubMed article:', err.message);
      }
    }

    return { articles, totalCount };
  }
}

module.exports = PubMedSearcher;
