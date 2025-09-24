import React from 'react';
import { createRoot } from 'react-dom/client';
import { DouraRoot, useModel } from 'react-doura';
import { appStateModel, appStateModelName } from './modules/state-manager';

import { UI_CONSTANTS } from './config/app-config.js';
import { scrollToBottom } from './utils/dom-utils.js';
import {
  getSupportedMimeType,
  captureTabAudio,
  captureMicrophoneAudio,
  setupAudioPlayback,
  closeAudioContext,
  closeAllAudioContexts,
} from './utils/audio-utils.js';

import {
  addSession,
  removeSession,
  getSession,
  getAllSessionIds,
  startTimer,
  stopTimer,
  douraStore,
  appStateStore,
} from './modules/state-manager.js';
import {
  getApiProvider,
  getCurrentApiConfiguration,
  loadAllApiKeys,
} from './modules/storage-manager.js';
import {
  summaryWithCurrentProvider,
  summarizePartTextWithOpenAI,
  assistantWithOpenAI,
} from './modules/transcription-service.js';
import { WavRecorder } from './utils/wavtools/index.js';
import { RealtimeClient } from './modules/openai-realtime-api.js';

import Setting from './components/Setting.jsx';
import Menu from './components/Menu.jsx';

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

  realtimeClient.updateSession({
    turn_detection: {
      type: 'server_vad',
      silence_duration_ms: 250, // 默认约 500
      threshold: 0.5, // 嘈杂环境可以调高
      prefix_padding_ms: 150,
    },
  });

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
    // realtimeClient.createResponse();
  }, 8192 * 5);

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
  setTimeout(function () {
    if (appStateStore.onfocusContent) {
      return;
    }
    scrollToBottom(document.getElementById('transcription-display'));
  });
}, 1000);

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

const handleAssistantWithOpenAI = async (index, item) => {
  const apiKey = (await getCurrentApiConfiguration()).apiKey;
  const { text } = item;
  const res = await assistantWithOpenAI({ text: text, apiKey });
  appStateStore.updateCompletedTranscripts(index, { assistant: res });
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
    showMenu,
    setShowMenu,
    completedTranscripts,
    realTimeTranscription,
    audioTabs,
    selectTabId,
    setSelectTabId,
    setOnfocusContent,
    isRecording,
    formateRecordingDurationSeconds,
    currentView,
  } = useModel(appStateModelName, appStateModel);
  return (
    <>
      <div className="header">
        <div className="header-content">
          <h1>AI Meeting Assistant</h1>
          <div id="status" className={`status-${currentStatus}`}>
            {currentStatusMessage}
          </div>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="menu-toggle" title="menu">
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19 17H5c-1.103 0-2 .897-2 2s.897 2 2 2h14c1.103 0 2-.897 2-2s-.897-2-2-2m0-7H5c-1.103 0-2 .897-2 2s.897 2 2 2h14c1.103 0 2-.897 2-2s-.897-2-2-2m0-7H5c-1.103 0-2 .897-2 2s.897 2 2 2h14c1.103 0 2-.897 2-2s-.897-2-2-2"
            ></path>
          </svg>
        </button>
        {showMenu && <Menu></Menu>}
      </div>

      {currentView === 'setting' && <Setting />}

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
        <div
          id="transcription-display"
          onMouseEnter={() => setOnfocusContent(true)}
          onMouseLeave={() => setOnfocusContent(false)}
          className="transcription-container"
        >
          <div id="transcription-display-content">
            {completedTranscripts.length === 0 ? (
              <div className="placeholder">Your transcription will appear here…</div>
            ) : (
              completedTranscripts.map((item, index) => (
                <div className="transcription-item" key={index}>
                  {item.timestamp && <span className="ts">{item.timestamp}</span>}
                  {item.label && <span className="chan">{item.label}</span>}
                  {item.text}
                  {item.assistant && <div className="assistant">{item.assistant}</div>}
                  <div className="transcription-item-handels">
                    <button>
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
                    <button onClick={() => handleAssistantWithOpenAI(index, item)}>
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

