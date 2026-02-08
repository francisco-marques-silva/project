const XLSX = require('xlsx');

/**
 * Parse an uploaded XLSX/CSV file and extract article metadata
 */
function parseSpreadsheetBuffer(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    return { articles: [], columns: [] };
  }

  const columns = Object.keys(rows[0]);
  
  // Map common column names to our schema
  const articles = rows.map((row, index) => ({
    title: findColumn(row, ['title', 'titulo', 'article title']) || '',
    abstract: findColumn(row, ['abstract', 'resumo', 'summary']) || '',
    authors: findColumn(row, ['authors', 'autores', 'author']) || '',
    journal: findColumn(row, ['journal', 'revista', 'source', 'publication']) || '',
    year: parseInt(findColumn(row, ['year', 'ano', 'pub year', 'publication year'])) || null,
    doi: findColumn(row, ['doi', 'digital object identifier']) || '',
    pmid: findColumn(row, ['pmid', 'pubmed id']) || '',
    volume: findColumn(row, ['volume', 'vol']) || '',
    issue: findColumn(row, ['issue', 'number']) || '',
    pages: findColumn(row, ['pages', 'page', 'paginas']) || '',
    keywords: findColumn(row, ['keywords', 'palavras-chave', 'mesh']) || '',
    publication_type: findColumn(row, ['type', 'document type', 'publication type']) || '',
    language: findColumn(row, ['language', 'idioma']) || '',
    url: findColumn(row, ['url', 'link']) || '',
    issn: findColumn(row, ['issn']) || '',
    _row: row // Keep original row data
  }));

  return { articles, columns };
}

function findColumn(row, possibleNames) {
  for (const name of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim() === name.toLowerCase()) {
        return row[key];
      }
    }
  }
  return null;
}

/**
 * Generate an XLSX buffer from articles data
 */
function generateXLSX(articles, sheetName = 'Articles') {
  const data = articles.map(article => ({
    Title: article.title || '',
    Abstract: article.abstract || '',
    Authors: article.authors || '',
    Journal: article.journal || '',
    Year: article.year || '',
    DOI: article.doi || '',
    PMID: article.pmid || '',
    'Publication Type': article.publication_type || '',
    Keywords: article.keywords || '',
    Volume: article.volume || '',
    Issue: article.issue || '',
    Pages: article.pages || '',
    ISSN: article.issn || '',
    Language: article.language || '',
    URL: article.url || '',
    'Screening Status': article.screening_status || '',
    'AI Decision': article.ai_decision || '',
    'AI Confidence': article.ai_confidence || '',
    'AI Reasoning': article.ai_reasoning || ''
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseSpreadsheetBuffer,
  generateXLSX,
  findColumn
};
