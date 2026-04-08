/**
 * Crisis Classification Utility — Multi-Signal Approach
 * 
 * Uses three layers of classification:
 *   1. STRONG PHRASES — Multi-word phrases that unambiguously indicate a category.
 *      If found, they give a large bonus. This prevents false positives from
 *      single generic words like "market" or "attack".
 *   2. WEIGHTED KEYWORDS — Single keywords with weights. Same as before but with
 *      stricter, more specific terms.
 *   3. EXCLUSION PATTERNS — If certain context words appear near a keyword,
 *      that keyword's score is reduced. E.g., "cyber attack" should not boost
 *      the conflict score as much as "military attack".
 *
 * Articles that don't meet a minimum confidence threshold are classified as
 * "general" instead of being forced into a category.
 */

// ── STRONG INDICATOR PHRASES (multi-word, high confidence) ──
const STRONG_PHRASES = {
  conflict: [
    'military offensive', 'military operation', 'armed conflict', 'armed forces',
    'drone strike', 'air strike', 'airstrike', 'missile strike', 'missile attack',
    'artillery fire', 'artillery shells', 'artillery bombardment',
    'military troops', 'deployed troops', 'troop deployment',
    'suicide bomb', 'car bomb', 'terrorist attack', 'terror attack',
    'insurgent attack', 'rebel forces', 'rebel attack',
    'civil war', 'armed resistance', 'guerrilla warfare',
    'ceasefire violation', 'border conflict', 'border clash',
    'hostage crisis', 'hostage situation',
    'nuclear threat', 'nuclear weapon', 'ballistic missile',
    'military junta', 'coup attempt', 'military coup',
    'ethnic cleansing', 'war crimes', 'war zone', 'warzone',
    'military escalation', 'combat operations', 'combat zone',
    'ground offensive', 'ground invasion', 'full-scale invasion',
    'drug cartel violence', 'cartel attacks', 'drug war',
    'militia forces', 'paramilitary forces',
    'weapons of mass destruction', 'chemical weapons',
  ],
  economic: [
    'economic crisis', 'economic downturn', 'economic recession',
    'economic collapse', 'economic sanctions', 'economic decline',
    'financial crisis', 'financial collapse', 'financial meltdown',
    'stock market crash', 'market crash', 'market collapse', 'market downturn',
    'inflation rate', 'inflation rises', 'inflation surges', 'inflation soars',
    'interest rate hike', 'interest rate cut', 'interest rate rise',
    'gdp growth', 'gdp decline', 'gdp contraction', 'gdp shrinks',
    'unemployment rate', 'unemployment rises', 'unemployment surges',
    'trade war', 'trade sanctions', 'trade deficit',
    'currency collapse', 'currency crisis', 'currency devaluation',
    'debt crisis', 'sovereign debt', 'national debt',
    'fiscal deficit', 'budget deficit', 'fiscal policy',
    'oil price crash', 'oil price surge', 'energy crisis', 'energy price',
    'cost of living crisis', 'cost of living',
    'bank collapse', 'banking crisis', 'bank run',
    'recession fears', 'recession deepens', 'enters recession',
    'market falters', 'economic value', 'purchasing power',
    'austerity measures', 'monetary policy',
  ],
  disaster: [
    'natural disaster', 'earthquake strikes', 'earthquake hits',
    'magnitude earthquake', 'powerful earthquake', 'major earthquake',
    'tsunami warning', 'tsunami alert', 'tsunami hits',
    'hurricane category', 'hurricane devastates', 'hurricane hits',
    'tropical cyclone', 'cyclone devastates', 'cyclone hits',
    'massive floods', 'flooding displaces', 'flash floods', 'flood waters',
    'wildfire emergency', 'wildfire burns', 'wildfire devastates',
    'volcanic eruption', 'volcano erupts', 'lava flows',
    'tornado warning', 'tornado touches down', 'tornado destroys',
    'landslide buries', 'landslide kills', 'mudslide',
    'avalanche warning', 'avalanche kills',
    'drought crisis', 'severe drought', 'water crisis',
    'famine crisis', 'food crisis', 'food shortage',
    'mass evacuation', 'forced evacuation', 'evacuation order',
    'catastrophic damage', 'widespread destruction', 'widespread devastation',
    'seismic activity', 'aftershock',
  ],
  health: [
    'pandemic outbreak', 'pandemic spreads', 'pandemic declared',
    'epidemic spreads', 'epidemic outbreak', 'epidemic declared',
    'disease outbreak', 'disease spreads', 'disease cluster',
    'virus spreads', 'virus detected', 'viral outbreak', 'new virus',
    'covid surge', 'covid variant', 'covid outbreak', 'covid wave',
    'infection rate', 'infection surge', 'infection spreads',
    'vaccine rollout', 'vaccine shortage', 'vaccine mandate',
    'quarantine imposed', 'quarantine zone', 'quarantine order',
    'health emergency', 'public health crisis', 'health crisis',
    'hospital overwhelmed', 'hospital capacity', 'icu capacity',
    'mortality rate', 'death toll rises', 'fatality rate',
    'who declares', 'who warns', 'world health organization',
    'contagion spreads', 'highly contagious',
    'lockdown imposed', 'lockdown extended', 'lockdown measures',
  ],
};

