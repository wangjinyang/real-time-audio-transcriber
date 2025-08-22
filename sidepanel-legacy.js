/**
 * AI Audio Transcriber Chrome Extension - Main Application Logic
 *
 * This file handles:
 * - Audio capture from browser tabs and microphone
 * - Real-time transcription using Google Gemini API
 * - UI state management and user interactions
 * - Offline buffering and error handling
 * - Settings management and data persistence
 */

// ==================== CONFIGURATION ====================
/**
 * Audio processing configuration constants
 * STEP_MS: Interval between starting new audio segments (30 seconds)
 * DURATION_MS: Length of each audio segment with 3-second overlap (33 seconds)
 * CHUNK_MS: MediaRecorder data availability interval (3 seconds)
 */
const STEP_MS = 30000; // start a new segment every 30s
const DURATION_MS = 33000; // each segment records 33s => 3s overlap
const CHUNK_MS = 3000; // ondataavailable timeslice

// ==================== DOM ELEMENT REFERENCES ====================
/**
 * Cache all DOM elements for performance and code clarity
 * These elements are used throughout the application lifecycle
 */
const toggleBtn = document.getElementById('toggleBtn');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');
const transcriptionDisplay = document.getElementById('transcription-display');
const loadingAnimation = document.getElementById('loadingAnimation');
const copyBtn = document.getElementById('copyBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const clearBtn = document.getElementById('clearBtn');
const useMicChk = document.getElementById('useMic');
const tabsList = document.getElementById('tabsList');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettings');
const resetBtn = document.getElementById('resetBtn');

// API Configuration Elements
const apiProviderSelect = document.getElementById('apiProvider');
const apiConfigContainer = document.getElementById('apiConfigContainer');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
const fireworksApiKeyInput = document.getElementById('fireworksApiKey');
const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
const saveOpenaiKeyBtn = document.getElementById('saveOpenaiKeyBtn');
const saveDeepgramKeyBtn = document.getElementById('saveDeepgramKeyBtn');
const saveFireworksKeyBtn = document.getElementById('saveFireworksKeyBtn');

/**
 * Updates the visibility of transcription control buttons based on content
 * Shows export buttons only when transcripts are available
 */
function updateButtonVisibility() {
  const controls = document.querySelector('.transcription-controls');
  const hasTranscripts = TRANSCRIPTS.length > 0;
  if (hasTranscripts) {
    controls.classList.add('has-content');
  } else {
    controls.classList.remove('has-content');
  }
}

// ==================== APPLICATION STATE ====================
/**
 * Global state management for the transcription application
 */

// Timer management
let timerInterval = null; // Interval ID for recording timer
let seconds = 0; // Recording duration in seconds
let isRecording = false; // Current recording state

/**
 * Active recording sessions map
 * Key: sessionId (format: "tab-<tabId>" or "mic-1")
 * Value: {
 *   label: string,              // Display name for the session
 *   stream: MediaStream,        // Audio stream object
 *   mime: string,              // MIME type for recording
 *   tickTimer: number,         // Interval ID for segment creation
 *   activeRecorders: Set<MediaRecorder>, // Active MediaRecorder instances
 *   audioContext: AudioContext, // Web Audio API context for playback
 *   gainNode: GainNode         // Audio gain control node
 * }
 */
const SESSIONS = new Map();

/**
 * Queue for failed transcription requests (offline buffering)
 * Items will be retried when network connection is restored
 */
const PENDING_QUEUE = [];

/**
 * Storage for completed transcriptions
 * Each item: { tsIso, text, sessionId, label }
 */
const TRANSCRIPTS = [];

// ==================== UI STATUS AND TIMER MANAGEMENT ====================
/**
 * Updates the status display with appropriate styling
 * @param {string} text - Status message to display
 * @param {string} type - Status type for CSS class ('idle', 'recording', 'processing', 'error')
 */
function setStatus(text, type = 'idle') {
  statusDiv.textContent = `Status: ${text}`;
  statusDiv.className = `status-${type}`;
}

/**
 * Updates the recording timer display
 * Increments seconds and formats as HH:MM:SS
 */
function updateTimer() {
  seconds++;
  timerDiv.textContent = new Date(seconds * 1000).toISOString().substring(11, 19);
}

/**
 * Resets the recording timer to 00:00:00
 * Clears any active timer interval
 */
function resetTimer() {
  clearInterval(timerInterval);
  seconds = 0;
  timerDiv.textContent = '00:00:00';
}

// ==================== DATA PERSISTENCE ====================
/**
 * API Provider Configuration
 * Stores configuration for each supported transcription API
 */
const API_PROVIDERS = {
  gemini: {
    name: 'Google Gemini 2.5 Flash',
    keyName: 'GEMINI_API_KEY',
    inputElement: 'geminiApiKey',
    saveElement: 'saveGeminiKeyBtn',
    configElement: 'geminiConfig',
  },
  openai: {
    name: 'OpenAI Whisper',
    keyName: 'OPENAI_API_KEY',
    inputElement: 'openaiApiKey',
    saveElement: 'saveOpenaiKeyBtn',
    configElement: 'openaiConfig',
  },
  deepgram: {
    name: 'Deepgram',
    keyName: 'DEEPGRAM_API_KEY',
    inputElement: 'deepgramApiKey',
    saveElement: 'saveDeepgramKeyBtn',
    configElement: 'deepgramConfig',
  },
  fireworks: {
    name: 'Fireworks AI',
    keyName: 'FIREWORKS_API_KEY',
    inputElement: 'fireworksApiKey',
    saveElement: 'saveFireworksKeyBtn',
    configElement: 'fireworksConfig',
  },
};

/**
 * Load saved API provider and keys from Chrome storage on initialization
 */
async function loadApiConfiguration() {
  // Load selected provider
  const { API_PROVIDER = 'gemini' } = await new Promise(resolve =>
    chrome.storage.local.get(['API_PROVIDER'], resolve)
  );

  // Set selected provider in dropdown
  apiProviderSelect.value = API_PROVIDER;

  // Load all API keys
  const keys = Object.values(API_PROVIDERS).map(p => p.keyName);
  const savedKeys = await new Promise(resolve => chrome.storage.local.get(keys, resolve));

  // Populate API key inputs
  Object.entries(API_PROVIDERS).forEach(([provider, config]) => {
    const input = document.getElementById(config.inputElement);
    if (input && savedKeys[config.keyName]) {
      input.value = savedKeys[config.keyName];
    }
  });

  // Show the correct configuration panel
  showApiConfig(API_PROVIDER);
}

/**
 * Show the configuration panel for the selected API provider
 * @param {string} provider - The selected API provider key
 */
function showApiConfig(provider) {
  // Hide all configuration panels
  Object.values(API_PROVIDERS).forEach(config => {
    const element = document.getElementById(config.configElement);
    if (element) element.style.display = 'none';
  });

  // Show the selected provider's configuration
  const selectedConfig = API_PROVIDERS[provider];
  if (selectedConfig) {
    const element = document.getElementById(selectedConfig.configElement);
    if (element) element.style.display = 'block';
  }
}

/**
 * Handle API provider selection change
 */
apiProviderSelect.addEventListener('change', e => {
  const selectedProvider = e.target.value;

  // Save selected provider
  chrome.storage.local.set({ API_PROVIDER: selectedProvider });

  // Show appropriate configuration panel
  showApiConfig(selectedProvider);

  setStatus(`Switched to ${API_PROVIDERS[selectedProvider].name}`, 'processing');
  setTimeout(() => setStatus('Idle', 'idle'), 1500);
});

/**
 * Generic API key save functionality with visual feedback
 * @param {string} provider - The API provider key
 */
function saveApiKey(provider) {
  const config = API_PROVIDERS[provider];
  if (!config) return;

  const input = document.getElementById(config.inputElement);
  const button = document.getElementById(config.saveElement);

  if (!input || !button) return;

  const originalText = button.textContent;
  button.textContent = 'Saving...';
  button.disabled = true;

  const apiKey = input.value.trim();
  chrome.storage.local.set({ [config.keyName]: apiKey }, () => {
    button.textContent = 'Saved';
    button.style.background = '#16a34a'; // Green success color
    setStatus(`${config.name} API key saved`, 'processing');

    // Restore original state after 1.5 seconds
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      button.style.background = '';
      setStatus('Idle', 'idle');
    }, 1500);
  });
}

