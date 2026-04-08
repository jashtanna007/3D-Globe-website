import React from 'react';
import { Triangle, TrendingDown, Zap, Heart } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';

const FILTER_ITEMS = [
  { type: 'conflict', label: 'Conflict', icon: Triangle, color: '#ff4444' },
  { type: 'economic', label: 'Economic', icon: TrendingDown, color: '#4488ff' },
  { type: 'disaster', label: 'Disaster', icon: Zap, color: '#ffaa00' },
  { type: 'health', label: 'Health', icon: Heart, color: '#22c55e' },
];

const CrisisFilter = () => {
  const { activeFilters } = useNewsState();
  const dispatch = useNewsDispatch();

  const toggle = (type) => {
    dispatch({ type: 'TOGGLE_FILTER', payload: type });
  };

  return (
    <div className="crisis-filter">
      <span className="filter-label">FILTER</span>
      <div className="filter-buttons">
        {FILTER_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activeFilters.includes(item.type);
          return (
            <button
              key={item.type}
              className={`filter-btn ${active ? 'filter-btn-active' : ''}`}
              style={{
                '--filter-color': item.color,
                borderColor: active ? item.color : 'rgba(255,255,255,0.1)',
                background: active ? item.color + '22' : 'transparent',
              }}
              onClick={() => toggle(item.type)}
              title={`Toggle ${item.label}`}
            >
              <Icon size={12} color={active ? item.color : '#64748b'} />
              <span style={{ color: active ? item.color : '#64748b' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CrisisFilter;
