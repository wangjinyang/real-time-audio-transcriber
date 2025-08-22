# AI Audio Transcriber - Modular Architecture

## 📁 Project Structure

```
chrome/
├── icons/                          # Extension icons
├── js/                             # Main JavaScript modules
│   ├── config/                     # Configuration files
│   │   └── app-config.js          # Central app configuration
│   ├── modules/                    # Core application modules
│   │   ├── settings-controller.js  # Settings panel management
│   │   ├── state-manager.js        # Application state management
│   │   ├── storage-manager.js      # Chrome storage operations
│   │   └── transcription-service.js # Multi-provider transcription
│   ├── utils/                      # Utility modules
│   │   ├── audio-utils.js          # Audio processing utilities
│   │   └── dom-utils.js            # DOM manipulation utilities
│   └── main.js                     # Main application controller
├── sidepanel.html                  # Extension UI
├── sidepanel.css                   # Extension styles
├── manifest.json                   # Chrome extension manifest
└── service-worker.js               # Background service worker
```

## 🏗️ Architecture Overview

### **Modular Design Principles**

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Loose Coupling**: Modules interact through well-defined interfaces
3. **High Cohesion**: Related functionality is grouped together
4. **Dependency Injection**: Dependencies are injected rather than hard-coded
5. **ES6 Modules**: Native JavaScript module system for imports/exports

### **Naming Conventions**

#### **File Naming**

- **PascalCase**: Class files (`TranscriptionService`)
- **kebab-case**: Module files (`app-config.js`, `audio-utils.js`)
- **camelCase**: Function and variable names
- **SCREAMING_SNAKE_CASE**: Constants

#### **Code Structure**

- **Classes**: PascalCase (`ApplicationState`, `StorageManager`)
- **Functions**: camelCase (`handleToggleRecording`, `startRecording`)
- **Constants**: SCREAMING_SNAKE_CASE (`AUDIO_CONFIG`, `API_PROVIDERS`)
- **Private methods**: Leading underscore (`_validateInput`)

## 📋 Module Documentation

### **🔧 Config Module (`js/config/`)**

#### `app-config.js`

- **Purpose**: Central configuration for the entire application
- **Exports**: `AUDIO_CONFIG`, `API_PROVIDERS`, `UI_CONSTANTS`, `STORAGE_KEYS`
- **Responsibilities**:
  - Audio processing configuration
  - API provider definitions
  - UI constants and CSS classes
  - Storage key definitions

### **🎯 Core Modules (`js/modules/`)**

#### `state-manager.js`

- **Purpose**: Centralized application state management
- **Classes**: `ApplicationState`, `StatusManager`
- **Responsibilities**:
  - Recording state tracking
  - Session management
  - Timer management
  - Status updates

#### `storage-manager.js`

- **Purpose**: Chrome storage operations and API key management
- **Classes**: `StorageManager`, `ApiKeyManager`
- **Responsibilities**:
  - API configuration persistence
  - Key validation
  - Storage operations

#### `transcription-service.js`

- **Purpose**: Multi-provider transcription API integration
- **Classes**: `BaseTranscriptionService`, provider-specific services, `TranscriptionManager`
- **Responsibilities**:
  - API abstraction layer
  - Retry logic with exponential backoff
  - Error handling and classification

#### `settings-controller.js`

- **Purpose**: Settings panel UI management
- **Classes**: `SettingsPanelController`
- **Responsibilities**:
  - Settings panel interactions
  - API provider switching
  - Configuration loading/saving

### **🛠️ Utility Modules (`js/utils/`)**

#### `dom-utils.js`

- **Purpose**: DOM manipulation and element management
- **Classes**: `DOMElements`, `DOMUtils`
- **Responsibilities**:
  - DOM element caching
  - Utility functions for DOM operations
  - UI component creation

#### `audio-utils.js`

- **Purpose**: Audio processing and Web Audio API operations
- **Classes**: `AudioMimeTypeDetector`, `AudioConverter`, `WebAudioManager`, `AudioStreamManager`
- **Responsibilities**:
  - MIME type detection
  - Audio format conversion
  - Stream management
  - Audio context handling

### **🎮 Main Controller (`js/main.js`)**

#### `AudioTranscriberApp`

- **Purpose**: Main application orchestrator
- **Responsibilities**:
  - Module coordination
  - Event handling
  - Application lifecycle management
  - Recording control flow

## 🔄 Data Flow

```
User Input → Main Controller → State Manager ↔ Storage Manager
     ↓              ↓                ↓              ↓
  DOM Utils ← Settings Controller ← Transcription ← Audio Utils
```

1. **User Interaction**: DOM events captured by main controller
2. **State Management**: Application state updated via state manager
3. **Persistence**: Configuration saved via storage manager
4. **Audio Processing**: Audio streams managed by audio utilities
5. **Transcription**: Text generation via transcription services
6. **UI Updates**: DOM manipulation via DOM utilities

## 🚀 Benefits of Refactoring

### **Maintainability**

- **Single Responsibility**: Each module has one clear purpose
- **Easy Testing**: Modules can be tested in isolation
- **Code Reuse**: Utilities can be reused across modules
- **Clear Dependencies**: Import/export relationships are explicit

### **Scalability**

- **Easy Extension**: New API providers can be added easily
- **Modular Loading**: Only required modules are loaded
- **Performance**: Better memory management and garbage collection
- **Debugging**: Easier to isolate and fix issues

### **Code Quality**

- **Consistent Naming**: Standardized naming conventions
- **Type Safety**: Better error detection and IDE support
- **Documentation**: Clear module boundaries and responsibilities
- **Modern Standards**: ES6 modules and modern JavaScript patterns

## 🧪 Testing Strategy

### **Unit Testing**

- Test individual modules in isolation
- Mock dependencies for pure unit tests
- Test utility functions independently

### **Integration Testing**

- Test module interactions
- Verify data flow between modules
- Test API integrations

### **End-to-End Testing**

- Test complete user workflows
- Verify transcription accuracy
- Test error handling scenarios

## 📈 Future Enhancements

### **Potential Improvements**

1. **TypeScript Migration**: Add type safety
2. **Service Worker Enhancement**: Improve background processing
3. **Real-time Streaming**: WebSocket-based real-time transcription
4. **Plugin Architecture**: Extensible plugin system for new features
5. **Performance Monitoring**: Add performance metrics and monitoring

### **Code Quality Tools**

- **ESLint**: Already configured for code quality
- **Prettier**: Code formatting
- **JSDoc**: Enhanced documentation
- **Jest**: Unit testing framework
- **Cypress**: End-to-end testing

## 🔧 Development Guidelines

### **Adding New Features**

1. Identify the appropriate module for the feature
2. Follow existing naming conventions
3. Add proper error handling
4. Update relevant tests
5. Document public APIs

### **Modifying Existing Code**

1. Understand the module's responsibility
2. Maintain backward compatibility
3. Update tests and documentation
4. Follow the established patterns

This modular architecture provides a solid foundation for the AI Audio Transcriber extension, making it more maintainable, testable, and extensible.
