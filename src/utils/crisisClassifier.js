/**
 * Crisis Classification Utility
 * Classifies news articles into: conflict, economic, or disaster
 * based on keyword matching with weighted confidence scoring.
 */

const KEYWORD_SETS = {
  conflict: {
    keywords: [
      'war', 'military', 'army', 'attack', 'troops', 'missile', 'bomb',
      'bombing', 'invasion', 'terrorism', 'terrorist', 'conflict', 'combat',
      'offensive', 'strikes', 'weapon', 'soldier', 'militia', 'rebel',
      'insurgent', 'assassination', 'drone strike', 'artillery', 'ammunition',
      'ceasefire', 'airstrike', 'gunfire', 'hostage', 'cartel', 'crackdown',
      'junta', 'coup', 'warzone', 'ballistic', 'nuclear', 'deployed',
    ],
    weights: { 'war': 3, 'military': 2, 'attack': 2, 'terrorism': 3, 'bomb': 3, 'missile': 3, 'invasion': 3 },
  },
  economic: {
    keywords: [
      'inflation', 'gdp', 'recession', 'market crash', 'unemployment',
      'deficit', 'sanctions', 'economy', 'economic', 'stock market',
      'financial', 'debt', 'currency', 'trade war', 'downturn', 'bankrupt',
      'interest rate', 'fiscal', 'monetary', 'austerity', 'oil price',
      'energy price', 'cost of living', 'poverty', 'market',
    ],
    weights: { 'recession': 3, 'inflation': 2, 'market crash': 3, 'sanctions': 2, 'economic': 1 },
  },
  disaster: {
    keywords: [
      'earthquake', 'flood', 'hurricane', 'tsunami', 'wildfire', 'volcano',
      'volcanic', 'cyclone', 'drought', 'tornado', 'landslide', 'avalanche',
      'storm', 'typhoon', 'disaster', 'catastrophe', 'evacuation', 'devastation',
      'famine', 'epidemic', 'pandemic', 'eruption', 'seismic',
    ],
    weights: { 'earthquake': 3, 'tsunami': 3, 'hurricane': 3, 'flood': 2, 'wildfire': 2, 'volcano': 3 },
  },
};

/**
 * Classify a single article into a crisis type.
 * @param {Object} article - { title, description }
 * @returns {{ type: string, confidence: number, keywordWeight: number }}
 */
export function classifyArticle(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const scores = {};

  for (const [type, config] of Object.entries(KEYWORD_SETS)) {
    let count = 0;
    let weight = 0;

    for (const keyword of config.keywords) {
      // Count occurrences in text
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
        weight += (config.weights[keyword] || 1) * matches.length;
      }
    }

    scores[type] = { count, weight };
  }

  // Find the dominant type (highest weight, then count as tiebreaker)
  let bestType = 'conflict';
  let bestWeight = 0;
  let bestCount = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score.weight > bestWeight || (score.weight === bestWeight && score.count > bestCount)) {
      bestType = type;
      bestWeight = score.weight;
      bestCount = score.count;
    }
  }

  // If no keywords matched at all, default based on simple heuristics
  if (bestWeight === 0) {
    bestType = 'conflict'; // default
  }

  const confidence = Math.min(1, bestWeight / 6);

  return {
    type: bestType,
    confidence,
    keywordWeight: bestWeight,
  };
}

/**
 * Classify an array of articles.
 * @param {Array} articles
 * @returns {Array} articles with added type, confidence, keywordWeight fields
 */
export function classifyArticles(articles) {
  return articles.map(article => {
    const classification = classifyArticle(article);
    return { ...article, ...classification };
  });
}
