/**
 * News Store — React Context + useReducer for global crisis state management.
 */
import { createContext, useContext, useReducer } from 'react';

const NewsContext = createContext(null);
const NewsDispatchContext = createContext(null);

const initialState = {
  articles: [],          // Raw articles from API
  processedData: [],     // { country, lat, lng, severity, dominantType, articles }
  history: [],           // [{ timestamp, data }]
  selectedCountry: null, // Currently selected country data object
  isLoading: false,
  error: null,
  autoRotate: true,
  historyIndex: -1,      // -1 = live/current, 0+ = historical snapshot
  dataSource: 'live',    // 'live' | 'mock'
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

    case 'SET_PROCESSED_DATA': {
      // Push a new snapshot to history
      const newHistory = [
        ...state.history,
        { timestamp: new Date().toISOString(), data: action.payload },
      ];
      return {
        ...state,
        processedData: action.payload,
        history: newHistory,
        historyIndex: -1,
        isLoading: false,
        error: null,
      };
    }

    case 'SET_SELECTED_COUNTRY':
      return { ...state, selectedCountry: action.payload };

    case 'TOGGLE_AUTO_ROTATE':
      return { ...state, autoRotate: !state.autoRotate };

    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.payload };

    case 'SET_HISTORY_INDEX': {
      const idx = action.payload;
      if (idx === -1) {
        // Go back to live data (latest snapshot)
        const latestData = state.history.length > 0
          ? state.history[state.history.length - 1].data
          : [];
        return { ...state, historyIndex: -1, processedData: latestData };
      }
      const snapshot = state.history[idx];
      if (!snapshot) return state;
      return { ...state, historyIndex: idx, processedData: snapshot.data };
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
