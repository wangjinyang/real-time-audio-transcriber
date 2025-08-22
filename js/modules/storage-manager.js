/**
 * Storage Manager Module
 * Functional Chrome storage operations for API configuration and settings
 */

import { API_PROVIDERS, STORAGE_KEYS } from '../config/app-config.js';

// ==================== GENERIC STORAGE OPERATIONS ====================

/**
 * Get data from Chrome storage
 * @param {string|string[]} keys - Storage keys to retrieve
 * @returns {Promise<Object>} Storage data
 */
export const storageGet = keys => {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
};

/**
 * Set data in Chrome storage
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
export const storageSet = data => {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
};

/**
 * Remove data from Chrome storage
 * @param {string|string[]} keys - Keys to remove
 * @returns {Promise<void>}
 */
export const storageRemove = keys => {
  return new Promise(resolve => {
    chrome.storage.local.remove(keys, resolve);
  });
};

/**
 * Clear all data from Chrome storage
 * @returns {Promise<void>}
 */
export const storageClear = () => {
  return new Promise(resolve => {
    chrome.storage.local.clear(resolve);
  });
};

// ==================== API CONFIGURATION FUNCTIONS ====================

/**
 * Save API provider selection
 * @param {string} providerId - Provider ID to save
 * @returns {Promise<void>}
 */
export const saveApiProvider = async providerId => {
  await storageSet({ [STORAGE_KEYS.API_PROVIDER]: providerId });
};

/**
 * Get current API provider
 * @returns {Promise<string>} Current provider ID
 */
export const getApiProvider = async () => {
  const result = await storageGet([STORAGE_KEYS.API_PROVIDER]);
  return result[STORAGE_KEYS.API_PROVIDER] || STORAGE_KEYS.DEFAULT_PROVIDER;
};

/**
 * Save API key for provider
 * @param {string} providerId - Provider ID
 * @param {string} apiKey - API key to save
 * @returns {Promise<void>}
 */
export const saveApiKey = async (providerId, apiKey) => {
  const provider = API_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown API provider: ${providerId}`);
  }

  await storageSet({ [provider.keyName]: apiKey.trim() });
};

/**
 * Get API key for provider
 * @param {string} providerId - Provider ID
 * @returns {Promise<string>} API key
 */
export const getApiKey = async providerId => {
  const provider = API_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown API provider: ${providerId}`);
  }

  const result = await storageGet([provider.keyName]);
  return result[provider.keyName] || '';
};

/**
 * Get current API configuration
 * @returns {Promise<Object>} Current configuration object
 */
export const getCurrentApiConfiguration = async () => {
  const currentProvider = await getApiProvider();
  const apiKey = await getApiKey(currentProvider);

  return {
    provider: currentProvider,
    apiKey: apiKey,
    providerConfig: API_PROVIDERS[currentProvider],
  };
};

/**
 * Get all API keys for all providers
 * @returns {Promise<Object>} Object with all API keys
 */
export const getAllApiKeys = async () => {
  const keyNames = Object.values(API_PROVIDERS).map(provider => provider.keyName);
  return await storageGet(keyNames);
};

/**
 * Clear all API configuration
 * @returns {Promise<void>}
 */
export const clearApiConfiguration = async () => {
  const keysToRemove = [
    STORAGE_KEYS.API_PROVIDER,
    ...Object.values(API_PROVIDERS).map(provider => provider.keyName),
  ];

  await storageRemove(keysToRemove);
};

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Whether API key is valid
 */
export const validateApiKey = apiKey => {
  return apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;
};

/**
 * Validate provider ID
 * @param {string} providerId - Provider ID to validate
 * @returns {boolean} Whether provider ID is valid
 */
export const validateProvider = providerId => {
  return providerId && API_PROVIDERS.hasOwnProperty(providerId);
};

// ==================== API KEY MANAGEMENT FUNCTIONS ====================

/**
 * Load all API keys for all providers
 * @returns {Promise<Object>} Object mapping provider IDs to API keys
 */
export const loadAllApiKeys = async () => {
  const savedKeys = await getAllApiKeys();
  const loadedKeys = {};

  Object.entries(API_PROVIDERS).forEach(([providerId, config]) => {
    loadedKeys[providerId] = savedKeys[config.keyName] || '';
  });

  return loadedKeys;
};

/**
 * Save API key with validation
 * @param {string} providerId - Provider ID
 * @param {string} apiKey - API key to save
 * @returns {Promise<boolean>} Success status
 */
export const saveValidatedApiKey = async (providerId, apiKey) => {
  if (!validateProvider(providerId)) {
    throw new Error(`Invalid API provider: ${providerId}`);
  }

  if (!validateApiKey(apiKey)) {
    throw new Error('API key cannot be empty');
  }

  await saveApiKey(providerId, apiKey);
  return true;
};

/**
 * Get API key with validation
 * @param {string} providerId - Provider ID
 * @returns {Promise<string>} API key
 */
export const getValidatedApiKey = async providerId => {
  if (!validateProvider(providerId)) {
    throw new Error(`Invalid API provider: ${providerId}`);
  }

  return await getApiKey(providerId);
};

/**
 * Set current provider with validation
 * @param {string} providerId - Provider ID to set as current
 * @returns {Promise<boolean>} Success status
 */
export const setCurrentProvider = async providerId => {
  if (!validateProvider(providerId)) {
    throw new Error(`Invalid API provider: ${providerId}`);
  }

  await saveApiProvider(providerId);
  return true;
};

/**
 * Clear all API keys
 * @returns {Promise<boolean>} Success status
 */
export const clearAllApiKeys = async () => {
  await clearApiConfiguration();
  return true;
};

// ==================== PROVIDER UTILITY FUNCTIONS ====================

/**
 * Get provider display name
 * @param {string} providerId - Provider ID
 * @returns {string} Provider display name
 */
export const getProviderDisplayName = providerId => {
  const provider = API_PROVIDERS[providerId];
  return provider ? provider.name : 'Unknown Provider';
};

/**
 * Get all provider configurations
 * @returns {Object[]} Array of all provider configurations
 */
export const getAllProviders = () => {
  return Object.values(API_PROVIDERS);
};

/**
 * Get provider configuration by ID
 * @param {string} providerId - Provider ID
 * @returns {Object|null} Provider configuration or null
 */
export const getProviderById = providerId => {
  return API_PROVIDERS[providerId] || null;
};

/**
 * Get provider IDs list
 * @returns {string[]} Array of provider IDs
 */
export const getProviderIds = () => {
  return Object.keys(API_PROVIDERS);
};

/**
 * Check if provider exists
 * @param {string} providerId - Provider ID to check
 * @returns {boolean} Whether provider exists
 */
export const hasProvider = providerId => {
  return providerId in API_PROVIDERS;
};

// ==================== STORAGE EVENT UTILITIES ====================

/**
 * Listen for storage changes
 * @param {Function} callback - Callback function for storage changes
 * @returns {Function} Function to remove listener
 */
export const onStorageChanged = callback => {
  const listener = (changes, namespace) => {
    if (namespace === 'local') {
      callback(changes);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  // Return function to remove listener
  return () => chrome.storage.onChanged.removeListener(listener);
};

/**
 * Get storage usage info
 * @returns {Promise<Object>} Storage usage information
 */
export const getStorageInfo = async () => {
  return new Promise(resolve => {
    chrome.storage.local.getBytesInUse(null, bytesInUse => {
      resolve({
        bytesInUse,
        quota: chrome.storage.local.QUOTA_BYTES,
      });
    });
  });
};
