// Audio settings
export const AUDIO_CONFIG = Object.freeze({
  STEP_MS: 3000, // 30 seconds between segments
  DURATION_MS: 3300, // 33 seconds per segment (3s overlap)
  CHUNK_MS: 1000, // 3 second chunks
  MAX_RETRY_ATTEMPTS: 3,
  TAB_DETECTION_INTERVAL_MS: 3000,
});

// API provider configs
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
    name: 'OpenAI',
    keyName: 'OPENAI_API_KEY',
    inputElementId: 'openaiApiKey',
    saveButtonElementId: 'saveOpenaiKeyBtn',
    configElementId: 'openaiConfig',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'gpt-4o-mini-transcribe',
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

// UI constants
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

// Storage keys
export const STORAGE_KEYS = Object.freeze({
  API_PROVIDER: 'API_PROVIDER',
  DEFAULT_PROVIDER: 'openai',
  COLLECTIONS: 'collections',
});

// Timer config
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

// Utils
export const getApiProviderConfig = providerId => API_PROVIDERS[providerId] || null;
export const getDefaultProvider = () => STORAGE_KEYS.DEFAULT_PROVIDER;

export const getAllProviderIds = () => Object.keys(API_PROVIDERS);

export const isValidProvider = providerId => providerId in API_PROVIDERS;
