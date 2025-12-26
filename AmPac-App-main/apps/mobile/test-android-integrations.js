#!/usr/bin/env node

/**
 * Android Integrations Test Suite
 * 
 * This script tests Firebase and Stripe integrations for Android compatibility
 * by running both validation scripts and performing additional integration checks.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🤖 Android Integrations Test Suite\n');
console.log('Testing Firebase and Stripe integrations for Android compatibility...\n');

// Test Firebase configuration
function testFirebaseIntegration() {
  console.log('🔥 Testing Firebase Integration...');
  console.log('=' .repeat(40));
  
  try {
    const result = execSync('node validate-firebase-android.js', { 
      encoding: 'utf8',
      cwd: __dirname 
    });
    
    if (result.includes('🎉 All Firebase Android configurations are valid!')) {
      console.log('✅ Firebase integration test PASSED\n');
      return true;
    } else {
      console.log('❌ Firebase integration test FAILED\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase integration test ERROR:', error.message);
    return false;
  }
}

// Test Stripe configuration
function testStripeIntegration() {
  console.log('💳 Testing Stripe Integration...');
  console.log('=' .repeat(40));
  
  try {
    const result = execSync('node validate-stripe-android.js', { 
      encoding: 'utf8',
      cwd: __dirname 
    });
    
    if (result.includes('🎉 All Stripe Android configurations are valid!')) {
      console.log('✅ Stripe integration test PASSED\n');
      return true;
    } else {
      console.log('❌ Stripe integration test FAILED\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Stripe integration test ERROR:', error.message);
    return false;
  }
}

// Test EAS build configuration
function testEASBuildConfiguration() {
  console.log('🏗️  Testing EAS Build Configuration...');
  console.log('=' .repeat(40));
  
  const easJsonPath = path.join(__dirname, 'eas.json');
  
  if (!fs.existsSync(easJsonPath)) {
    console.error('❌ eas.json not found');
    return false;
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    
    // Check for Android build profiles
    if (!easConfig.build) {
      console.error('❌ No build configuration found in eas.json');
      return false;
    }
    
    let hasAndroidProfile = false;
    
    for (const [profileName, config] of Object.entries(easConfig.build)) {
      if (config.android || config.platform === 'android' || profileName.includes('android')) {
        console.log(`✅ Found Android build profile: ${profileName}`);
        hasAndroidProfile = true;
        
        // Check Node.js version
        if (config.node) {
          console.log(`   Node.js version: ${config.node}`);
        }
        
        // Check Android-specific settings
        if (config.android) {
          if (config.android.buildType) {
            console.log(`   Build type: ${config.android.buildType}`);
          }
          if (config.android.gradleCommand) {
            console.log(`   Gradle command: ${config.android.gradleCommand}`);
          }
        }
      }
    }
    
    if (!hasAndroidProfile) {
      console.error('❌ No Android build profile found in eas.json');
      return false;
    }
    
    console.log('✅ EAS build configuration test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('❌ EAS build configuration test ERROR:', error.message);
    return false;
  }
}

// Test app.json Android configuration
function testAppJsonAndroidConfig() {
  console.log('📱 Testing app.json Android Configuration...');
  console.log('=' .repeat(40));
  
  const appJsonPath = path.join(__dirname, 'app.json');
  
  if (!fs.existsSync(appJsonPath)) {
    console.error('❌ app.json not found');
    return false;
  }
  
  try {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const expo = appConfig.expo;
    
    if (!expo.android) {
      console.error('❌ No Android configuration found in app.json');
      return false;
    }
    
    // Check required Android fields
    const requiredFields = ['package', 'versionCode'];
    for (const field of requiredFields) {
      if (!expo.android[field]) {
        console.error(`❌ Missing required Android field: ${field}`);
        return false;
      }
      console.log(`✅ ${field}: ${expo.android[field]}`);
    }
    
    // Check Firebase configuration
    if (expo.android.googleServicesFile) {
      console.log(`✅ Google Services file: ${expo.android.googleServicesFile}`);
    }
    
    // Check permissions
    if (expo.android.permissions && expo.android.permissions.length > 0) {
      console.log(`✅ Android permissions configured: ${expo.android.permissions.length} permissions`);
    }
    
    // Check environment variables
    if (expo.extra) {
      const envVars = Object.keys(expo.extra).filter(key => 
        key.includes('firebase') || key.includes('stripe') || key.includes('brain')
      );
      console.log(`✅ Environment variables configured: ${envVars.length} variables`);
    }
    
    console.log('✅ app.json Android configuration test PASSED\n');
    return true;
    
  } catch (error) {
    console.error('❌ app.json Android configuration test ERROR:', error.message);
    return false;
  }
}

// Test package.json dependencies
function testPackageDependencies() {
  console.log('📦 Testing Package Dependencies...');
  console.log('=' .repeat(40));
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    // Critical dependencies for Android builds
    const criticalDeps = {
      'expo': 'Expo SDK',
      'react-native': 'React Native',
      'firebase': 'Firebase SDK',
      '@stripe/stripe-react-native': 'Stripe SDK',
      'react-native-webview': 'WebView (for Stripe)',
      '@react-navigation/native': 'Navigation'
    };
    
    let allDepsPresent = true;
    
    for (const [dep, description] of Object.entries(criticalDeps)) {
      if (dependencies[dep]) {
        console.log(`✅ ${description}: ${dependencies[dep]}`);
      } else {
        console.error(`❌ Missing critical dependency: ${dep} (${description})`);
        allDepsPresent = false;
      }
    }
    
    if (allDepsPresent) {
      console.log('✅ Package dependencies test PASSED\n');
      return true;
    } else {
      console.log('❌ Package dependencies test FAILED\n');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Package dependencies test ERROR:', error.message);
    return false;
  }
}

// Generate test report
function generateTestReport(results) {
  console.log('📊 Test Report');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Firebase Integration', passed: results.firebase },
    { name: 'Stripe Integration', passed: results.stripe },
    { name: 'EAS Build Configuration', passed: results.easBuild },
    { name: 'app.json Android Config', passed: results.appJson },
    { name: 'Package Dependencies', passed: results.dependencies }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (test.passed) passedTests++;
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📈 Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Android build is ready for Firebase and Stripe integrations');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: npx eas build --platform android');
    console.log('   2. Test the generated APK on Android device');
    console.log('   3. Verify Firebase authentication works');
    console.log('   4. Test Stripe payment flow');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('🔧 Please fix the failing tests before proceeding with Android build');
    return false;
  }
}

// Main test function
function main() {
  console.log('Starting comprehensive Android integrations test...\n');
  
  const results = {
    firebase: testFirebaseIntegration(),
    stripe: testStripeIntegration(),
    easBuild: testEASBuildConfiguration(),
    appJson: testAppJsonAndroidConfig(),
    dependencies: testPackageDependencies()
  };
  
  const allTestsPassed = generateTestReport(results);
  
  if (!allTestsPassed) {
    process.exit(1);
  }
}

// Run tests
main();