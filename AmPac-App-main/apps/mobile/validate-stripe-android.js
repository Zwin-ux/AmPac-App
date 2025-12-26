#!/usr/bin/env node

/**
 * Stripe Android Configuration Validator
 * 
 * This script validates that Stripe is properly configured for Android builds
 * by checking SDK version compatibility, configuration, and integration setup.
 */

const fs = require('fs');
const path = require('path');

console.log('💳 Stripe Android Configuration Validator\n');

// Check Stripe SDK version compatibility
function validateStripeSDKVersion() {
  console.log('📦 Validating Stripe SDK version...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    // Check Stripe React Native SDK
    if (!dependencies['@stripe/stripe-react-native']) {
      console.error('❌ @stripe/stripe-react-native not found in dependencies');
      return false;
    }
    
    const stripeVersion = dependencies['@stripe/stripe-react-native'];
    console.log(`✅ Stripe React Native SDK version: ${stripeVersion}`);
    
    // Check if version is compatible with React Native 0.81.5
    // Version 0.50.3 is compatible with RN 0.81.5
    const versionNumber = stripeVersion.replace(/[^0-9.]/g, '');
    const [major, minor] = versionNumber.split('.').map(Number);
    
    if (major === 0 && minor >= 50) {
      console.log('✅ Stripe SDK version is compatible with React Native 0.81.5');
    } else {
      console.log('⚠️  Stripe SDK version may have compatibility issues with React Native 0.81.5');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Invalid package.json format:', error.message);
    return false;
  }
}

// Check React Native version compatibility
function validateReactNativeCompatibility() {
  console.log('\n⚛️  Validating React Native compatibility...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    const reactNativeVersion = dependencies['react-native'];
    const stripeVersion = dependencies['@stripe/stripe-react-native'];
    
    if (!reactNativeVersion) {
      console.error('❌ React Native not found in dependencies');
      return false;
    }
    
    console.log(`📱 React Native version: ${reactNativeVersion}`);
    console.log(`💳 Stripe SDK version: ${stripeVersion}`);
    
    // Check compatibility matrix
    const rnVersion = reactNativeVersion.replace(/[^0-9.]/g, '');
    if (rnVersion.startsWith('0.81')) {
      console.log('✅ React Native 0.81.x is compatible with Stripe SDK 0.50.x');
    } else {
      console.log('⚠️  React Native version compatibility should be verified');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking React Native compatibility:', error.message);
    return false;
  }
}

// Check Stripe configuration
function validateStripeConfiguration() {
  console.log('\n🔧 Validating Stripe configuration...');
  
  // Check environment variables
  const envFiles = ['.env', '.env.production'];
  let hasStripeConfig = false;
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY')) {
        console.log(`✅ Stripe publishable key found in ${envFile}`);
        hasStripeConfig = true;
        
        // Check if it's a test key (should start with pk_test_)
        const keyMatch = envContent.match(/EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=(.+)/);
        if (keyMatch && keyMatch[1]) {
          const key = keyMatch[1].trim();
          if (key.startsWith('pk_test_')) {
            console.log('📝 Using Stripe test key (recommended for development)');
          } else if (key.startsWith('pk_live_')) {
            console.log('🚨 Using Stripe live key (ensure this is intentional)');
          } else {
            console.log('⚠️  Stripe key format not recognized');
          }
        }
      }
    }
  }
  
  if (!hasStripeConfig) {
    console.error('❌ No Stripe configuration found in environment files');
    return false;
  }
  
  // Check app.json configuration
  const appJsonPath = path.join(__dirname, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // Check if Stripe environment variable is referenced
      if (appJson.expo?.extra && 'stripePublishableKey' in appJson.expo.extra) {
        console.log('✅ Stripe configuration referenced in app.json');
      } else {
        console.log('⚠️  Stripe configuration not found in app.json extra config');
      }
      
    } catch (error) {
      console.log('⚠️  Could not parse app.json');
    }
  }
  
  return true;
}

