# Build and Release Documentation

## Build System Overview

This Chrome Extension uses a comprehensive modern build system featuring:
- **Webpack 5** for JavaScript bundling and tree shaking
- **Terser** for advanced JavaScript optimization (55% compression)
- **Babel** for ES6+ transpilation to Chrome 88+ compatible code
- **GitHub Actions** for automated CI/CD workflows
- **Automated packaging** for Chrome Web Store and GitHub releases
- **Functional programming optimization** for better tree shaking and minification

## Build Performance

### Compression Results
- **Source Size**: ~90KB (functional JavaScript modules)
- **Production Build**: ~40KB (55% compression with Terser)
- **Distribution Package**: ~30KB (complete optimized zip file)

### Optimization Features
- **Tree Shaking**: Removes unused functional code
- **Dead Code Elimination**: Pure functions enable aggressive optimization
- **Function Inlining**: Safe inlining of pure functions
- **Constant Folding**: Immutable data optimizations

## Build Scripts

### Development Build
```bash
npm run build:dev
```
- Creates unminified build with source maps
- Faster build times for development
- Preserves console.log statements

### Production Build
```bash
npm run build:prod
```
- Minified and optimized JavaScript
- Removes console.log statements
- Smaller file sizes for distribution

### Full Build Process
```bash
npm run build
```
- Runs complete build with optimizations
- Validates all required files
- Calculates build size

### Create Distribution Package
```bash
npm run package
```
- Creates zip file for distribution
- Generates checksums for verification
- Creates release notes

### Complete Release Build
```bash
npm run release
```
- Cleans previous builds
- Runs production build
- Creates distribution package
- Ready for upload to Chrome Web Store

## File Size Optimization

The build process includes several optimizations:

### JavaScript Optimization
- **Minification**: Removes whitespace, shortens variable names
- **Dead code elimination**: Removes unused code
- **Tree shaking**: Removes unused imports
- **Compression**: Gzip-like compression with Terser

### Asset Optimization
- **CSS minification**: Removes comments and whitespace
- **HTML minification**: Removes unnecessary whitespace
- **Image optimization**: Icons are already optimized

### Expected File Sizes
- **Development build**: ~150-200KB (with source maps and debug info)
- **Production build**: ~40KB (55% reduction from 90KB source)
- **Final zip package**: ~30KB (includes all assets and manifest)

## GitHub Actions Workflows

### Release Workflow (`build-and-release.yml`)
Triggered on:
- Git tags matching `v*.*.*` (e.g., `v1.0.0`)
- Manual workflow dispatch

Actions:
- Creates production build
- Generates distribution package
- Creates GitHub release with zip file
- Includes checksums and release notes

## Creating a Release

### 1. Prepare for Release
```bash
# Ensure code is ready
npm run lint
npm run format:check

# Create build locally
npm run release

# Verify the package works
```

### 2. Tag the Release
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

### 3. Automated Release
- GitHub Actions automatically creates the release
- Zip file is uploaded to GitHub Releases
- Release notes are generated

### 4. Manual Release (if needed)
```bash
# Trigger workflow manually from GitHub Actions tab
# Or use GitHub CLI
gh workflow run build-and-release.yml -f version=v1.0.0
```

## Directory Structure After Build

```
build/                          # Production build output
├── manifest.json              # Extension manifest
├── service-worker.js          # Minified service worker
├── sidepanel.html            # Optimized HTML
├── sidepanel.css             # Minified CSS
├── js/                       # Minified JavaScript modules
│   ├── main.js
│   ├── config/
│   ├── utils/
│   └── modules/
├── icons/                    # Extension icons
├── LICENSE                   # License file
└── README.md                 # Documentation

dist/                          # Distribution packages
├── real-time-audio-transcriber-v1.0.0.zip
├── real-time-audio-transcriber-v1.0.0.checksums.txt
└── real-time-audio-transcriber-v1.0.0.RELEASE_NOTES.md
```

## Build Configuration

### Webpack Configuration (`webpack.config.cjs`)
- **ES6+ modules** with aggressive tree shaking for functional code
- **Chrome 88+ compatibility** with optimal browser support
- **Terser optimization** achieving 55% compression ratio
- **Asset copying** and optimization for all extension files
- **Functional programming optimizations** for better minification

### Babel Configuration
- **Target**: Chrome 88+ for optimal compatibility
- **ES modules preserved** for superior tree shaking
- **Modern JavaScript features** transpiled safely
- **Functional programming constructs** optimized

### Build Scripts (`scripts/`)
- **build.cjs**: Production build orchestration with Webpack integration
- **package.cjs**: Automated distribution packaging with checksums

## Performance Optimization

### Bundle Analysis
To analyze bundle size:
```bash
# Install webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Add to webpack config and run
npx webpack-bundle-analyzer build/js/main.js
```

### Size Limits
- **Chrome Web Store**: 128MB limit (we're at ~40KB - excellent)
- **Recommended**: Keep under 5MB for optimal performance
- **Current optimized build**: ~40KB (outstanding compression)
- **Distribution package**: ~30KB (complete extension)

## Troubleshooting

### Build Fails
```bash
# Clean and retry
npm run clean
npm ci
npm run build
```

### Missing Files in Build
- Check webpack.config.js copy patterns
- Ensure source files exist
- Check file paths in build script

### Large Bundle Size
- Review imported dependencies and functional composition
- Check for circular imports in module system
- Use webpack-bundle-analyzer for detailed analysis
- Leverage functional programming for better tree shaking
- Consider code splitting for large functional modules

### GitHub Actions Failing
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check file paths (Windows vs Linux)
- Review GitHub Actions logs

## Security Considerations

### API Keys
- Never include API keys in builds
- Use environment variables for CI/CD
- Exclude sensitive files in .gitignore

### Code Integrity
- Checksums generated for all releases
- Source maps excluded from production
- All dependencies verified
