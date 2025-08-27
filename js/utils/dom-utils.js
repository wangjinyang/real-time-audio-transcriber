// DOM elements cache
let domElements = {};

export const initializeDOMElements = () => {
  domElements = {
    // Main elements
    toggleButton: document.getElementById('toggleBtn'),
    statusDisplay: document.getElementById('status'),
    timerDisplay: document.getElementById('timer'),
    transcriptionDisplay: document.getElementById('transcription-display'),
    loadingAnimation: document.getElementById('loadingAnimation'),

    // Control Buttons
    summaryButton: document.getElementById('summaryBtn'),
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


export const getDOMElements = () => Object.freeze({ ...domElements });


export const getElement = elementKey => domElements[elementKey] || null;




export const showElement = element => {
  if (element) element.style.display = 'block';
};


export const hideElement = element => {
  if (element) element.style.display = 'none';
};


export const addClass = (element, className) => {
  if (element) element.classList.add(className);
};


export const removeClass = (element, className) => {
  if (element) element.classList.remove(className);
};


export const toggleClass = (element, className) => {
  if (element) return element.classList.toggle(className);
  return false;
};


export const setText = (element, text) => {
  if (element) element.textContent = text;
};


export const setHTML = (element, html) => {
  if (element) element.innerHTML = html;
};


export const getText = element => {
  return element ? element.textContent : '';
};


export const getValue = element => {
  return element ? element.value : '';
};


export const setValue = (element, value) => {
  if (element) element.value = value;
};


export const setAttribute = (element, name, value) => {
  if (element && name) {
    element.setAttribute(name, value);
  }
};


export const getAttribute = (element, name) => {
  return element && name ? element.getAttribute(name) : null;
};


export const addEventListener = (element, event, handler, options = {}) => {
  if (element && event && typeof handler === 'function') {
    element.addEventListener(event, handler, options);
  }
};


export const removeEventListener = (element, event, handler) => {
  if (element && event && typeof handler === 'function') {
    element.removeEventListener(event, handler);
  }
};




export const createElement = (tag, className = '', textContent = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
};


export const createTranscriptionItem = (timestamp, channelLabel, text) => {
  const container = createElement('p', 'transcription-item');
  const timestampSpan = createElement('span', 'ts', timestamp);
  const channelSpan = createElement('span', 'chan', channelLabel);

  container.appendChild(timestampSpan);
  container.appendChild(channelSpan);
  container.appendChild(document.createTextNode(text));

  return container;
};


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


export const appendChild = (parent, child) => {
  if (parent && child) {
    parent.appendChild(child);
  }
};


export const removeElement = element => {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
};


export const clearElement = element => {
  if (element) {
    element.innerHTML = '';
  }
};




export const scrollToBottom = element => {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
};


export const getSelectedTabIds = () => {
  const checkedBoxes = document.querySelectorAll('#tabsList input[type="checkbox"]:checked');
  return Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.value, 10));
};


export const getCurrentSelections = () => {
  const selections = new Set();
  document.querySelectorAll('#tabsList input[type="checkbox"]:checked').forEach(checkbox => {
    selections.add(parseInt(checkbox.value, 10));
  });
  return selections;
};


export const setStyle = (element, property, value) => {
  if (element && property) {
    element.style[property] = value;
  }
};


export const setStyles = (element, styles) => {
  if (element && styles && typeof styles === 'object') {
    Object.entries(styles).forEach(([property, value]) => {
      setStyle(element, property, value);
    });
  }
};


export const hasClass = (element, className) => {
  return element && className ? element.classList.contains(className) : false;
};