// ── SINGLE KEYWORDS with weights ──
// Only high-specificity words that rarely appear outside their crisis context
const KEYWORD_SETS = {
  conflict: {
    keywords: [
      'war', 'military', 'army', 'troops', 'missile', 'bomb', 'bombing',
      'invasion', 'terrorism', 'terrorist', 'combat', 'offensive',
      'weapon', 'soldier', 'militia', 'rebel', 'insurgent',
      'assassination', 'artillery', 'ammunition', 'ceasefire', 'airstrike',
      'gunfire', 'hostage', 'crackdown', 'junta', 'coup', 'ballistic',
      'deployed',
    ],
    weights: {
      'war': 3, 'terrorism': 3, 'terrorist': 3, 'bomb': 3, 'bombing': 3,
      'missile': 3, 'invasion': 3, 'airstrike': 3, 'coup': 3,
      'military': 2, 'army': 2, 'troops': 2, 'combat': 2,
      'soldier': 2, 'artillery': 2, 'ammunition': 2,
      'militia': 2, 'rebel': 2, 'insurgent': 2,
      'ceasefire': 2, 'gunfire': 2, 'hostage': 2,
    },
  },
  economic: {
    keywords: [
      'inflation', 'gdp', 'recession', 'unemployment', 'deficit',
      'sanctions', 'economy', 'bankruptcy', 'bankrupt',
      'fiscal', 'monetary', 'austerity', 'poverty',
    ],
    weights: {
      'recession': 3, 'inflation': 3, 'gdp': 3, 'unemployment': 2,
      'bankruptcy': 3, 'bankrupt': 3, 'deficit': 2, 'sanctions': 2,
      'fiscal': 2, 'austerity': 2,
    },
  },
  disaster: {
    keywords: [
      'earthquake', 'flood', 'hurricane', 'tsunami', 'wildfire', 'volcano',
      'volcanic', 'cyclone', 'drought', 'tornado', 'landslide', 'avalanche',
      'typhoon', 'catastrophe', 'evacuation', 'famine',
      'eruption', 'seismic',
    ],
    weights: {
      'earthquake': 3, 'tsunami': 3, 'hurricane': 3, 'volcano': 3,
      'volcanic': 3, 'eruption': 3, 'cyclone': 3, 'typhoon': 3,
      'wildfire': 2, 'flood': 2, 'tornado': 2, 'drought': 2,
      'landslide': 2, 'famine': 2,
    },
  },
  health: {
    keywords: [
      'virus', 'pandemic', 'epidemic', 'covid', 'outbreak', 'infection',
      'disease', 'vaccine', 'quarantine', 'contagion', 'pathogen',
      'mortality', 'hospitalization', 'lockdown', 'variant',
    ],
    weights: {
      'pandemic': 3, 'epidemic': 3, 'virus': 3, 'covid': 3,
      'outbreak': 2, 'infection': 2, 'disease': 2, 'vaccine': 2,
      'quarantine': 2, 'contagion': 3, 'pathogen': 3,
      'mortality': 2, 'lockdown': 2,
    },
  },
};

