/**
 * Settings Panel Controller Module
 * Functional settings panel management for API provider selection and key management
 */

import { API_PROVIDERS, UI_CONSTANTS } from '../config/app-config.js';
import {
  getDOMElements,
  showElement,
  hideElement,
  addClass,
  removeClass,
  getValue,
  setValue,
  setHTML,
} from '../utils/dom-utils.js';
import {
  getCurrentApiConfiguration,
  saveValidatedApiKey,
  setCurrentProvider,
  loadAllApiKeys,
  clearAllApiKeys,
  getApiProvider,
} from './storage-manager.js';
import {
  setApiProvider,
  clearTranscripts,
  openSettingsPanel,
  closeSettingsPanel,
  isSettingsPanelOpen,
} from './state-manager.js';

// ==================== SETTINGS STATE ====================
let settingsState = {
  isInitialized: false,
  statusManager: null,
};

/**
 * Initialize settings controller
 * @param {Object} statusManager - Status manager for UI feedback
 */
export const initializeSettings = async statusManager => {
  if (settingsState.isInitialized) return;

  settingsState.statusManager = statusManager;
  bindAllEventListeners();
  await loadApiConfiguration();
  settingsState.isInitialized = true;
};

/**
 * Bind all event listeners
 */
const bindAllEventListeners = () => {
  bindPanelControls();
  bindApiProviderSelection();
  bindApiKeySaveButtons();
  bindResetButton();
  bindKeyboardShortcuts();
};

// ==================== PANEL CONTROLS ====================

/**
 * Bind panel open/close controls
 */
const bindPanelControls = () => {
  const elements = getDOMElements();

  // Open settings panel
  elements.settingsButton?.addEventListener('click', () => {
    openPanel();
  });

  // Close settings panel via close button
  elements.closeSettingsButton?.addEventListener('click', () => {
    closePanel();
  });

  // Close settings when clicking outside the panel content
  elements.settingsPanel?.addEventListener('click', event => {
    if (event.target === elements.settingsPanel) {
      closePanel();
    }
  });
};

/**
 * Bind keyboard shortcuts
 */
const bindKeyboardShortcuts = () => {
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isPanelOpen()) {
      closePanel();
    }
  });
};

/**
 * Open settings panel
 */
export const openPanel = () => {
  const elements = getDOMElements();
  addClass(elements.settingsPanel, UI_CONSTANTS.CSS_CLASSES.OPEN);
  addClass(elements.settingsButton, UI_CONSTANTS.CSS_CLASSES.ACTIVE);
  openSettingsPanel();
};

/**
 * Close settings panel
 */
export const closePanel = () => {
  const elements = getDOMElements();
  removeClass(elements.settingsPanel, UI_CONSTANTS.CSS_CLASSES.OPEN);
  removeClass(elements.settingsButton, UI_CONSTANTS.CSS_CLASSES.ACTIVE);
  closeSettingsPanel();
};

/**
 * Toggle settings panel
 */
export const togglePanel = () => {
  if (isPanelOpen()) {
    closePanel();
  } else {
    openPanel();
  }
};

/**
 * Check if panel is open
 * @returns {boolean} Whether panel is open
 */
export const isPanelOpen = () => {
  const elements = getDOMElements();
  return elements.settingsPanel?.classList.contains(UI_CONSTANTS.CSS_CLASSES.OPEN) || false;
};

// ==================== API PROVIDER MANAGEMENT ====================

/**
 * Bind API provider selection
 */
const bindApiProviderSelection = () => {
  const elements = getDOMElements();
  elements.apiProviderSelect?.addEventListener('change', async event => {
    const selectedProvider = event.target.value;
    await handleProviderChange(selectedProvider);
  });
};

/**
 * Handle provider change
 * @param {string} providerId - Provider ID
 */
const handleProviderChange = async providerId => {
  try {
    // Validate provider
    if (!API_PROVIDERS[providerId]) {
      throw new Error(`Invalid provider: ${providerId}`);
    }

    // Save selected provider
    await setCurrentProvider(providerId);

    // Update UI
    showApiConfigurationPanel(providerId);
    setApiProvider(providerId);

    // Show feedback
    const providerName = API_PROVIDERS[providerId].name;
    setStatus(`Switched to ${providerName}`, 'processing');

    setTimeout(() => {
      setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
    }, 1500);
  } catch (error) {
    console.error('Failed to change API provider:', error);
    setStatus(`Failed to switch provider: ${error.message}`, 'error');
  }
};

