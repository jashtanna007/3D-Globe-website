/**
 * useNewsData Hook
 * Orchestrates the full pipeline: fetch → classify → geolocate → severity
 * for each of the past 7 days, and dispatches results to the global store.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useNewsDispatch } from '../store/newsStore';
import { fetchCrisisNewsForDate, getPast7Days } from '../services/newsService';
import { classifyArticles } from '../utils/crisisClassifier';
import { detectCountry, getCountryCoordinates } from '../utils/countryCoordinates';
import { calculateSeverity } from '../utils/severityCalculator';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (refresh all 7 days)

/**
 * Process a single day's articles through the classification pipeline.
 */
function processArticles(articles) {
  // Step 1: Classify each article (conflict / economic / disaster / general)
  const classified = classifyArticles(articles);

  // Step 2: Geolocate — detect country and attach coordinates
  const geolocated = classified
    .map(article => {
      const country = detectCountry(article);
      if (!country) return null;

      const coords = getCountryCoordinates(country);
      if (!coords) return null;

      return {
        ...article,
        country,
        lat: coords.lat,
        lng: coords.lng,
      };
    })
    .filter(Boolean);

  // Step 3: Calculate per-country severity
  return calculateSeverity(geolocated);
}

export function useNewsData() {
  const dispatch = useNewsDispatch();
  const intervalRef = useRef(null);
  const isLoadingRef = useRef(false);

  const loadAllDays = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const days = getPast7Days(); // Returns 7 entries: oldest → newest
      const dailyHistory = [];

      // Fetch all 7 days in parallel for speed
      const fetchPromises = days.map(day => fetchCrisisNewsForDate(day.dateStr));
      const results = await Promise.all(fetchPromises);

      for (let i = 0; i < days.length; i++) {
        const { articles, source } = results[i];
        const processedData = processArticles(articles);

        dailyHistory.push({
          dateStr: days[i].dateStr,
          label: days[i].label,
          data: processedData,
          articles: articles,
          source,
        });
      }

      // Set the daily history
      dispatch({ type: 'SET_DAILY_HISTORY', payload: dailyHistory });

      // Set today's data as active (index 6 = most recent)
      const todayIdx = dailyHistory.length - 1;
      const todayData = dailyHistory[todayIdx];

      dispatch({ type: 'SET_DATA_SOURCE', payload: todayData.source });
      dispatch({ type: 'SET_ARTICLES', payload: todayData.articles });
      dispatch({ type: 'SET_PROCESSED_DATA', payload: todayData.data });
      dispatch({ type: 'SET_ACTIVE_DAY', payload: todayIdx });

      console.log(`[useNewsData] Loaded 7 days of data:`);
      dailyHistory.forEach((d, i) => {
        console.log(`  Day ${i} (${d.label}): ${d.articles.length} articles → ${d.data.length} countries`);
      });
    } catch (err) {
      console.error('[useNewsData] Processing error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      isLoadingRef.current = false;
    }
  }, [dispatch]);

  // Initial fetch on mount
  useEffect(() => {
    loadAllDays();

    // Auto-refresh every 10 minutes
    intervalRef.current = setInterval(loadAllDays, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadAllDays]);

  return { refresh: loadAllDays };
}
