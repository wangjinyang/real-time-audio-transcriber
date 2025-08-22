/**
 * Application State Manager Module
 * Functional state management for the transcription application
 */

import { UI_CONSTANTS, TIMER_CONFIG } from '../config/app-config.js';

// ==================== APPLICATION STATE ====================
let applicationState = {
  // Recording state
  isRecording: false,
  activeSessions: new Map(),
  pendingTranscriptionQueue: [],
  completedTranscripts: [],

  // Timer state
  timerInterval: null,
  recordingDurationSeconds: 0,

  // Tab detection state
  tabDetectionInterval: null,

  // UI state
  isSettingsPanelOpen: false,
  currentApiProvider: 'gemini',
};

// ==================== STATE RESET FUNCTIONS ====================

/**
 * Reset application state to initial values
 */
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
    timerInterval: null,
    recordingDurationSeconds: 0,
    tabDetectionInterval: null,
    isSettingsPanelOpen: false,
    currentApiProvider: 'gemini',
  };
};

/**
 * Get current application state (read-only copy)
 * @returns {Object} Current state
 */
export const getState = () => ({
  ...applicationState,
  activeSessions: new Map(applicationState.activeSessions),
  pendingTranscriptionQueue: [...applicationState.pendingTranscriptionQueue],
  completedTranscripts: [...applicationState.completedTranscripts],
});

// ==================== RECORDING STATE FUNCTIONS ====================

/**
 * Start recording
 */
export const startRecording = () => {
  applicationState.isRecording = true;
};

/**
 * Stop recording
 */
export const stopRecording = () => {
  applicationState.isRecording = false;
};

/**
 * Check if currently recording
 * @returns {boolean} Recording status
 */
export const isRecording = () => applicationState.isRecording;

/**
 * Add recording session
 * @param {string} sessionId - Session identifier
 * @param {Object} sessionData - Session data
 */
export const addSession = (sessionId, sessionData) => {
  applicationState.activeSessions.set(sessionId, sessionData);
};

/**
 * Remove recording session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Whether session was removed
 */
export const removeSession = sessionId => {
  return applicationState.activeSessions.delete(sessionId);
};

/**
 * Get recording session
 * @param {string} sessionId - Session identifier
 * @returns {Object|undefined} Session data
 */
export const getSession = sessionId => {
  return applicationState.activeSessions.get(sessionId);
};

/**
 * Check if session exists
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Whether session exists
 */
export const hasSession = sessionId => {
  return applicationState.activeSessions.has(sessionId);
};

/**
 * Get all session IDs
 * @returns {string[]} Array of session IDs
 */
export const getAllSessionIds = () => {
  return Array.from(applicationState.activeSessions.keys());
};

/**
 * Get number of active sessions
 * @returns {number} Session count
 */
export const getSessionCount = () => {
  return applicationState.activeSessions.size;
};

/**
 * Clear all sessions
 */
export const clearSessions = () => {
  applicationState.activeSessions.clear();
};

// ==================== TRANSCRIPT MANAGEMENT FUNCTIONS ====================

/**
 * Add completed transcript
 * @param {Object} transcript - Transcript object
 */
export const addTranscript = transcript => {
  applicationState.completedTranscripts.push(transcript);
};

/**
 * Get all transcripts
 * @returns {Object[]} Array of transcripts
 */
export const getTranscripts = () => {
  return [...applicationState.completedTranscripts];
};

/**
 * Clear all transcripts
 */
export const clearTranscripts = () => {
  applicationState.completedTranscripts = [];
};

/**
 * Check if there are any transcripts
 * @returns {boolean} Whether transcripts exist
 */
export const hasTranscripts = () => {
  return applicationState.completedTranscripts.length > 0;
};

/**
 * Get transcript count
 * @returns {number} Number of transcripts
 */
export const getTranscriptCount = () => {
  return applicationState.completedTranscripts.length;
};

// ==================== PENDING QUEUE MANAGEMENT FUNCTIONS ====================

/**
 * Add item to pending transcription queue
 * @param {Object} item - Queue item
 */
export const addToPendingQueue = item => {
  applicationState.pendingTranscriptionQueue.push(item);
};

/**
 * Get and clear all pending queue items
 * @returns {Object[]} Array of pending items
 */
export const getPendingQueueItems = () => {
  return applicationState.pendingTranscriptionQueue.splice(
    0,
    applicationState.pendingTranscriptionQueue.length
  );
};

/**
 * Check if there are pending items
 * @returns {boolean} Whether pending items exist
 */
export const hasPendingItems = () => {
  return applicationState.pendingTranscriptionQueue.length > 0;
};

/**
 * Get pending queue length
 * @returns {number} Number of pending items
 */
export const getPendingQueueLength = () => {
  return applicationState.pendingTranscriptionQueue.length;
};

/**
 * Clear pending queue
 */
export const clearPendingQueue = () => {
  applicationState.pendingTranscriptionQueue = [];
};

