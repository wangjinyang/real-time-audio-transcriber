/**
 * Audio Utilities Module
 * Functional audio processing utilities for the AI Audio Transcriber Chrome Extension
 */

import { UI_CONSTANTS } from '../config/app-config.js';

// ==================== MIME TYPE UTILITIES ====================

/**
 * Get supported MIME type for MediaRecorder
 * @param {MediaStream} stream - Audio stream
 * @returns {string} Supported MIME type
 */
export const getSupportedMimeType = stream => {
  const preferredTypes = [
    UI_CONSTANTS.MIME_TYPES.WEBM_OPUS,
    UI_CONSTANTS.MIME_TYPES.OGG_OPUS,
    UI_CONSTANTS.MIME_TYPES.WEBM,
  ];

  for (const mimeType of preferredTypes) {
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      return recorder.mimeType;
    } catch (error) {
      // Continue to next MIME type
      continue;
    }
  }

  // Fallback to default
  try {
    const recorder = new MediaRecorder(stream);
    return recorder.mimeType || UI_CONSTANTS.MIME_TYPES.WEBM;
  } catch (error) {
    console.warn('Failed to create MediaRecorder with any MIME type:', error);
    return UI_CONSTANTS.MIME_TYPES.WEBM;
  }
};

/**
 * Check if MIME type is valid
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} Whether MIME type is valid
 */
export const isValidMimeType = mimeType => {
  return Object.values(UI_CONSTANTS.MIME_TYPES).includes(mimeType);
};

// ==================== AUDIO CONVERSION UTILITIES ====================

/**
 * Convert blob to base64 string
 * @param {Blob} blob - Audio blob
 * @returns {Promise<string>} Base64 encoded string
 */
export const blobToBase64 = blob => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      try {
        // Remove the data URL prefix (data:audio/webm;base64,)
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert base64 string to blob
 * @param {string} base64Data - Base64 encoded data
 * @param {string} mimeType - MIME type for the blob
 * @returns {Blob} Audio blob
 */
export const base64ToBlob = (base64Data, mimeType) => {
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('Failed to convert base64 to blob:', error);
    throw new Error('Invalid base64 data');
  }
};

/**
 * Validate audio blob
 * @param {Blob} blob - Blob to validate
 * @returns {Promise<boolean>} Whether blob is valid
 */
export const validateAudioBlob = async blob => {
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Invalid blob object');
  }

  if (blob.size === 0) {
    throw new Error('Empty audio blob');
  }

  if (!blob.type || !blob.type.startsWith('audio/')) {
    console.warn('Blob MIME type may not be audio:', blob.type);
  }

  return true;
};

// ==================== WEB AUDIO API UTILITIES ====================

// Store audio contexts in a Map for session management
let audioContexts = new Map();

/**
 * Create or get audio context for session
 * @param {string} sessionId - Session identifier
 * @returns {AudioContext} Audio context
 */
export const createAudioContext = sessionId => {
  if (audioContexts.has(sessionId)) {
    return audioContexts.get(sessionId);
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  audioContexts.set(sessionId, audioContext);

  return audioContext;
};

/**
 * Setup audio playback for stream
 * @param {string} sessionId - Session identifier
 * @param {MediaStream} stream - Audio stream
 * @param {boolean} enablePlayback - Whether to enable playback
 * @returns {Object|null} Audio setup object or null
 */
export const setupAudioPlayback = (sessionId, stream, enablePlayback = true) => {
  if (!enablePlayback) {
    return null;
  }

  try {
    const audioContext = createAudioContext(sessionId);
    const source = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 1.0; // Full volume

    return { audioContext, source, gainNode };
  } catch (error) {
    console.warn('Failed to setup audio playback:', error);
    return null;
  }
};

/**
 * Set volume for session
 * @param {string} sessionId - Session identifier
 * @param {number} volume - Volume level (0-1)
 */
export const setVolume = (sessionId, volume) => {
  const audioContext = audioContexts.get(sessionId);
  if (audioContext && audioContext.gainNode) {
    audioContext.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
};

/**
 * Close audio context for session
 * @param {string} sessionId - Session identifier
 * @returns {Promise<void>}
 */
export const closeAudioContext = async sessionId => {
  const audioContext = audioContexts.get(sessionId);

  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
    } catch (error) {
      console.warn('Failed to close audio context:', error);
    }
  }

  audioContexts.delete(sessionId);
};

/**
 * Close all audio contexts
 * @returns {Promise<void>}
 */
export const closeAllAudioContexts = async () => {
  const sessionIds = Array.from(audioContexts.keys());
  await Promise.all(sessionIds.map(sessionId => closeAudioContext(sessionId)));
};

// ==================== AUDIO STREAM UTILITIES ====================

/**
 * Capture audio from a specific tab
 * @param {number} tabId - Tab ID to capture
 * @returns {Promise<MediaStream>} Audio stream
 */
export const captureTabAudio = async tabId => {
  // Get tab information
  const tabInfo = await chrome.tabs.get(tabId);

  // Focus the target tab (Chrome requirement for capture)
  await chrome.windows.update(tabInfo.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });

  // Brief delay for tab activation
  await new Promise(resolve => setTimeout(resolve, 200));

  // Capture tab audio
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, stream => {
      if (chrome.runtime.lastError || !stream) {
        reject(new Error(chrome.runtime.lastError?.message || 'Tab capture failed'));
        return;
      }
      resolve(stream);
    });
  });
};

/**
 * Capture microphone audio
 * @returns {Promise<MediaStream>} Audio stream
 */
export const captureMicrophoneAudio = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  } catch (error) {
    console.error('Microphone capture failed:', error);
    throw new Error(`Microphone access denied: ${error.message}`);
  }
};

/**
 * Stop audio stream
 * @param {MediaStream} stream - Stream to stop
 */
export const stopStream = stream => {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Failed to stop audio track:', error);
      }
    });
  }
};

/**
 * Check if stream is active
 * @param {MediaStream} stream - Stream to check
 * @returns {boolean} Whether stream is active
 */
export const isStreamActive = stream => {
  if (!stream || !stream.getTracks) {
    return false;
  }

  return stream.getTracks().some(track => track.readyState === 'live');
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create audio file URL from blob
 * @param {Blob} blob - Audio blob
 * @returns {string} Object URL
 */
export const createAudioURL = blob => {
  return URL.createObjectURL(blob);
};

/**
 * Revoke audio file URL
 * @param {string} url - Object URL to revoke
 */
export const revokeAudioURL = url => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Get audio duration from blob
 * @param {Blob} blob - Audio blob
 * @returns {Promise<number>} Duration in seconds
 */
export const getAudioDuration = blob => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = createAudioURL(blob);

    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      revokeAudioURL(url);
    };

    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'));
      revokeAudioURL(url);
    };

    audio.src = url;
  });
};

/**
 * Download audio blob as file
 * @param {Blob} blob - Audio blob
 * @param {string} filename - File name
 */
export const downloadAudioFile = (blob, filename = 'audio.webm') => {
  const url = createAudioURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  revokeAudioURL(url);
};
