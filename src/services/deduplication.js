const crypto = require('crypto');

/**
 * Generate a fingerprint for deduplication based on title normalization
 */
function generateFingerprint(article) {
  const title = (article.title || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
  
  if (!title) return null;
  
  return crypto.createHash('md5').update(title).digest('hex');
}

/**
 * Check similarity between two articles based on multiple fields
 */
function areSimilar(a, b) {
  // Check DOI match
  if (a.doi && b.doi && a.doi.toLowerCase() === b.doi.toLowerCase()) {
    return true;
  }

  // Check PMID match
  if (a.pmid && b.pmid && a.pmid === b.pmid) {
    return true;
  }

  // Check title similarity
  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);
  
  if (titleA && titleB && titleA === titleB) {
    return true;
  }

  // Check Levenshtein distance for close matches
  if (titleA && titleB && titleA.length > 10 && titleB.length > 10) {
    const similarity = calculateSimilarity(titleA, titleB);
    if (similarity > 0.9) return true;
  }

  return false;
}

function normalizeTitle(title) {
  if (!title) return '';
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  // Use substr matching for efficiency
  let matches = 0;
  const words1 = shorter.split(' ');
  const words2 = longer.split(' ');
  
  for (const word of words1) {
    if (words2.includes(word)) matches++;
  }
  
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Deduplicate a list of articles, marking duplicates
 */
function deduplicateArticles(articles) {
  const unique = [];
  const duplicateIndices = new Set();

  for (let i = 0; i < articles.length; i++) {
    if (duplicateIndices.has(i)) continue;
    
    let isDuplicate = false;
    for (let j = 0; j < unique.length; j++) {
      if (areSimilar(articles[i], unique[j])) {
        isDuplicate = true;
        duplicateIndices.add(i);
        break;
      }
    }
    
    if (!isDuplicate) {
      unique.push(articles[i]);
    }
  }

  return {
    unique,
    duplicateCount: duplicateIndices.size,
    totalCount: articles.length
  };
}

module.exports = {
  generateFingerprint,
  areSimilar,
  deduplicateArticles,
  normalizeTitle,
  calculateSimilarity
};
