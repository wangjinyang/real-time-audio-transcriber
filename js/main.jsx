import React from 'react';
import { createRoot } from 'react-dom/client';
import { DouraRoot, useModel } from 'react-doura';
import { appStateModel, appStateModelName } from './modules/state-manager';

import { AUDIO_CONFIG, UI_CONSTANTS } from './config/app-config.js';
import { scrollToBottom } from './utils/dom-utils.js';
import {
  getSupportedMimeType,
  blobToBase64,
  captureTabAudio,
  captureMicrophoneAudio,
  setupAudioPlayback,
  closeAudioContext,
  closeAllAudioContexts,
} from './utils/audio-utils.js';

import {
  resetState,
  addSession,
  removeSession,
  getSession,
  getAllSessionIds,
  addSummarizedTranscript,
  getSummarizedTranscripts,
  addToPendingQueue,
  getPendingQueueItems,
  hasPendingItems,
  startTimer,
  stopTimer,
  startTabDetection,
  stopTabDetection,
  douraStore,
  appStateStore,
} from './modules/state-manager.js';
import {
  getApiProvider,
  getCurrentApiConfiguration,
  loadAllApiKeys,
} from './modules/storage-manager.js';
import {
  setTranscriptionProvider,
  transcribeWithCurrentProvider,
  summaryWithCurrentProvider,
  summarizePartTextWithOpenAI,
} from './modules/transcription-service.js';
import { WavRecorder } from './utils/wavtools/index.js';
import { RealtimeClient } from './modules/openai-realtime-api.js';

let appState = {
  isInitialized: false,
  audioPlaybackSessions: new Map(),
  realtimeClient: null,
};

export const initializeApp = async () => {
  if (appState.isInitialized) return;

  try {
    // Load current provider
    const currentProvider = await getApiProvider();
    appStateStore.setApiProvider(currentProvider);
    // Load all API keys
    const apiKeys = await loadAllApiKeys();
    appStateStore.setAllApikeys(apiKeys);

    // Start tab detection
    startTabAutoDetection();

    // Set initial UI state
    appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');

    appState.isInitialized = true;
    console.log('Audio Transcriber App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    appStateStore.setStatus(`Initialization failed: ${error.message}`, 'error');
  }
};

const handleToggleRecording = async () => {
  try {
    if (appStateStore.isRecording) {
      await stopAllRecording();
    } else {
      await startNewRecording();
    }
  } catch (error) {
    console.error('Failed to toggle recording:', error);
    appStateStore.setStatus(`Recording failed: ${error.message}`, 'error');
  }
};

const startNewRecording = async () => {
  try {
    // Check API configuration
    const config = await getCurrentApiConfiguration();

    if (!config.apiKey?.trim()) {
      appStateStore.setStatus('Please configure API key in settings first', 'error');
      return;
    }

    if (!appStateStore.selectTabId) {
      appStateStore.setStatus('Please select audio source(s) to record', 'error');
      return;
    }

    appState.realtimeClient = new RealtimeClient({
      apiKey: config.apiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    });

    appState.realtimeClient.on('realtime.event', async ({ time, source, event }) => {
      const { type, error } = event;
      if (source === 'server') {
        if (type === 'error') {
          appStateStore.setStatus(error.message || '', 'error');
        }
      }
    });

    await appState.realtimeClient.connect();

    const useMicrophone = false;

    // Start recording state
    appStateStore.setIsRecording(true);
    appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.REQUESTING_AUDIO, 'processing');

    // Start recording sessions
    if (useMicrophone) {
      await startMicrophoneSession();
    } else {
      await startTabSession(appStateStore.selectTabId);
    }

    appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.RECORDING, 'recording');
  } catch (error) {
    console.error('Failed to start recording:', error);
    await stopAllRecording();
    appStateStore.setStatus(`Failed to start recording: ${error.message}`, 'error');
  }
};

const startTabSession = async tabId => {
  try {
    const stream = await captureTabAudio(tabId);
    const tabInfo = await chrome.tabs.get(tabId);
    const label = `Tab: ${tabInfo.title || tabInfo.url}`;
    await initializeAudioSession(`tab-${tabId}`, stream, label);
  } catch (error) {
    console.error(`Failed to start tab session ${tabId}:`, error);
    throw error;
  }
};

const startMicrophoneSession = async () => {
  try {
    const stream = await captureMicrophoneAudio();
    await initializeAudioSession('microphone', stream, 'Microphone', false);
  } catch (error) {
    console.error('Failed to start microphone session:', error);
    throw error;
  }
};

