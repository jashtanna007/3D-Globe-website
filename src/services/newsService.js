/**
 * News Fetching Service
 * Fetches crisis-related news from NewsAPI.org with mock data fallback.
 * Supports fetching news for specific dates (past 7 days).
 */

const API_KEY = import.meta.env.VITE_NEWS_API_KEY;

// Crisis keywords for search — using specific multi-word phrases to get
// higher-quality results from the API itself
const CRISIS_QUERY = 'war OR conflict OR military OR terrorism OR earthquake OR flood OR disaster OR hurricane OR inflation OR recession OR sanctions';

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get dates for the past N days (including today).
 * Returns array of { date: Date, label: string, dateStr: string }
 * ordered from oldest to newest.
 */
export function getPast7Days() {
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const label = i === 0
      ? 'Today'
      : i === 1
        ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    days.push({
      date: d,
      label,
      dateStr: formatDate(d),
    });
  }

  return days;
}

/**
 * Fetch news articles from NewsAPI for a specific date.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {{ articles: Array, source: string }}
 */
export async function fetchCrisisNewsForDate(dateStr) {
  if (!API_KEY) {
    console.warn('[NewsService] No API key found, using mock data');
    return { articles: getMockArticlesForDate(dateStr), source: 'mock' };
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(CRISIS_QUERY)}&from=${dateStr}&to=${dateStr}&sortBy=publishedAt&pageSize=60&apiKey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[NewsService] API error:', errData.message || response.statusText);
      return { articles: getMockArticlesForDate(dateStr), source: 'mock' };
    }

    const data = await response.json();
    const articles = (data.articles || []).map(a => ({
      title: a.title || '',
      description: a.description || '',
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt || new Date().toISOString(),
      url: a.url || '#',
      imageUrl: a.urlToImage || null,
    }));

    if (articles.length === 0) {
      return { articles: getMockArticlesForDate(dateStr), source: 'mock' };
    }

    return { articles, source: 'live' };
  } catch (err) {
    console.error('[NewsService] Fetch failed:', err.message);
    return { articles: getMockArticlesForDate(dateStr), source: 'mock' };
  }
}

/**
 * Fetch today's crisis news (backward compatible).
 */
export async function fetchCrisisNews() {
  const today = formatDate(new Date());
  return fetchCrisisNewsForDate(today);
}

/**
 * Mock articles — full set covering multiple countries and crisis types.
 * These are used as fallback when API key is missing or API fails.
 */
