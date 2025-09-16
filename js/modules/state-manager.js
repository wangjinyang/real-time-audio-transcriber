import { UI_CONSTANTS, TIMER_CONFIG, API_PROVIDERS } from '../config/app-config.js';
import { defineModel, doura } from 'doura';
import { clearAllApiKeys, saveValidatedApiKey, saveApiProvider } from './storage-manager.js';

export const appStateModel = defineModel({
  state: {
    currentStatus: 'idle',
    currentStatusMessage: '',
    audioTabs: [],
    selectTabId: '',
    isRecording: false,
    completedTranscripts: [],
    summarizedTranscriptsPosition: 0,
    summarizedTranscripts: [],
    realTimeTranscription: '',
    recordingDurationSeconds: 0,
    isSettingsPanelOpen: false,
    currentApiProvider: 'openai',
    allApikeys: {},
  },
  actions: {
    setCurrentStatus(v) {
      this.currentStatus = v;
    },
    setCurrentStatusMessage(v) {
      this.currentStatusMessage = v;
    },
    setIsRecording(v) {
      this.isRecording = v;
    },
    addCompletedTranscripts(transcript) {
      const { timestamp } = transcript;
      if (timestamp && timestamp.toLocaleTimeString) {
        transcript.timestamp = timestamp.toLocaleTimeString();
      }
      this.completedTranscripts.push(transcript);
    },
    clearCompletedTranscripts() {
      this.completedTranscripts = [];
    },
    setSummarizedTranscriptsPosition(v) {
      this.summarizedTranscriptsPosition = v;
    },
    addSummarizedTranscripts(summary) {
      this.summarizedTranscripts.push(summary);
    },
    clearSummarizedTranscripts() {
      this.summarizedTranscripts = [];
    },
    setRealTimeTranscription(v) {
      this.realTimeTranscription = v;
    },
    setRecordingDurationSeconds(v) {
      this.recordingDurationSeconds = v;
    },
    setIsSettingsPanelOpen(v) {
      return (this.isSettingsPanelOpen = v);
    },
    setApiProvider(v) {
      this.currentApiProvider = v;
      saveApiProvider(this.currentApiProvider);
    },
    setAllApikeys(v) {
      this.allApikeys = v;
    },
    setParticularApikeys(providerId, apiKey) {
      this.allApikeys[providerId] = apiKey;
    },
    async saveParticularApikeys(providerId, apiKey) {
      const config = API_PROVIDERS[providerId];
      if (!config) {
        console.error(`Unknown provider: ${providerId}`);
        return;
      }
      this.allApikeys[providerId] = apiKey;
      await saveValidatedApiKey(providerId, apiKey);
      this.isSettingsPanelOpen = false;
      this.setStatus(`${config.name} API key saved`, 'processing');
      setTimeout(() => {
        this.setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
      }, 1500);
    },
    setStatus(message, type = 'idle') {
      this.setCurrentStatusMessage(`Status: ${message}`);
      this.setCurrentStatus(type);
    },
    setAudioTabs(tabs) {
      this.audioTabs = tabs;
    },
    setSelectTabId(tabId) {
      this.selectTabId = tabId;
    },
    async resetState() {
      this.isRecording = false;
      this.completedTranscripts = [];
      this.summarizedTranscriptsPosition = 0;
      this.summarizedTranscripts = [];
      this.recordingDurationSeconds = 0;
      this.isSettingsPanelOpen = false;
      this.currentApiProvider = 'openai';
      this.allApikeys = {};
    },
  },
  views: {
    formateRecordingDurationSeconds() {
      const date = new Date(this.recordingDurationSeconds * 1000);
      return date.toISOString().substring(11, 19); // HH:MM:SS format
    },
  },
});

export const appStateModelName = 'appStateModelName';

export const douraStore = doura();

export const appStateStore = douraStore.getModel('appStateModelName', appStateModel);

let applicationState = {
  // Recording state
  activeSessions: new Map(),
  pendingTranscriptionQueue: [],
  // Timer state
  timerInterval: null,

  // Tab detection state
  tabDetectionInterval: null,
};

export const resetState = () => {
  // Stop any running intervals
  stopTimer();
  stopTabDetection();

  // Reset state
  applicationState = {
    activeSessions: new Map(),
    pendingTranscriptionQueue: [],
    timerInterval: null,
    tabDetectionInterval: null,
  };
  appStateStore.resetState();
  clearAllApiKeys();
  appStateStore.setStatus('Reset success');
};

export const addSession = (sessionId, sessionData) => {
  applicationState.activeSessions.set(sessionId, sessionData);
};

export const removeSession = sessionId => {
  return applicationState.activeSessions.delete(sessionId);
};

export const getSession = sessionId => {
  return applicationState.activeSessions.get(sessionId);
};

export const hasSession = sessionId => {
  return applicationState.activeSessions.has(sessionId);
};

export const getAllSessionIds = () => {
  return Array.from(applicationState.activeSessions.keys());
};

export const getSessionCount = () => {
  return applicationState.activeSessions.size;
};

export const clearSessions = () => {
  applicationState.activeSessions.clear();
};

export const addToPendingQueue = item => {
  applicationState.pendingTranscriptionQueue.push(item);
};

export const getPendingQueueItems = () => {
  return applicationState.pendingTranscriptionQueue.splice(
    0,
    applicationState.pendingTranscriptionQueue.length
  );
};

export const hasPendingItems = () => {
  return applicationState.pendingTranscriptionQueue.length > 0;
};

export const getPendingQueueLength = () => {
  return applicationState.pendingTranscriptionQueue.length;
};

export const clearPendingQueue = () => {
  applicationState.pendingTranscriptionQueue = [];
};

export const startTimer = () => {
  appStateStore.setRecordingDurationSeconds(0);
  if (applicationState.timerInterval) {
    return;
  }
  applicationState.timerInterval = setInterval(() => {
    appStateStore.setRecordingDurationSeconds(appStateStore.recordingDurationSeconds + 1);
  }, TIMER_CONFIG.UPDATE_INTERVAL_MS);
};

export const stopTimer = () => {
  if (applicationState.timerInterval) {
    clearInterval(applicationState.timerInterval);
    applicationState.timerInterval = null;
  }
  appStateStore.setRecordingDurationSeconds(0);
};

export const isTimerRunning = () => {
  return applicationState.timerInterval !== null;
};

export const startTabDetection = (detectionCallback, intervalMs = 3000) => {
  if (applicationState.tabDetectionInterval) {
    stopTabDetection();
  }

  // Immediate detection
  if (detectionCallback) detectionCallback();

  // Periodic detection
  applicationState.tabDetectionInterval = setInterval(detectionCallback, intervalMs);
};

export const stopTabDetection = () => {
  if (applicationState.tabDetectionInterval) {
    clearInterval(applicationState.tabDetectionInterval);
    applicationState.tabDetectionInterval = null;
  }
};

