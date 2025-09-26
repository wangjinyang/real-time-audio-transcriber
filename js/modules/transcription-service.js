import { API_PROVIDERS, AUDIO_CONFIG } from '../config/app-config.js';
import { appStateStore } from './state-manager.js';
import { base64ToBlob } from '../utils/audio-utils.js';

export const transcribeWithRetry = async (
  transcriptionFn,
  audioData,
  maxAttempts = AUDIO_CONFIG.MAX_RETRY_ATTEMPTS
) => {
  return await retryApiCall(() => transcriptionFn(audioData), maxAttempts);
};

export const summaryWithRetry = async (
  summaryFn,
  textData,
  maxAttempts = AUDIO_CONFIG.MAX_RETRY_ATTEMPTS
) => {
  return await retryApiCall(() => summaryFn(textData), maxAttempts);
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

// Google Gemini API text summarization
export const summarizeTextWithGemini = async ({ text, apiKey }) => {
  const config = API_PROVIDERS.gemini;
  const endpoint = `${config.endpoint}?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `Summarize the following content:\n${text}\nRespond with only the summary.` },
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
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!summary) {
    throw { message: 'Empty summary response', isFatal: true };
  }

  return summary;
};

// OpenAI text summarization
export const summarizeTextWithOpenAI = async ({ text, apiKey }) => {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Financial Meeting Assistant. Please summarize the following meeting content with a professional and concise style. Follow these instructions:

1. Summarize the main discussion points in clear bullet points.
2. For each mentioned stock, you MUST identify and format it EXACTLY as:
   [Full Company Name (Stock Ticker)]
   - Do not use any other format such as colons, dashes, or parentheses outside this structure.
3. If multiple stocks are mentioned, list each separately.
4. Exclude any irrelevant small talk, personal comments, or off-topic discussions.
5. Maintain a professional tone suitable for financial reporting or internal meeting notes.

Example output:
- [Apple Inc. (AAPL)] Quarterly report shows strong performance
- [Tesla, Inc. (TSLA)] Delivery shortfalls caused negative reaction
- [Microsoft Corporation (MSFT)] Cloud business outlook remains positive`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  console.log('response: ', response);

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw { message: 'Empty summary response', isFatal: true };
  }

  return summary;
};

export const assistantWithOpenAI = async ({ text, apiKey }) => {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: text,
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  console.log('response: ', response);

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const res = data?.choices?.[0]?.message?.content?.trim();

  if (!res) {
    throw { message: 'no message return', isFatal: true };
  }

  return res;
};

function getStockInfo(text) {
  const regex = /\[([^(]+)\s\(([^)]+)\)\]/g;

  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const companyName = match[1].trim(); // 公司全称
    const stockCode = match[2].trim(); // 股票代码
    results.push({ companyName, stockCode });
  }
  return results;
}

function replaceStockInfoWithPrices(summaryText, stockInfosMap) {
  return summaryText.replace(/\[([^(]+)\s\(([^)]+)\)\]/g, (match, companyName, stockCode) => {
    const stockInfo = stockInfosMap[stockCode];
    const price = stockInfo?.price ?? 'N/A';
    return `[${stockInfo?.shortName || ''} (${stockCode}, ${price === 'N/A' ? price : `$${price}`})]`;
  });
}

export const summarizePartTextWithOpenAI = async ({ text, apiKey }) => {
  const summarizeText = await summarizeTextWithOpenAI({ text, apiKey });
  const stockInfos = getStockInfo(summarizeText);
  await appStateStore.fetchStockInfos(stockInfos.map(info => info.stockCode));
  stockInfos.forEach(stock => {
    const stockInfo = appStateStore.stocksInfos[stock.stockCode];
    if (stockInfo) {
      stock.price = stockInfo.currentPrice;
      stock.shortName = stockInfo.shortName;
    }
  });
  console.log('stockInfos: ', stockInfos);
  const stockInfosMap = {};
  stockInfos.forEach(stock => {
    stockInfosMap[stock.stockCode] = stock;
  });
  const finalSummary = replaceStockInfoWithPrices(summarizeText, stockInfosMap);
  console.log('Final Summary:', finalSummary);
  return finalSummary;
};

