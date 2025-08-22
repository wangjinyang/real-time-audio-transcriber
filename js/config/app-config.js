/**
 * Application Configuration
 * Functional configuration module for the AI Audio Transcriber Chrome Extension
 * All configuration objects are frozen to ensure immutability
 */

// ==================== AUDIO PROCESSING CONFIGURATION ====================
export const AUDIO_CONFIG = Object.freeze({
  /** Interval between starting new audio segments (30 seconds) */
  STEP_MS: 30000,

  /** Length of each audio segment with 3-second overlap (33 seconds) */
  DURATION_MS: 33000,

  /** MediaRecorder data availability interval (3 seconds) */
  CHUNK_MS: 3000,

  /** Maximum retry attempts for transcription */
  MAX_RETRY_ATTEMPTS: 3,

  /** Tab detection interval (3 seconds) */
  TAB_DETECTION_INTERVAL_MS: 3000,
});

// ==================== API PROVIDER CONFIGURATION ====================
export const API_PROVIDERS = Object.freeze({
  gemini: Object.freeze({
    id: 'gemini',
    name: 'Google Gemini 2.5 Flash',
    keyName: 'GEMINI_API_KEY',
    inputElementId: 'geminiApiKey',
    saveButtonElementId: 'saveGeminiKeyBtn',
    configElementId: 'geminiConfig',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    isDefault: true,
  }),
  openai: Object.freeze({
    id: 'openai',
    name: 'OpenAI Whisper',
    keyName: 'OPENAI_API_KEY',
    inputElementId: 'openaiApiKey',
    saveButtonElementId: 'saveOpenaiKeyBtn',
    configElementId: 'openaiConfig',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  }),
  deepgram: Object.freeze({
    id: 'deepgram',
    name: 'Deepgram',
    keyName: 'DEEPGRAM_API_KEY',
    inputElementId: 'deepgramApiKey',
    saveButtonElementId: 'saveDeepgramKeyBtn',
    configElementId: 'deepgramConfig',
    endpoint: 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
  }),
  fireworks: Object.freeze({
    id: 'fireworks',
    name: 'Fireworks AI',
    keyName: 'FIREWORKS_API_KEY',
    inputElementId: 'fireworksApiKey',
    saveButtonElementId: 'saveFireworksKeyBtn',
    configElementId: 'fireworksConfig',
    endpoint: 'https://api.fireworks.ai/inference/v1/audio/transcriptions',
    model: 'whisper-v3',
  }),
});

// ==================== UI CONSTANTS ====================
export const UI_CONSTANTS = Object.freeze({
  CSS_CLASSES: Object.freeze({
    STATUS_IDLE: 'status-idle',
    STATUS_RECORDING: 'status-recording',
    STATUS_PROCESSING: 'status-processing',
    STATUS_ERROR: 'status-error',
    STOP_STATE: 'stop-state',
    HAS_CONTENT: 'has-content',
    OPEN: 'open',
    ACTIVE: 'active',
    TRANSCRIPTION_ITEM: 'transcription-item',
    TIMESTAMP: 'ts',
    CHANNEL: 'chan',
    TAB_ITEM: 'tab-item',
    TAB_TITLE: 'tab-title',
    PLACEHOLDER: 'placeholder',
  }),

  BUTTON_STATES: Object.freeze({
    START: 'Start',
    STOP: 'Stop',
    SAVING: 'Saving...',
    SAVED: 'Saved',
  }),

  STATUS_MESSAGES: Object.freeze({
    IDLE: 'Idle',
    REQUESTING_AUDIO: 'Requesting audio…',
    RECORDING: 'Recording…',
    PROCESSING: 'Processing…',
    ERROR: 'Error',
    RESET_COMPLETE: 'Everything has been reset',
    TRANSCRIPTION_CLEARED: 'Transcription cleared',
  }),

  MIME_TYPES: Object.freeze({
    WEBM_OPUS: 'audio/webm;codecs=opus',
    OGG_OPUS: 'audio/ogg;codecs=opus',
    WEBM: 'audio/webm',
    TEXT_PLAIN: 'text/plain',
  }),
});

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = Object.freeze({
  API_PROVIDER: 'API_PROVIDER',
  DEFAULT_PROVIDER: 'gemini',
});

// ==================== TIMER CONFIGURATION ====================
export const TIMER_CONFIG = Object.freeze({
  UPDATE_INTERVAL_MS: 1000,
  FORMAT_OPTIONS: Object.freeze({
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
});

// ==================== CONFIGURATION UTILITIES ====================
export const getApiProviderConfig = providerId => API_PROVIDERS[providerId] || null;

export const getDefaultProvider = () => STORAGE_KEYS.DEFAULT_PROVIDER;

export const getAllProviderIds = () => Object.keys(API_PROVIDERS);

export const isValidProvider = providerId => providerId in API_PROVIDERS;