// ==================== TIMER MANAGEMENT FUNCTIONS ====================

/**
 * Start recording timer
 * @param {Function} updateCallback - Callback function for timer updates
 */
export const startTimer = updateCallback => {
  applicationState.recordingDurationSeconds = 0;
  applicationState.timerInterval = setInterval(() => {
    applicationState.recordingDurationSeconds++;
    if (updateCallback) {
      updateCallback(getFormattedTime());
    }
  }, TIMER_CONFIG.UPDATE_INTERVAL_MS);
};

/**
 * Stop recording timer
 */
export const stopTimer = () => {
  if (applicationState.timerInterval) {
    clearInterval(applicationState.timerInterval);
    applicationState.timerInterval = null;
  }
  applicationState.recordingDurationSeconds = 0;
};

/**
 * Get formatted time string
 * @returns {string} Formatted time (HH:MM:SS)
 */
export const getFormattedTime = () => {
  const date = new Date(applicationState.recordingDurationSeconds * 1000);
  return date.toISOString().substring(11, 19); // HH:MM:SS format
};

/**
 * Get recording duration in seconds
 * @returns {number} Duration in seconds
 */
export const getRecordingDuration = () => {
  return applicationState.recordingDurationSeconds;
};

/**
 * Check if timer is running
 * @returns {boolean} Whether timer is active
 */
export const isTimerRunning = () => {
  return applicationState.timerInterval !== null;
};

// ==================== TAB DETECTION MANAGEMENT FUNCTIONS ====================

/**
 * Start tab detection
 * @param {Function} detectionCallback - Callback for tab detection
 * @param {number} intervalMs - Detection interval in milliseconds
 */
export const startTabDetection = (detectionCallback, intervalMs = 3000) => {
  if (applicationState.tabDetectionInterval) {
    stopTabDetection();
  }

  // Immediate detection
  if (detectionCallback) detectionCallback();

  // Periodic detection
  applicationState.tabDetectionInterval = setInterval(detectionCallback, intervalMs);
};

/**
 * Stop tab detection
 */
export const stopTabDetection = () => {
  if (applicationState.tabDetectionInterval) {
    clearInterval(applicationState.tabDetectionInterval);
    applicationState.tabDetectionInterval = null;
  }
};

/**
 * Check if tab detection is running
 * @returns {boolean} Whether tab detection is active
 */
export const isTabDetectionRunning = () => {
  return applicationState.tabDetectionInterval !== null;
};

// ==================== API PROVIDER MANAGEMENT FUNCTIONS ====================

/**
 * Set current API provider
 * @param {string} provider - Provider ID
 */
export const setApiProvider = provider => {
  applicationState.currentApiProvider = provider;
};

/**
 * Get current API provider
 * @returns {string} Current provider ID
 */
export const getApiProvider = () => {
  return applicationState.currentApiProvider;
};

// ==================== SETTINGS PANEL STATE FUNCTIONS ====================

/**
 * Open settings panel
 */
export const openSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = true;
};

/**
 * Close settings panel
 */
export const closeSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = false;
};

/**
 * Toggle settings panel
 * @returns {boolean} New panel state
 */
export const toggleSettingsPanel = () => {
  applicationState.isSettingsPanelOpen = !applicationState.isSettingsPanelOpen;
  return applicationState.isSettingsPanelOpen;
};

/**
 * Check if settings panel is open
 * @returns {boolean} Whether panel is open
 */
export const isSettingsPanelOpen = () => {
  return applicationState.isSettingsPanelOpen;
};

// ==================== STATUS MANAGEMENT FUNCTIONS ====================

let statusState = {
  currentStatus: 'idle',
  statusElement: null,
};

/**
 * Initialize status manager with DOM element
 * @param {HTMLElement} statusElement - Status display element
 */
export const initializeStatusManager = statusElement => {
  statusState.statusElement = statusElement;
};

/**
 * Set status message and type
 * @param {string} message - Status message
 * @param {string} type - Status type (idle, recording, processing, error)
 */
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

/**
 * Get current status
 * @returns {string} Current status type
 */
export const getCurrentStatus = () => {
  return statusState.currentStatus;
};

/**
 * Check if status is recording
 * @returns {boolean} Whether status is recording
 */
export const isStatusRecording = () => {
  return statusState.currentStatus === 'recording';
};

/**
 * Check if status is processing
 * @returns {boolean} Whether status is processing
 */
export const isStatusProcessing = () => {
  return statusState.currentStatus === 'processing';
};

/**
 * Check if status is error
 * @returns {boolean} Whether status is error
 */
export const isStatusError = () => {
  return statusState.currentStatus === 'error';
};

/**
 * Check if status is idle
 * @returns {boolean} Whether status is idle
 */
export const isStatusIdle = () => {
  return statusState.currentStatus === 'idle';
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get comprehensive state summary
 * @returns {Object} State summary object
 */
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
