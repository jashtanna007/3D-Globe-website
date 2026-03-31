import React from 'react';
import { Globe, Activity, AlertTriangle } from 'lucide-react';
import { useNewsState } from '../store/newsStore';
import Legend from './Legend';
import ControlBar from './ControlBar';
import HistorySlider from './HistorySlider';
import NewsPanel from './NewsPanel';
import LoadingSpinner from './LoadingSpinner';

const Overlay = ({ onRefresh }) => {
  const { processedData, isLoading, dataSource } = useNewsState();

  const totalCrises = processedData.length;
  const topCountry = processedData[0];
  const totalArticles = processedData.reduce((sum, d) => sum + d.articleCount, 0);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col text-blue-100 font-mono">
      {/* Loading Overlay */}
      {isLoading && totalCrises === 0 && <LoadingSpinner />}

      {/* Top Bar */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <Globe className="w-8 h-8 text-cyan-400 animate-pulse" />
          <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            GLOBAL RISK MONITOR
          </h1>
        </div>

        {/* Stats Summary */}
        {totalCrises > 0 && (
          <div className="stats-summary pointer-events-auto">
            <div className="stat-chip">
              <AlertTriangle size={12} className="text-red-400" />
              <span>{totalCrises} regions</span>
            </div>
            <div className="stat-chip">
              <Activity size={12} className="text-cyan-400" />
              <span>{totalArticles} articles</span>
            </div>
            {topCountry && (
              <div className="stat-chip stat-chip-hot">
                <span>🔥 {topCountry.country.charAt(0).toUpperCase() + topCountry.country.slice(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* News Panel (right side) */}
      <NewsPanel />

      {/* Legend (bottom-left) */}
      <Legend />

      {/* Controls (bottom-right) */}
      <div className="pointer-events-auto">
        <ControlBar onRefresh={onRefresh} />
      </div>

      {/* History Slider (bottom-center) */}
      <div className="pointer-events-auto">
        <HistorySlider />
      </div>

      {/* Click hint */}
      {totalCrises > 0 && (
        <div className="click-hint">
          Click on a highlighted region to view details
        </div>
      )}
    </div>
  );
};

export default Overlay;
