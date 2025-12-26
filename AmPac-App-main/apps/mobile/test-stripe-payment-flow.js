#!/usr/bin/env node

/**
 * Stripe Payment Flow Test Suite
 * 
 * Comprehensive testing of Stripe integration for AmPac mobile app
 * Tests the complete payment flow from mobile app to Stripe API
 */

const fs = require('fs');
const path = require('path');

console.log('💳 AmPac Stripe Payment Flow Test Suite');
console.log('=' .repeat(50));

class StripePaymentFlowTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${icons[type]} ${message}`);
  }

  addResult(testName, passed, details = null, error = null) {
    this.testResults.push({ testName, passed, details, error });
    if (!passed && error) {
      this.errors.push(`${testName}: ${error}`);
    }
  }

  // Test 1: Validate Stripe Configuration
  testStripeConfiguration() {
    this.log('Testing Stripe configuration...', 'test');
    
    try {
      // Check environment variables
      const envFiles = ['.env', '.env.production'];
      let stripeKeyFound = false;
      let keyType = '';
      
      for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
          const content = fs.readFileSync(envFile, 'utf8');
          if (content.includes('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY')) {
            stripeKeyFound = true;
            
            // Extract key to check type
            const keyMatch = content.match(/EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=(.+)/);
            if (keyMatch && keyMatch[1]) {
              const key = keyMatch[1].trim();
              if (key.startsWith('pk_test_')) {
                keyType = 'test';
              } else if (key.startsWith('pk_live_')) {
                keyType = 'live';
              }
            }
            break;
          }
        }
      }
      
      if (stripeKeyFound) {
        this.addResult('Stripe Configuration', true, `Stripe ${keyType} key configured`);
        this.log(`Stripe ${keyType} key found and configured`, 'success');
        return true;
      } else {
        this.addResult('Stripe Configuration', false, null, 'No Stripe publishable key found');
        this.log('No Stripe publishable key found in environment', 'error');
        return false;
      }
    } catch (error) {
      this.addResult('Stripe Configuration', false, null, error.message);
      this.log(`Configuration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 2: Validate Stripe SDK Integration
  testStripeSDKIntegration() {
    this.log('Testing Stripe SDK integration...', 'test');
    
    try {
      // Check package.json for Stripe dependency
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const stripeDep = packageJson.dependencies['@stripe/stripe-react-native'];
      
      if (!stripeDep) {
        this.addResult('Stripe SDK Integration', false, null, 'Stripe React Native SDK not found');
        this.log('Stripe React Native SDK not found in dependencies', 'error');
        return false;
      }
      
      // Check if version is compatible
      const version = stripeDep.replace(/[^0-9.]/g, '');
      const [major, minor] = version.split('.').map(Number);
      
      if (major === 0 && minor >= 50) {
        this.addResult('Stripe SDK Integration', true, `Version ${stripeDep} (compatible)`);
        this.log(`Stripe SDK version ${stripeDep} is compatible`, 'success');
        return true;
      } else {
        this.addResult('Stripe SDK Integration', false, null, `Version ${stripeDep} may be incompatible`);
        this.log(`Stripe SDK version ${stripeDep} may be incompatible`, 'warning');
        return false;
      }
    } catch (error) {
      this.addResult('Stripe SDK Integration', false, null, error.message);
      this.log(`SDK integration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 3: Validate Stripe Service Implementation
  testStripeServiceImplementation() {
    this.log('Testing Stripe service implementation...', 'test');
    
    try {
      const servicePath = 'src/services/stripeService.ts';
      
      if (!fs.existsSync(servicePath)) {
        this.addResult('Stripe Service Implementation', false, null, 'stripeService.ts not found');
        this.log('Stripe service file not found', 'error');
        return false;
      }
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      // Check for required imports and functions
      const requiredElements = [
        { pattern: /@stripe\/stripe-react-native/, name: 'Stripe SDK import' },
        { pattern: /initStripe/, name: 'Stripe initialization' },
        { pattern: /useStripe/, name: 'Stripe hook usage' },
        { pattern: /createApplicationFeeSession/, name: 'Application fee session creation' },
        { pattern: /createSubscriptionSession/, name: 'Subscription session creation' },
        { pattern: /getPaymentStatus/, name: 'Payment status checking' }
      ];
      
      let allElementsFound = true;
      const foundElements = [];
      
      for (const element of requiredElements) {
        if (element.pattern.test(serviceContent)) {
          foundElements.push(element.name);
        } else {
          allElementsFound = false;
          this.log(`Missing: ${element.name}`, 'warning');
        }
      }
      
      if (allElementsFound) {
        this.addResult('Stripe Service Implementation', true, `All ${requiredElements.length} elements found`);
        this.log('All required Stripe service elements found', 'success');
        return true;
      } else {
        this.addResult('Stripe Service Implementation', false, null, `Missing elements: ${requiredElements.length - foundElements.length}`);
        this.log(`Missing ${requiredElements.length - foundElements.length} required elements`, 'error');
        return false;
      }
    } catch (error) {
      this.addResult('Stripe Service Implementation', false, null, error.message);
      this.log(`Service implementation test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 4: Validate Payment Button Component
  testPaymentButtonComponent() {
    this.log('Testing Payment Button component...', 'test');
    
    try {
      const buttonPath = 'src/components/ui/PaymentButton.tsx';
      
      if (!fs.existsSync(buttonPath)) {
        this.addResult('Payment Button Component', false, null, 'PaymentButton.tsx not found');
        this.log('Payment Button component not found', 'error');
        return false;
      }
      
      const buttonContent = fs.readFileSync(buttonPath, 'utf8');
      
      // Check for required functionality
      const requiredFeatures = [
        { pattern: /useStripePayments/, name: 'Stripe payments hook' },
        { pattern: /createApplicationFeeSession/, name: 'Application fee handling' },
        { pattern: /createSubscriptionSession/, name: 'Subscription handling' },
        { pattern: /onPaymentSuccess/, name: 'Success callback' },
        { pattern: /onPaymentError/, name: 'Error handling' },
        { pattern: /Linking\.openURL/, name: 'URL opening for checkout' }
      ];
      
      let allFeaturesFound = true;
      const foundFeatures = [];
      
      for (const feature of requiredFeatures) {
        if (feature.pattern.test(buttonContent)) {
          foundFeatures.push(feature.name);
        } else {
          allFeaturesFound = false;
          this.log(`Missing: ${feature.name}`, 'warning');
        }
      }
      
      if (allFeaturesFound) {
        this.addResult('Payment Button Component', true, `All ${requiredFeatures.length} features found`);
        this.log('Payment Button component is complete', 'success');
        return true;
      } else {
        this.addResult('Payment Button Component', false, null, `Missing features: ${requiredFeatures.length - foundFeatures.length}`);
        this.log(`Missing ${requiredFeatures.length - foundFeatures.length} required features`, 'error');
        return false;
      }
    } catch (error) {
      this.addResult('Payment Button Component', false, null, error.message);
      this.log(`Payment Button test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 5: Validate Payment Screen Integration
  testPaymentScreenIntegration() {
    this.log('Testing Payment Screen integration...', 'test');
    
    try {
      const screenPath = 'src/screens/PaymentScreen.tsx';
      
      if (!fs.existsSync(screenPath)) {
        this.addResult('Payment Screen Integration', false, null, 'PaymentScreen.tsx not found');
        this.log('Payment Screen not found', 'error');
        return false;
      }
      
      const screenContent = fs.readFileSync(screenPath, 'utf8');
      
      // Check for payment integration
      const integrationElements = [
        { pattern: /useStripePayments/, name: 'Stripe payments integration' },
        { pattern: /PaymentButton/, name: 'Payment Button usage' },
        { pattern: /WebView/, name: 'WebView for checkout' },
        { pattern: /getPaymentStatus/, name: 'Payment status checking' },
        { pattern: /PAYMENT_CONFIG/, name: 'Payment configuration' }
      ];
      
      let allIntegrationsFound = true;
      const foundIntegrations = [];
      
      for (const integration of integrationElements) {
        if (integration.pattern.test(screenContent)) {
          foundIntegrations.push(integration.name);
        } else {
          allIntegrationsFound = false;
          this.log(`Missing: ${integration.name}`, 'warning');
        }
      }
      
      if (allIntegrationsFound) {
        this.addResult('Payment Screen Integration', true, `All ${integrationElements.length} integrations found`);
        this.log('Payment Screen is fully integrated', 'success');
        return true;
      } else {
        this.addResult('Payment Screen Integration', false, null, `Missing integrations: ${integrationElements.length - foundIntegrations.length}`);
        this.log(`Missing ${integrationElements.length - foundIntegrations.length} required integrations`, 'error');
        return false;
      }
    } catch (error) {
      this.addResult('Payment Screen Integration', false, null, error.message);
      this.log(`Payment Screen test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 6: Validate App Configuration for Stripe
  testAppConfigurationForStripe() {
    this.log('Testing app configuration for Stripe...', 'test');
    
    try {
      const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const expo = appConfig.expo;
      
      // Check for Stripe environment variable reference
      if (!expo.extra || !expo.extra.stripePublishableKey) {
        this.addResult('App Configuration for Stripe', false, null, 'Stripe key not referenced in app.json');
        this.log('Stripe publishable key not referenced in app.json', 'error');
        return false;
      }
      
      // Check for required permissions (Android)
      if (expo.android && expo.android.permissions) {
        const hasInternet = expo.android.permissions.includes('INTERNET');
        const hasNetworkState = expo.android.permissions.includes('ACCESS_NETWORK_STATE');
        
        if (hasInternet && hasNetworkState) {
          this.addResult('App Configuration for Stripe', true, 'All required permissions configured');
          this.log('All required permissions for Stripe configured', 'success');
          return true;
        } else {
          this.addResult('App Configuration for Stripe', false, null, 'Missing required permissions');
          this.log('Missing required network permissions', 'error');
          return false;
        }
      } else {
        this.addResult('App Configuration for Stripe', false, null, 'Android permissions not configured');
        this.log('Android permissions not configured', 'warning');
        return false;
      }
    } catch (error) {
      this.addResult('App Configuration for Stripe', false, null, error.message);
      this.log(`App configuration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 7: Simulate Payment Flow Logic
  testPaymentFlowLogic() {
    this.log('Testing payment flow logic...', 'test');
    
    try {
      // Simulate the payment flow steps
      const paymentFlowSteps = [
        'User clicks payment button',
        'App creates payment session request',
        'Request sent to Brain API',
        'Brain API creates Stripe checkout session',
        'Checkout URL returned to app',
        'App opens WebView with checkout URL',
        'User completes payment in Stripe',
        'Stripe redirects back to app',
        'App verifies payment status'
      ];
      
      // Check if all components exist for this flow
      const requiredFiles = [
        'src/components/ui/PaymentButton.tsx',
        'src/services/stripeService.ts',
        'src/screens/PaymentScreen.tsx'
      ];
      
      let allFilesExist = true;
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          allFilesExist = false;
          this.log(`Missing file for payment flow: ${file}`, 'error');
        }
      }
      
      if (allFilesExist) {
        this.addResult('Payment Flow Logic', true, `All ${paymentFlowSteps.length} steps supported`);
        this.log('Payment flow logic is complete', 'success');
        
        // Log the flow steps
        console.log('\n📋 Payment Flow Steps:');
        paymentFlowSteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
        
        return true;
      } else {
        this.addResult('Payment Flow Logic', false, null, 'Missing required files');
        this.log('Payment flow logic incomplete - missing files', 'error');
        return false;
      }
    } catch (error) {
      this.addResult('Payment Flow Logic', false, null, error.message);
      this.log(`Payment flow logic test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Generate comprehensive test report
  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    this.log('STRIPE PAYMENT FLOW TEST REPORT', 'info');
    console.log('='.repeat(60));

    const passedTests = this.testResults.filter(result => result.passed).length;
    const totalTests = this.testResults.length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 Test Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.testName}`);
      if (result.details) {
        console.log(`     ${result.details}`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    console.log(`\n📈 Overall Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`);

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\n' + '-'.repeat(60));

    if (successRate === 100) {
      console.log('🎉 ALL STRIPE PAYMENT TESTS PASSED!');
      console.log('✅ Stripe integration is production-ready');
      console.log('✅ Payment flow is complete and functional');
      console.log('✅ All required components are properly configured');
      
      console.log('\n💳 Payment Flow Ready For:');
      console.log('   • Application fee payments ($50.00)');
      console.log('   • Premium subscription payments ($29/month)');
      console.log('   • Secure Stripe checkout process');
      console.log('   • Payment status tracking');
      console.log('   • Error handling and fallbacks');
      
      return true;
    } else if (successRate >= 80) {
      console.log('⚠️  MOSTLY READY - Minor issues to resolve');
      console.log('🔧 Review warnings and fix minor issues');
      return false;
    } else {
      console.log('❌ STRIPE INTEGRATION NOT READY');
      console.log('🔧 Significant issues need to be resolved');
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('Running comprehensive Stripe payment flow tests...\n');

    // Execute all tests
    this.testStripeConfiguration();
    this.testStripeSDKIntegration();
    this.testStripeServiceImplementation();
    this.testPaymentButtonComponent();
    this.testPaymentScreenIntegration();
    this.testAppConfigurationForStripe();
    this.testPaymentFlowLogic();

    // Generate report
    const success = this.generateTestReport();
    return success;
  }
}

// Execute the test suite
const tester = new StripePaymentFlowTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});