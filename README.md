# AI Audio Transcriber Chrome Extension

A powerful AI-powered Chrome extension that captures real-time audio from browser tabs and provides instant transcription using multiple AI providers. Perfect for transcribing meetings, videos, podcasts, and any audio content playing in your browser.

## 🌟 Features

### Core Functionality

- **Real-time Audio Capture**: Capture audio from any browser tab playing audio
- **Multi-Provider AI Transcription**: Support for Google Gemini, OpenAI Whisper, Deepgram, and Fireworks AI
- **Auto-detection**: Automatically detects audible tabs without manual refresh
- **Multi-source Support**: Capture from multiple tabs and optional microphone input
- **Smart Processing**: 30-second audio chunks with 3-second overlap to prevent word loss

### User Interface

- **Modern Sidepanel**: Clean, professional interface with real-time updates
- **Visual Feedback**: Loading animations and status indicators
- **Recording Controls**: Single toggle button (Start/Stop) with timer
- **Export Options**: Copy to clipboard or download as text file
- **Advanced Settings**: API provider selection, key management, and configuration options

### Advanced Features

- **Multiple API Providers**: Choose between Google Gemini, OpenAI Whisper, Deepgram, or Fireworks AI
- **Offline Buffering**: Continues recording during network interruptions
- **Error Handling**: Automatic retry with exponential backoff
- **Performance Optimized**: Minimal CPU usage and memory management
- **Channel Labeling**: Distinguish between tab audio and microphone input

## 📋 Prerequisites

