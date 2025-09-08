import { UI_CONSTANTS, TIMER_CONFIG } from '../config/app-config.js';

let applicationState = {
  // Recording state
  isRecording: false,
  activeSessions: new Map(),
  pendingTranscriptionQueue: [],
  completedTranscripts: [],
  summarizedTranscriptsPosition: 0,
  summarizedTranscripts: [],
  // Timer state
  timerInterval: null,
  recordingDurationSeconds: 0,

  // Tab detection state
  tabDetectionInterval: null,

  // UI state
  isSettingsPanelOpen: false,
  currentApiProvider: 'gemini',
};

export const resetState = () => {
  // Stop any running intervals
  stopTimer();
  stopTabDetection();

  // Reset state
  applicationState = {
    isRecording: false,
    activeSessions: new Map(),
    pendingTranscriptionQueue: [],
    completedTranscripts: [],
    summarizedTranscriptsPosition: 0,
    summarizedTranscripts: [],
    timerInterval: null,
    recordingDurationSeconds: 0,
    tabDetectionInterval: null,
    isSettingsPanelOpen: false,
    currentApiProvider: 'gemini',
  };
};

export const getState = () => ({
  ...applicationState,
  activeSessions: new Map(applicationState.activeSessions),
  pendingTranscriptionQueue: [...applicationState.pendingTranscriptionQueue],
  completedTranscripts: [...applicationState.completedTranscripts],
  summarizedTranscripts: [...applicationState.summarizedTranscripts],
});

export const startRecording = () => {
  applicationState.isRecording = true;
};

export const stopRecording = () => {
  applicationState.isRecording = false;
};

export const isRecording = () => applicationState.isRecording;

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

export const addTranscript = transcript => {
  applicationState.completedTranscripts.push(transcript);
};

export const getTranscripts = () => {
  return [...applicationState.completedTranscripts];
};

export const clearTranscripts = () => {
  applicationState.completedTranscripts = [];
};

export const addSummarizedTranscript = transcript => {
  applicationState.summarizedTranscripts.push(transcript);
};

export const getSummarizedTranscripts = () => {
  return [...applicationState.summarizedTranscripts];
};

export const clearSummarizedTranscripts = () => {
  applicationState.summarizedTranscripts = [];
};

export const hasTranscripts = () => {
  return applicationState.completedTranscripts.length > 0;
};

export const getTranscriptCount = () => {
  return applicationState.completedTranscripts.length;
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

export const startTimer = updateCallback => {
  applicationState.recordingDurationSeconds = 0;
  applicationState.timerInterval = setInterval(() => {
    applicationState.recordingDurationSeconds++;
    if (updateCallback) {
      updateCallback(getFormattedTime());
    }
  }, TIMER_CONFIG.UPDATE_INTERVAL_MS);
};

export const stopTimer = () => {
  if (applicationState.timerInterval) {
    clearInterval(applicationState.timerInterval);
    applicationState.timerInterval = null;
  }
  applicationState.recordingDurationSeconds = 0;
};

export const getFormattedTime = () => {
  const date = new Date(applicationState.recordingDurationSeconds * 1000);
  return date.toISOString().substring(11, 19); // HH:MM:SS format
};

export const getRecordingDuration = () => {
  return applicationState.recordingDurationSeconds;
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

export const isTabDetectionRunning = () => {
  return applicationState.tabDetectionInterval !== null;
};

export const setApiProvider = provider => {
  applicationState.currentApiProvider = provider;
};

export const getApiProvider = () => {
  return applicationState.currentApiProvider;
};

export const openSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = true;
};

export const closeSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = false;
};

export const toggleSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = !applicationState.isSettingsPanelOpen;
  return applicationState.isSettingsPanelOpen;
};

export const isSettingsPanelOpen = () => {
  return applicationState.isSettingsPanelOpen;
};

let statusState = {
  currentStatus: 'idle',
  statusElement: null,
};

export const initializeStatusManager = statusElement => {
  statusState.statusElement = statusElement;
};

export const setStatus = (message, type = 'idle') => {
  if (statusState.statusElement) {
    statusState.statusElement.textContent = `Status: ${message}`;

    // Remove all status classes
    Object.values(UI_CONSTANTS.CSS_CLASSES).forEach(className => {
      if (className.startsWith('status-')) {
        statusState.statusElement.classList.remove(className);
      }
    });

    // Add current status class
    statusState.statusElement.classList.add(`status-${type}`);
    statusState.currentStatus = type;
  }
};

export const getCurrentStatus = () => {
  return statusState.currentStatus;
};

export const isStatusRecording = () => {
  return statusState.currentStatus === 'recording';
};

export const isStatusProcessing = () => {
  return statusState.currentStatus === 'processing';
};

export const isStatusError = () => {
  return statusState.currentStatus === 'error';
};

export const isStatusIdle = () => {
  return statusState.currentStatus === 'idle';
};

export const getStateSummary = () => {
  return {
    isRecording: isRecording(),
    sessionCount: getSessionCount(),
    transcriptCount: getTranscriptCount(),
    pendingCount: getPendingQueueLength(),
    timerRunning: isTimerRunning(),
    tabDetectionRunning: isTabDetectionRunning(),
    settingsPanelOpen: isSettingsPanelOpen(),
    currentProvider: getApiProvider(),
    currentStatus: getCurrentStatus(),
    recordingDuration: getRecordingDuration(),
  };
};

