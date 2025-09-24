import React from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import './calendar.css';

export default function Calendar() {
  const { setCurrentView } = useModel(appStateModelName, appStateModel);
  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>Calendar</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
    </div>
  );
}