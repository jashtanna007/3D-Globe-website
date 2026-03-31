import React from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';

const HistorySlider = () => {
  const { history, historyIndex } = useNewsState();
  const dispatch = useNewsDispatch();

  if (history.length <= 1) return null;

  const currentIdx = historyIndex === -1 ? history.length - 1 : historyIndex;

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSlide = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val === history.length - 1) {
      dispatch({ type: 'SET_HISTORY_INDEX', payload: -1 });
    } else {
      dispatch({ type: 'SET_HISTORY_INDEX', payload: val });
    }
  };

  const goBack = () => {
    if (currentIdx > 0) {
      dispatch({ type: 'SET_HISTORY_INDEX', payload: currentIdx - 1 });
    }
  };

  const goForward = () => {
    if (currentIdx < history.length - 1) {
      const next = currentIdx + 1;
      dispatch({ type: 'SET_HISTORY_INDEX', payload: next === history.length - 1 ? -1 : next });
    }
  };

  return (
    <div className="history-slider">
      <Clock size={14} className="history-icon" />
      <button className="history-nav-btn" onClick={goBack} disabled={currentIdx === 0}>
        <ChevronLeft size={14} />
      </button>
      <input
        type="range"
        min={0}
        max={history.length - 1}
        value={currentIdx}
        onChange={handleSlide}
        className="history-range"
      />
      <button className="history-nav-btn" onClick={goForward} disabled={currentIdx >= history.length - 1}>
        <ChevronRight size={14} />
      </button>
      <span className="history-timestamp">
        {history[currentIdx] ? formatTime(history[currentIdx].timestamp) : '--:--'}
        {historyIndex === -1 && <span className="history-live-badge">LIVE</span>}
      </span>
    </div>
  );
};

export default HistorySlider;