// Set up event listeners for all API key save buttons
saveGeminiKeyBtn.addEventListener('click', () => saveApiKey('gemini'));
saveOpenaiKeyBtn.addEventListener('click', () => saveApiKey('openai'));
saveDeepgramKeyBtn.addEventListener('click', () => saveApiKey('deepgram'));
saveFireworksKeyBtn.addEventListener('click', () => saveApiKey('fireworks'));

/**
 * Utility function to retrieve API key for the current provider
 * @returns {Promise<{provider: string, apiKey: string}>} Current provider and API key
 */
async function getCurrentApiConfig() {
  const { API_PROVIDER = 'gemini' } = await new Promise(resolve =>
    chrome.storage.local.get(['API_PROVIDER'], resolve)
  );

  const config = API_PROVIDERS[API_PROVIDER];
  if (!config) return { provider: 'gemini', apiKey: '' };

  const { [config.keyName]: apiKey = '' } = await new Promise(resolve =>
    chrome.storage.local.get([config.keyName], resolve)
  );

  return { provider: API_PROVIDER, apiKey };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCurrentApiConfig() instead
 */
const getApiKey = async () => {
  const { apiKey } = await getCurrentApiConfig();
  return apiKey;
};

// ==================== SETTINGS PANEL MANAGEMENT ====================
/**
 * Settings panel event handlers for show/hide functionality
 * Includes keyboard navigation and click-outside-to-close behavior
 */

// Open settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('open');
  settingsBtn.classList.add('active');
});

