// src/event-handler.ts
var RealtimeEventHandler = class {
  eventHandlers = {};
  /**
   * Clears all event handlers.
   */
  clearEventHandlers() {
    this.eventHandlers = {};
  }
  /**
   * Adds a listener for a specific event.
   */
  on(eventName, callback) {
    this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
    this.eventHandlers[eventName].push(callback);
  }
  /**
   * Adds a listener for a single occurrence of an event.
   */
  once(eventName, callback) {
    const onceCallback = event => {
      this.off(eventName, onceCallback);
      return callback(event);
    };
    this.on(eventName, onceCallback);
  }
  /**
   * Removes a listener for an event.
   * Calling without a callback will remove all listeners for the event.
   */
  off(eventName, callback) {
    const handlers = this.eventHandlers[eventName] || [];
    if (callback) {
      const index = handlers.indexOf(callback);
      if (index < 0) {
        throw new Error(
          `Could not turn off specified event listener for "${eventName}": not found as a listener`
        );
      }
      handlers.splice(index, 1);
    } else {
      delete this.eventHandlers[eventName];
    }
  }
  /**
   * Waits for next event of a specific type and returns the payload.
   */
  async waitForNext(eventName, { timeoutMs } = {}) {
    return new Promise((resolve, reject) => {
      this.once(eventName, resolve);
      if (timeoutMs !== void 0) {
        setTimeout(() => reject(new Error(`Timeout waiting for "${eventName}"`)), timeoutMs);
      }
    });
  }
  /**
   * Executes all events handlers in the order they were added.
   */
  dispatch(eventName, event) {
    const handlers = this.eventHandlers[eventName] || [];
    for (const handler of handlers) {
      handler(event);
    }
  }
};

