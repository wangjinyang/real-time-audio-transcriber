import React from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import './collections.css';

export default function Collections() {
  const { setCurrentView } = useModel(appStateModelName, appStateModel);
  return (
    <div className="collections-container">
      <div className="collections-header">
        <h3>Collections</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
    </div>
  );
}