// Close settings panel via close button
closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('open');
  settingsBtn.classList.remove('active');
});

// Close settings when clicking outside the panel content
settingsPanel.addEventListener('click', e => {
  if (e.target === settingsPanel) {
    settingsPanel.classList.remove('open');
    settingsBtn.classList.remove('active');
  }
});

// Close settings panel on Escape key press
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && settingsPanel.classList.contains('open')) {
    settingsPanel.classList.remove('open');
    settingsBtn.classList.remove('active');
  }
});

/**
 * Reset functionality - clears all application data
 * Includes confirmation dialog to prevent accidental data loss
 */
resetBtn.addEventListener('click', () => {
  if (
    confirm(
      'Are you sure you want to reset everything? This will clear all API keys and transcription data.'
    )
  ) {
    // Stop recording if currently active
    if (isRecording) {
      stopAll();
    }

    // Clear all stored API keys from Chrome storage
    const allKeys = Object.values(API_PROVIDERS).map(p => p.keyName);
    allKeys.push('API_PROVIDER'); // Also reset the selected provider

    chrome.storage.local.remove(allKeys, () => {
      // Clear all API key input fields
      Object.values(API_PROVIDERS).forEach(config => {
        const input = document.getElementById(config.inputElement);
        if (input) input.value = '';
      });

      // Reset to default provider (Gemini)
      apiProviderSelect.value = 'gemini';
      showApiConfig('gemini');

      setStatus('All API keys cleared', 'idle');
    });

    // Reset transcription display to initial state
    transcriptionDisplay.innerHTML =
      '<p class="placeholder">Your transcription will appear here…</p>';
    loadingAnimation.style.display = 'none';

    // Reset UI controls to default state
    useMicChk.checked = false;
    resetTimer();
    updateButtonVisibility();

    // Close settings panel
    settingsPanel.classList.remove('open');
    settingsBtn.classList.remove('active');

    setStatus('Everything has been reset', 'idle');
  }
});

// ==================== NETWORK MANAGEMENT ====================
/**
 * Retry pending transcription requests when network comes back online
 * Handles offline buffering capability
 */
window.addEventListener('online', () => retryPendingQueue());

// ==================== AUDIBLE TABS DETECTION ====================
/**
 * Auto-detection system for audible browser tabs
 * Continuously monitors for tabs playing audio every 3 seconds
 */
let tabDetectionInterval = null;

/**
 * Starts the automatic tab detection system
 * Performs initial detection and sets up recurring checks
 */
function startAutoDetection() {
  // Perform immediate detection
  listAudibleTabs();

  // Set up periodic detection every 3 seconds
  tabDetectionInterval = setInterval(listAudibleTabs, 3000);
}

/**
 * Stops the automatic tab detection system
 * Clears the detection interval to prevent memory leaks
 */
function stopAutoDetection() {
  if (tabDetectionInterval) {
    clearInterval(tabDetectionInterval);
    tabDetectionInterval = null;
  }
}

