import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';

const HistorySlider = () => {
  const { dailyHistory, activeDayIndex, historyLoaded } = useNewsState();
  const dispatch = useNewsDispatch();

  if (!historyLoaded || dailyHistory.length <= 1) return null;

  const maxIdx = dailyHistory.length - 1; // 6 = today
  const currentIdx = activeDayIndex;

  const handleSlide = (e) => {
    const val = parseInt(e.target.value, 10);
    dispatch({ type: 'SET_ACTIVE_DAY', payload: val });
  };

  const goBack = () => {
    if (currentIdx > 0) {
      dispatch({ type: 'SET_ACTIVE_DAY', payload: currentIdx - 1 });
    }
  };

  const goForward = () => {
    if (currentIdx < maxIdx) {
      dispatch({ type: 'SET_ACTIVE_DAY', payload: currentIdx + 1 });
    }
  };

  const currentDay = dailyHistory[currentIdx];
  const isToday = currentIdx === maxIdx;

  return (
    <div className="history-slider">
      <Calendar size={14} className="history-icon" />
      <button className="history-nav-btn" onClick={goBack} disabled={currentIdx === 0}>
        <ChevronLeft size={14} />
      </button>
      <div className="history-slider-track-wrapper">
        <div className="history-day-markers">
          {dailyHistory.map((day, i) => (
            <div
              key={day.dateStr}
              className={`history-day-dot ${i === currentIdx ? 'active' : ''} ${i === maxIdx ? 'today' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_DAY', payload: i })}
              title={`${day.label} — ${day.data.length} events`}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={maxIdx}
          step={1}
          value={currentIdx}
          onChange={handleSlide}
          className="history-range"
        />
      </div>
      <button className="history-nav-btn" onClick={goForward} disabled={currentIdx >= maxIdx}>
        <ChevronRight size={14} />
      </button>
      <span className="history-timestamp">
        {currentDay ? currentDay.label : '--'}
        {isToday && <span className="history-live-badge">LIVE</span>}
      </span>
    </div>
  );
};

export default HistorySlider;
