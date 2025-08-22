#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'build';
const DIST_DIR = 'dist';

async function createDirectories() {
  console.log('Creating build directories...');
  
  try {
    await fs.access(BUILD_DIR);
    await fs.rm(BUILD_DIR, { recursive: true });
  } catch (error) {
    
  }
  
  try {
    await fs.access(DIST_DIR);
    await fs.rm(DIST_DIR, { recursive: true });
  } catch (error) {
    
  }
  
  await fs.mkdir(BUILD_DIR, { recursive: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
}

async function runWebpack() {
  console.log('Running Webpack build...');
  
  try {
    execSync('npx webpack --config webpack.config.cjs --mode=production', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('Webpack build completed successfully!');
  } catch (error) {
    console.error('Webpack build failed:', error.message);
    process.exit(1);
  }
}

async function optimizeAssets() {
  console.log('Optimizing assets...');
  
  const cssPath = path.join(BUILD_DIR, 'sidepanel.css');
  try {
    let css = await fs.readFile(cssPath, 'utf8');
    
    css = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .trim();
    
    await fs.writeFile(cssPath, css);
    console.log('CSS optimized');
  } catch (error) {
    console.warn('CSS optimization failed:', error.message);
  }
  
  const htmlPath = path.join(BUILD_DIR, 'sidepanel.html');
  try {
    let html = await fs.readFile(htmlPath, 'utf8');
    
    html = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
    
    await fs.writeFile(htmlPath, html);
    console.log('HTML optimized');
  } catch (error) {
    console.warn('HTML optimization failed:', error.message);
  }
}

async function validateBuild() {
  console.log('Validating build...');
  
  const requiredFiles = [
    'manifest.json',
    'service-worker.js',
    'sidepanel.html',
    'sidepanel.css',
    'js/main.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(BUILD_DIR, file);
    try {
      await fs.access(filePath);
    } catch (error) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error('Missing required files in build:');
    missingFiles.forEach(file => console.error(`  - ${file}`));
    process.exit(1);
  }
  
  console.log('Build validation passed!');
}

async function calculateBuildSize() {
  console.log('Calculating build size...');
  
  const getDirectorySize = async (dirPath) => {
    let totalSize = 0;
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  };
  
  const buildSize = await getDirectorySize(BUILD_DIR);
  const sizeInMB = (buildSize / (1024 * 1024)).toFixed(2);
  
  console.log(`Build size: ${sizeInMB} MB`);
  
  if (buildSize > 5 * 1024 * 1024) {
    console.warn('Build size exceeds 5MB - this may cause issues with Chrome Web Store');
  }
}

async function main() {
  console.log('Starting Chrome Extension build process...\n');
  
  const startTime = Date.now();
  
  try {
    await createDirectories();
    await runWebpack();
    await optimizeAssets();
    await validateBuild();
    await calculateBuildSize();
    
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nBuild completed successfully in ${buildTime}s!`);
    console.log(`Build output: ${path.resolve(BUILD_DIR)}`);
    
  } catch (error) {
    console.error('\nBuild failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