/**
 * Queries Chrome for audible tabs and updates the UI
 * Uses Chrome tabs API to find tabs currently playing audio
 */
function listAudibleTabs() {
  chrome.tabs.query({ audible: true }, tabs => renderTabs(tabs || []));
}

/**
 * Renders the list of audible tabs in the UI
 * Preserves user selections when updating the list
 * @param {Array} tabs - Array of Chrome tab objects with audio
 */
function renderTabs(tabs) {
  // Preserve current user selections before re-rendering
  const currentSelections = new Set();
  tabsList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
    currentSelections.add(parseInt(cb.value, 10));
  });

  // Clear and rebuild the tabs list
  tabsList.innerHTML = '';
  if (!tabs.length) {
    tabsList.innerHTML =
      '<div class="placeholder">Play a YouTube video to detect audio automatically</div>';
    return;
  }

  // Create checkbox items for each audible tab
  for (const t of tabs) {
    const row = document.createElement('label');
    row.className = 'tab-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = t.id;
    cb.dataset.tabId = t.id;

    // Restore previous selection state if tab was already selected
    if (currentSelections.has(t.id)) {
      cb.checked = true;
    }

    // Create tab representation with icon and title
    const icon = document.createElement('img');
    icon.src = t.favIconUrl || 'icons/icon16.png';
    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = t.title || t.url || `Tab ${t.id}`;

    row.append(cb, icon, title);
    tabsList.appendChild(row);
  }
}

/**
 * Dynamic tab management during recording
 * Allows users to add/remove tabs while recording is active
 */
tabsList.addEventListener('change', async e => {
  if (e.target?.type !== 'checkbox') return;
  const tabId = parseInt(e.target.value, 10);
  if (!isRecording) return; // Only manage tabs during active recording

  const sessionId = `tab-${tabId}`;
  if (e.target.checked) {
    // Start recording from newly selected tab
    if (!SESSIONS.has(sessionId)) {
      setStatus(`Adding ${sessionId}…`, 'processing');
      try {
        await startTabSession(tabId);
        setStatus('Recording…', 'recording');
      } catch (err) {
        setStatus(`Couldn't add tab: ${err?.message || err}`, 'error');
        e.target.checked = false; // Revert checkbox state on failure
      }
    }
  } else {
    // Stop recording from deselected tab
    await stopSession(sessionId);
    setStatus('Recording…', 'recording');
  }
});

// 🔴 NEW: live add/remove while recording
tabsList.addEventListener('change', async e => {
  if (e.target?.type !== 'checkbox') return;
  const tabId = parseInt(e.target.value, 10);
  if (!isRecording) return; // only live-manage during recording

  const sessionId = `tab-${tabId}`;
  if (e.target.checked) {
    // start if not already recording
    if (!SESSIONS.has(sessionId)) {
      setStatus(`Adding ${sessionId}…`, 'processing');
      try {
        await startTabSession(tabId);
        setStatus('Recording…', 'recording');
      } catch (err) {
        setStatus(`Couldn’t add tab: ${err?.message || err}`, 'error');
        e.target.checked = false;
      }
    }
  } else {
    // stop just that session
    await stopSession(sessionId);
    setStatus('Recording…', 'recording');
  }
});

// ==================== AUDIO CAPTURE SYSTEM ====================
/**
 * Main recording control - handles start/stop toggle functionality
 */
toggleBtn.addEventListener('click', toggleRecording);

/**
 * Toggles recording state between start and stop
 * Central control point for recording functionality
 */
async function toggleRecording() {
  if (isRecording) {
    await stopAll();
  } else {
    await startRequested();
  }
}

/**
 * Initiates recording from selected sources
 * Validates API configuration, starts tab/mic sessions, and updates UI
 */
