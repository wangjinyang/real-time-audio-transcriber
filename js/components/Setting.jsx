import React from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import { resetState } from '../modules/state-manager.js';
import './setting.css';
export default function Setting() {
  const {
    setCurrentView,
    allApikeys,
    currentApiProvider,
    saveParticularApikeys,
    setParticularApikeys,
    handleTranscriptsPeriod,
    setHandleTranscriptsPeriod,
  } = useModel(appStateModelName, appStateModel);
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h3>Settings</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>

      <div className="settings-section">
        <h4>Transcription API</h4>

        <label htmlFor="apiProvider">Provider</label>
        <select disabled className="api-provider-select">
          {/* <option value="gemini">Google Gemini 2.5 Flash</option> */}
          <option value="openai">OpenAI Whisper</option>
          {/* <option value="deepgram">Deepgram</option>
                    <option value="fireworks">Fireworks AI</option> */}
        </select>

        <div id="apiConfigContainer">
          {/* <div id="geminiConfig" className="api-config">
                      <label htmlFor="geminiApiKey">Google Gemini API Key</label>
                      <div className="api-key-row">
                        <input type="password" id="geminiApiKey" placeholder="Enter Gemini API key" />
                        <button id="saveGeminiKeyBtn" className="secondary">
                          Save
                        </button>
                      </div>
                      <p className="api-description">
                        Free tier available with good accuracy. Get your key from
                        <a href="https://aistudio.google.com/app/apikey" target="_blank">
                          Google AI Studio
                        </a>
                      </p>
                    </div> */}

          <div className="api-config">
            <label htmlFor="openaiApiKey">OpenAI API Key</label>
            <div className="api-key-row">
              <input
                value={allApikeys[currentApiProvider] || ''}
                type="password"
                onChange={e => setParticularApikeys('openai', e.target.value)}
                placeholder="Enter OpenAI API key"
              />
              <button
                onClick={() =>
                  saveParticularApikeys('openai', allApikeys[currentApiProvider] || '')
                }
                className="secondary"
              >
                Save
              </button>
            </div>
            <p className="api-description">
              High accuracy with pay-per-use pricing. Get your key from
              <a href="https://platform.openai.com/api-keys" target="_blank">
                OpenAI Platform
              </a>
            </p>
          </div>
          <div className="api-period-config">
            <label htmlFor="handleTranscriptsPeriod">
              Specify the duration for the summary section in seconds
            </label>
            <input
              type="number"
              min="10"
              step="10"
              value={handleTranscriptsPeriod}
              onChange={e => setHandleTranscriptsPeriod(parseInt(e.target.value))}
              placeholder="Enter period in seconds"
            />
          </div>

          {/* <div id="deepgramConfig" className="api-config" style={{ display: 'none' }}>
                      <label htmlFor="deepgramApiKey">Deepgram API Key</label>
                      <div className="api-key-row">
                        <input type="password" id="deepgramApiKey" placeholder="Enter Deepgram API key" />
                        <button id="saveDeepgramKeyBtn" className="secondary">
                          Save
                        </button>
                      </div>
                      <p className="api-description">
                        Real-time speech recognition. Get your key from
                        <a href="https://console.deepgram.com/" target="_blank">
                          Deepgram Console
                        </a>
                      </p>
                    </div>
        
                    <div id="fireworksConfig" className="api-config" style={{ display: 'none' }}>
                      <label htmlFor="fireworksApiKey">Fireworks API Key</label>
                      <div className="api-key-row">
                        <input type="password" id="fireworksApiKey" placeholder="Enter Fireworks API key" />
                        <button id="saveFireworksKeyBtn" className="secondary">
                          Save
                        </button>
                      </div>
                      <p className="api-description">
                        Fast and cost-effective AI inference. Get your key from
                        <a href="https://fireworks.ai/" target="_blank">
                          Fireworks AI
                        </a>
                      </p>
                    </div> */}
        </div>
      </div>

      {/* <div className="settings-section">
                  <h4>Audio Sources</h4>
                  <label className="mic-toggle">
                    <input type="checkbox" />
                    Include Microphone
                  </label>
                </div> */}

      <div className="settings-section">
        <button onClick={resetState} className="reset-btn">
          Reset
        </button>
        <p className="reset-description">
          Clear all data including API key and transcription history
        </p>
      </div>
    </div>
  );
}

