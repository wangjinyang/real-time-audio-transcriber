import React from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import './stocks.css';
export default function Setting() {
  const { setCurrentView } = useModel(appStateModelName, appStateModel);
  return (
    <div className="stocks-container">
      <div className="stocks-header">
        <h3>Stocks</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
    </div>
  );
}