async function startRequested() {
  await stopAll(); // Ensure clean state before starting

  // Validate API configuration before proceeding
  const { provider, apiKey } = await getCurrentApiConfig();
  if (!apiKey) {
    setStatus(
      `Missing ${API_PROVIDERS[provider].name} API Key. Configure it in settings.`,
      'error'
    );
    return;
  }

  // Get selected tabs and microphone preference
  const tabIds = Array.from(tabsList.querySelectorAll('input[type="checkbox"]:checked')).map(x =>
    parseInt(x.value, 10)
  );
  const useMic = !!useMicChk.checked;

  setStatus('Requesting audio…', 'processing');
  let started = 0; // Counter for successfully started sessions

  // Start recording sessions for selected tabs
  for (const tabId of tabIds) {
    if (await startTabSession(tabId).catch(() => false)) started++;
  }

  // Start microphone session if requested
  if (useMic) {
    if (await startMicSession().catch(() => false)) started++;
  }

  // Validate that at least one session started successfully
  if (started === 0) {
    setStatus('Nothing started (no tabs or mic).', 'error');
    toggleBtn.textContent = 'Start';
    toggleBtn.classList.remove('stop-state');
    return;
  }

  // Update UI for recording state
  isRecording = true;
  setStatus(`Recording… (${started} channel${started > 1 ? 's' : ''})`, 'recording');
  toggleBtn.textContent = 'Stop';
  toggleBtn.classList.add('stop-state');
  transcriptionDisplay.innerHTML = '';
  loadingAnimation.style.display = 'block'; // Show loading animation
  updateButtonVisibility();

  // Start recording timer
  resetTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Starts audio capture from a specific browser tab
 * @param {number} tabId - Chrome tab ID to capture audio from
 * @returns {Promise<boolean>} Success status
 */
async function startTabSession(tabId) {
  // Get tab information
  const info = await chrome.tabs.get(tabId);

  // Focus the target tab to enable capture (Chrome API requirement)
  await chrome.windows.update(info.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
  await new Promise(r => setTimeout(r, 200)); // Brief delay for tab activation

  // Capture tab audio using Chrome tabCapture API
  const stream = await new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, s => {
      if (chrome.runtime.lastError || !s) {
        return reject(new Error(chrome.runtime.lastError?.message || 'Tab capture failed'));
      }
      resolve(s);
    });
  });

  // Initialize recording session for this tab
  const label = `Tab: ${info.title || tabId}`;
  const sessionId = `tab-${tabId}`;
  initSession(sessionId, stream, label);
  return true;
}

/**
 * Starts audio capture from user's microphone
 * @returns {Promise<boolean>} Success status
 */
async function startMicSession() {
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  initSession('mic-1', stream, 'Microphone');
  return true;
}

/**
 * Determines the best MIME type for audio recording
 * @param {MediaStream} stream - Audio stream to test
 * @returns {string} Best supported MIME type
 */
function pickMime(stream) {
  // Try preferred formats in order of quality/compatibility
  try {
    return new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' }).mimeType;
  } catch {}
  try {
    return new MediaRecorder(stream, { mimeType: 'audio/ogg;codecs=opus' }).mimeType;
  } catch {}
  return new MediaRecorder(stream).mimeType || 'audio/webm';
}

/**
 * Initializes a recording session for audio capture and processing
 * Sets up MediaRecorder segments with overlap for continuous transcription
 * @param {string} sessionId - Unique identifier for the session
 * @param {MediaStream} stream - Audio stream to record
 * @param {string} label - Display label for the session
 */
function initSession(sessionId, stream, label) {
  if (SESSIONS.has(sessionId)) return; // Prevent duplicate sessions

  const mime = pickMime(stream);
  const activeRecorders = new Set(); // Track active MediaRecorder instances

  // Create Web Audio API context for real-time playback
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const gainNode = audioContext.createGain();

  // Enable audio playback for tab audio (not microphone to prevent feedback)
  if (!sessionId.startsWith('mic-')) {
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 1.0; // Full volume playback
  }

  // Store session data
  const sess = { label, stream, mime, activeRecorders, tickTimer: null, audioContext, gainNode };
  SESSIONS.set(sessionId, sess);

  // Start first recording segment immediately, then schedule recurring segments
  startOneSegment(sessionId);
  sess.tickTimer = setInterval(() => startOneSegment(sessionId), STEP_MS);

  // Add session start notification to transcription
  const p = document.createElement('p');
  p.className = 'transcription-item';
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString();
  const ch = document.createElement('span');
  ch.className = 'chan';
  ch.textContent = `${label} started`;
  p.append(ts, ch);
  transcriptionDisplay.appendChild(p);
}

/**
 * Creates and starts a single audio recording segment
 * Implements overlapping segments to prevent word loss between chunks
 * @param {string} sessionId - Session identifier to record from
 */
