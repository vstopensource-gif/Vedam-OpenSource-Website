#!/usr/bin/env node

/**
 * Build script for CI/CD (Netlify) deployment
 * 
 * This script:
 * 1. Validates all required environment variables are set
 * 2. Replaces placeholders in firebase-config.js with actual values
 * 3. ONLY runs in CI/CD environments (not locally)
 * 
 * DO NOT RUN THIS LOCALLY!
 * Use `npm run dev` for local development instead.
 */

const fs = require('fs');
const path = require('path');

// Detect if running in CI/CD environment
const isCI = process.env.CI === 'true' || process.env.NETLIFY === 'true' || process.env.VERCEL === '1';

console.log('🔧 Build Script Starting...');
console.log(`Environment: ${isCI ? 'CI/CD' : 'LOCAL'}`);

// Prevent running locally
if (!isCI) {
  console.error('❌ ERROR: This build script should ONLY run in CI/CD!');
  console.error('For local development, use: npm run dev');
  process.exit(1);
}

// Required environment variables
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

// Validate all required environment variables exist
console.log('🔍 Validating environment variables...');
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these in your Netlify Dashboard:');
  console.error('Site Settings → Build & Deploy → Environment Variables');
  process.exit(1);
}

console.log('✅ All required environment variables found');

// Read firebase-config.js
const configPath = path.join(__dirname, 'firebase-config.js');
console.log(`📄 Reading ${configPath}...`);

if (!fs.existsSync(configPath)) {
  console.error(`❌ ERROR: firebase-config.js not found at ${configPath}`);
  process.exit(1);
}

let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with actual environment variable values
console.log('🔄 Replacing placeholders with environment variables...');
requiredVars.forEach(varName => {
  const placeholder = varName;
  const actualValue = process.env[varName];
  
  // Replace all occurrences of the placeholder
  const regex = new RegExp(`"${placeholder}"`, 'g');
  configContent = configContent.replace(regex, `"${actualValue}"`);
  
  console.log(`   ✓ ${varName}`);
});

// Write the built config (this file will be gitignored)
const builtConfigPath = path.join(__dirname, 'firebase-config.built.js');
fs.writeFileSync(builtConfigPath, configContent, 'utf8');
console.log(`✅ Built configuration written to ${builtConfigPath}`);

// Verify placeholders were replaced
const stillHasPlaceholders = configContent.includes('VITE_FIREBASE_');
if (stillHasPlaceholders) {
  console.warn('⚠️  WARNING: Some placeholders may not have been replaced');
  console.warn('This might cause issues in production');
}

console.log('✨ Build completed successfully!');
console.log('\nNext steps:');
console.log('1. Netlify will deploy these files');
console.log('2. Your app will use the real Firebase credentials');
console.log('3. Source files still contain placeholders (secure)');

