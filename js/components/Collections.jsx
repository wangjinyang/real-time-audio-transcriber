import React from 'react';
import { useModel } from 'react-doura';
import { assistantWithOpenAI } from '../modules/transcription-service.js';
import { getCurrentApiConfiguration } from '../modules/storage-manager';
import { appStateModel, appStateModelName, appStateStore } from '../modules/state-manager';
import './collections.css';

const handleAssistantWithOpenAI = async (item) => {
  const apiKey = (await getCurrentApiConfiguration()).apiKey;
  const { text } = item;
  const res = await assistantWithOpenAI({ text: text, apiKey });
  appStateStore.updateCollection(item.id, { assistant: res });
};

export default function Collections() {
  const { setCurrentView, collections, collectionsIds, addCollection, removeCollection } = useModel(
    appStateModelName,
    appStateModel
  );
  return (
    <div className="collections-container">
      <div className="collections-header">
        <h3>Collections</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
      <div>
        <div className="collections-list-wrapper">
          {collections.length === 0 ? (
            <div className="placeholder">Your collections will appear here…</div>
          ) : (
            collections.map((item, index) => {
              const isCollectionItem = collectionsIds[item.id];
              return (
                <div className="transcription-item" key={index}>
                  {item.timestamp && <span className="ts">{item.timestamp}</span>}
                  {item.label && <span className="chan">{item.label}</span>}
                  {item.text}
                  {item.assistant && <div className="assistant">{item.assistant}</div>}
                  <div className="transcription-item-handels">
                    <button
                      onClick={() =>
                        isCollectionItem ? removeCollection(item.id) : addCollection(item)
                      }
                      className={isCollectionItem ? 'active' : ''}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          d="M12.404 20.802C14.028 19.97 20 16.568 20 11.5C20 7 16.267 4 12 4c-4.124 0-8 3-8 7.5c0 5.068 5.972 8.47 7.596 9.302a.88.88 0 0 0 .808 0m-.635-6.045L8.97 11.81a1.806 1.806 0 1 1 2.898-2.107l.07.128a.07.07 0 0 0 .124 0l.07-.128c.658-1.212 2.377-1.27 3.114-.104c.443.7.354 1.61-.216 2.21l-2.799 2.947c-.092.097-.139.146-.195.157a.2.2 0 0 1-.072 0c-.056-.011-.103-.06-.195-.157"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </button>
                    <button onClick={() => handleAssistantWithOpenAI(item)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                      >
                        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={2}>
                          <path
                            strokeLinejoin="round"
                            d="M14 19c3.771 0 5.657 0 6.828-1.172S22 14.771 22 11s0-5.657-1.172-6.828S17.771 3 14 3h-4C6.229 3 4.343 3 3.172 4.172S2 7.229 2 11s0 5.657 1.172 6.828c.653.654 1.528.943 2.828 1.07"
                          ></path>
                          <path d="M10 8.484C10.5 7.494 11 7 12 7c1.246 0 2 .989 2 1.978s-.5 1.033-2 2.022v1m0 2.5v.5m2 4c-1.236 0-2.598.5-3.841 1.145c-1.998 1.037-2.997 1.556-3.489 1.225s-.399-1.355-.212-3.404L6.5 17.5"></path>
                        </g>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