function startOneSegment(sessionId) {
  const s = SESSIONS.get(sessionId);
  if (!s) return; // Session may have been stopped

  let recorder;
  try {
    recorder = new MediaRecorder(s.stream, { mimeType: s.mime });
  } catch {
    recorder = new MediaRecorder(s.stream); // Fallback without MIME type
  }

  const chunks = []; // Store audio data chunks

  // Collect audio data as it becomes available
  recorder.ondataavailable = e => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  // Process completed recording segment
  recorder.onstop = async () => {
    s.activeRecorders.delete(recorder);
    if (!chunks.length) return; // No audio data collected

    // Create blob from chunks and convert to base64 for API
    const blob = new Blob(chunks, { type: s.mime });
    const base64 = await blobToBase64(blob);
    const tsIso = new Date().toISOString();
    const item = { sessionId, base64, mime: s.mime, tsIso, label: s.label };

    // Attempt transcription with retry logic
    const { text, error, fatal } = await transcribeWithRetry(item);
    if (text) {
      // Success: store and display transcription
      TRANSCRIPTS.push({ tsIso, text, sessionId, label: s.label });
      appendTranscript(tsIso, text, s.label);
      setStatus('Recording…', 'recording');
    } else if (fatal) {
      // Fatal error: show error message
      setStatus(`Transcription error: ${error}`, 'error');
    } else {
      // Temporary error: queue for retry
      PENDING_QUEUE.push(item);
      setStatus('Queued segment (offline or error).', 'processing');
    }
  };

  // Start recording and schedule automatic stop
  s.activeRecorders.add(recorder);
  recorder.start(CHUNK_MS); // Collect data every CHUNK_MS milliseconds
  setTimeout(() => {
    try {
      recorder.state !== 'inactive' && recorder.stop();
    } catch {}
  }, DURATION_MS);
}

// ==================== SESSION CLEANUP ====================
/**
 * Stops a specific recording session and cleans up resources
 * @param {string} sessionId - Identifier of session to stop
 */
async function stopSession(sessionId) {
  const s = SESSIONS.get(sessionId);
  if (!s) return; // Session doesn't exist

  try {
    // Stop recurring segment creation
    if (s.tickTimer) clearInterval(s.tickTimer);

    // Stop all active MediaRecorder instances
    for (const rec of Array.from(s.activeRecorders)) {
      try {
        rec.state !== 'inactive' && rec.stop();
      } catch {}
    }

    // Stop all audio tracks
    if (s.stream) s.stream.getTracks().forEach(t => t.stop());

    // Close Web Audio API context
    if (s.audioContext && s.audioContext.state !== 'closed') {
      try {
        await s.audioContext.close();
      } catch {}
    }
  } catch {}

  // Remove session from active sessions
  SESSIONS.delete(sessionId);

  // Add session stop notification to transcription
  const p = document.createElement('p');
  p.className = 'transcription-item';
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString();
  const ch = document.createElement('span');
  ch.className = 'chan';
  ch.textContent = `${sessionId} stopped`;
  p.append(ts, ch);
  transcriptionDisplay.appendChild(p);
}

/**
 * Stops all active recording sessions and resets the application state
 */
async function stopAll() {
  isRecording = false;

  // Stop all active sessions
  for (const id of Array.from(SESSIONS.keys())) {
    await stopSession(id);
  }

  // Reset UI to idle state
  setStatus('Idle', 'idle');
  toggleBtn.textContent = 'Start';
  toggleBtn.classList.remove('stop-state');
  loadingAnimation.style.display = 'none';
  resetTimer();
}

// ==================== OFFLINE QUEUE MANAGEMENT ====================
/**
 * Retries all pending transcription requests when network is restored
 * Implements offline buffering capability for failed requests
 */
async function retryPendingQueue() {
  if (!PENDING_QUEUE.length) return; // No pending items

  // Process all queued items
  const copy = PENDING_QUEUE.splice(0, PENDING_QUEUE.length);
  for (const item of copy) {
    const { text, error, fatal } = await transcribeWithRetry(item);
    if (text) {
      // Success: add to transcripts and display
      TRANSCRIPTS.push({ tsIso: item.tsIso, text, sessionId: item.sessionId, label: item.label });
      appendTranscript(item.tsIso, text, item.label);
      setStatus('Recording…', 'recording');
    } else if (!fatal) {
      // Temporary failure: re-queue for later retry
      PENDING_QUEUE.push(item);
    } else {
      // Fatal error: show error and abandon item
      setStatus(`Transcription error: ${error}`, 'error');
    }
  }
}

