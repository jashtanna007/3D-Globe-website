import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-globe">
          <div className="loading-ring ring-1"></div>
          <div className="loading-ring ring-2"></div>
          <div className="loading-ring ring-3"></div>
          <Loader className="loading-icon" size={28} />
        </div>
        <p className="loading-text">ANALYZING GLOBAL THREATS</p>
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
