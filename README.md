###Demo:
https://www.youtube.com/watch?v=S2bAtLlr4tk

# AI Audio Transcriber Chrome Extension

A powerful AI-powered Chrome extension that captures real-time audio from browser tabs and provides instant transcription using multiple AI providers. Perfect for t### Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension format
- **Functional Programming**: Pure functions and immutable data structures
- **ES6+ Modules**: Clean, maintainable JavaScript with modern syntax
- **Service Worker**: Background audio processing
- **Web Audio API**: Real-time audio playback during transcription
- **Chrome APIs**: Tab capture, storage, and sidepanel integration

### Build System

- **Webpack**: Module bundling and optimization
- **Terser**: Advanced JavaScript minification (55% compression)
- **Babel**: ES6+ transpilation for Chrome 88+ compatibility
- **GitHub Actions**: Automated build and release workflows
- **Automated Packaging**: Creates optimized zip files for distributionng meetings, videos, podcasts, and any audio content playing in your browser.

## Features

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

## Prerequisites

- **Google Chrome**: Version 88 or higher
- **API Key**: Choose from supported providers:
  - [Google Gemini API](https://aistudio.google.com/app/apikey) (Free tier available)
  - [OpenAI API](https://platform.openai.com/api-keys) (Pay-per-use)
  - [Deepgram API](https://console.deepgram.com/) (Real-time focus)
  - [Fireworks AI API](https://fireworks.ai/) (Fast and cost-effective)

## Installation

### Option 1: From Source (Recommended for Development)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/real-time-audio-transcriber.git
   cd real-time-audio-transcriber
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

1. Download the latest release `.zip` file from [Releases](https://github.com/your-username/real-time-audio-transcriber/releases)
2. Extract the zip file
3. Follow steps 2-3 from Option 1

## Setup & Configuration

### API Provider Setup

1. **Choose Your Provider**: Select from:
   - **Google Gemini 2.5 Flash**: Free tier with good accuracy
   - **OpenAI Whisper**: High accuracy, pay-per-use
   - **Deepgram**: Real-time speech recognition
   - **Fireworks AI**: Fast and cost-effective

2. **Get API Key**: Visit your chosen provider's website and create an API key
3. **Configure Extension**:
   - Open the extension sidepanel
   - Click the settings icon
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

## Project Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── service-worker.js          # Background processing
├── sidepanel.html             # Main interface
├── sidepanel.css              # Styling
├── js/                        # Functional JavaScript architecture
│   ├── config/
│   │   └── app-config.js              # Immutable configuration
│   ├── modules/
│   │   ├── settings-controller.js     # Pure settings management
│   │   ├── state-manager.js           # Functional state handling
│   │   ├── storage-manager.js         # Storage operations
│   │   └── transcription-service.js   # Multi-provider API service
│   ├── utils/
│   │   ├── audio-utils.js             # Audio processing utilities
│   │   └── dom-utils.js               # DOM manipulation utilities
│   └── main.js                        # Main application controller
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── scripts/                   # Build system
│   ├── build.cjs              # Production build script
│   └── package.cjs            # Automated packaging
├── .github/workflows/         # CI/CD automation
│   └── build-and-release.yml  # Automated releases
├── webpack.config.cjs         # Webpack build configuration
├── package.json               # Dependencies and scripts
├── .eslintrc.cjs             # Code quality rules
├── .gitignore                 # Git ignore patterns
├── ARCHITECTURE.md            # Detailed architecture docs
├── BUILD.md                   # Build system documentation
└── README.md                  # This file
```

### Architecture Highlights

- **Functional Programming**: Pure functions, immutable data structures, and minimal side effects
- **Modern JavaScript**: ES6+ modules with advanced language features
- **Production Build System**: Webpack + Terser achieving 55% compression ratio
- **Automated CI/CD**: GitHub Actions for builds and releases
- **Scalable**: Easy to add new features and API providers
- **Maintainable**: Well-organized code with clear separation of concerns

## Development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Verify your changes in the sidepanel

### Building for Production

The project includes a comprehensive build system for optimized production releases:

```bash
# Install dependencies
npm install

# Development build (with source maps)
npm run build:dev

# Production build (minified and optimized)
npm run build:prod

# Create distribution package
npm run package

# Complete release process
npm run release
```

**Build Features:**
- **JavaScript Compression**: 55% size reduction (90KB → 40KB) using Webpack + Terser
- **ES6+ Transpilation**: Chrome 88+ compatibility with Babel
- **Tree Shaking**: Removes unused code for smaller bundles
- **Automated Packaging**: Creates zip files with checksums and release notes

**Automated Releases:**
Create GitHub releases by pushing version tags:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers GitHub Actions to automatically build, optimize, and create a release package.

## Technical Details

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
- **CPU Optimized**: Minimal processing overhead with functional architecture
- **Network Smart**: Offline buffering with auto-retry
- **Compressed Builds**: 55% size reduction (90KB → 40KB) in production
- **Modular Loading**: Only load required components

### Audio Processing

- **Chunk Size**: 30-second segments
- **Overlap**: 3-second overlap between chunks
- **Format**: WAV audio at optimal quality for transcription

## Troubleshooting

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

- Check the [Issues](https://github.com/your-username/real-time-audio-transcriber/issues) page
- Create a new issue with detailed description
- Include Chrome version and error messages

## API Reference

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

- Follow functional programming principles with pure functions
- Use existing build system for optimized production builds
- Add comprehensive comments for complex functionality
- Verify thoroughly with multiple API providers
- Update documentation as needed
- Use ESLint for code quality and consistency
- Run `npm run format` before commits

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for multimodal transcription services
- OpenAI for Whisper speech recognition technology
- Deepgram for real-time speech processing
- Fireworks AI for fast inference capabilities
- Chrome Extensions team for excellent APIs
- Open source community for inspiration and tools

## Statistics

- **Languages**: HTML, CSS, JavaScript (ES6+ with Functional Programming)
- **APIs Used**: Chrome Extensions API, Web Audio API, Multiple AI Transcription APIs
- **Architecture**: Functional programming with 8 core modules
- **Browser Support**: Chrome 88+
- **Source Size**: ~90KB (functional modular architecture)
- **Production Size**: ~40KB (55% compression with Webpack + Terser)
- **Distribution Package**: ~30KB (complete optimized zip)
- **API Providers**: 4 supported transcription services
- **Build System**: Webpack, Babel, Terser, GitHub Actions CI/CD

## License

MIT License - Copyright (c) 2025 Manasa Pasupuleti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

**Made with care for better accessibility and productivity by Manasa Pasupuleti**

For more information, visit our [GitHub repository](https://github.com/your-username/real-time-audio-transcriber) or check out the [demo video](https://your-demo-link.com).
