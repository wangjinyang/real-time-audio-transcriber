/**
 * AI Audio Transcriber - Main Application Controller
 * Functional orchestration of all modules and main application flow
 */

// Import all modules
import { AUDIO_CONFIG, UI_CONSTANTS } from './config/app-config.js';
import {
  initializeDOMElements,
  getDOMElements,
  getText,
  setText,
  setHTML,
  addClass,
  removeClass,
  showElement,
  hideElement,
  createTranscriptionItem,
  createTabListItem,
  scrollToBottom,
  getCurrentSelections,
  clearElement,
  appendChild,
} from './utils/dom-utils.js';
import {
  getSupportedMimeType,
  blobToBase64,
  captureTabAudio,
  captureMicrophoneAudio,
  stopStream,
  isStreamActive,
  setupAudioPlayback,
  closeAudioContext,
  closeAllAudioContexts,
} from './utils/audio-utils.js';
import {
  resetState,
  isRecording,
  startRecording as setRecordingState,
  stopRecording as setRecordingStop,
  addSession,
  removeSession,
  getSession,
  getAllSessionIds,
  addTranscript,
  clearTranscripts,
  addToPendingQueue,
  getPendingQueueItems,
  hasPendingItems,
  startTimer,
  stopTimer,
  startTabDetection,
  stopTabDetection,
  initializeStatusManager,
  setStatus,
  getCurrentStatus,
} from './modules/state-manager.js';
import { getCurrentApiConfiguration } from './modules/storage-manager.js';
import {
  setTranscriptionProvider,
  transcribeWithCurrentProvider,
  getCurrentProvider,
} from './modules/transcription-service.js';
import { initializeSettings } from './modules/settings-controller.js';

// ==================== APPLICATION STATE ====================
let appState = {
  isInitialized: false,
  audioPlaybackSessions: new Map(),
};

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
export const initializeApp = async () => {
  if (appState.isInitialized) return;

  try {
    // Initialize DOM elements
    initializeDOMElements();

    // Initialize status manager
    const elements = getDOMElements();
    initializeStatusManager(elements.statusDisplay);

    // Initialize settings
    await initializeSettings({
      setStatus: (message, type) => setStatus(message, type),
    });

    // Set up event listeners
    bindEventListeners();

    // Start tab detection
    startTabAutoDetection();

    // Set initial UI state
    setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
    updateButtonVisibility();

    appState.isInitialized = true;
    console.log('Audio Transcriber App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    setStatus(`Initialization failed: ${error.message}`, 'error');
  }
};

// ==================== EVENT BINDING ====================

/**
 * Bind all event listeners
 */
const bindEventListeners = () => {
  const elements = getDOMElements();

  // Main recording control
  elements.toggleButton?.addEventListener('click', () => {
    handleToggleRecording();
  });

  // Tab selection changes during recording
  elements.tabsList?.addEventListener('change', event => {
    handleTabSelectionChange(event);
  });

  // Export controls
  elements.copyButton?.addEventListener('click', () => {
    handleCopyTranscription();
  });

  elements.downloadTextButton?.addEventListener('click', () => {
    handleDownloadTranscription();
  });

  elements.clearButton?.addEventListener('click', () => {
    handleClearTranscription();
  });

  // Network state changes
  window.addEventListener('online', () => {
    handleNetworkReconnection();
  });

  // Settings events
  document.addEventListener('force-stop-recording', () => {
    stopAllRecording();
  });

  document.addEventListener('settings-reset', () => {
    handleSettingsReset();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cleanup();
  });
};

// ==================== RECORDING CONTROL ====================

/**
 * Handle toggle recording button
 */
const handleToggleRecording = async () => {
  try {
    if (isRecording()) {
      await stopAllRecording();
    } else {
      await startNewRecording();
    }
  } catch (error) {
    console.error('Failed to toggle recording:', error);
    setStatus(`Recording failed: ${error.message}`, 'error');
  }
};

/**
 * Start new recording session
 */
const startNewRecording = async () => {
  try {
    const elements = getDOMElements();

    // Check API configuration
    const config = await getCurrentApiConfiguration();
    if (!config.apiKey?.trim()) {
      setStatus('Please configure API key in settings first', 'error');
      return;
    }

    // Set transcription provider
    setTranscriptionProvider(config.provider);

    // Determine what to record
    const useMicrophone = elements.microphoneCheckbox?.checked;
    const selectedTabs = useMicrophone ? [] : getCurrentSelections();

    if (!useMicrophone && selectedTabs.size === 0) {
      setStatus('Please select audio source(s) to record', 'error');
      return;
    }

    // Start recording state
    setRecordingState();
    setRecordingUIState(true);
    startRecordingTimer();
    setStatus(UI_CONSTANTS.STATUS_MESSAGES.REQUESTING_AUDIO, 'processing');

    // Start recording sessions
    if (useMicrophone) {
      await startMicrophoneSession();
    } else {
      for (const tabId of selectedTabs) {
        await startTabSession(tabId);
      }
    }

    setStatus(UI_CONSTANTS.STATUS_MESSAGES.RECORDING, 'recording');
  } catch (error) {
    console.error('Failed to start recording:', error);
    await stopAllRecording();
    setStatus(`Failed to start recording: ${error.message}`, 'error');
  }
};

/**
 * Start tab recording session
 * @param {number} tabId - Tab ID to record
 */
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

/**
 * Start microphone recording session
 */
const startMicrophoneSession = async () => {
  try {
    const stream = await captureMicrophoneAudio();
    await initializeAudioSession('microphone', stream, 'Microphone', false);
  } catch (error) {
    console.error('Failed to start microphone session:', error);
    throw error;
  }
};

/**
 * Initialize audio session
 * @param {string} sessionId - Session identifier
 * @param {MediaStream} stream - Audio stream
 * @param {string} label - Session label
 * @param {boolean} enablePlayback - Whether to enable audio playback
 */
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
  startRecordingSegment(sessionId);
  sessionData.tickTimer = setInterval(() => {
    startRecordingSegment(sessionId);
  }, AUDIO_CONFIG.STEP_MS);

  // Add session start notification
  addTranscriptionItem(new Date().toLocaleTimeString(), `${label} started`, '');
};