/**
 * Show API configuration panel for provider
 * @param {string} providerId - Provider ID
 */
const showApiConfigurationPanel = providerId => {
  // Hide all configuration panels
  Object.values(API_PROVIDERS).forEach(provider => {
    const element = document.getElementById(provider.configElementId);
    if (element) {
      hideElement(element);
    }
  });

  // Show the selected provider's configuration
  const selectedProvider = API_PROVIDERS[providerId];
  if (selectedProvider) {
    const element = document.getElementById(selectedProvider.configElementId);
    if (element) {
      showElement(element);
    }
  }
};

// ==================== API KEY MANAGEMENT ====================

/**
 * Bind API key save buttons
 */
const bindApiKeySaveButtons = () => {
  Object.entries(API_PROVIDERS).forEach(([providerId, config]) => {
    const saveButton = document.getElementById(config.saveButtonElementId);
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        handleApiKeySave(providerId);
      });
    }
  });
};

/**
 * Handle API key save
 * @param {string} providerId - Provider ID
 */
const handleApiKeySave = async providerId => {
  const config = API_PROVIDERS[providerId];
  if (!config) {
    console.error(`Unknown provider: ${providerId}`);
    return;
  }

  const inputElement = document.getElementById(config.inputElementId);
  const buttonElement = document.getElementById(config.saveButtonElementId);

  if (!inputElement || !buttonElement) {
    console.error(`Missing DOM elements for provider: ${providerId}`);
    return;
  }

  try {
    const apiKey = getValue(inputElement);

    if (!apiKey.trim()) {
      setStatus('API key cannot be empty', 'error');
      return;
    }

    // Show saving state
    setButtonSavingState(buttonElement, true);

    // Save API key
    await saveValidatedApiKey(providerId, apiKey);

    // Show success state
    setButtonSavedState(buttonElement);
    setStatus(`${config.name} API key saved`, 'processing');

    // Restore normal state after delay
    setTimeout(() => {
      setButtonSavingState(buttonElement, false);
      setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
    }, 1500);
  } catch (error) {
    console.error('Failed to save API key:', error);
    setButtonSavingState(buttonElement, false);
    setStatus(`Failed to save API key: ${error.message}`, 'error');
  }
};

/**
 * Set button saving state
 * @param {HTMLElement} buttonElement - Button element
 * @param {boolean} isSaving - Whether button is in saving state
 */
const setButtonSavingState = (buttonElement, isSaving) => {
  if (!buttonElement) return;

  if (isSaving) {
    buttonElement.textContent = UI_CONSTANTS.BUTTON_STATES.SAVING;
    buttonElement.disabled = true;
  } else {
    buttonElement.textContent = 'Save';
    buttonElement.disabled = false;
    buttonElement.style.background = '';
  }
};

/**
 * Set button saved state
 * @param {HTMLElement} buttonElement - Button element
 */
const setButtonSavedState = buttonElement => {
  if (!buttonElement) return;

  buttonElement.textContent = UI_CONSTANTS.BUTTON_STATES.SAVED;
  buttonElement.style.background = '#16a34a'; // Green success color
};

// ==================== CONFIGURATION LOADING ====================

/**
 * Load API configuration
 */
const loadApiConfiguration = async () => {
  try {
    const elements = getDOMElements();

    // Load current provider
    const currentProvider = await getApiProvider();

    // Set selected provider in dropdown
    if (elements.apiProviderSelect) {
      setValue(elements.apiProviderSelect, currentProvider);
    }

    // Load all API keys
    const apiKeys = await loadAllApiKeys();

    // Populate API key inputs
    Object.entries(API_PROVIDERS).forEach(([providerId, config]) => {
      const inputElement = document.getElementById(config.inputElementId);
      if (inputElement && apiKeys[providerId]) {
        setValue(inputElement, apiKeys[providerId]);
      }
    });

    // Show the correct configuration panel
    showApiConfigurationPanel(currentProvider);
    setApiProvider(currentProvider);
  } catch (error) {
    console.error('Failed to load API configuration:', error);
    setStatus('Failed to load settings', 'error');
  }
};

