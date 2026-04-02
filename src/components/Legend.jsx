import React from 'react';
import { Triangle, TrendingDown, Zap } from 'lucide-react';

const LEGEND_ITEMS = [
  {
    type: 'conflict',
    label: 'CONFLICT',
    desc: 'Wars & attacks',
    icon: Triangle,
    color: '#ff4444',
    effect: 'Mountains',
  },
  {
    type: 'economic',
    label: 'ECONOMIC',
    desc: 'Recession & inflation',
    icon: TrendingDown,
    color: '#4488ff',
    effect: 'Craters',
  },
  {
    type: 'disaster',
    label: 'DISASTER',
    desc: 'Earthquakes & floods',
    icon: Zap,
    color: '#ffaa00',
    effect: 'Shockwaves',
  },
];

const Legend = () => {
  return (
    <div className="legend-panel">
      <div className="legend-title">THREAT CLASSIFICATION</div>
      {LEGEND_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.type} className="legend-item">
            <div className="legend-icon-wrap" style={{ '--glow': item.color }}>
              <Icon size={14} color={item.color} />
            </div>
            <div className="legend-text">
              <span className="legend-label" style={{ color: item.color }}>{item.label}</span>
              <span className="legend-desc">{item.desc} → {item.effect}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Legend;