// ==================== MULTI-PROVIDER TRANSCRIPTION ====================
/**
 * Main transcription function that routes to the appropriate API provider
 * @param {Object} params - Transcription parameters
 * @param {string} params.base64 - Base64 encoded audio data
 * @param {string} params.mime - MIME type of audio
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Transcription result with text, error, and fatal status
 */
async function transcribeWithRetry({ base64, mime }, maxAttempts = 3) {
  const { provider, apiKey } = await getCurrentApiConfig();

  if (!apiKey) {
    return {
      text: null,
      error: `Please configure your ${API_PROVIDERS[provider].name} API key in settings`,
      fatal: true,
    };
  }

  switch (provider) {
    case 'gemini':
      return await transcribeWithGemini({ base64, mime, apiKey }, maxAttempts);
    case 'openai':
      return await transcribeWithOpenAI({ base64, mime, apiKey }, maxAttempts);
    case 'deepgram':
      return await transcribeWithDeepgram({ base64, mime, apiKey }, maxAttempts);
    case 'fireworks':
      return await transcribeWithFireworks({ base64, mime, apiKey }, maxAttempts);
    default:
      return { text: null, error: 'Unsupported API provider', fatal: true };
  }
}

/**
 * Google Gemini transcription implementation
 */
async function transcribeWithGemini({ base64, mime, apiKey }, maxAttempts = 3) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: 'Transcribe this audio to plain text. Respond with only the transcript.' },
          { inlineData: { mimeType: mime, data: base64 } },
        ],
      },
    ],
  };

  return await retryApiCall(async () => {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const info = await safeJson(resp);
      const status = (info?.error?.status || '').toUpperCase();
      const msg = info?.error?.message || `HTTP ${resp.status}`;

      const fatal =
        /INVALID_ARGUMENT|PERMISSION_DENIED|UNAUTHENTICATED|FAILED_PRECONDITION/i.test(status) ||
        resp.status === 400 ||
        resp.status === 401 ||
        resp.status === 403;
      throw { message: msg, fatal };
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw { message: 'Empty transcription response', fatal: true };

    return text;
  }, maxAttempts);
}

/**
 * OpenAI Whisper transcription implementation
 */
async function transcribeWithOpenAI({ base64, mime, apiKey }, maxAttempts = 3) {
  const endpoint = 'https://api.openai.com/v1/audio/transcriptions';

  // Convert base64 to blob for form data
  const audioBlob = base64ToBlob(base64, mime);
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');

  return await retryApiCall(async () => {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!resp.ok) {
      const info = await safeJson(resp);
      const msg = info?.error?.message || `HTTP ${resp.status}`;
      const fatal = resp.status === 400 || resp.status === 401 || resp.status === 403;
      throw { message: msg, fatal };
    }

    const data = await resp.json();
    const text = data?.text?.trim();
    if (!text) throw { message: 'Empty transcription response', fatal: true };

    return text;
  }, maxAttempts);
}

/**
 * Deepgram transcription implementation
 */
async function transcribeWithDeepgram({ base64, mime, apiKey }, maxAttempts = 3) {
  const endpoint = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true';

  const audioBlob = base64ToBlob(base64, mime);

  return await retryApiCall(async () => {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mime,
      },
      body: audioBlob,
    });

    if (!resp.ok) {
      const info = await safeJson(resp);
      const msg = info?.err_msg || `HTTP ${resp.status}`;
      const fatal = resp.status === 400 || resp.status === 401 || resp.status === 403;
      throw { message: msg, fatal };
    }

    const data = await resp.json();
    const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    if (!text) throw { message: 'Empty transcription response', fatal: true };

    return text;
  }, maxAttempts);
}

/**
 * Fireworks AI transcription implementation
 */