// src/utils.ts
var isBrowser = !!globalThis.document;
function hasNativeWebSocket() {
  return !!globalThis.WebSocket;
}
function assert(value, message) {
  if (value) {
    return;
  }
  if (!message) {
    throw new Error('Assertion failed');
  }
  throw typeof message === 'string' ? new Error(message) : message;
}
function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
  }
  return buffer;
}
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
function arrayBufferToBase64(arrayBuffer) {
  if (arrayBuffer instanceof Float32Array) {
    arrayBuffer = floatTo16BitPCM(arrayBuffer);
  } else if (arrayBuffer instanceof Int16Array) {
    arrayBuffer = arrayBuffer.buffer;
  }
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 32768;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
function mergeInt16Arrays(left, right) {
  if (left instanceof ArrayBuffer) {
    left = new Int16Array(left);
  }
  if (right instanceof ArrayBuffer) {
    right = new Int16Array(right);
  }
  if (!(left instanceof Int16Array) || !(right instanceof Int16Array)) {
    throw new TypeError(`Both items must be Int16Array`);
  }
  const newValues = new Int16Array(left.length + right.length);
  for (const [i, element] of left.entries()) {
    newValues[i] = element;
  }
  for (const [j, element] of right.entries()) {
    newValues[left.length + j] = element;
  }
  return newValues;
}
function customAlphabet(alphabet, size = 21) {
  const chars = alphabet.split('');
  const length = chars.length;

  return function generate() {
    let id = '';
    for (let i = 0; i < size; i++) {
      const randIndex = Math.floor(Math.random() * length);
      id += chars[randIndex];
    }
    return id;
  };
}
var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
var generateIdImpl = customAlphabet(alphabet, 21);
function generateId(prefix, size = 21) {
  const id = generateIdImpl(size);
  return `${prefix}${id}`;
}
var sleep = t => new Promise(r => setTimeout(() => r(), t));
function trimDebugEvent(event, { maxLimit = 200 } = {}) {
  if (!event) return event;
  const e = structuredClone(event);
  if (e.item?.content?.find(c => c.audio)) {
    e.item.content = e.item.content.map(({ audio, c }) => {
      if (audio) {
        return {
          ...c,
          audio: '<base64 redacted...>',
        };
      } else {
        return c;
      }
    });
  }
  if (e.audio) {
    e.audio = '<audio redacted...>';
  }
  if (e.delta?.length > maxLimit) {
    e.delta = e.delta.slice(0, maxLimit) + '... (truncated)';
  }
  return e;
}

// src/api.ts
var RealtimeAPI = class extends RealtimeEventHandler {
  model;
  url;
  apiKey;
  debug;
  ws;
  /**
   * Creates a new RealtimeAPI instance.
   */
  constructor({
    model = '',
    url = 'wss://api.openai.com/v1/realtime?intent=transcription',
    apiKey,
    dangerouslyAllowAPIKeyInBrowser,
    debug,
  } = {}) {
    super();
    this.model = model;
    this.url = url;
    this.apiKey = apiKey;
    this.debug = !!debug;
    if (!this.apiKey) {
      throw new Error(
        'An API key is required to connect to the Realtime API. Please provide it via the "apiKey" parameter or the "OPENAI_API_KEY" environment variable.'
      );
    }
    if (isBrowser && this.apiKey) {
      if (!dangerouslyAllowAPIKeyInBrowser) {
        throw new Error(
          'Unable to provide API key in the browser without "dangerouslyAllowAPIKeyInBrowser" set to true'
        );
      }
    }
  }
  /**
   * Whether or not the WebSocket is connected.
   */
  get isConnected() {
    return !!this.ws;
  }
  /**
   * Connects to Realtime API WebSocket Server.
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    if (!this.apiKey && !isBrowser) {
      console.warn(`No apiKey provided for connection to "${this.url}"`);
    }
    const url = new URL(this.url);
    this.model && url.searchParams.set('model', this.model);
    if (hasNativeWebSocket()) {
      if (isBrowser && this.apiKey) {
        console.warn('Warning: Connecting using API key in the browser, this is not recommended');
      }
      const ws = new WebSocket(
        url.toString(),
        [
          'realtime',
          this.apiKey ? `openai-insecure-api-key.${this.apiKey}` : void 0,
          'openai-beta.realtime-v1',
        ].filter(Boolean)
      );
      ws.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        this.receive(message.type, message);
      });
      return new Promise((resolve, reject) => {
        const connectionErrorHandler = () => {
          this.disconnect(ws);
          reject(new Error(`Could not connect to "${this.url}"`));
        };
        ws.addEventListener('error', connectionErrorHandler);
        ws.addEventListener('open', () => {
          ws.removeEventListener('error', connectionErrorHandler);
          ws.addEventListener('error', () => {
            this.disconnect(ws);
            this._log(`Error, disconnected from "${this.url}"`);
            this.dispatch('close', { type: 'close', error: true });
          });
          ws.addEventListener('close', () => {
            this.disconnect(ws);
            this._log(`Disconnected from "${this.url}"`);
            this.dispatch('close', { type: 'close', error: false });
          });
          this.ws = ws;
          resolve(true);
        });
      });
    } else {
      throw new Error(`WebSocket is not supported in this environment`);
    }
  }
  /**
   * Disconnects from the Realtime API server.
   */
  disconnect(ws) {
    if (this.ws && (!ws || this.ws === ws)) {
      this.ws?.close();
      this.ws = void 0;
    }
  }
  /**
   * Receives an event from WebSocket and dispatches related events.
   */
  receive(eventName, event) {
    this._log('received:', eventName, event);
    this.dispatch(eventName, event);
    this.dispatch(`server.${eventName}`, event);
    this.dispatch('server.*', event);
  }
  /**
   * Sends an event to the underlying WebSocket and dispatches related events.
   */
  send(eventName, data = {}) {
    if (!this.isConnected) {
      throw new Error(`RealtimeAPI is not connected`);
    }
    data = data || {};
    if (typeof data !== 'object') {
      throw new TypeError(`data must be an object`);
    }
    const event = {
      event_id: generateId('evt_'),
      type: eventName,
      ...data,
    };
    this.dispatch(eventName, event);
    this.dispatch(`client.${eventName}`, event);
    this.dispatch('client.*', event);
    this._log('sent:', eventName, event);
    this.ws.send(JSON.stringify(event));
  }
  /**
   * Writes WebSocket logs to the console if `debug` is enabled.
   */
  _log(...args) {
    const date = /* @__PURE__ */ new Date().toISOString();
    const logs = [`[Websocket/${date}]`].concat(args).map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(trimDebugEvent(arg), null, 2);
      } else {
        return arg;
      }
    });
    if (this.debug) {
      console.log(...logs);
    }
  }
};

