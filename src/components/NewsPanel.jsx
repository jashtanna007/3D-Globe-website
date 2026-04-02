import React from 'react';
import { X, ExternalLink, AlertTriangle, TrendingDown, Zap, Clock } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';

const TYPE_CONFIG = {
  conflict: { color: '#ff4444', icon: AlertTriangle, label: 'CONFLICT ZONE' },
  economic: { color: '#4488ff', icon: TrendingDown, label: 'ECONOMIC CRISIS' },
  disaster: { color: '#ffaa00', icon: Zap, label: 'NATURAL DISASTER' },
  general: { color: '#94a3b8', icon: AlertTriangle, label: 'GENERAL NEWS' },
};

const NewsPanel = () => {
  const { selectedCountry } = useNewsState();
  const dispatch = useNewsDispatch();

  if (!selectedCountry) return null;

  const config = TYPE_CONFIG[selectedCountry.dominantType] || TYPE_CONFIG.conflict;
  const Icon = config.icon;

  const close = () => dispatch({ type: 'SET_SELECTED_COUNTRY', payload: null });

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const severityPercent = Math.round(selectedCountry.severity * 100);

  return (
    <div className="news-panel">
      {/* Header */}
      <div className="news-panel-header">
        <div className="news-panel-title-row">
          <div className="news-panel-badge" style={{ background: config.color + '22', borderColor: config.color }}>
            <Icon size={14} color={config.color} />
            <span style={{ color: config.color }}>{config.label}</span>
          </div>
          <button className="news-panel-close" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <h2 className="news-panel-country">
          {selectedCountry.country.charAt(0).toUpperCase() + selectedCountry.country.slice(1)}
        </h2>

        {/* Severity Bar */}
        <div className="news-panel-severity">
          <div className="severity-label">
            <span>THREAT LEVEL</span>
            <span style={{ color: config.color }}>{severityPercent}%</span>
          </div>
          <div className="severity-track">
            <div
              className="severity-fill"
              style={{
                width: `${severityPercent}%`,
                background: `linear-gradient(90deg, ${config.color}66, ${config.color})`,
                boxShadow: `0 0 12px ${config.color}88`,
              }}
            />
          </div>
        </div>

        <div className="news-panel-stats">
          <span>{selectedCountry.articleCount} article{selectedCountry.articleCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{selectedCountry.lat.toFixed(1)}°, {selectedCountry.lng.toFixed(1)}°</span>
        </div>
      </div>

      {/* Articles List */}
      <div className="news-panel-articles">
        {selectedCountry.articles.map((article, i) => {
          const articleTypeConfig = TYPE_CONFIG[article.type] || TYPE_CONFIG.conflict;

          return (
            <div key={i} className="news-article-card">
              <div className="article-type-dot" style={{ background: articleTypeConfig.color }} />
              <div className="article-content">
                <h3 className="article-title">{article.title}</h3>
                <p className="article-description">
                  {article.description || 'No description available'}
                </p>
                <div className="article-meta">
                  <span className="article-source">{article.source}</span>
                  <span className="article-date">
                    <Clock size={10} />
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
                {article.url && article.url !== '#' && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-link"
                  >
                    Read Full Article <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewsPanel;
