const { Op } = require('sequelize');
const { Work, Search, SearchResult, ProjectArticle, ScreeningEvent, UserSearchHistory } = require('../models');
const { generateFingerprint, normalizeTitle } = require('./deduplication');

/**
 * Save search results: creates Work entries, SearchResult entries, and ProjectArticle entries
 */
async function saveSearchResults(projectId, userId, searchData, articles) {
  // Create the search record
  const search = await Search.create({
    project_id: projectId,
    user_id: userId,
    source: searchData.database,
    query_text: searchData.query,
    year_start: searchData.yearStart ? parseInt(searchData.yearStart) : null,
    year_end: searchData.yearEnd ? parseInt(searchData.yearEnd) : null,
    max_results: searchData.maxResults ? parseInt(searchData.maxResults) : 100,
    results_count: articles.length,
    imported_at: new Date(),
    search_metadata: { filters: searchData.filters || {} }
  });

  let savedCount = 0;
  let duplicateCount = 0;

  for (const article of articles) {
    try {
      const fingerprint = generateFingerprint(article);
      const titleNorm = normalizeTitle(article.title);

      // Find or create Work (global dedup)
      let work = null;
      if (fingerprint) {
        work = await Work.findOne({ where: { fingerprint } });
      }
      if (!work && article.doi) {
        work = await Work.findOne({ where: { doi: article.doi } });
      }
      if (!work && article.pmid) {
        work = await Work.findOne({ where: { pmid: String(article.pmid) } });
      }

      if (!work) {
        work = await Work.create({
          title: article.title,
          title_normalized: titleNorm,
          abstract: article.abstract,
          authors: article.authors,
          year: article.year,
          journal: article.journal,
          doi: article.doi,
          pmid: article.pmid ? String(article.pmid) : null,
          scopus_id: article.scopus_id,
          wos_id: article.wos_id,
          publication_type: article.publication_type,
          keywords: article.keywords,
          url: article.url,
          volume: article.volume,
          issue: article.issue,
          pages: article.pages,
          issn: article.issn,
          language: article.language,
          fingerprint
        });
      }

      // Create SearchResult (raw search tracking)
      await SearchResult.create({
        search_id: search.id,
        work_id: work.id,
        source_record_id: article.pmid || article.scopus_id || article.doi || null,
        raw_data: article
      });

      // Check if already in project
      const existing = await ProjectArticle.findOne({
        where: { project_id: projectId, work_id: work.id }
      });

      if (existing) {
        duplicateCount++;
      } else {
        // Create ProjectArticle with metadata copied
        await ProjectArticle.create({
          project_id: projectId,
          work_id: work.id,
          source: searchData.database,
          search_id: search.id,
          title: article.title,
          abstract: article.abstract,
          authors: article.authors,
          year: article.year,
          journal: article.journal,
          doi: article.doi,
          pmid: article.pmid ? String(article.pmid) : null,
          keywords: article.keywords,
          url: article.url,
          volume: article.volume,
          issue: article.issue,
          pages: article.pages,
          publication_type: article.publication_type,
          language: article.language,
          issn: article.issn,
          is_duplicate: false,
          screening_status: 'pending'
        });
        savedCount++;
      }
    } catch (err) {
      console.error('Error saving article:', err.message);
    }
  }

  // Save search history
  await saveSearchHistory(userId, searchData, articles.length, savedCount);

  return { search, savedCount, duplicateCount, totalArticles: articles.length };
}

/**
 * Save/update user search history
 */
async function saveSearchHistory(userId, searchData, totalResults, uniqueResults) {
  try {
    const queryNorm = (searchData.query || '').toLowerCase().trim();
    const existing = await UserSearchHistory.findOne({
      where: {
        user_id: userId,
        query_normalized: queryNorm,
        databases: { [Op.contains]: [searchData.database] }
      }
    });

    if (existing) {
      existing.search_count += 1;
      existing.results_count = totalResults || existing.results_count;
      existing.last_searched_at = new Date();
      await existing.save();
    } else {
      await UserSearchHistory.create({
        user_id: userId,
        query_text: searchData.query,
        query_normalized: queryNorm,
        databases: [searchData.database],
        search_params: {
          yearStart: searchData.yearStart,
          yearEnd: searchData.yearEnd,
          maxResults: searchData.maxResults,
          filters: searchData.filters
        },
        results_count: totalResults || 0,
        unique_results_count: uniqueResults || 0,
        last_searched_at: new Date()
      });
    }
  } catch (err) {
    console.error('Error saving search history:', err.message);
  }
}

/**
 * Get project articles with optional search/filter
 */
async function getProjectArticles(projectId, options = {}) {
  const { page = 1, limit = 50, search = '' } = options;
  const offset = (page - 1) * limit;

  const where = { project_id: projectId };

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { authors: { [Op.iLike]: `%${search}%` } },
      { journal: { [Op.iLike]: `%${search}%` } },
      { doi: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows } = await ProjectArticle.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  return {
    articles: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
}

/**
 * Delete a project article
 */
async function deleteArticle(articleId, projectId) {
  const article = await ProjectArticle.findOne({
    where: { id: articleId, project_id: projectId }
  });
  if (!article) throw new Error('Article not found');

  // Screening events cascade-deleted via FK
  await article.destroy();
  return true;
}

/**
 * Add a manual article to a project (no work entry needed)
 */
async function addManualArticle(projectId, articleData) {
  const article = await ProjectArticle.create({
    project_id: projectId,
    source: articleData._source || 'manual',
    title: articleData.title || '',
    abstract: articleData.abstract || '',
    authors: articleData.authors || '',
    year: articleData.year ? parseInt(articleData.year) : null,
    journal: articleData.journal || '',
    doi: articleData.doi || '',
    pmid: articleData.pmid || '',
    keywords: articleData.keywords || '',
    url: articleData.url || '',
    volume: articleData.volume || '',
    issue: articleData.issue || '',
    pages: articleData.pages || '',
    publication_type: articleData.publication_type || '',
    language: articleData.language || '',
    issn: articleData.issn || '',
    screening_status: 'pending',
    is_duplicate: false
  });

  return article;
}

/**
 * Add articles from uploaded file to a project
 */
async function addUploadedArticles(projectId, articles) {
  let savedCount = 0;
  let duplicateCount = 0;

  for (const article of articles) {
    try {
      // Check for duplicates by DOI or title
      const where = { project_id: projectId };
      let isDuplicate = false;

      if (article.doi) {
        const byDoi = await ProjectArticle.findOne({
          where: { ...where, doi: article.doi }
        });
        if (byDoi) { isDuplicate = true; duplicateCount++; continue; }
      }

      if (article.title) {
        const titleNorm = normalizeTitle(article.title);
        if (titleNorm) {
          const existing = await ProjectArticle.findAll({ where });
          for (const ex of existing) {
            if (normalizeTitle(ex.title) === titleNorm) {
              isDuplicate = true; duplicateCount++; break;
            }
          }
          if (isDuplicate) continue;
        }
      }

      await addManualArticle(projectId, { ...article, _source: 'upload' });
      savedCount++;
    } catch (err) {
      console.error('Error saving uploaded article:', err.message);
    }
  }

  return { savedCount, duplicateCount, total: articles.length };
}

module.exports = {
  saveSearchResults,
  saveSearchHistory,
  getProjectArticles,
  deleteArticle,
  addManualArticle,
  addUploadedArticles
};