// Check Stripe service implementation
function validateStripeServiceImplementation() {
  console.log('\n🛠️  Validating Stripe service implementation...');
  
  const stripeServicePath = path.join(__dirname, 'src/services/stripeService.ts');
  
  if (!fs.existsSync(stripeServicePath)) {
    console.error('❌ stripeService.ts not found');
    return false;
  }
  
  try {
    const serviceContent = fs.readFileSync(stripeServicePath, 'utf8');
    
    // Check for proper imports
    if (serviceContent.includes('@stripe/stripe-react-native')) {
      console.log('✅ Stripe React Native SDK properly imported');
    } else {
      console.error('❌ Stripe React Native SDK import not found');
      return false;
    }
    
    // Check for initStripe call
    if (serviceContent.includes('initStripe')) {
      console.log('✅ Stripe initialization found');
    } else {
      console.error('❌ Stripe initialization not found');
      return false;
    }
    
    // Check for Android-specific configurations
    if (serviceContent.includes('merchantIdentifier')) {
      console.log('✅ Merchant identifier configured (for Apple Pay)');
    }
    
    // Check for proper error handling
    if (serviceContent.includes('try') && serviceContent.includes('catch')) {
      console.log('✅ Error handling implemented');
    } else {
      console.log('⚠️  Consider adding error handling to Stripe service');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error reading Stripe service:', error.message);
    return false;
  }
}

// Check Android-specific Stripe requirements
function validateAndroidSpecificRequirements() {
  console.log('\n🤖 Validating Android-specific requirements...');
  
  // Check if WebView is available for Stripe Checkout
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    if (dependencies['react-native-webview']) {
      console.log('✅ react-native-webview available for Stripe Checkout');
    } else {
      console.log('⚠️  react-native-webview not found (may be needed for Stripe Checkout)');
    }
    
    // Check app.json for Android permissions
    const appJsonPath = path.join(__dirname, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      if (appJson.expo?.android?.permissions) {
        const permissions = appJson.expo.android.permissions;
        
        if (permissions.includes('INTERNET')) {
          console.log('✅ INTERNET permission configured for Android');
        } else {
          console.log('⚠️  INTERNET permission not explicitly configured');
        }
        
        if (permissions.includes('ACCESS_NETWORK_STATE')) {
          console.log('✅ ACCESS_NETWORK_STATE permission configured for Android');
        } else {
          console.log('⚠️  ACCESS_NETWORK_STATE permission not explicitly configured');
        }
      } else {
        console.log('⚠️  Android permissions not configured in app.json');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking Android requirements:', error.message);
    return false;
  }
}

// Test Stripe service initialization
function testStripeServiceInitialization() {
  console.log('\n🧪 Testing Stripe service initialization...');
  
  try {
    // This is a basic syntax check - actual initialization would require React Native environment
    const stripeServicePath = path.join(__dirname, 'src/services/stripeService.ts');
    
    if (fs.existsSync(stripeServicePath)) {
      const serviceContent = fs.readFileSync(stripeServicePath, 'utf8');
      
      // Check for common syntax issues
      const syntaxChecks = [
        { pattern: /import.*@stripe\/stripe-react-native/, message: 'Stripe import syntax' },
        { pattern: /initStripe\s*\(/, message: 'initStripe function call' },
        { pattern: /publishableKey/, message: 'publishableKey configuration' },
        { pattern: /export.*StripeService/, message: 'Service export' }
      ];
      
      let allChecksPass = true;
      
      for (const check of syntaxChecks) {
        if (check.pattern.test(serviceContent)) {
          console.log(`✅ ${check.message} - OK`);
        } else {
          console.log(`⚠️  ${check.message} - Not found or incorrect syntax`);
          allChecksPass = false;
        }
      }
      
      return allChecksPass;
    } else {
      console.error('❌ Stripe service file not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing Stripe service:', error.message);
    return false;
  }
}

// Main validation function
function main() {
  const validations = [
    validateStripeSDKVersion,
    validateReactNativeCompatibility,
    validateStripeConfiguration,
    validateStripeServiceImplementation,
    validateAndroidSpecificRequirements,
    testStripeServiceInitialization
  ];
  
  let allValid = true;
  
  for (const validation of validations) {
    if (!validation()) {
      allValid = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('🎉 All Stripe Android configurations are valid!');
    console.log('✅ Ready for Android build with Stripe integration');
    console.log('\n📋 Next steps:');
    console.log('   1. Test payment flow in Android emulator/device');
    console.log('   2. Verify Stripe webhooks are configured');
    console.log('   3. Test both test and live payment modes');
  } else {
    console.log('❌ Stripe Android configuration has issues');
    console.log('🔧 Please fix the issues above before building for Android');
    console.log('\n💡 Common fixes:');
    console.log('   - Update Stripe SDK to compatible version');
    console.log('   - Add required Android permissions');
    console.log('   - Configure environment variables properly');
    process.exit(1);
  }
}

// Run validation
main();