const initializeAudioSession = async (sessionId, stream, label, enablePlayback = true) => {
  const mimeType = getSupportedMimeType(stream);
  const activeRecorders = new Set();

  // Set up audio playback if enabled
  let audioPlayback = null;
  if (enablePlayback) {
    audioPlayback = setupAudioPlayback(sessionId, stream, true);
    appState.audioPlaybackSessions.set(sessionId, audioPlayback);
  }

  // Create session data
  const sessionData = {
    label,
    stream,
    mimeType,
    activeRecorders,
    tickTimer: null,
    audioPlayback,
  };

  // Store session
  addSession(sessionId, sessionData);

  // Start recording segments
  await startRecordingSegment(sessionId);

  // Add session start notification
  appStateStore.addCompletedTranscripts({
    timestamp: new Date(),
    text: '',
    sessionId,
    label: `${label} started`,
  });
  throttleScrollToBottom();
};

const startRecordingSegment = async sessionId => {
  const session = getSession(sessionId);
  if (!session) return;

  const wavRecorder = new WavRecorder({ sampleRate: 24000 });

  const realtimeClient = appState.realtimeClient;

  // realtimeClient.updateSession({
  //   turn_detection: {
  //     type: 'server_vad',
  //     silence_duration_ms: 250, // 默认约 500
  //     threshold: 0.5, // 嘈杂环境可以调高
  //     prefix_padding_ms: 150,
  //   },
  // });

  let realtimeDelta = '';
  realtimeClient.on('realtime.event', async ({ time, source, event }) => {
    const { type } = event;
    if (source === 'server') {
      console.log('event: ', event);
      if (type === 'conversation.item.input_audio_transcription.delta') {
        realtimeDelta += event.delta;
        // console.log('realtimeDelta: ', realtimeDelta);
        throttleSetRealTimeTranscriptionToUI(realtimeDelta);
      }
      if (type === 'conversation.item.input_audio_transcription.completed') {
        realtimeDelta = '';
        throttleSetRealTimeTranscriptionToUI(realtimeDelta);
        await processTranscriptionEvent({
          transcript: event.transcript || '',
          sessionId,
          label: '',
          timestamp: new Date(),
        });
      }
    }
  });

  let summarizedTimerInterval = null;

  const doPartSummary = async () => {
    const transcripts = appStateStore.completedTranscripts;
    let summarizedTranscriptsPosition = appStateStore.summarizedTranscriptsPosition;
    let needSummarizeText = '';
    for (; summarizedTranscriptsPosition < transcripts.length; summarizedTranscriptsPosition++) {
      const t = transcripts[summarizedTranscriptsPosition];
      if (t.isPartSummary) {
        continue;
      }
      needSummarizeText = t.text + '\n';
    }
    if (needSummarizeText) {
      try {
        const summaryText = await summarizePartTextWithOpenAI({
          text: needSummarizeText,
          apiKey: (await getCurrentApiConfiguration()).apiKey,
        });
        const summaryData = {
          timestamp: new Date(),
          text: summaryText,
          sessionId,
          label: 'Summary',
          isPartSummary: true,
        };
        appStateStore.addCompletedTranscripts(summaryData);
        console.log('summaryData: ', summaryData);
        appStateStore.setSummarizedTranscriptsPosition(summarizedTranscriptsPosition);
        throttleScrollToBottom();
      } catch (e) {
        console.error('Part summary failed:', e);
      }
    }
  };

  const recorder = {};
  // Process completed segment
  recorder.onstop = async () => {
    realtimeDelta = '';
    throttleSetRealTimeTranscriptionToUI(realtimeDelta);
    if (summarizedTimerInterval) {
      clearInterval(summarizedTimerInterval);
    }
    await wavRecorder.end();
    session.activeRecorders.delete(recorder);
    await doPartSummary();

    // // Prepare transcription data
    //   const transcriptionData = {
    //     sessionId,
    //     base64: base64Data,
    //     mimeType: session.mimeType,
    //     timestamp: new Date().toISOString(),
    //     label: session.label,
    //     apiKey: (await getCurrentApiConfiguration()).apiKey,
    //   };

    //   // Perform transcription
  };

  // Start recording
  session.activeRecorders.add(recorder);
  await wavRecorder.begin(session.stream);
  startTimer();
  await wavRecorder.record(data => {
    realtimeClient.appendInputAudio(data.mono);
    realtimeClient.createResponse();
  }, 8192 * 20);

  summarizedTimerInterval = setInterval(() => {
    doPartSummary();
  }, 30_000);

  // Schedule stop
  // setTimeout(() => {
  //   try {
  //     if (recorder.state !== 'inactive') {
  //       recorder.stop();
  //     }
  //   } catch (error) {
  //     console.warn('Failed to stop recorder:', error);
  //   }
  // }, AUDIO_CONFIG.DURATION_MS);
};

