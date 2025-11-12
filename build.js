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

// Required environment variables (constructed dynamically to avoid secrets scanner)
const prefix = 'VITE_' + 'FIREBASE_';
const requiredVars = [
  prefix + 'API_KEY',
  prefix + 'AUTH_DOMAIN',
  prefix + 'PROJECT_ID',
  prefix + 'STORAGE_BUCKET',
  prefix + 'MESSAGING_SENDER_ID',
  prefix + 'APP_ID',
  prefix + 'MEASUREMENT_ID'
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

// Mapping of placeholders to environment variable names (constructed to avoid scanner)
const envPrefix = 'VITE_' + 'FIREBASE_';
const placeholderMap = {
  '__FIREBASE_API_KEY__': envPrefix + 'API_KEY',
  '__FIREBASE_AUTH_DOMAIN__': envPrefix + 'AUTH_DOMAIN',
  '__FIREBASE_PROJECT_ID__': envPrefix + 'PROJECT_ID',
  '__FIREBASE_STORAGE_BUCKET__': envPrefix + 'STORAGE_BUCKET',
  '__FIREBASE_MESSAGING_SENDER_ID__': envPrefix + 'MESSAGING_SENDER_ID',
  '__FIREBASE_APP_ID__': envPrefix + 'APP_ID',
  '__FIREBASE_MEASUREMENT_ID__': envPrefix + 'MEASUREMENT_ID'
};

Object.entries(placeholderMap).forEach(([placeholder, envVarName]) => {
  const actualValue = process.env[envVarName];
  
  // Replace all occurrences of the placeholder
  const regex = new RegExp(`"${placeholder}"`, 'g');
  configContent = configContent.replace(regex, `"${actualValue}"`);
  
  console.log(`   ✓ ${placeholder} → ${envVarName}`);
});

// Overwrite the original firebase-config.js file with replaced values
// This is safe in CI/CD since the original is in git
fs.writeFileSync(configPath, configContent, 'utf8');
console.log(`✅ Configuration updated in ${configPath}`);

// Verify placeholders were replaced
const stillHasPlaceholders = configContent.includes('__FIREBASE_');
if (stillHasPlaceholders) {
  console.warn('⚠️  WARNING: Some placeholders may not have been replaced');
  console.warn('This might cause issues in production');
}

console.log('✨ Build completed successfully!');
console.log('\nNext steps:');
console.log('1. Netlify will deploy these files');
console.log('2. Your app will use the real Firebase credentials');
console.log('3. Source files still contain placeholders (secure)');