async function transcribeWithFireworks({ base64, mime, apiKey }, maxAttempts = 3) {
  const endpoint = 'https://api.fireworks.ai/inference/v1/audio/transcriptions';

  const audioBlob = base64ToBlob(base64, mime);
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-v3');

  return await retryApiCall(async () => {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!resp.ok) {
      const info = await safeJson(resp);
      const msg = info?.error?.message || `HTTP ${resp.status}`;
      const fatal = resp.status === 400 || resp.status === 401 || resp.status === 403;
      throw { message: msg, fatal };
    }

    const data = await resp.json();
    const text = data?.text?.trim();
    if (!text) throw { message: 'Empty transcription response', fatal: true };

    return text;
  }, maxAttempts);
}

/**
 * Generic retry logic for API calls with exponential backoff
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<Object>} Transcription result
 */
async function retryApiCall(apiCall, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const text = await apiCall();
      return { text, error: null, fatal: false };
    } catch (e) {
      const fatal = e.fatal || false;
      const transient =
        !fatal &&
        /Failed to fetch|network|5\d\d|timeout|temporarily/i.test(String(e?.message || ''));

      if (attempt >= maxAttempts || fatal || !transient) {
        return { text: null, error: e?.message || 'Unknown error', fatal };
      }

      // Wait before retry with exponential backoff
      await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt - 1)));
    }
  }
  return { text: null, error: 'Max attempts exceeded', fatal: false };
}

/**
 * Utility function to convert base64 to blob
 * @param {string} base64 - Base64 encoded data
 * @param {string} mimeType - MIME type of the data
 * @returns {Blob} Blob object
 */
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// ==================== UI RENDERING AND EXPORT ====================
/**
 * Adds a new transcription item to the display
 * Hides loading animation when first transcription appears
 * @param {string} tsIso - ISO timestamp of transcription
 * @param {string} text - Transcribed text content
 * @param {string} label - Source label (tab title or 'Microphone')
 */
function appendTranscript(tsIso, text, label) {
  // Hide loading animation when first transcription appears
  if (loadingAnimation.style.display !== 'none') {
    loadingAnimation.style.display = 'none';
  }

  // Create transcription item with timestamp, channel, and text
  const p = document.createElement('p');
  p.className = 'transcription-item';
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = new Date(tsIso).toLocaleTimeString();
  const ch = document.createElement('span');
  ch.className = 'chan';
  ch.textContent = label || 'Channel';
  p.append(ts, ch, document.createTextNode(text));

  // Add to display and auto-scroll to bottom
  transcriptionDisplay.appendChild(p);
  transcriptionDisplay.scrollTop = transcriptionDisplay.scrollHeight;
  updateButtonVisibility();
}

/**
 * Export functionality event handlers
 * Provides copy to clipboard and download as text file options
 */

// Copy all transcription text to clipboard
copyBtn.addEventListener('click', () =>
  navigator.clipboard.writeText(transcriptionDisplay.innerText).catch(() => {})
);

// Download transcription as text file with timestamp
downloadTxtBtn.addEventListener('click', () => {
  const blob = new Blob([transcriptionDisplay.innerText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcription-${new Date().toISOString()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Clear all transcription content with confirmation
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all transcription content?')) {
    transcriptionDisplay.innerHTML =
      '<p class="placeholder">Your transcription will appear here…</p>';
    loadingAnimation.style.display = 'none';
    updateButtonVisibility();
    setStatus('Transcription cleared', 'idle');
  }
});

// ==================== UTILITY FUNCTIONS ====================
/**
 * Converts a Blob to base64 string for API transmission
 * @param {Blob} blob - Audio blob to convert
 * @returns {Promise<string>} Base64 encoded string (without data URL prefix)
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        resolve(reader.result.split(',')[1]); // Remove data URL prefix
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Safely parses JSON response, returning null on failure
 * @param {Response} resp - Fetch response object
 * @returns {Promise<Object|null>} Parsed JSON or null
 */
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

// ==================== APPLICATION INITIALIZATION ====================
/**
 * Initialize the application when the page loads
 * Sets up auto-detection and initial UI state
 */
startAutoDetection(); // Begin monitoring for audible tabs
setStatus('Idle', 'idle'); // Set initial status
updateButtonVisibility(); // Update export button visibility
loadApiConfiguration(); // Load saved API provider and keys

/**
 * Cleanup when the page is about to unload
 * Prevents memory leaks from detection intervals
 */
window.addEventListener('beforeunload', () => {
  stopAutoDetection();
});