/**
 * Start recording segment for session
 * @param {string} sessionId - Session identifier
 */
const startRecordingSegment = sessionId => {
  const session = getSession(sessionId);
  if (!session) return;

  let recorder;
  try {
    recorder = new MediaRecorder(session.stream, { mimeType: session.mimeType });
  } catch (error) {
    console.warn('Failed to create MediaRecorder with MIME type, using default:', error);
    recorder = new MediaRecorder(session.stream);
  }

  const audioChunks = [];

  // Collect audio data
  recorder.ondataavailable = event => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  // Process completed segment
  recorder.onstop = async () => {
    session.activeRecorders.delete(recorder);

    if (audioChunks.length === 0) return;

    try {
      // Create blob and convert to base64
      const audioBlob = new Blob(audioChunks, { type: session.mimeType });
      const base64Data = await blobToBase64(audioBlob);

      // Prepare transcription data
      const transcriptionData = {
        sessionId,
        base64: base64Data,
        mimeType: session.mimeType,
        timestamp: new Date().toISOString(),
        label: session.label,
        apiKey: (await getCurrentApiConfiguration()).apiKey,
      };

      // Perform transcription
      await processTranscription(transcriptionData);
    } catch (error) {
      console.error('Failed to process audio segment:', error);
      setStatus('Transcription processing failed', 'error');
    }
  };

  // Start recording
  session.activeRecorders.add(recorder);
  recorder.start(AUDIO_CONFIG.CHUNK_MS);

  // Schedule stop
  setTimeout(() => {
    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (error) {
      console.warn('Failed to stop recorder:', error);
    }
  }, AUDIO_CONFIG.DURATION_MS);
};

/**
 * Process transcription data
 * @param {Object} data - Transcription data
 */
