

import { API_PROVIDERS, STORAGE_KEYS } from '../config/app-config.js';




export const storageGet = keys => {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
};


export const storageSet = data => {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
};


export const storageRemove = keys => {
  return new Promise(resolve => {
    chrome.storage.local.remove(keys, resolve);
  });
};


export const storageClear = () => {
  return new Promise(resolve => {
    chrome.storage.local.clear(resolve);
  });
};




export const saveApiProvider = async providerId => {
  await storageSet({ [STORAGE_KEYS.API_PROVIDER]: providerId });
};


export const getApiProvider = async () => {
  const result = await storageGet([STORAGE_KEYS.API_PROVIDER]);
  return result[STORAGE_KEYS.API_PROVIDER] || STORAGE_KEYS.DEFAULT_PROVIDER;
};


export const saveApiKey = async (providerId, apiKey) => {
  const provider = API_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown API provider: ${providerId}`);
  }

  await storageSet({ [provider.keyName]: apiKey.trim() });
};


export const getApiKey = async providerId => {
  const provider = API_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown API provider: ${providerId}`);
  }

  const result = await storageGet([provider.keyName]);
  return result[provider.keyName] || '';
};


export const getCurrentApiConfiguration = async () => {
  const currentProvider = await getApiProvider();
  const apiKey = await getApiKey(currentProvider);

  return {
    provider: currentProvider,
    apiKey: apiKey,
    providerConfig: API_PROVIDERS[currentProvider],
  };
};


export const getAllApiKeys = async () => {
  const keyNames = Object.values(API_PROVIDERS).map(provider => provider.keyName);
  return await storageGet(keyNames);
};


export const clearApiConfiguration = async () => {
  const keysToRemove = [
    STORAGE_KEYS.API_PROVIDER,
    ...Object.values(API_PROVIDERS).map(provider => provider.keyName),
  ];

  await storageRemove(keysToRemove);
};




export const validateApiKey = apiKey => {
  return apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;
};


export const validateProvider = providerId => {
  return providerId && API_PROVIDERS.hasOwnProperty(providerId);
};




export const loadAllApiKeys = async () => {
  const savedKeys = await getAllApiKeys();
  const loadedKeys = {};

  Object.entries(API_PROVIDERS).forEach(([providerId, config]) => {
    loadedKeys[providerId] = savedKeys[config.keyName] || '';
  });

  return loadedKeys;
};


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


export const getValidatedApiKey = async providerId => {
  if (!validateProvider(providerId)) {
    throw new Error(`Invalid API provider: ${providerId}`);
  }

  return await getApiKey(providerId);
};


export const setCurrentProvider = async providerId => {
  if (!validateProvider(providerId)) {
    throw new Error(`Invalid API provider: ${providerId}`);
  }

  await saveApiProvider(providerId);
  return true;
};


export const clearAllApiKeys = async () => {
  await clearApiConfiguration();
  return true;
};




export const getProviderDisplayName = providerId => {
  const provider = API_PROVIDERS[providerId];
  return provider ? provider.name : 'Unknown Provider';
};


export const getAllProviders = () => {
  return Object.values(API_PROVIDERS);
};


export const getProviderById = providerId => {
  return API_PROVIDERS[providerId] || null;
};


export const getProviderIds = () => {
  return Object.keys(API_PROVIDERS);
};


export const hasProvider = providerId => {
  return providerId in API_PROVIDERS;
};




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
