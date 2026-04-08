import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';
import { getAllCountryNames } from '../utils/countryCoordinates';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const { processedData } = useNewsState();
  const dispatch = useNewsDispatch();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const allCountries = useMemo(() => getAllCountryNames(), []);

  const results = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return allCountries
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allCountries]);

  const selectCountry = useCallback((country) => {
    // Navigate globe to the country
    dispatch({
      type: 'NAVIGATE_TO_COUNTRY',
      payload: { lat: country.lat, lng: country.lng, country: country.key },
    });

    // Also select it for border highlight — use crisis data if available
    const crisisData = processedData?.find(c => c.country === country.key);
    dispatch({
      type: 'SET_SELECTED_COUNTRY',
      payload: crisisData || {
        country: country.key,
        lat: country.lat,
        lng: country.lng,
        severity: 0,
        dominantType: null,
        articles: [],
        articleCount: 0,
      },
    });

    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  }, [dispatch, processedData]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectCountry(results[highlightIndex]);
    }
  }, [results, highlightIndex, selectCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="search-bar-container" ref={dropdownRef}>
      <div className={`search-bar ${isOpen && results.length ? 'search-bar-active' : ''}`}>
        <Search size={14} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search country..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => { setQuery(''); setIsOpen(false); }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="search-dropdown">
          {results.map((country, i) => (
            <button
              key={country.key}
              className={`search-result ${i === highlightIndex ? 'search-result-highlight' : ''}`}
              onClick={() => selectCountry(country)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <MapPin size={12} className="search-result-icon" />
              <span className="search-result-name">{country.name}</span>
              <span className="search-result-coords">
                {country.lat.toFixed(1)}°, {country.lng.toFixed(1)}°
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
