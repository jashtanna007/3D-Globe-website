/**
 * Severity Calculator
 * Aggregates classified + geolocated articles into per-country severity scores.
 */

/**
 * Calculate severity for each country based on its articles.
 * @param {Array} articles - Classified and geolocated articles
 *   Each: { title, description, source, publishedAt, type, confidence, keywordWeight, country, lat, lng }
 * @returns {Array} Sorted array of country crisis data
 *   Each: { country, lat, lng, severity, dominantType, articles, articleCount }
 */
export function calculateSeverity(articles) {
  // Group articles by country
  const countryMap = {};

  for (const article of articles) {
    if (!article.country) continue;

    if (!countryMap[article.country]) {
      countryMap[article.country] = {
        country: article.country,
        lat: article.lat,
        lng: article.lng,
        articles: [],
        typeWeights: { conflict: 0, economic: 0, disaster: 0 },
        totalWeight: 0,
      };
    }

    const entry = countryMap[article.country];
    entry.articles.push(article);
    entry.typeWeights[article.type] = (entry.typeWeights[article.type] || 0) + (article.keywordWeight || 1);
    entry.totalWeight += article.keywordWeight || 1;
  }

  // Calculate severity and dominant type for each country
  const result = Object.values(countryMap).map(entry => {
    const articleCount = entry.articles.length;

    // Severity formula: base from article count + bonus from keyword weights
    // Normalized between 0 and 1
    const countScore = articleCount / 10;
    const weightScore = entry.totalWeight / 30;
    const severity = Math.min(1, countScore * 0.6 + weightScore * 0.4);

    // Dominant type: highest accumulated weight
    let dominantType = 'conflict';
    let maxTypeWeight = 0;
    for (const [type, weight] of Object.entries(entry.typeWeights)) {
      if (weight > maxTypeWeight) {
        dominantType = type;
        maxTypeWeight = weight;
      }
    }

    return {
      country: entry.country,
      lat: entry.lat,
      lng: entry.lng,
      severity,
      dominantType,
      articles: entry.articles,
      articleCount,
    };
  });

  // Sort by severity descending
  result.sort((a, b) => b.severity - a.severity);

  return result;
}
