#!/usr/bin/env node

/**
 * Firebase Android Configuration Validator
 * 
 * This script validates that Firebase is properly configured for Android builds
 * by checking configuration files, environment variables, and dependencies.
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Android Configuration Validator\n');

// Check if google-services.json exists and is valid
function validateGoogleServicesJson() {
  console.log('📱 Validating google-services.json...');
  
  const googleServicesPath = path.join(__dirname, 'google-services.json');
  
  if (!fs.existsSync(googleServicesPath)) {
    console.error('❌ google-services.json not found');
    return false;
  }
  
  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    
    // Validate required fields
    const requiredFields = [
      'project_info.project_id',
      'project_info.project_number',
      'client[0].client_info.mobilesdk_app_id',
      'client[0].client_info.android_client_info.package_name'
    ];
    
    for (const field of requiredFields) {
      const value = field.split('.').reduce((obj, key) => {
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.split('[')[0];
          const index = parseInt(key.split('[')[1].split(']')[0]);
          return obj?.[arrayKey]?.[index];
        }
        return obj?.[key];
      }, googleServices);
      
      if (!value) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate package name matches app.json
    const appJsonPath = path.join(__dirname, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const appPackageName = appJson.expo?.android?.package;
      const firebasePackageName = googleServices.client[0].client_info.android_client_info.package_name;
      
      if (appPackageName !== firebasePackageName) {
        console.error(`❌ Package name mismatch:`);
        console.error(`   app.json: ${appPackageName}`);
        console.error(`   google-services.json: ${firebasePackageName}`);
        return false;
      }
    }
    
    console.log('✅ google-services.json is valid');
    console.log(`   Project ID: ${googleServices.project_info.project_id}`);
    console.log(`   Package Name: ${googleServices.client[0].client_info.android_client_info.package_name}`);
    return true;
    
  } catch (error) {
    console.error('❌ Invalid google-services.json format:', error.message);
    return false;
  }
}

// Check app.json Firebase configuration
function validateAppJsonConfig() {
  console.log('\n📋 Validating app.json Firebase configuration...');
  
  const appJsonPath = path.join(__dirname, 'app.json');
  
  if (!fs.existsSync(appJsonPath)) {
    console.error('❌ app.json not found');
    return false;
  }
  
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const expo = appJson.expo;
    
    // Check Android configuration
    if (!expo.android) {
      console.error('❌ Missing android configuration in app.json');
      return false;
    }
    
    if (!expo.android.package) {
      console.error('❌ Missing android.package in app.json');
      return false;
    }
    
    // Check if googleServicesFile is specified
    if (!expo.android.googleServicesFile) {
      console.log('⚠️  googleServicesFile not specified in app.json (will use default location)');
    } else {
      console.log(`✅ googleServicesFile specified: ${expo.android.googleServicesFile}`);
    }
    
    // Check Firebase environment variables in extra
    const requiredEnvVars = [
      'firebaseApiKey',
      'firebaseAuthDomain', 
      'firebaseProjectId',
      'firebaseStorageBucket',
      'firebaseMessagingSenderId',
      'firebaseAppId'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!expo.extra?.[envVar]) {
        console.error(`❌ Missing Firebase environment variable: ${envVar}`);
        return false;
      }
    }
    
    console.log('✅ app.json Firebase configuration is valid');
    return true;
    
  } catch (error) {
    console.error('❌ Invalid app.json format:', error.message);
    return false;
  }
}

// Check package.json Firebase dependencies
function validateFirebaseDependencies() {
  console.log('\n📦 Validating Firebase dependencies...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    // Check Firebase SDK version
    if (!dependencies.firebase) {
      console.error('❌ Firebase SDK not found in dependencies');
      return false;
    }
    
    const firebaseVersion = dependencies.firebase;
    console.log(`✅ Firebase SDK version: ${firebaseVersion}`);
    
    // Check if version is compatible (v12.6.0 as specified in tech.md)
    if (!firebaseVersion.includes('12.6.0')) {
      console.log(`⚠️  Firebase version ${firebaseVersion} may not match recommended v12.6.0`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Invalid package.json format:', error.message);
    return false;
  }
}

// Check environment variables
function validateEnvironmentVariables() {
  console.log('\n🌍 Validating environment variables...');
  
  const envFiles = ['.env', '.env.production'];
  let hasValidEnv = false;
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    
    if (fs.existsSync(envPath)) {
      console.log(`📄 Found ${envFile}`);
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const requiredVars = [
        'EXPO_PUBLIC_FIREBASE_API_KEY',
        'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'EXPO_PUBLIC_FIREBASE_APP_ID'
      ];
      
      let allVarsPresent = true;
      for (const varName of requiredVars) {
        if (!envContent.includes(varName)) {
          console.error(`❌ Missing environment variable: ${varName}`);
          allVarsPresent = false;
        }
      }
      
      if (allVarsPresent) {
        console.log(`✅ All Firebase environment variables present in ${envFile}`);
        hasValidEnv = true;
      }
    }
  }
  
  if (!hasValidEnv) {
    console.error('❌ No valid environment file found with Firebase configuration');
    return false;
  }
  
  return true;
}

// Main validation function
function main() {
  const validations = [
    validateGoogleServicesJson,
    validateAppJsonConfig,
    validateFirebaseDependencies,
    validateEnvironmentVariables
  ];
  
  let allValid = true;
  
  for (const validation of validations) {
    if (!validation()) {
      allValid = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('🎉 All Firebase Android configurations are valid!');
    console.log('✅ Ready for Android build with Firebase integration');
  } else {
    console.log('❌ Firebase Android configuration has issues');
    console.log('🔧 Please fix the issues above before building for Android');
    process.exit(1);
  }
}

// Run validation
main();