/**
 * Refresh configuration
 */
export const refreshConfiguration = async () => {
  await loadApiConfiguration();
};

// ==================== RESET FUNCTIONALITY ====================

/**
 * Bind reset button
 */
const bindResetButton = () => {
  const elements = getDOMElements();
  elements.resetButton?.addEventListener('click', () => {
    handleReset();
  });
};

/**
 * Handle settings reset
 */
const handleReset = async () => {
  const confirmMessage =
    'Are you sure you want to reset everything? This will clear all API keys and transcription data.';

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const elements = getDOMElements();

    // Stop recording if active
    if (isSettingsPanelOpen()) {
      // This will be handled by the main controller
      document.dispatchEvent(new CustomEvent('force-stop-recording'));
    }

    // Clear all API configuration
    await clearAllApiKeys();

    // Clear all input fields
    Object.values(API_PROVIDERS).forEach(config => {
      const inputElement = document.getElementById(config.inputElementId);
      if (inputElement) {
        setValue(inputElement, '');
      }
    });

    // Reset to default provider
    if (elements.apiProviderSelect) {
      setValue(elements.apiProviderSelect, 'gemini');
    }
    showApiConfigurationPanel('gemini');
    setApiProvider('gemini');

    // Clear transcription display
    if (elements.transcriptionDisplay) {
      setHTML(
        elements.transcriptionDisplay,
        '<p class="placeholder">Your transcription will appear here…</p>'
      );
    }

    // Hide loading animation
    hideElement(elements.loadingAnimation);

    // Reset other UI elements
    if (elements.microphoneCheckbox) {
      elements.microphoneCheckbox.checked = false;
    }

    // Clear application state
    clearTranscripts();

    // Close settings panel
    closePanel();

    // Show completion message
    setStatus(UI_CONSTANTS.STATUS_MESSAGES.RESET_COMPLETE, 'idle');

    // Dispatch reset event for other components
    document.dispatchEvent(new CustomEvent('settings-reset'));
  } catch (error) {
    console.error('Failed to reset application:', error);
    setStatus(`Reset failed: ${error.message}`, 'error');
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Set status message
 * @param {string} message - Status message
 * @param {string} type - Status type
 */
const setStatus = (message, type) => {
  if (settingsState.statusManager && settingsState.statusManager.setStatus) {
    settingsState.statusManager.setStatus(message, type);
  }
};

/**
 * Get current API configuration
 * @returns {Promise<Object>} Current API configuration
 */
export const getCurrentConfiguration = async () => {
  return await getCurrentApiConfiguration();
};

/**
 * Check if settings are initialized
 * @returns {boolean} Whether settings are initialized
 */
export const isInitialized = () => {
  return settingsState.isInitialized;
};

/**
 * Get settings state summary
 * @returns {Object} Settings state summary
 */
export const getSettingsState = () => {
  return {
    isInitialized: settingsState.isInitialized,
    isPanelOpen: isPanelOpen(),
    hasStatusManager: !!settingsState.statusManager,
  };
};

// ==================== EVENT HANDLING ====================

/**
 * Handle provider switch from external source
 * @param {string} providerId - Provider ID
 */
export const switchProvider = async providerId => {
  await handleProviderChange(providerId);
};

/**
 * Handle API key update from external source
 * @param {string} providerId - Provider ID
 * @param {string} apiKey - API key
 */
export const updateApiKey = async (providerId, apiKey) => {
  try {
    await saveValidatedApiKey(providerId, apiKey);

    // Update input field if it exists
    const config = API_PROVIDERS[providerId];
    if (config) {
      const inputElement = document.getElementById(config.inputElementId);
      if (inputElement) {
        setValue(inputElement, apiKey);
      }
    }

    setStatus(`${API_PROVIDERS[providerId]?.name || providerId} API key updated`, 'processing');

    setTimeout(() => {
      setStatus(UI_CONSTANTS.STATUS_MESSAGES.IDLE, 'idle');
    }, 1500);
  } catch (error) {
    console.error('Failed to update API key:', error);
    setStatus(`Failed to update API key: ${error.message}`, 'error');
  }
};
