import { UI_CONSTANTS, TIMER_CONFIG, API_PROVIDERS } from '../config/app-config.js';
import { defineModel, doura } from 'doura';
import {
  clearAllApiKeys,
  saveValidatedApiKey,
  saveApiProvider,
  setCollections,
} from './storage-manager.js';

export const appStateModel = defineModel({
  state: {
    currentStatus: 'idle',
    currentStatusMessage: '',
    audioTabs: [],
    selectTabId: '',
    isRecording: false,
    currentView: 'main', // 'main' | 'stocks' | 'collections' | 'calendar' | 'menu' | 'setting'
    completedTranscripts: [
      {
        id: 1,
        text: 'Welcome to Real-time Meeting Assistant! Start recording to see live transcriptions here.',
        timestamp: new Date().toLocaleTimeString(),
        label: 'System',
        assistant: 'Hello! I am your assistant. How can I help you today?',
      },
    ],
    summarizedTranscriptsPosition: 0,
    summarizedTranscripts: [],
    stocks: [
      {
        symbol: '123',
        shortName: 'apple',
        currentPrice: 1,
      },
    ],
    collections: [],
    realTimeTranscription: '',
    recordingDurationSeconds: 0,
    showMenu: false,
    currentApiProvider: 'openai',
    onfocusContent: false,
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
      transcript.id = crypto.randomUUID();
      this.completedTranscripts.push(transcript);
    },
    updateCompletedTranscripts(id, newData) {
      const index = this.completedTranscripts.findIndex(t => t.id === id);
      if (index === -1) return;
      this.completedTranscripts[index] = {
        ...this.completedTranscripts[index],
        ...newData,
      };
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
    addStock(stock) {
      if (!stock || !stock.symbol) return;
      if (this.stocks.some(s => s.symbol === stock.symbol)) return;
      this.stocks.push(stock);
    },
    updateStock(symbol, newData) {
      const idx = this.stocks.findIndex(s => s.symbol === symbol);
      if (idx === -1) return;
      this.stocks[idx] = { ...this.stocks[idx], ...newData };
    },
    removeStock(symbol) {
      this.stocks = this.stocks.filter(s => s.symbol !== symbol);
    },
    addCollection(item) {
      if (!item || !item.id) return;
      if (this.collectionsIds[item.id]) return;
      this.collections.push(item);
      setCollections(this.collections);
    },
    updateCollection(id, newData) {
      const idx = this.collections.findIndex(c => c.id === id);
      if (idx === -1) return;
      this.collections[idx] = { ...this.collections[idx], ...newData };
      setCollections(this.collections);
    },
    removeCollection(id) {
      this.collections = this.collections.filter(c => c.id !== id);
      setCollections(this.collections);
    },
    setCollections(collections) {
      this.collections = collections;
    },
    clearCollections() {
      this.collections = [];
      setCollections(this.collections);
    },
    setRealTimeTranscription(v) {
      this.realTimeTranscription = v;
    },
    setRecordingDurationSeconds(v) {
      this.recordingDurationSeconds = v;
    },
    setShowMenu(v) {
      return (this.showMenu = v);
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
      this.setCurrentView('main');
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
    setOnfocusContent(v) {
      this.onfocusContent = v;
    },
    setCurrentView(v) {
      this.currentView = v;
    },
    async resetState() {
      this.isRecording = false;
      this.completedTranscripts = [];
      this.summarizedTranscriptsPosition = 0;
      this.summarizedTranscripts = [];
      this.recordingDurationSeconds = 0;
      this.currentApiProvider = 'openai';
      this.allApikeys = {};
    },
  },
  views: {
    formateRecordingDurationSeconds() {
      const date = new Date(this.recordingDurationSeconds * 1000);
      return date.toISOString().substring(11, 19); // HH:MM:SS format
    },
    collectionsIds() {
      const ids = {};
      this.collections.forEach(c => {
        ids[c.id] = true;
      });
      return ids;
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