const processTranscription = async data => {
  try {
    const result = await transcribeWithCurrentProvider({
      base64: data.base64,
      mimeType: data.mimeType,
      apiKey: data.apiKey,
    });

    if (result.success) {
      // Add successful transcription
      const transcript = {
        timestamp: data.timestamp,
        text: result.text,
        sessionId: data.sessionId,
        label: data.label,
      };

      addTranscript(transcript);
      addTranscriptionToUI(new Date(data.timestamp).toLocaleTimeString(), data.label, result.text);

      setStatus(UI_CONSTANTS.STATUS_MESSAGES.RECORDING, 'recording');
    } else if (result.isFatal) {
      // Fatal error - show to user
      setStatus(`Transcription error: ${result.error}`, 'error');
    } else {
      // Temporary error - queue for retry
      addToPendingQueue(data);
      setStatus('Queued segment (offline or error)', 'processing');
    }
  } catch (error) {
    console.error('Transcription failed:', error);
    setStatus(`Transcription failed: ${error.message}`, 'error');
  }
};

/**
 * Stop all recording sessions
 */
const stopAllRecording = async () => {
  setRecordingStop();

  // Stop all sessions
  const sessionIds = getAllSessionIds();
  for (const sessionId of sessionIds) {
    await stopSession(sessionId);
  }

  // Reset UI state
  setRecordingUIState(false);
  stopRecordingTimer();
  setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
};

/**
 * Stop individual session
 * @param {string} sessionId - Session identifier
 */
