import React from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import './menu.css';

export default function Menu() {
  const { setCurrentView } = useModel(appStateModelName, appStateModel);
  return (
    <div className="menu-container">
      <div className="menu-item" onClick={() => setCurrentView('main')}>
        main
      </div>
      <div className="menu-item" onClick={() => setCurrentView('stocks')}>
        stocks
      </div>
      <div className="menu-item" onClick={() => setCurrentView('calendar')}>
        calendar
      </div>
      <div className="menu-item" onClick={() => setCurrentView('collections')}>
        collections
      </div>
      <div className="menu-item" onClick={() => setCurrentView('setting')}>
        setting
      </div>
    </div>
  );
}

