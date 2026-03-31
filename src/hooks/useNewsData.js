/**
 * useNewsData Hook
 * Orchestrates the full pipeline: fetch → classify → geolocate → severity
 * and dispatches results to the global store.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useNewsDispatch } from '../store/newsStore';
import { fetchCrisisNews } from '../services/newsService';
import { classifyArticles } from '../utils/crisisClassifier';
import { detectCountry, getCountryCoordinates } from '../utils/countryCoordinates';
import { calculateSeverity } from '../utils/severityCalculator';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useNewsData() {
  const dispatch = useNewsDispatch();
  const intervalRef = useRef(null);

  const processNews = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Step 1: Fetch news
      const { articles, source } = await fetchCrisisNews();
      dispatch({ type: 'SET_DATA_SOURCE', payload: source });
      dispatch({ type: 'SET_ARTICLES', payload: articles });

      // Step 2: Classify each article (conflict / economic / disaster)
      const classified = classifyArticles(articles);

      // Step 3: Geolocate — detect country in each article and attach coordinates
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

      // Step 4: Calculate per-country severity
      const processedData = calculateSeverity(geolocated);

      // Dispatch final processed data (also creates history snapshot)
      dispatch({ type: 'SET_PROCESSED_DATA', payload: processedData });

      console.log(`[useNewsData] Processed ${articles.length} articles → ${geolocated.length} geolocated → ${processedData.length} countries`);
    } catch (err) {
      console.error('[useNewsData] Processing error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [dispatch]);

  // Initial fetch on mount
  useEffect(() => {
    processNews();

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(processNews, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [processNews]);

  return { refresh: processNews };
}