// ── AMBIGUOUS / CONTEXT-SENSITIVE WORDS ──
// These words CAN appear in crisis news but also appear in unrelated contexts.
// They are excluded from keyword matching entirely to prevent false positives.
const AMBIGUOUS_WORDS = new Set([
  'attack',     // "heart attack", "panic attack", "cyber attack"
  'market',     // "supermarket", "market research", "market share"
  'storm',      // "brainstorm", "storm of protests" (metaphorical)
  'strikes',    // "strikes a deal", "labor strikes"
  'nuclear',    // "nuclear family", "nuclear option" (political metaphor)
  'crash',      // "car crash", "crash course"
  'disaster',   // "fashion disaster", "PR disaster"
  'conflict',   // "conflict of interest"
  'economic',   // too generic by itself in a headline
  'financial',  // "financial advisor", "financial planning"
  'stock',      // "livestock", "in stock"
  'debt',       // "sleep debt", "debt of gratitude"
  'currency',   // "social currency"
  'energy',     // "energy drink", "positive energy"
  'oil',        // "olive oil", "oil painting"
  'devastation', // sometimes used metaphorically
  'cartel',     // sometimes used in economic context (e.g., OPEC cartel)
]);

// Minimum total score required to assign a category.
// Below this threshold, the article is classified as "general".
const MIN_CONFIDENCE_SCORE = 3;

/**
 * Classify a single article into a crisis type using multi-signal approach.
 * @param {Object} article - { title, description }
 * @returns {{ type: string, confidence: number, keywordWeight: number }}
 */
export function classifyArticle(article) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  const scores = { conflict: 0, economic: 0, disaster: 0, health: 0 };

  // ── PASS 1: Strong phrase matching (highest signal) ──
  for (const [type, phrases] of Object.entries(STRONG_PHRASES)) {
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        scores[type] += 5; // Strong phrases get high score
      }
    }
  }

  // ── PASS 2: Individual keyword matching (filtered by ambiguity) ──
  for (const [type, config] of Object.entries(KEYWORD_SETS)) {
    for (const keyword of config.keywords) {
      // Skip ambiguous words — they are only counted via strong phrases
      if (AMBIGUOUS_WORDS.has(keyword)) continue;

      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        scores[type] += (config.weights[keyword] || 1) * matches.length;
      }
    }
  }

  // ── Determine winner ──
  let bestType = 'general';
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  }

  // ── Check minimum confidence threshold ──
  if (bestScore < MIN_CONFIDENCE_SCORE) {
    bestType = 'general';
  }

  // ── Handle ties: if top two scores are within 1 point, check if one
  //    has phrase matches (which are more reliable) ──
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (
    sortedScores.length >= 2 &&
    sortedScores[0][1] > 0 &&
    sortedScores[0][1] - sortedScores[1][1] <= 1
  ) {
    // Near-tie: check which type has more strong phrase matches
    const type1 = sortedScores[0][0];
    const type2 = sortedScores[1][0];
    const phrase1 = STRONG_PHRASES[type1].filter(p => text.includes(p)).length;
    const phrase2 = STRONG_PHRASES[type2].filter(p => text.includes(p)).length;
    if (phrase2 > phrase1) {
      bestType = type2;
      bestScore = sortedScores[1][1];
    }
  }

  const confidence = Math.min(1, bestScore / 10);

  return {
    type: bestType,
    confidence,
    keywordWeight: bestScore,
  };
}

/**
 * Classify an array of articles.
 * Articles classified as "general" are still included but won't strongly
 * influence country categorization.
 * @param {Array} articles
 * @returns {Array} articles with added type, confidence, keywordWeight fields
 */
export function classifyArticles(articles) {
  return articles.map(article => {
    const classification = classifyArticle(article);
    return { ...article, ...classification };
  });
}
