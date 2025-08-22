#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'build';
const DIST_DIR = 'dist';

async function getVersion() {
  try {
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    return manifest.version;
  } catch (error) {
    console.error('Failed to read version from manifest.json');
    throw error;
  }
}

async function createZipFile(version) {
  console.log('Creating zip package...');
  
  const zipFileName = `real-time-audio-transcriber-v${version}.zip`;
  const zipPath = path.join(DIST_DIR, zipFileName);
  
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      const powershellCommand = `Compress-Archive -Path "${BUILD_DIR}\\*" -DestinationPath "${zipPath}" -Force`;
      execSync(`powershell -Command "${powershellCommand}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } else {
      execSync(`cd ${BUILD_DIR} && zip -r "../${zipPath}" .`, { 
        stdio: 'inherit',
        shell: '/bin/bash'
      });
    }
    
    console.log(`Package created: ${zipFileName}`);
    return zipPath;
    
  } catch (error) {
    console.error('Failed to create zip package:', error.message);
    throw error;
  }
}

async function validateZip(zipPath) {
  console.log('Validating zip package...');
  
  try {
    const stats = await fs.stat(zipPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`Package size: ${sizeInMB} MB`);
    
    if (stats.size > 50 * 1024 * 1024) {
      console.warn('Package size exceeds 50MB - this is very large for a Chrome extension');
    }
    
    if (stats.size < 1024) {
      console.error('Package size is suspiciously small - build may be incomplete');
      throw new Error('Package validation failed');
    }
    
    console.log('Package validation passed!');
    
  } catch (error) {
    console.error('Package validation failed:', error.message);
    throw error;
  }
}

async function generateChecksums(zipPath) {
  console.log('Generating checksums...');
  
  try {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(zipPath);
    
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    
    const checksumContent = `# Checksums for ${path.basename(zipPath)}

## SHA256
${sha256}

## MD5
${md5}

## Verification
To verify the integrity of the downloaded file:

### On Windows (PowerShell):
\`\`\`powershell
Get-FileHash -Algorithm SHA256 "${path.basename(zipPath)}"
\`\`\`

### On macOS/Linux:
\`\`\`bash
shasum -a 256 "${path.basename(zipPath)}"
\`\`\`

The output should match the SHA256 hash above.
`;
    
    const checksumPath = zipPath.replace('.zip', '.checksums.txt');
    await fs.writeFile(checksumPath, checksumContent);
    
    console.log('Checksums generated');
    console.log(`SHA256: ${sha256}`);
    
  } catch (error) {
    console.warn('Failed to generate checksums:', error.message);
  }
}

async function createReleaseNotes(version, zipPath) {
  console.log('Creating release notes...');
  
  // Release notes/comment block removed as per user request; only code remains in scripts.
}

async function main() {
  console.log('Starting Chrome Extension packaging...\n');
  
  const startTime = Date.now();
  
  try {
    // Check if build directory exists
    try {
      await fs.access(BUILD_DIR);
    } catch (error) {
      console.error('Build directory not found. Run "npm run build" first.');
      process.exit(1);
    }
    
    const version = await getVersion();
    console.log(`Packaging version: ${version}`);
    
    const zipPath = await createZipFile(version);
    await validateZip(zipPath);
    await generateChecksums(zipPath);
    await createReleaseNotes(version, zipPath);
    
    const packageTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nPackaging completed successfully in ${packageTime}s!`);
    console.log(`Package location: ${path.resolve(zipPath)}`);
    
  } catch (error) {
    console.error('\nPackaging failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
