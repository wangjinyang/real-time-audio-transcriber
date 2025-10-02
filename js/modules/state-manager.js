import { defineModel, doura, set } from 'doura';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import utc from 'dayjs/plugin/utc.js';
import {
  clearAllApiKeys,
  saveValidatedApiKey,
  saveApiProvider,
  setCollections,
  saveHandlePeriod,
} from './storage-manager.js';
import { UI_CONSTANTS, TIMER_CONFIG, API_PROVIDERS } from '../config/app-config.js';

dayjs.extend(localizedFormat);
dayjs.extend(utc);

export const appStateModel = defineModel({
  state: {
    currentStatus: 'idle',
    currentStatusMessage: '',
    audioTabs: [],
    selectTabId: '',
    isRecording: false,
    currentView: 'main', // 'main' | 'stocks' | 'collections' | 'calendar' | 'menu' | 'setting'
    completedTranscripts: [],
    summarizedTranscriptsPosition: 0,
    summarizedTranscripts: [],
    stocks: [],
    collections: [],
    calendarEvents: [],
    realTimeTranscription: '',
    recordingDurationSeconds: 0,
    handleTranscriptsPeriod: 60, // seconds
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
      const { timestamp = new Date() } = transcript;
      if (timestamp && timestamp.getTime) {
        transcript.time = timestamp.getTime();
      }
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
    async fetchStockInfos(stockSymbols) {
      const needFetchSymbols = stockSymbols.filter(stock => !this.stocksInfos[stock]);
      if (needFetchSymbols.length > 0) {
        const url = `https://sub3.phatty.io/ai-agent/current-price?symbols=${needFetchSymbols.join(',')}`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          console.log('data: ', data);
          if (data.length === 0) {
            confirm('No stock data found');
            return;
          }
          for (const item of data) {
            this.addStock(item);
          }
        } catch (err) {
          console.error('Failed to fetch stock prices:', err.message);
        }
      }
    },
    async fetchEarningsDates() {
      const symbols = this.stocks.map(s => s.symbol);
      if (symbols.length > 0) {
        const fetchEarningsDate = async symbol => {
          const url = `https://sub3.phatty.io/ai-agent/earnings-date/${symbol}`;
          try {
            const res = await fetch(url);
            const data = await res.json();
            const { earningsDate, symbol } = data;
            this.calendarEvents.push({
              title: `${symbol} estimated earnings release date`,
              start: dayjs(earningsDate).valueOf(),
              description: '',
            });
          } catch (err) {
            console.error('Failed to fetch earnings dates:', err.message);
          }
        };
        let arr = [];
        for (const symbol of symbols) {
          const data = await fetchEarningsDate(symbol);
          arr.push(data);
        }
        await Promise.all(arr);
      }
    },
    async fetchCalendarEvents() {
      const url = `https://sub3.phatty.io/ai-agent/economic-events`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('data: ', data);
        const { events = [] } = data;
        events.forEach(event => {
          const { name, dateline } = event;
          this.calendarEvents.push({
            title: name,
            start: dateline * 1000,
            description: '',
          });
        });
      } catch (err) {
        console.error('Failed to fetch calendar events:', err.message);
      }
    },
    addCalendarEvent(event) {
      if (!event || !event.title || !event.start) return;
      if (typeof event.start === 'string') {
        event.start = dayjs(event.start).valueOf();
      }
      if (typeof event.end === 'string') {
        event.end = dayjs(event.end).valueOf();
      }
      this.calendarEvents.push(event);
    },
    removeCalendarEvent(index) {
      if (index < 0 || index >= this.calendarEvents.length) return;
      this.calendarEvents.splice(index, 1);
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
    setHandleTranscriptsPeriod(v) {
      this.handleTranscriptsPeriod = v;
      saveHandlePeriod(v);
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
    stocksInfos() {
      const res = {};
      this.stocks.forEach(stock => {
        res[stock.symbol] = stock;
      });
      return res;
    },
    groupCalendarEvents() {
      const res = [];
      const grouped = {};
      this.calendarEvents.forEach(event => {
        const dateKey = dayjs(event.start).format('YYYY-MM-DD');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      });
      const sortedKeys = Object.keys(grouped).sort(
        (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()
      );
      sortedKeys.forEach(key => {
        grouped[key].sort((a, b) => a.start - b.start);
        res.push({ groupedDate: key, events: grouped[key] });
      });
      return res;
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