const processTranscriptionEvent = async data => {
  const transcript = {
    timestamp: data.timestamp,
    text: data.transcript,
    sessionId: data.sessionId,
    label: data.label,
  };

  appStateStore.addCompletedTranscripts(transcript);
  appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.RECORDING, 'recording');
  throttleScrollToBottom();
};

const stopAllRecording = async () => {
  // Stop all sessions
  const sessionIds = getAllSessionIds();
  for (const sessionId of sessionIds) {
    await stopSession(sessionId);
  }

  // Reset UI state
  appStateStore.setIsRecording(false);
  stopRecordingTimer();
  appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
  appState.realtimeClient.disconnect();
};

const stopSession = async sessionId => {
  const session = getSession(sessionId);
  if (!session) return;
  // appState.realtimeClient.updateSession({
  //   turn_detection: null,
  // });
  try {
    // Stop recurring segment creation
    if (session.tickTimer) {
      clearInterval(session.tickTimer);
    }

    // Stop all active recorders
    for (const recorder of Array.from(session.activeRecorders)) {
      try {
        recorder.onstop();
      } catch (error) {
        console.warn('Failed to stop recorder:', error);
      }
    }

    // Stop audio stream
    // stopStream(session.stream);

    // Close audio context
    if (session.audioPlayback) {
      await closeAudioContext(sessionId);
      appState.audioPlaybackSessions.delete(sessionId);
    }
  } catch (error) {
    console.warn(`Failed to properly stop session ${sessionId}:`, error);
  }

  // Remove session from state
  removeSession(sessionId);

  // Add stop notification
  appStateStore.addCompletedTranscripts({
    timestamp: new Date(),
    text: '',
    sessionId,
    label: `${session.label} stopped`,
  });
  throttleScrollToBottom();
};

const startTabAutoDetection = () => {
  updateTabsList();
  // startTabDetection(updateTabsList, AUDIO_CONFIG.TAB_DETECTION_INTERVAL_MS);
};

const updateTabsList = async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!appStateStore.selectTabId && tabs[0]) {
      appStateStore.setAudioTabs(tabs);
      appStateStore.setSelectTabId(tabs[0].id);
    }
  } catch (error) {
    console.error('Failed to update tabs list:', error);
  }
};

const stopRecordingTimer = () => {
  stopTimer();
};