// Deepgram text summarization (assumed endpoint)
export const summarizeTextWithDeepgram = async ({ text, apiKey }) => {
  // Deepgram usually does not support direct text summarization, this is an assumed endpoint
  const config = API_PROVIDERS.deepgram;
  const endpoint = config.textSummaryEndpoint || 'https://api.deepgram.com/v1/summarize';

  const payload = { text };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.err_msg || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const summary = data?.summary?.trim();

  if (!summary) {
    throw { message: 'Empty summary response', isFatal: true };
  }

  return summary;
};

// Fireworks text summarization
export const summarizeTextWithFireworks = async ({ text, apiKey }) => {
  const config = API_PROVIDERS.fireworks;
  const endpoint = config.chatEndpoint || 'https://api.fireworks.ai/v1/chat/completions';

  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: `Summarize the following content:\n${text}\nRespond with only the summary.`,
      },
    ],
    temperature: 0.5,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorInfo = await safeJsonParse(response);
    const message = errorInfo?.error?.message || `HTTP ${response.status}`;
    const isFatal = [400, 401, 403].includes(response.status);
    throw { message, isFatal };
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw { message: 'Empty summary response', isFatal: true };
  }

  return summary;
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

let realtimeClient = null;

// OpenAI Whisper API
export const transcribeWithOpenAI = async ({ base64, mimeType, apiKey }) => {
  // if (!realtimeClient) {
  //   realtimeClient = new RealtimeClient({
  //     apiKey: apiKey,
  //     dangerouslyAllowAPIKeyInBrowser: true,
  //   });
  //   await realtimeClient.connect();
  // }
  const config = API_PROVIDERS.openai;
  const audioBlob = base64ToBlob(base64, mimeType);
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', config.model);
  // console.log('realtimeClient: ', realtimeClient, realtimeClient.isConnected);
  // console.log('base64: ', base64);
  // console.log('audioBlob: ', audioBlob);

  // if (realtimeClient && realtimeClient.isConnected) {
  //   realtimeClient.appendInputAudio(await audioBlob.arrayBuffer());
  //   realtimeClient.createResponse();
  // }

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

export const getSummaryFunction = providerId => {
  const summarizeFunctions = {
    gemini: summarizeTextWithGemini,
    openai: summarizeTextWithOpenAI,
    deepgram: summarizeTextWithDeepgram,
    fireworks: summarizeTextWithFireworks,
  };

  const summarizeFn = summarizeFunctions[providerId];
  if (!summarizeFn) {
    throw new Error(`Unsupported summary provider: ${providerId}`);
  }

  return summarizeFn;
};

export const transcribeAudio = async (providerId, audioData) => {
  const transcriptionFn = getTranscriptionFunction(providerId);
  return await transcribeWithRetry(transcriptionFn, audioData);
};

export const summaryText = async (providerId, text) => {
  const summaryFn = getSummaryFunction(providerId);
  return await summaryWithRetry(summaryFn, text);
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
  summaryFunction: null,
};

/**
 * Set current transcription provider
 * @param {string} providerId - Provider ID
 */
export const setTranscriptionProvider = providerId => {
  validateProvider(providerId);

  transcriptionManagerState.currentProvider = providerId;
  transcriptionManagerState.transcriptionFunction = getTranscriptionFunction(providerId);
  transcriptionManagerState.summaryFunction = getSummaryFunction(providerId);
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
 * Summarize with current provider
 * @param {string} text - Text to summarize
 * @returns {Promise<Object>} Summary result
 */
export const summaryWithCurrentProvider = async text => {
  if (!transcriptionManagerState.summaryFunction) {
    throw new Error('No summary service configured');
  }

  return await summaryWithRetry(transcriptionManagerState.summaryFunction, text);
};

/**
 * Reset transcription manager state
 */
export const resetTranscriptionManager = () => {
  transcriptionManagerState = {
    currentProvider: null,
    transcriptionFunction: null,
    summaryFunction: null,
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