const stopSession = async sessionId => {
  const session = getSession(sessionId);
  if (!session) return;

  try {
    // Stop recurring segment creation
    if (session.tickTimer) {
      clearInterval(session.tickTimer);
    }

    // Stop all active recorders
    for (const recorder of Array.from(session.activeRecorders)) {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (error) {
        console.warn('Failed to stop recorder:', error);
      }
    }

    // Stop audio stream
    stopStream(session.stream);

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
  addTranscriptionToUI(new Date().toLocaleTimeString(), `${sessionId} stopped`, '');
};

// ==================== TAB DETECTION AND MANAGEMENT ====================

/**
 * Handle tab selection changes
 * @param {Event} event - Change event
 */
const handleTabSelectionChange = async event => {
  if (!isRecording()) return;

  try {
    const checkbox = event.target;
    const tabId = parseInt(checkbox.value, 10);

    if (checkbox.checked) {
      // Start recording for newly selected tab
      await startTabSession(tabId);
    } else {
      // Stop recording for deselected tab
      await stopSession(`tab-${tabId}`);
    }
  } catch (error) {
    console.error('Failed to handle tab selection change:', error);
    setStatus(`Failed to update tab recording: ${error.message}`, 'error');
  }
};

/**
 * Start automatic tab detection
 */
const startTabAutoDetection = () => {
  startTabDetection(updateTabsList, AUDIO_CONFIG.TAB_DETECTION_INTERVAL_MS);
};

/**
 * Update tabs list in UI
 */
const updateTabsList = async () => {
  const elements = getDOMElements();
  if (!elements.tabsList) return;

  try {
    const currentSelections = getCurrentSelections();
    const tabs = await chrome.tabs.query({});
    const audioTabs = tabs.filter(tab => tab.audible || tab.url?.includes('youtube.com'));

    clearElement(elements.tabsList);

    if (audioTabs.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Play a YouTube video to detect audio automatically';
      appendChild(elements.tabsList, placeholder);
      return;
    }

    audioTabs.forEach(tab => {
      const isSelected = currentSelections.has(tab.id);
      const tabItem = createTabListItem(tab, isSelected);
      appendChild(elements.tabsList, tabItem);
    });
  } catch (error) {
    console.error('Failed to update tabs list:', error);
  }
};

// ==================== UI MANAGEMENT ====================

/**
 * Set recording UI state
 * @param {boolean} recording - Whether recording is active
 */
const setRecordingUIState = recording => {
  const elements = getDOMElements();

  if (recording) {
    setText(elements.toggleButton, UI_CONSTANTS.BUTTON_STATES.STOP);
    addClass(elements.toggleButton, UI_CONSTANTS.CSS_CLASSES.STOP_STATE);
  } else {
    setText(elements.toggleButton, UI_CONSTANTS.BUTTON_STATES.START);
    removeClass(elements.toggleButton, UI_CONSTANTS.CSS_CLASSES.STOP_STATE);
  }
};

/**
 * Update button visibility based on content
 */
const updateButtonVisibility = () => {
  const elements = getDOMElements();
  const hasContent = elements.transcriptionDisplay?.children.length > 0;

  if (hasContent && !elements.transcriptionDisplay.querySelector('.placeholder')) {
    addClass(elements.transcriptionControls, UI_CONSTANTS.CSS_CLASSES.HAS_CONTENT);
  } else {
    removeClass(elements.transcriptionControls, UI_CONSTANTS.CSS_CLASSES.HAS_CONTENT);
  }
};

/**
 * Start recording timer
 */
const startRecordingTimer = () => {
  const elements = getDOMElements();
  startTimer(formattedTime => {
    setText(elements.timerDisplay, formattedTime);
  });
};

/**
 * Stop recording timer
 */
const stopRecordingTimer = () => {
  const elements = getDOMElements();
  stopTimer();
  setText(elements.timerDisplay, '00:00:00');
};

/**
 * Add transcription item to UI
 * @param {string} timestamp - Formatted timestamp
 * @param {string} channelLabel - Channel label
 * @param {string} text - Transcription text
 */
const addTranscriptionToUI = (timestamp, channelLabel, text) => {
  const elements = getDOMElements();
  if (!elements.transcriptionDisplay) return;

  // Hide loading animation when first transcription appears
  if (text && elements.loadingAnimation?.style.display !== 'none') {
    hideElement(elements.loadingAnimation);
  }

  // Create and add transcription item
  const item = createTranscriptionItem(timestamp, channelLabel, text);
  appendChild(elements.transcriptionDisplay, item);

  // Auto-scroll to bottom
  scrollToBottom(elements.transcriptionDisplay);
  updateButtonVisibility();
};

// ==================== EXPORT FUNCTIONALITY ====================

/**
 * Handle copy transcription
 */
const handleCopyTranscription = () => {
  const elements = getDOMElements();
  const text = elements.transcriptionDisplay?.innerText || '';
  navigator.clipboard.writeText(text).catch(error => {
    console.warn('Failed to copy to clipboard:', error);
  });
};

/**
 * Handle download transcription
 */
const handleDownloadTranscription = () => {
  const elements = getDOMElements();
  const text = elements.transcriptionDisplay?.innerText || '';
  const blob = new Blob([text], { type: UI_CONSTANTS.MIME_TYPES.TEXT_PLAIN });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `transcription-${new Date().toISOString()}.txt`;
  downloadLink.click();

  URL.revokeObjectURL(url);
};

/**
 * Handle clear transcription
 */
const handleClearTranscription = () => {
  const elements = getDOMElements();
  const confirmMessage = 'Are you sure you want to clear all transcription content?';

  if (confirm(confirmMessage)) {
    setHTML(
      elements.transcriptionDisplay,
      '<p class="placeholder">Your transcription will appear here…</p>'
    );
    hideElement(elements.loadingAnimation);
    clearTranscripts();
    updateButtonVisibility();
    setStatus(UI_CONSTANTS.STATUS_MESSAGES.TRANSCRIPTION_CLEARED, 'idle');
  }
};

// ==================== NETWORK MANAGEMENT ====================

/**
 * Handle network reconnection
 */
const handleNetworkReconnection = async () => {
  if (!hasPendingItems()) return;

  const pendingItems = getPendingQueueItems();

  for (const item of pendingItems) {
    try {
      await processTranscription(item);
    } catch (error) {
      console.warn('Failed to retry pending transcription:', error);
      addToPendingQueue(item); // Re-queue if still failing
    }
  }
};

// ==================== EVENT HANDLERS ====================

/**
 * Handle settings reset
 */
const handleSettingsReset = () => {
  // Clear application state
  resetState();

  // Reset UI
  stopRecordingTimer();
  updateButtonVisibility();
};

// ==================== CLEANUP ====================

/**
 * Cleanup resources
 */
const cleanup = () => {
  stopTabDetection();
  closeAllAudioContexts();

  // Clear audio playback sessions
  appState.audioPlaybackSessions.clear();
};

// ==================== APPLICATION INITIALIZATION ====================

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Export for global access if needed
window.AudioTranscriberApp = {
  initializeApp,
  handleToggleRecording,
  stopAllRecording,
  cleanup,
};
