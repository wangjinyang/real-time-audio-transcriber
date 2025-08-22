import { API_PROVIDERS, AUDIO_CONFIG } from '../config/app-config.js';
import { base64ToBlob } from '../utils/audio-utils.js';
export const transcribeWithRetry = async (
  transcriptionFn,
  audioData,
  maxAttempts = AUDIO_CONFIG.MAX_RETRY_ATTEMPTS
) => {
  return await retryApiCall(() => transcriptionFn(audioData), maxAttempts);
};

// Retry with exponential backoff
const retryApiCall = async (apiCall, maxAttempts) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const text = await apiCall();
      return {
        success: true,
        text,
        error: null,
        isFatal: false,
      };
    } catch (error) {
      const isFatal = error.isFatal || false;
      const isTransient = isTransientError(error);

      if (attempt >= maxAttempts || isFatal || !isTransient) {
        return {
          success: false,
          text: null,
          error: error.message || 'Unknown error',
          isFatal,
        };
      }

      // Wait before retry with exponential backoff
      const delay = calculateBackoffDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    text: null,
    error: 'Maximum retry attempts exceeded',
    isFatal: false,
  };
};

// Check if error can be retried
const isTransientError = error => {
  const transientPatterns = [
    /failed to fetch/i,
    /network/i,
    /5\d{2}/, // 5xx errors
    /timeout/i,
    /temporarily/i,
  ];

  const errorMessage = String(error?.message || '');
  return transientPatterns.some(pattern => pattern.test(errorMessage));
};

const calculateBackoffDelay = attempt => {
  // 1.5s, 3s, 6s, etc.
  return 1500 * Math.pow(2, attempt - 1);
};

const safeJsonParse = async response => {
  try {
    return await response.json();
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return null;
  }
};

// Google Gemini API
export const transcribeWithGemini = async ({ base64, mimeType, apiKey }) => {
  const config = API_PROVIDERS.gemini;
  const endpoint = `${config.endpoint}?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: 'Transcribe this audio to plain text. Respond with only the transcript.' },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const status = (errorInfo?.error?.status || '').toUpperCase();
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;

    const isFatal = isGeminiFatalError(status, response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw { message: 'Empty transcription response', isFatal: true };
  }

  return text;
};

// Check if Gemini error is fatal
const isGeminiFatalError = (status, httpStatus) => {
  const fatalStatuses = [
    'INVALID_ARGUMENT',
    'PERMISSION_DENIED',
    'UNAUTHENTICATED',
    'FAILED_PRECONDITION',
  ];

  const fatalHttpCodes = [400, 401, 403];

  return fatalStatuses.includes(status) || fatalHttpCodes.includes(httpStatus);
};

// OpenAI Whisper API
export const transcribeWithOpenAI = async ({ base64, mimeType, apiKey }) => {
  const config = API_PROVIDERS.openai;
  const audioBlob = base64ToBlob(base64, mimeType);
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', config.model);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const text = data?.text?.trim();

  if (!text) {
    throw { message: 'Empty transcription response', isFatal: true };
  }

  return text;
};

// Deepgram API
export const transcribeWithDeepgram = async ({ base64, mimeType, apiKey }) => {
  const config = API_PROVIDERS.deepgram;
  const audioBlob = base64ToBlob(base64, mimeType);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType,
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.err_msg || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

  if (!text) {
    throw { message: 'Empty transcription response', isFatal: true };
  }

  return text;
};

// Fireworks AI API
export const transcribeWithFireworks = async ({ base64, mimeType, apiKey }) => {
  const config = API_PROVIDERS.fireworks;
  const audioBlob = base64ToBlob(base64, mimeType);
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', config.model);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const text = data?.text?.trim();

  if (!text) {
    throw { message: 'Empty transcription response', isFatal: true };
  }

  return text;
};

// Get transcription function for provider
export const getTranscriptionFunction = providerId => {
  const transcriptionFunctions = {
    gemini: transcribeWithGemini,
    openai: transcribeWithOpenAI,
    deepgram: transcribeWithDeepgram,
    fireworks: transcribeWithFireworks,
  };

  const transcriptionFn = transcriptionFunctions[providerId];
  if (!transcriptionFn) {
    throw new Error(`Unsupported transcription provider: ${providerId}`);
  }

  return transcriptionFn;
};

export const transcribeAudio = async (providerId, audioData) => {
  const transcriptionFn = getTranscriptionFunction(providerId);
  return await transcribeWithRetry(transcriptionFn, audioData);
};

export const getSupportedProviders = () => {
  return Object.keys(API_PROVIDERS);
};

/**
 * Check if provider is supported
 * @param {string} providerId - Provider ID
 * @returns {boolean} Whether provider is supported
 */
export const isProviderSupported = providerId => {
  return Object.prototype.hasOwnProperty.call(API_PROVIDERS, providerId);
};

/**
 * Validate provider ID
 * @param {string} providerId - Provider ID to validate
 * @throws {Error} If provider is not supported
 */
export const validateProvider = providerId => {
  if (!isProviderSupported(providerId)) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
};

/**
 * Get provider configuration
 * @param {string} providerId - Provider ID
 * @returns {Object} Provider configuration
 */
export const getProviderConfig = providerId => {
  validateProvider(providerId);
  return API_PROVIDERS[providerId];
};

let transcriptionManagerState = {
  currentProvider: null,
  transcriptionFunction: null,
};

/**
 * Set current transcription provider
 * @param {string} providerId - Provider ID
 */
export const setTranscriptionProvider = providerId => {
  validateProvider(providerId);

  transcriptionManagerState.currentProvider = providerId;
  transcriptionManagerState.transcriptionFunction = getTranscriptionFunction(providerId);
};

/**
 * Get current transcription provider
 * @returns {string|null} Current provider ID
 */
export const getCurrentProvider = () => {
  return transcriptionManagerState.currentProvider;
};

/**
 * Transcribe with current provider
 * @param {Object} audioData - Audio data
 * @returns {Promise<Object>} Transcription result
 */
export const transcribeWithCurrentProvider = async audioData => {
  if (!transcriptionManagerState.transcriptionFunction) {
    throw new Error('No transcription service configured');
  }

  return await transcribeWithRetry(transcriptionManagerState.transcriptionFunction, audioData);
};

/**
 * Reset transcription manager state
 */
export const resetTranscriptionManager = () => {
  transcriptionManagerState = {
    currentProvider: null,
    transcriptionFunction: null,
  };
};

// Test provider config
export const testProviderConfiguration = async (providerId, apiKey) => {
  try {
    validateProvider(providerId);

    // Create minimal test audio data (silence)
    const testAudioData = {
      base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', // Minimal WAV
      mimeType: 'audio/wav',
      apiKey: apiKey,
    };

    const result = await transcribeAudio(providerId, testAudioData);
    return {
      success: true,
      provider: providerId,
      message: 'Provider configuration is valid',
    };
  } catch (error) {
    return {
      success: false,
      provider: providerId,
      error: error.message || 'Configuration test failed',
    };
  }
};

/**
 * Get transcription statistics
 * @returns {Object} Statistics object
 */
export const getTranscriptionStatistics = () => {
  return {
    supportedProviders: getSupportedProviders().length,
    currentProvider: getCurrentProvider(),
    availableProviders: getSupportedProviders(),
  };
};