// src/client.ts
var RealtimeClient = class extends RealtimeEventHandler {
  defaultSessionConfig;
  sessionConfig;
  realtime;
  conversation;
  inputAudioBuffer;
  sessionCreated;
  constructor({ sessionConfig, relay = false, ...apiParams } = {}) {
    super();
    this.defaultSessionConfig = {
      input_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'gpt-4o-mini-transcribe',
        // "prompt": "",
        // "language": "en"
      },
      turn_detection: null,
      // "turn_detection": {
      //   "type": "server_vad",
      //   "threshold": 0.5,
      //   "prefix_padding_ms": 300,
      //   "silence_duration_ms": 500,
      // },
      input_audio_noise_reduction: {
        type: 'near_field',
      },
      // "include": [
      //   "item.input_audio_transcription.logprobs"
      // ],
      ...sessionConfig,
    };
    this.sessionConfig = {};
    this.sessionCreated = false;
    this.realtime = new RealtimeAPI(apiParams);
    this._resetConfig();
    this._addAPIEventHandlers();
  }
  /**
   * Resets sessionConfig and conversation to defaults.
   */
  _resetConfig() {
    this.sessionCreated = false;
    this.sessionConfig = structuredClone(this.defaultSessionConfig);
  }
  /**
   * Sets up event handlers for a fully-functional application control flow.
   */
  _addAPIEventHandlers() {
    this.realtime.on('client.*', event => {
      this.dispatch('realtime.event', {
        type: 'realtime.event',
        time: /* @__PURE__ */ new Date().toISOString(),
        source: 'client',
        event,
      });
    });
    this.realtime.on('server.*', event => {
      this.dispatch('realtime.event', {
        type: 'realtime.event',
        time: /* @__PURE__ */ new Date().toISOString(),
        source: 'server',
        event,
      });
    });
    this.realtime.on('server.session.created', () => {
      this.sessionCreated = true;
    });
  }
  /**
   * Whether the realtime socket is connected.
   */
  get isConnected() {
    return this.realtime.isConnected;
  }
  /**
   * Resets the client instance entirely: disconnects and clears configs.
   */
  reset() {
    this.disconnect();
    this.clearEventHandlers();
    this.realtime.clearEventHandlers();
    this._resetConfig();
    this._addAPIEventHandlers();
  }
  /**
   * Connects to the Realtime WebSocket API and updates the session config.
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    await this.realtime.connect();
    this.updateSession();
  }
  /**
   * Waits for a session.created event to be executed before proceeding.
   */
  async waitForSessionCreated() {
    assert(this.isConnected, 'Not connected, use .connect() first');
    while (!this.sessionCreated) {
      await sleep(1);
    }
  }
  /**
   * Disconnects from the Realtime API and clears the conversation history.
   */
  disconnect() {
    this.sessionCreated = false;
    this.realtime.disconnect();
  }
  /**
   * Gets the active turn detection mode.
   */
  getTurnDetectionType() {
    return this.sessionConfig.turn_detection?.type;
  }
  /**
   * Deletes an item.
   */
  deleteItem(id) {
    this.realtime.send('conversation.item.delete', { item_id: id });
  }
  /**
   * Updates session configuration.
   *
   * If the client is not yet connected, the session will be updated upon connection.
   */
  updateSession(sessionConfig = {}) {
    this.sessionConfig = {
      ...this.sessionConfig,
      ...sessionConfig,
    };
    if (this.isConnected && !this.isRelay) {
      this.realtime.send('transcription_session.update', {
        session: structuredClone(this.sessionConfig),
      });
    }
  }
  /**
   * Sends user message content and generates a response.
   */
  sendUserMessageContent(content) {
    if (content.length) {
      this.realtime.send('conversation.item.create', {
        item: {
          type: 'message',
          role: 'user',
          content,
        },
      });
    }
    this.createResponse();
  }
  /**
   * Appends user audio to the existing audio buffer.
   */
  appendInputAudio(arrayBuffer) {
    if (arrayBuffer.byteLength > 0) {
      this.realtime.send('input_audio_buffer.append', {
        audio: arrayBufferToBase64(arrayBuffer),
      });
    }
  }
  /**
   * Forces the model to generate a response.
   */
  createResponse() {
    this.realtime.send('input_audio_buffer.commit');
  }
  /**
   * Cancels the ongoing server generation and truncates ongoing generation, if
   * applicable.
   *
   * If no id provided, will simply call `cancel_generation` command.
   */
  cancelResponse(id, sampleCount = 0) {
    this.realtime.send('response.cancel');
  }
  /**
   * Utility for waiting for the next `conversation.item.appended` event to be
   * triggered by the server.
   */
  async waitForNextItem() {
    const event = await this.waitForNext('conversation.item.appended');
    return event.item;
  }
  /**
   * Utility for waiting for the next `conversation.item.completed` event to be
   * triggered by the server.
   */
  async waitForNextCompletedItem() {
    const event = await this.waitForNext('conversation.item.completed');
    return event.item;
  }
};
export {
  RealtimeAPI,
  RealtimeClient,
  RealtimeEventHandler,
  arrayBufferToBase64,
  assert,
  base64ToArrayBuffer,
  floatTo16BitPCM,
  generateId,
  hasNativeWebSocket,
  isBrowser,
  mergeInt16Arrays,
  sleep,
  trimDebugEvent,
};
//# sourceMappingURL=index.js.map