- **Google Chrome**: Version 88 or higher
- **API Key**: Choose from supported providers:
  - [Google Gemini API](https://aistudio.google.com/app/apikey) (Free tier available)
  - [OpenAI API](https://platform.openai.com/api-keys) (Pay-per-use)
  - [Deepgram API](https://console.deepgram.com/) (Real-time focus)
  - [Fireworks AI API](https://fireworks.ai/) (Fast and cost-effective)

## 🚀 Installation

### Option 1: From Source (Recommended for Development)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/ai-audio-transcriber.git
   cd ai-audio-transcriber
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the project folder

3. **Configure API Provider**
   - Click the extension icon in Chrome toolbar
   - Open Settings (gear icon)
   - Select your preferred AI provider from the dropdown
   - Enter your API key for the selected provider
   - Click "Save"

### Option 2: From Release Package

1. Download the latest release `.zip` file from [Releases](https://github.com/your-username/ai-audio-transcriber/releases)
2. Extract the zip file
3. Follow steps 2-3 from Option 1

## 🔧 Setup & Configuration

### API Provider Setup

1. **Choose Your Provider**: Select from:
   - **Google Gemini 2.5 Flash**: Free tier with good accuracy
   - **OpenAI Whisper**: High accuracy, pay-per-use
   - **Deepgram**: Real-time speech recognition
   - **Fireworks AI**: Fast and cost-effective

2. **Get API Key**: Visit your chosen provider's website and create an API key
3. **Configure Extension**:
   - Open the extension sidepanel
   - Click the settings icon (⚙️)
   - Select your provider from the dropdown
   - Enter your API key and click "Save"

### Permissions

The extension requires these permissions:

- **tabCapture**: Capture audio from browser tabs
- **activeTab**: Access current tab information
- **sidePanel**: Display the transcription interface
- **storage**: Save settings and transcripts
- **microphone** (optional): Capture microphone input

## 📖 Usage

### Basic Transcription

1. **Open Sidepanel**: Click the extension icon in Chrome toolbar
2. **Play Audio**: Start playing audio in any browser tab (YouTube, meetings, etc.)
3. **Start Recording**: Click the "Start" button in the sidepanel
4. **View Transcription**: Watch real-time transcription appear below
5. **Stop Recording**: Click "Stop" when finished

### Advanced Features

- **Multiple Tabs**: Select multiple audible tabs from the auto-detected list
- **API Provider Switching**: Change between different AI providers anytime
- **Microphone Input**: Enable "Include Microphone" for mixed audio sources
- **Export Results**: Use "Copy" or "Download" buttons to save transcription
- **Clear Content**: Use "Clear" button to remove all transcription data
- **Reset Settings**: Use "Reset" button in settings to clear all data and API keys

## 🏗️ Project Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── service-worker.js      # Background processing
├── sidepanel.html         # Main interface
├── sidepanel.css          # Styling
├── js/                    # Modular JavaScript architecture
│   ├── config/
│   │   └── app-config.js          # Central configuration
│   ├── modules/
│   │   ├── settings-controller.js  # Settings panel management
│   │   ├── state-manager.js        # Application state
│   │   ├── storage-manager.js      # Chrome storage operations
│   │   └── transcription-service.js # Multi-provider transcription
│   ├── utils/
│   │   ├── audio-utils.js          # Audio processing utilities
│   │   └── dom-utils.js            # DOM manipulation utilities
│   └── main.js                     # Main application controller
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── settings-48.png
├── ARCHITECTURE.md        # Detailed architecture documentation
└── README.md             # This file
```

### Architecture Highlights

- **Modular Design**: Clean separation of concerns with ES6 modules
- **Modern JavaScript**: Uses latest standards and best practices
- **Scalable**: Easy to add new features and API providers
- **Maintainable**: Well-organized code with clear naming conventions

## 🛠️ Development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes in the sidepanel

### Building for Production

The extension is ready for distribution as-is. To create a release package:

1. Zip the entire project folder (excluding `.git`, `node_modules`, etc.)
2. The zip file can be distributed or submitted to Chrome Web Store

## 🔧 Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension format
- **Modular ES6**: Clean, maintainable JavaScript modules
- **Service Worker**: Background audio processing
- **Web Audio API**: Real-time audio playback during transcription
- **Chrome APIs**: Tab capture, storage, and sidepanel integration

### Multi-Provider Support

- **Google Gemini**: Multimodal AI with free tier
- **OpenAI Whisper**: Industry-leading speech recognition
- **Deepgram**: Real-time transcription specialist
- **Fireworks AI**: Fast inference and cost-effective

### Performance

- **Memory Efficient**: Automatic cleanup of audio buffers
- **CPU Optimized**: Minimal processing overhead
- **Network Smart**: Offline buffering with auto-retry
- **Modular Loading**: Only load required components

### Audio Processing

- **Chunk Size**: 30-second segments
- **Overlap**: 3-second overlap between chunks
- **Format**: WAV audio at optimal quality for transcription

## 🚨 Troubleshooting

### Common Issues

**No audio detected**

- Ensure the tab is playing audio
- Check Chrome's site permissions for microphone/audio
- Refresh the page and try again

**API errors**

- Verify your API key is correct for the selected provider
- Check your internet connection
- Ensure you have API credits/quota remaining
- Try switching to a different API provider

**Extension not loading**

- Enable Developer mode in Chrome
- Check for console errors in extension popup
- Try reloading the extension

**Poor transcription quality**

- Ensure clear audio source
- Check your internet connection speed
- Try reducing background noise

### Getting Help

- Check the [Issues](https://github.com/your-username/ai-audio-transcriber/issues) page
- Create a new issue with detailed description
- Include Chrome version and error messages

## 📝 API Reference

### Supported Transcription APIs

- **Google Gemini 2.5 Flash**
  - Free tier: 15 requests per minute
  - Multimodal AI with excellent accuracy
  - Best for: General transcription, free usage
- **OpenAI Whisper**
  - Pay-per-use: $0.006 per minute
  - Industry-leading accuracy
  - Best for: High-quality transcription needs
- **Deepgram**
  - Real-time focused with streaming capabilities
  - Competitive pricing
  - Best for: Live transcription, conferences
- **Fireworks AI**
  - Fast inference with cost-effective pricing
  - Good balance of speed and accuracy
  - Best for: High-volume usage

### Rate Limits & Retry Logic

- Automatic retry with exponential backoff
- Queue management for failed requests
- Provider-specific error handling
- Graceful fallback on errors

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and modular architecture
- Add comprehensive comments for complex functionality
- Test thoroughly with multiple API providers
- Update documentation as needed
- Use ESLint for code quality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for multimodal transcription services
- OpenAI for Whisper speech recognition technology
- Deepgram for real-time speech processing
- Fireworks AI for fast inference capabilities
- Chrome Extensions team for excellent APIs
- Open source community for inspiration and tools

## 📊 Statistics

- **Languages**: HTML, CSS, JavaScript (ES6 Modules)
- **APIs Used**: Chrome Extensions API, Web Audio API, Multiple AI Transcription APIs
- **Architecture**: Modular design with 8 core modules
- **Browser Support**: Chrome 88+
- **File Size**: ~70KB (modular architecture)
- **API Providers**: 4 supported transcription services

---

**Made with ❤️ for better accessibility and productivity**

For more information, visit our [GitHub repository](https://github.com/your-username/ai-audio-transcriber) or check out the [demo video](https://your-demo-link.com).
