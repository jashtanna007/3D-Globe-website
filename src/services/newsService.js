/**
 * News Fetching Service
 * Fetches crisis-related news from NewsAPI.org with mock data fallback.
 */

const API_KEY = import.meta.env.VITE_NEWS_API_KEY;

// Crisis keywords for search
const CRISIS_QUERY = 'war OR conflict OR attack OR terrorism OR earthquake OR flood OR disaster OR hurricane OR inflation OR recession OR economy OR sanctions';

/**
 * Fetch news articles from NewsAPI via Vite dev proxy.
 * Falls back to mock data if API key is missing or request fails.
 */
export async function fetchCrisisNews() {
  if (!API_KEY) {
    console.warn('[NewsService] No API key found, using mock data');
    return { articles: getMockArticles(), source: 'mock' };
  }

  try {
    const url = `/api/news/v2/everything?q=${encodeURIComponent(CRISIS_QUERY)}&sortBy=publishedAt&pageSize=60&apiKey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[NewsService] API error:', errData.message || response.statusText);
      return { articles: getMockArticles(), source: 'mock' };
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
      return { articles: getMockArticles(), source: 'mock' };
    }

    return { articles, source: 'live' };
  } catch (err) {
    console.error('[NewsService] Fetch failed:', err.message);
    return { articles: getMockArticles(), source: 'mock' };
  }
}

/**
 * Mock articles covering multiple countries and crisis types.
 */
function getMockArticles() {
  return [
    { title: "Russia launches major offensive in eastern Ukraine", description: "Russian forces have intensified their military operations across the eastern front with heavy artillery and drone strikes targeting Ukrainian positions.", source: "Reuters", publishedAt: "2026-03-30T14:00:00Z", url: "#", imageUrl: null },
    { title: "Earthquake of magnitude 7.2 strikes Turkey", description: "A powerful earthquake has hit southeastern Turkey, causing widespread destruction and casualties in several provinces.", source: "BBC", publishedAt: "2026-03-30T10:00:00Z", url: "#", imageUrl: null },
    { title: "US inflation rises to 5.2% as recession fears grow", description: "The latest economic data shows inflation climbing in the United States, sparking renewed concerns about a potential recession.", source: "CNN", publishedAt: "2026-03-29T16:00:00Z", url: "#", imageUrl: null },
    { title: "Massive floods devastate Bangladesh coastal regions", description: "Flooding across Bangladesh has displaced millions of people as rising waters inundate coastal communities and agricultural land.", source: "Al Jazeera", publishedAt: "2026-03-29T08:00:00Z", url: "#", imageUrl: null },
    { title: "Israel-Iran tensions escalate with new missile threats", description: "Military tensions between Israel and Iran have reached a critical point with both sides issuing warnings of potential strikes.", source: "The Guardian", publishedAt: "2026-03-30T12:00:00Z", url: "#", imageUrl: null },
    { title: "Sudan civil war displaces millions more civilians", description: "The ongoing conflict in Sudan continues to cause a humanitarian catastrophe as army and militia forces clash in major cities.", source: "AP News", publishedAt: "2026-03-28T14:00:00Z", url: "#", imageUrl: null },
    { title: "China market crash wipes trillions in economic value", description: "Chinese stock markets experienced their worst decline in years as GDP growth forecasts were slashed amid global trade tensions.", source: "Bloomberg", publishedAt: "2026-03-29T06:00:00Z", url: "#", imageUrl: null },
    { title: "Hurricane devastates Caribbean islands", description: "A Category 4 hurricane has caused catastrophic damage across multiple Caribbean nations including Haiti and Dominican Republic.", source: "Weather Channel", publishedAt: "2026-03-28T20:00:00Z", url: "#", imageUrl: null },
    { title: "Germany enters recession as manufacturing collapses", description: "Germany's economy has officially entered recession with manufacturing output falling sharply amid rising energy costs.", source: "Financial Times", publishedAt: "2026-03-29T09:00:00Z", url: "#", imageUrl: null },
    { title: "North Korea fires ballistic missiles near Japan", description: "North Korea launched multiple ballistic missiles that landed in waters near Japan, escalating military tensions in the region.", source: "NHK", publishedAt: "2026-03-30T04:00:00Z", url: "#", imageUrl: null },
    { title: "Wildfire emergency declared across Australia", description: "Massive wildfires are burning out of control across southeastern Australia, forcing evacuations of thousands of residents.", source: "ABC News", publishedAt: "2026-03-28T11:00:00Z", url: "#", imageUrl: null },
    { title: "India Pakistan border conflict intensifies", description: "Military clashes along the India-Pakistan border have intensified with both nations deploying additional army troops to the region.", source: "NDTV", publishedAt: "2026-03-30T07:00:00Z", url: "#", imageUrl: null },
    { title: "Mexico drug cartel attacks leave dozens dead", description: "Violent attacks by drug cartels in northern Mexico have resulted in dozens of casualties as security forces struggle to maintain order.", source: "El Universal", publishedAt: "2026-03-29T15:00:00Z", url: "#", imageUrl: null },
    { title: "European Union faces severe economic downturn", description: "The EU economy shows signs of a significant recession with unemployment rising sharply across France, Italy, and Spain.", source: "Euronews", publishedAt: "2026-03-28T13:00:00Z", url: "#", imageUrl: null },
    { title: "Tsunami warning issued after Chile earthquake", description: "A major earthquake off the coast of Chile has triggered tsunami warnings across the Pacific, threatening coastal populations.", source: "USGS", publishedAt: "2026-03-27T22:00:00Z", url: "#", imageUrl: null },
    { title: "Terrorism attack in Somalia kills dozens", description: "A devastating terrorist bombing in Mogadishu, Somalia has killed dozens of people and wounded many more in a crowded marketplace.", source: "BBC Africa", publishedAt: "2026-03-29T11:00:00Z", url: "#", imageUrl: null },
    { title: "Brazil economy struggles with record inflation", description: "Brazil's inflation rate has hit record highs, eroding purchasing power and pushing millions into poverty as the market falters.", source: "Reuters", publishedAt: "2026-03-28T17:00:00Z", url: "#", imageUrl: null },
    { title: "Syria conflict sees renewed military escalation", description: "Fighting in Syria has intensified with multiple factions engaged in heavy combat across the northern provinces.", source: "Middle East Eye", publishedAt: "2026-03-30T09:00:00Z", url: "#", imageUrl: null },
    { title: "Volcanic eruption threatens Philippines communities", description: "A major volcanic eruption in the Philippines has forced mass evacuations with lava flows and ash clouds spreading across the island.", source: "Philippine Star", publishedAt: "2026-03-27T15:00:00Z", url: "#", imageUrl: null },
    { title: "Nigeria faces economic crisis amid oil price collapse", description: "Nigeria's economy is in freefall as global oil prices collapse, threatening the GDP and causing widespread unemployment.", source: "Vanguard", publishedAt: "2026-03-28T08:00:00Z", url: "#", imageUrl: null },
    { title: "Afghanistan Taliban crackdown sparks armed resistance", description: "Armed resistance against the Taliban has erupted in several Afghan provinces following a brutal military crackdown on civilians.", source: "TOLOnews", publishedAt: "2026-03-29T05:00:00Z", url: "#", imageUrl: null },
    { title: "Japan earthquake causes widespread destruction", description: "A powerful earthquake has struck central Japan causing significant damage to infrastructure and triggering landslides.", source: "Kyodo News", publishedAt: "2026-03-27T01:00:00Z", url: "#", imageUrl: null },
    { title: "UK economy shrinks as recession deepens", description: "The United Kingdom economy has contracted for the third consecutive quarter with the market showing no signs of recovery.", source: "BBC Business", publishedAt: "2026-03-28T10:00:00Z", url: "#", imageUrl: null },
    { title: "Colombia armed conflict displaces thousands", description: "Renewed fighting between armed groups and the Colombian military has forced thousands of families to flee their homes.", source: "El Tiempo", publishedAt: "2026-03-29T13:00:00Z", url: "#", imageUrl: null },
    { title: "Cyclone devastates Mozambique eastern coast", description: "A powerful cyclone has made landfall in Mozambique, destroying homes and flooding entire communities along the eastern coast.", source: "DW", publishedAt: "2026-03-27T18:00:00Z", url: "#", imageUrl: null },
    { title: "Trump issues new warning to Tehran as Iran rejects US demands", description: "US president claims progress in talks before threatening to completely obliterate Iranian energy targets if a deal is not reached.", source: "The Irish Times", publishedAt: "2026-03-30T18:14:19Z", url: "#", imageUrl: null },
    { title: "South Korea deploys military amid border tensions", description: "South Korea has placed its military on high alert following provocative actions by North Korea along the demilitarized zone.", source: "Yonhap", publishedAt: "2026-03-30T06:00:00Z", url: "#", imageUrl: null },
    { title: "Egypt faces severe drought and water crisis", description: "Egypt is experiencing its worst drought in decades as the Nile River levels drop dramatically, threatening agriculture and food security.", source: "Al-Ahram", publishedAt: "2026-03-28T09:00:00Z", url: "#", imageUrl: null },
    { title: "Saudi Arabia oil sanctions impact global economy", description: "New sanctions affecting Saudi Arabian oil exports are sending shockwaves through global markets and driving up energy prices.", source: "CNBC", publishedAt: "2026-03-29T12:00:00Z", url: "#", imageUrl: null },
    { title: "Myanmar military junta attacks rebel positions", description: "Myanmar's army has launched major offensives against rebel forces, with reports of civilian casualties and mass displacement.", source: "Irrawaddy", publishedAt: "2026-03-28T07:00:00Z", url: "#", imageUrl: null },
  ];
}
