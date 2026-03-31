import React from 'react';
import { RotateCw, RefreshCcw, Radio, Pause, Play } from 'lucide-react';
import { useNewsState, useNewsDispatch } from '../store/newsStore';

const ControlBar = ({ onRefresh }) => {
  const { autoRotate, dataSource, isLoading } = useNewsState();
  const dispatch = useNewsDispatch();

  return (
    <div className="control-bar">
      <button
        className="control-btn"
        onClick={() => dispatch({ type: 'TOGGLE_AUTO_ROTATE' })}
        title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
      >
        {autoRotate ? <Pause size={14} /> : <Play size={14} />}
        <span>{autoRotate ? 'PAUSE' : 'ROTATE'}</span>
      </button>

      <button
        className="control-btn"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh news data"
      >
        <RefreshCcw size={14} className={isLoading ? 'spinning' : ''} />
        <span>REFRESH</span>
      </button>

      <div className="control-status">
        <Radio size={10} className={dataSource === 'live' ? 'status-live' : 'status-mock'} />
        <span className={dataSource === 'live' ? 'status-live' : 'status-mock'}>
          {dataSource === 'live' ? 'LIVE' : 'MOCK'}
        </span>
      </div>
    </div>
  );
};

export default ControlBar;