const ALL_MOCK_ARTICLES = [
  // ── CONFLICT ──
  { title: "Russia launches major military offensive in eastern Ukraine", description: "Russian armed forces have intensified their military operations across the eastern front with heavy artillery bombardment and drone strikes targeting Ukrainian military positions.", source: "Reuters", publishedAt: "2026-04-02T14:00:00Z", url: "#", imageUrl: null },
  { title: "Israel-Iran tensions escalate with new missile strike threats", description: "Military tensions between Israel and Iran have reached a critical point with both sides issuing warnings of potential missile strikes and troop deployments.", source: "The Guardian", publishedAt: "2026-04-02T12:00:00Z", url: "#", imageUrl: null },
  { title: "Sudan civil war displaces millions more civilians", description: "The ongoing armed conflict in Sudan continues to cause a humanitarian catastrophe as army troops and militia forces clash in major cities.", source: "AP News", publishedAt: "2026-04-01T14:00:00Z", url: "#", imageUrl: null },
  { title: "India Pakistan border clash intensifies with troop deployment", description: "Military clashes along the India-Pakistan border have intensified with both nations deploying additional army troops and artillery to the region.", source: "NDTV", publishedAt: "2026-04-02T07:00:00Z", url: "#", imageUrl: null },
  { title: "North Korea fires ballistic missile near Japan", description: "North Korea launched multiple ballistic missiles that landed in waters near Japan, escalating military tensions in the region.", source: "NHK", publishedAt: "2026-04-01T04:00:00Z", url: "#", imageUrl: null },
  { title: "Terrorism attack in Somalia kills dozens", description: "A devastating terrorist bombing in Mogadishu, Somalia has killed dozens of people and wounded many more in a crowded marketplace.", source: "BBC Africa", publishedAt: "2026-04-01T11:00:00Z", url: "#", imageUrl: null },
  { title: "Syria armed conflict sees renewed military escalation", description: "Fighting in Syria has intensified with multiple factions engaged in heavy combat operations across the northern provinces.", source: "Middle East Eye", publishedAt: "2026-04-02T09:00:00Z", url: "#", imageUrl: null },
  { title: "Mexico drug cartel attacks leave dozens dead", description: "Violent cartel attacks in northern Mexico have resulted in dozens of casualties as military forces struggle to maintain order.", source: "El Universal", publishedAt: "2026-04-01T15:00:00Z", url: "#", imageUrl: null },
  { title: "Colombia armed conflict displaces thousands of families", description: "Renewed fighting between rebel forces and the Colombian military has forced thousands of families to flee their homes.", source: "El Tiempo", publishedAt: "2026-03-31T13:00:00Z", url: "#", imageUrl: null },
  { title: "South Korea deploys military amid border clash tensions", description: "South Korea has placed its military and army troops on high alert following provocative actions by North Korea along the demilitarized zone.", source: "Yonhap", publishedAt: "2026-04-01T06:00:00Z", url: "#", imageUrl: null },
  { title: "Afghanistan Taliban military crackdown sparks armed resistance", description: "Armed resistance against the Taliban military junta has erupted in several Afghan provinces following a brutal crackdown on civilians.", source: "TOLOnews", publishedAt: "2026-03-31T05:00:00Z", url: "#", imageUrl: null },
  { title: "Myanmar military junta launches offensive against rebel positions", description: "Myanmar's army has launched major military offensives against rebel forces, with reports of civilian casualties and mass displacement.", source: "Irrawaddy", publishedAt: "2026-03-30T07:00:00Z", url: "#", imageUrl: null },
  { title: "Trump issues new warning to Tehran amid Iran tensions", description: "US president warns of military action and threatens to obliterate Iranian military targets if a ceasefire deal is not reached.", source: "The Irish Times", publishedAt: "2026-03-31T18:14:19Z", url: "#", imageUrl: null },

  // ── ECONOMIC ──
  { title: "US inflation rate rises to 5.2% as recession fears grow", description: "The latest economic data shows inflation climbing in the United States, sparking renewed concerns about a potential economic recession and gdp contraction.", source: "CNN", publishedAt: "2026-04-01T16:00:00Z", url: "#", imageUrl: null },
  { title: "China stock market crash wipes trillions in economic value", description: "Chinese stock markets experienced their worst decline in years as gdp growth forecasts were slashed amid global trade war tensions and economic downturn.", source: "Bloomberg", publishedAt: "2026-04-01T06:00:00Z", url: "#", imageUrl: null },
  { title: "Germany enters economic recession as manufacturing collapses", description: "Germany's economy has officially entered recession with gdp contraction and manufacturing output falling sharply amid rising energy crisis costs.", source: "Financial Times", publishedAt: "2026-04-01T09:00:00Z", url: "#", imageUrl: null },
  { title: "European Union faces severe economic downturn and unemployment", description: "The EU economy shows signs of a significant recession with unemployment rate rising sharply across France, Italy, and Spain amid fiscal deficit concerns.", source: "Euronews", publishedAt: "2026-03-31T13:00:00Z", url: "#", imageUrl: null },
  { title: "Brazil economy struggles with record inflation rate", description: "Brazil's inflation rate has hit record highs, eroding purchasing power and pushing millions into poverty as the economy falters and gdp declines.", source: "Reuters", publishedAt: "2026-03-31T17:00:00Z", url: "#", imageUrl: null },
  { title: "Nigeria faces economic crisis amid oil price collapse", description: "Nigeria's economy is in freefall as global oil prices collapse, threatening the gdp and causing widespread unemployment and fiscal deficit.", source: "Vanguard", publishedAt: "2026-03-31T08:00:00Z", url: "#", imageUrl: null },
  { title: "UK economy shrinks as recession deepens further", description: "The United Kingdom economy has contracted for the third consecutive quarter with gdp declining and unemployment rising with no signs of recovery.", source: "BBC Business", publishedAt: "2026-03-30T10:00:00Z", url: "#", imageUrl: null },
  { title: "Saudi Arabia oil sanctions impact global economy", description: "New economic sanctions affecting Saudi Arabian oil exports are sending shockwaves through global markets and driving up energy prices worldwide.", source: "CNBC", publishedAt: "2026-04-01T12:00:00Z", url: "#", imageUrl: null },

  // ── DISASTER ──
  { title: "Powerful earthquake of magnitude 7.2 strikes Turkey", description: "A powerful earthquake has hit southeastern Turkey, causing widespread destruction and casualties in several provinces with aftershocks continuing.", source: "BBC", publishedAt: "2026-04-02T10:00:00Z", url: "#", imageUrl: null },
  { title: "Massive floods devastate Bangladesh coastal regions", description: "Catastrophic flooding across Bangladesh has displaced millions of people as flood waters inundate coastal communities and agricultural land.", source: "Al Jazeera", publishedAt: "2026-04-01T08:00:00Z", url: "#", imageUrl: null },
  { title: "Hurricane devastates Caribbean islands with catastrophic damage", description: "A Category 4 hurricane has caused catastrophic damage across multiple Caribbean nations including Haiti and Dominican Republic with mass evacuation underway.", source: "Weather Channel", publishedAt: "2026-03-31T20:00:00Z", url: "#", imageUrl: null },
  { title: "Wildfire emergency declared across southeastern Australia", description: "Massive wildfires are burning out of control across southeastern Australia, forcing mass evacuation of thousands of residents.", source: "ABC News", publishedAt: "2026-03-30T11:00:00Z", url: "#", imageUrl: null },
  { title: "Tsunami warning issued after major Chile earthquake", description: "A major earthquake off the coast of Chile has triggered tsunami warnings across the Pacific, threatening coastal populations with seismic activity continuing.", source: "USGS", publishedAt: "2026-03-30T22:00:00Z", url: "#", imageUrl: null },
  { title: "Volcanic eruption threatens Philippines island communities", description: "A major volcanic eruption in the Philippines has forced mass evacuation with lava flows and volcanic ash clouds spreading across the island.", source: "Philippine Star", publishedAt: "2026-03-29T15:00:00Z", url: "#", imageUrl: null },
  { title: "Japan earthquake causes widespread destruction and landslides", description: "A powerful earthquake has struck central Japan causing significant damage to infrastructure and triggering landslides across the region.", source: "Kyodo News", publishedAt: "2026-03-29T01:00:00Z", url: "#", imageUrl: null },
  { title: "Cyclone devastates Mozambique eastern coast communities", description: "A powerful tropical cyclone has made landfall in Mozambique, destroying homes and causing catastrophic flooding along the eastern coast.", source: "DW", publishedAt: "2026-03-30T18:00:00Z", url: "#", imageUrl: null },
  { title: "Egypt faces severe drought and water crisis", description: "Egypt is experiencing its worst drought crisis in decades as water levels drop dramatically, threatening agriculture and food shortage across the country.", source: "Al-Ahram", publishedAt: "2026-03-30T09:00:00Z", url: "#", imageUrl: null },
];

