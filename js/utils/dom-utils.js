/**
 * DOM Utilities Module
 * Functional DOM manipulation utilities for the AI Audio Transcriber Chrome Extension
 */

// ==================== DOM ELEMENT REFERENCES ====================
let domElements = {};

/**
 * Initialize DOM element references
 * @returns {Object} DOM elements object
 */
export const initializeDOMElements = () => {
  domElements = {
    // Main UI Elements
    toggleButton: document.getElementById('toggleBtn'),
    statusDisplay: document.getElementById('status'),
    timerDisplay: document.getElementById('timer'),
    transcriptionDisplay: document.getElementById('transcription-display'),
    loadingAnimation: document.getElementById('loadingAnimation'),

    // Control Buttons
    copyButton: document.getElementById('copyBtn'),
    downloadTextButton: document.getElementById('downloadTxtBtn'),
    clearButton: document.getElementById('clearBtn'),

    // Audio Source Controls
    microphoneCheckbox: document.getElementById('useMic'),
    tabsList: document.getElementById('tabsList'),

    // Settings Panel
    settingsButton: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettingsButton: document.getElementById('closeSettings'),
    resetButton: document.getElementById('resetBtn'),

    // API Configuration
    apiProviderSelect: document.getElementById('apiProvider'),
    apiConfigContainer: document.getElementById('apiConfigContainer'),

    // API Key Inputs
    geminiApiKeyInput: document.getElementById('geminiApiKey'),
    openaiApiKeyInput: document.getElementById('openaiApiKey'),
    deepgramApiKeyInput: document.getElementById('deepgramApiKey'),
    fireworksApiKeyInput: document.getElementById('fireworksApiKey'),

    // Save Buttons
    saveGeminiKeyButton: document.getElementById('saveGeminiKeyBtn'),
    saveOpenaiKeyButton: document.getElementById('saveOpenaiKeyBtn'),
    saveDeepgramKeyButton: document.getElementById('saveDeepgramKeyBtn'),
    saveFireworksKeyButton: document.getElementById('saveFireworksKeyBtn'),

    // Transcription Controls
    transcriptionControls: document.querySelector('.transcription-controls'),
  };

  validateElements();
  return Object.freeze({ ...domElements });
};

/**
 * Validate that required DOM elements exist
 */
const validateElements = () => {
  const requiredElements = [
    'toggleButton',
    'statusDisplay',
    'timerDisplay',
    'transcriptionDisplay',
    'settingsButton',
    'settingsPanel',
    'apiProviderSelect',
  ];

  const missingElements = requiredElements.filter(elementName => !domElements[elementName]);

  if (missingElements.length > 0) {
    console.warn('Missing DOM elements:', missingElements);
  }
};

/**
 * Get all DOM elements
 * @returns {Object} Frozen copy of DOM elements
 */
export const getDOMElements = () => Object.freeze({ ...domElements });

/**
 * Get a specific DOM element
 * @param {string} elementKey - Key of the element to retrieve
 * @returns {HTMLElement|null} The DOM element or null if not found
 */
export const getElement = elementKey => domElements[elementKey] || null;

// ==================== BASIC DOM MANIPULATION FUNCTIONS ====================

/**
 * Show element
 * @param {HTMLElement} element - Element to show
 */
export const showElement = element => {
  if (element) element.style.display = 'block';
};

/**
 * Hide element
 * @param {HTMLElement} element - Element to hide
 */
export const hideElement = element => {
  if (element) element.style.display = 'none';
};

/**
 * Add CSS class to element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to add
 */
export const addClass = (element, className) => {
  if (element) element.classList.add(className);
};

/**
 * Remove CSS class from element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to remove
 */
export const removeClass = (element, className) => {
  if (element) element.classList.remove(className);
};

/**
 * Toggle CSS class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @returns {boolean} Whether class is present after toggle
 */
export const toggleClass = (element, className) => {
  if (element) return element.classList.toggle(className);
  return false;
};

/**
 * Set element text content
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to set
 */
export const setText = (element, text) => {
  if (element) element.textContent = text;
};

/**
 * Set element HTML content
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML to set
 */
export const setHTML = (element, html) => {
  if (element) element.innerHTML = html;
};

/**
 * Get element text content
 * @param {HTMLElement} element - Target element
 * @returns {string} Element text content or empty string
 */
export const getText = element => {
  return element ? element.textContent : '';
};

/**
 * Get element value
 * @param {HTMLElement} element - Target element
 * @returns {string} Element value or empty string
 */
export const getValue = element => {
  return element ? element.value : '';
};

/**
 * Set element value
 * @param {HTMLElement} element - Target element
 * @param {string} value - Value to set
 */
