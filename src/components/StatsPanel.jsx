import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, TrendingDown, Zap, Heart, Flame } from 'lucide-react';
import { useNewsState } from '../store/newsStore';

const TYPE_META = {
  conflict: { label: 'Conflict', color: '#ff4444', icon: AlertTriangle },
  economic: { label: 'Economic', color: '#4488ff', icon: TrendingDown },
  disaster: { label: 'Disaster', color: '#ffaa00', icon: Zap },
  health:   { label: 'Health',   color: '#22c55e', icon: Heart },
};

const StatsPanel = () => {
  const { processedData } = useNewsState();

  const stats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return null;
    }

    const totalCrises = processedData.length;
    const totalArticles = processedData.reduce((s, d) => s + d.articleCount, 0);

    // Most affected country
    const mostAffected = processedData[0]; // already sorted by severity desc

    // Highest severity
    const highestSeverity = mostAffected ? mostAffected.severity : 0;

    // Count by type
    const typeCounts = { conflict: 0, economic: 0, disaster: 0, health: 0 };
    for (const crisis of processedData) {
      if (typeCounts[crisis.dominantType] !== undefined) {
        typeCounts[crisis.dominantType]++;
      }
    }

    const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

    return {
      totalCrises,
      totalArticles,
      mostAffected,
      highestSeverity,
      typeCounts,
      maxTypeCount,
    };
  }, [processedData]);

  if (!stats) return null;

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="stats-panel">
      <div className="stats-panel-header">
        <BarChart3 size={14} className="stats-panel-icon" />
        <span>LIVE STATISTICS</span>
      </div>

      <div className="stats-panel-grid">
        {/* Active crises */}
        <div className="stats-metric">
          <span className="stats-metric-value">{stats.totalCrises}</span>
          <span className="stats-metric-label">Active Regions</span>
        </div>

        {/* Total articles */}
        <div className="stats-metric">
          <span className="stats-metric-value">{stats.totalArticles}</span>
          <span className="stats-metric-label">Articles</span>
        </div>

        {/* Highest severity */}
        <div className="stats-metric">
          <span className="stats-metric-value stats-metric-hot">
            {Math.round(stats.highestSeverity * 100)}%
          </span>
          <span className="stats-metric-label">Peak Severity</span>
        </div>
      </div>

      {/* Most affected country */}
      {stats.mostAffected && (
        <div className="stats-top-country">
          <div className="stats-top-label">
            <Flame size={12} className="text-orange-400" />
            <span>MOST AFFECTED</span>
          </div>
          <div className="stats-top-name">
            {capitalize(stats.mostAffected.country)}
          </div>
          <div className="stats-top-bar-track">
            <div
              className="stats-top-bar-fill"
              style={{ width: `${Math.round(stats.mostAffected.severity * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-type breakdown */}
      <div className="stats-breakdown">
        <div className="stats-breakdown-title">BY TYPE</div>
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const count = stats.typeCounts[type] || 0;
          const pct = (count / stats.maxTypeCount) * 100;
          const Icon = meta.icon;
          return (
            <div key={type} className="stats-type-row">
              <div className="stats-type-info">
                <Icon size={10} color={meta.color} />
                <span className="stats-type-label">{meta.label}</span>
                <span className="stats-type-count" style={{ color: meta.color }}>{count}</span>
              </div>
              <div className="stats-type-bar-track">
                <div
                  className="stats-type-bar-fill"
                  style={{ width: `${pct}%`, background: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsPanel;