/**
 * Get mock articles filtered for a specific date.
 * Distributes the mock articles across the past 7 days so each day
 * has a realistic spread of news.
 */
function getMockArticlesForDate(dateStr) {
  // Assign mock articles to days based on their publishedAt
  // Map each article to its date string
  const targetArticles = ALL_MOCK_ARTICLES.filter(a => {
    const articleDate = a.publishedAt.split('T')[0];
    return articleDate === dateStr;
  });

  // If no articles match the exact date, return a subset distributed by hash
  if (targetArticles.length === 0) {
    const dateHash = dateStr.split('-').reduce((sum, n) => sum + parseInt(n, 10), 0);
    const articlesPerDay = Math.ceil(ALL_MOCK_ARTICLES.length / 7);
    const startIdx = (dateHash % 7) * articlesPerDay;
    const subset = [];
    for (let i = 0; i < articlesPerDay && i + startIdx < ALL_MOCK_ARTICLES.length; i++) {
      const article = ALL_MOCK_ARTICLES[(startIdx + i) % ALL_MOCK_ARTICLES.length];
      // Override the publishedAt to match the requested date
      subset.push({
        ...article,
        publishedAt: `${dateStr}T${String(8 + i).padStart(2, '0')}:00:00Z`,
      });
    }
    return subset;
  }

  return targetArticles;
}