export const setValue = (element, value) => {
  if (element) element.value = value;
};

/**
 * Set element attribute
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @param {string} value - Attribute value
 */
export const setAttribute = (element, name, value) => {
  if (element && name) {
    element.setAttribute(name, value);
  }
};

/**
 * Get element attribute
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @returns {string|null} Attribute value or null
 */
export const getAttribute = (element, name) => {
  return element && name ? element.getAttribute(name) : null;
};

/**
 * Add event listener to element
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options
 */
export const addEventListener = (element, event, handler, options = {}) => {
  if (element && event && typeof handler === 'function') {
    element.addEventListener(event, handler, options);
  }
};

/**
 * Remove event listener from element
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler function
 */
export const removeEventListener = (element, event, handler) => {
  if (element && event && typeof handler === 'function') {
    element.removeEventListener(event, handler);
  }
};

// ==================== ELEMENT CREATION FUNCTIONS ====================

/**
 * Create element with optional class and text content
 * @param {string} tag - HTML tag name
 * @param {string} className - CSS class name (optional)
 * @param {string} textContent - Text content (optional)
 * @returns {HTMLElement} Created element
 */
export const createElement = (tag, className = '', textContent = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
};

/**
 * Create a transcription item element
 * @param {string} timestamp - Formatted timestamp
 * @param {string} channelLabel - Channel/tab label
 * @param {string} text - Transcription text
 * @returns {HTMLElement} Transcription item element
 */
export const createTranscriptionItem = (timestamp, channelLabel, text) => {
  const container = createElement('p', 'transcription-item');
  const timestampSpan = createElement('span', 'ts', timestamp);
  const channelSpan = createElement('span', 'chan', channelLabel);

  container.appendChild(timestampSpan);
  container.appendChild(channelSpan);
  container.appendChild(document.createTextNode(text));

  return container;
};

/**
 * Create a tab list item element
 * @param {Object} tab - Tab object with id, title, url, favIconUrl
 * @param {boolean} isSelected - Whether tab is initially selected
 * @returns {HTMLElement} Tab list item element
 */
export const createTabListItem = (tab, isSelected = false) => {
  const label = createElement('label', 'tab-item');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = tab.id;
  checkbox.dataset.tabId = tab.id;
  checkbox.checked = isSelected;

  const icon = document.createElement('img');
  icon.src = tab.favIconUrl || 'icons/icon16.png';
  icon.alt = 'Tab icon';

  const title = createElement('div', 'tab-title', tab.title || tab.url || `Tab ${tab.id}`);

  label.appendChild(checkbox);
  label.appendChild(icon);
  label.appendChild(title);

  return label;
};

/**
 * Append child element to parent
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element to append
 */
export const appendChild = (parent, child) => {
  if (parent && child) {
    parent.appendChild(child);
  }
};

/**
 * Remove element from DOM
 * @param {HTMLElement} element - Element to remove
 */
export const removeElement = element => {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
};

/**
 * Clear element content
 * @param {HTMLElement} element - Element to clear
 */
export const clearElement = element => {
  if (element) {
    element.innerHTML = '';
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Scroll element to bottom
 * @param {HTMLElement} element - Element to scroll
 */
export const scrollToBottom = element => {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
};

/**
 * Get selected tab IDs from tabs list
 * @returns {number[]} Array of selected tab IDs
 */
export const getSelectedTabIds = () => {
  const checkedBoxes = document.querySelectorAll('#tabsList input[type="checkbox"]:checked');
  return Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.value, 10));
};

/**
 * Get current tab selections as a Set
 * @returns {Set<number>} Set of selected tab IDs
 */
export const getCurrentSelections = () => {
  const selections = new Set();
  document.querySelectorAll('#tabsList input[type="checkbox"]:checked').forEach(checkbox => {
    selections.add(parseInt(checkbox.value, 10));
  });
  return selections;
};

/**
 * Set element style property
 * @param {HTMLElement} element - Target element
 * @param {string} property - CSS property name
 * @param {string} value - CSS property value
 */
export const setStyle = (element, property, value) => {
  if (element && property) {
    element.style[property] = value;
  }
};

/**
 * Set multiple style properties
 * @param {HTMLElement} element - Target element
 * @param {Object} styles - Object with style properties
 */
export const setStyles = (element, styles) => {
  if (element && styles && typeof styles === 'object') {
    Object.entries(styles).forEach(([property, value]) => {
      setStyle(element, property, value);
    });
  }
};

/**
 * Check if element has CSS class
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} Whether element has the class
 */
export const hasClass = (element, className) => {
  return element && className ? element.classList.contains(className) : false;
};
