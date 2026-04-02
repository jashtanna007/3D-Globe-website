/**
 * News Store — React Context + useReducer for global crisis state management.
 * 
 * Supports per-day history: stores the past 7 days of processed data,
 * each day accessible via the history slider.
 */
import { createContext, useContext, useReducer } from 'react';

const NewsContext = createContext(null);
const NewsDispatchContext = createContext(null);

const initialState = {
  articles: [],          // Raw articles for current day
  processedData: [],     // { country, lat, lng, severity, dominantType, articles }
  dailyHistory: [],      // [{ dateStr, label, data: processedData, articles }] — 7 days
  selectedCountry: null, // Currently selected country data object
  isLoading: false,
  error: null,
  autoRotate: true,
  activeDayIndex: 6,     // 0-6, where 6 = today (most recent)
  dataSource: 'live',    // 'live' | 'mock'
  historyLoaded: false,  // Whether all 7 days have been loaded
};

function newsReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_DATA_SOURCE':
      return { ...state, dataSource: action.payload };

    case 'SET_ARTICLES':
      return { ...state, articles: action.payload };

    case 'SET_PROCESSED_DATA':
      return {
        ...state,
        processedData: action.payload,
        isLoading: false,
        error: null,
      };

    case 'SET_DAILY_HISTORY':
      // Set all 7 days of history at once
      return {
        ...state,
        dailyHistory: action.payload,
        historyLoaded: true,
      };

    case 'SET_ACTIVE_DAY': {
      const idx = action.payload;
      const dayEntry = state.dailyHistory[idx];
      if (!dayEntry) return state;
      return {
        ...state,
        activeDayIndex: idx,
        processedData: dayEntry.data,
        articles: dayEntry.articles || [],
      };
    }

    case 'SET_SELECTED_COUNTRY':
      return { ...state, selectedCountry: action.payload };

    case 'TOGGLE_AUTO_ROTATE':
      return { ...state, autoRotate: !state.autoRotate };

    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.payload };

    // Keep legacy support for old history index
    case 'SET_HISTORY_INDEX': {
      const idx = action.payload;
      if (idx === -1) {
        // Go to today (latest)
        const todayIdx = state.dailyHistory.length - 1;
        const todayEntry = state.dailyHistory[todayIdx];
        return {
          ...state,
          activeDayIndex: todayIdx,
          processedData: todayEntry ? todayEntry.data : state.processedData,
        };
      }
      return newsReducer(state, { type: 'SET_ACTIVE_DAY', payload: idx });
    }

    default:
      return state;
  }
}

export function NewsProvider({ children }) {
  const [state, dispatch] = useReducer(newsReducer, initialState);

  return (
    <NewsContext.Provider value={state}>
      <NewsDispatchContext.Provider value={dispatch}>
        {children}
      </NewsDispatchContext.Provider>
    </NewsContext.Provider>
  );
}

export function useNewsState() {
  const context = useContext(NewsContext);
  if (!context && context !== initialState) {
    throw new Error('useNewsState must be used within a NewsProvider');
  }
  return context;
}

export function useNewsDispatch() {
  const context = useContext(NewsDispatchContext);
  if (!context) {
    throw new Error('useNewsDispatch must be used within a NewsProvider');
  }
  return context;
}