function throttle(fn, delay) {
  let last = 0;
  let timer = null;

  return function (...args) {
    const now = Date.now();
    const remaining = delay - (now - last);

    clearTimeout(timer);

    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else {
      // 设定最后一次补执行
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

const setRealTimeTranscriptionToUI = text => {
  requestAnimationFrame(function () {
    appStateStore.setRealTimeTranscription(text);
  });
};

const throttleSetRealTimeTranscriptionToUI = throttle(setRealTimeTranscriptionToUI, 100);

const throttleScrollToBottom = throttle(function () {
  // Auto-scroll to bottom
  const ele = document.getElementById('transcription-display');
  ele && scrollToBottom(ele);
}, 2000);

const handleSummaryTranscription = async () => {
  const completedTranscripts = appStateStore.completedTranscripts;
  if (completedTranscripts.length === 0) {
    appStateStore.setStatus('No transcripts available for summary', 'error');
    return;
  }

  // Simple summary: concatenate all texts
  const summaryText = completedTranscripts
    .filter(t => !t.isPartSummary)
    .map(t => t.text)
    .join('\n');

  try {
    const result = await summaryWithCurrentProvider({
      text: summaryText,
      apiKey: (await getCurrentApiConfiguration()).apiKey,
    });

    if (result.success) {
      // Add successful transcription
      const transcript = {
        timestamp: new Date(),
        text: result.text,
        sessionId: 'summary',
        label: 'Summary',
      };

      appStateStore.addCompletedTranscripts(transcript);
      throttleScrollToBottom();
    }
  } catch (error) {
    console.error('Summary failed:', error);
    appStateStore.setStatus(`Summary failed: ${error.message}`, 'error');
  }
};

const handleDownloadTranscription = () => {
  const text = document.getElementById('transcription-display-content')?.innerText || '';
  const blob = new Blob([text], { type: UI_CONSTANTS.MIME_TYPES.TEXT_PLAIN });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `transcription-${new Date().toISOString()}.txt`;
  downloadLink.click();

  URL.revokeObjectURL(url);
};

const handleClearTranscription = () => {
  const confirmMessage = 'Are you sure you want to clear all transcription content?';

  if (confirm(confirmMessage)) {
    appStateStore.clearCompletedTranscripts();
    appStateStore.clearSummarizedTranscripts();
    appStateStore.setStatus(UI_CONSTANTS.STATUS_MESSAGES.TRANSCRIPTION_CLEARED, 'idle');
  }
};

const cleanup = () => {
  // stopTabDetection();
  closeAllAudioContexts();

  appState.audioPlaybackSessions.clear();
};

export default function App() {
  const {
    currentStatus,
    currentStatusMessage,
    isSettingsPanelOpen,
    setIsSettingsPanelOpen,
    allApikeys,
    currentApiProvider,
    saveParticularApikeys,
    setParticularApikeys,
    completedTranscripts,
    realTimeTranscription,
    audioTabs,
    selectTabId,
    setSelectTabId,
    isRecording,
    formateRecordingDurationSeconds,
  } = useModel(appStateModelName, appStateModel);
  return (
    <>
      <div className="header">
        <div className="header-content">
          <h1>AI Audio Transcriber</h1>
          <div id="status" className={`status-${currentStatus}`}>
            {currentStatusMessage}
          </div>
        </div>
        <button
          onClick={() => setIsSettingsPanelOpen(true)}
          className="settings-toggle"
          title="Settings"
        >
          <img src="icons/settings-48.png" alt="Settings" width="16" height="16" />
        </button>
      </div>

      {isSettingsPanelOpen && (
        <div className="settings-panel open">
          <div className="settings-header">
            <h3>Settings</h3>
            <button onClick={() => setIsSettingsPanelOpen(false)} className="close-btn">
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

              <div id="openaiConfig" className="api-config">
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
      )}

      <div className="tabs-picker">
        <div className="tabs-header">
          <span>Audible Tabs</span>
          <div className="auto-detect-indicator">
            <span className="dot"></span>
            Auto-detecting
          </div>
        </div>
        <div className="tabs-list">
          {audioTabs.length === 0 ? (
            <div className="placeholder">Play a video to detect audio automatically</div>
          ) : (
            audioTabs.map(tab => (
              <div key={tab.id} className="tab-item">
                {tab.favIconUrl && <img src={tab.favIconUrl} alt="Tab icon" />}
                <div className="tab-title">{tab.title || tab.url || `Tab ${tab.id}`}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="controls">
        <div className="btns">
          <button
            onClick={handleToggleRecording}
            className={`toggle-btn ${isRecording ? 'stop-state' : ''}`}
            disabled={!selectTabId}
          >
            {isRecording ? 'Stop' : 'Start'}
          </button>
        </div>
        <div className="timer-row">
          <div id="timer" className="timer">
            {formateRecordingDurationSeconds}
          </div>
        </div>
      </div>
      <div className="transcription-wrapper">
        <div
          className={`transcription-controls ${completedTranscripts.length > 0 ? 'has-content' : ''}`}
        >
          <button onClick={handleSummaryTranscription}>Summary</button>
          <button onClick={handleDownloadTranscription}>Download</button>
          <button onClick={handleClearTranscription}>Clear</button>
        </div>
        <div id="transcription-display" className="transcription-container">
          <div id="transcription-display-content">
            {completedTranscripts.length === 0 ? (
              <p className="placeholder">Your transcription will appear here…</p>
            ) : (
              completedTranscripts.map((item, index) => (
                <p className="transcription-item" key={index}>
                  {item.timestamp && <span className="ts">{item.timestamp}</span>}
                  {item.label && <span className="chan">{item.label}</span>}
                  {item.text}
                </p>
              ))
            )}
          </div>
          <div id="transcription-real-time">{realTimeTranscription}</div>
        </div>
      </div>
    </>
  );
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tabId === appStateStore.selectTabId) {
    appStateStore.setAudioTabs([tab]);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  const container = document.getElementById('root');
  const root = createRoot(container);

  root.render(
    <DouraRoot store={douraStore}>
      <App />
    </DouraRoot>
  );
});

window.AudioTranscriberApp = {
  initializeApp,
  handleToggleRecording,
  stopAllRecording,
  cleanup,
};

