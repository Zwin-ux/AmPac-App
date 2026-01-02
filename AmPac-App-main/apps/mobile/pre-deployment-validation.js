#!/usr/bin/env node

/**
 * Pre-Deployment Validation Suite
 * 
 * Comprehensive validation of all systems before production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Pre-Deployment Validation Suite');
console.log('=' .repeat(50));

class PreDeploymentValidator {
  constructor() {
    this.validations = [];
    this.errors = [];
    this.warnings = [];
  }

  addValidation(name, fn) {
    this.validations.push({ name, fn });
  }

  async runValidation(name, fn) {
    try {
      console.log(`\n🔄 ${name}...`);
      const result = await fn();
      if (result.success) {
        console.log(`✅ ${name} - PASSED`);
        if (result.details) {
          result.details.forEach(detail => console.log(`   ${detail}`));
        }
        return true;
      } else {
        console.log(`❌ ${name} - FAILED`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
          this.errors.push(`${name}: ${result.error}`);
        }
        return false;
      }
    } catch (error) {
      console.log(`❌ ${name} - ERROR: ${error.message}`);
      this.errors.push(`${name}: ${error.message}`);
      return false;
    }
  }

  // Validation: Environment Configuration
  validateEnvironmentConfig() {
    return new Promise((resolve) => {
      const envFiles = ['.env', '.env.production'];
      // Brain API removed for v1 launch - Firebase only
      const requiredVars = [
        'EXPO_PUBLIC_FIREBASE_API_KEY',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
      ];

      let foundEnvFile = false;
      let missingVars = [];

      for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
          foundEnvFile = true;
          const content = fs.readFileSync(envFile, 'utf8');
          
          for (const varName of requiredVars) {
            if (!content.includes(varName)) {
              missingVars.push(varName);
            }
          }
          break;
        }
      }

      if (!foundEnvFile) {
        resolve({ success: false, error: 'No environment file found' });
      } else if (missingVars.length > 0) {
        resolve({ success: false, error: `Missing variables: ${missingVars.join(', ')}` });
      } else {
        resolve({ 
          success: true, 
          details: [`All ${requiredVars.length} required environment variables present`]
        });
      }
    });
  }

  // Validation: Package Dependencies
  validatePackageDependencies() {
    return new Promise((resolve) => {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = packageJson.dependencies || {};
        
        const criticalDeps = {
          'expo': '~54.0.30',
          'react-native': '0.81.5',
          'firebase': '^12.6.0',
          '@stripe/stripe-react-native': '0.50.3'
        };

        const issues = [];
        const details = [];

        for (const [dep, expectedVersion] of Object.entries(criticalDeps)) {
          if (!deps[dep]) {
            issues.push(`Missing: ${dep}`);
          } else {
            details.push(`${dep}: ${deps[dep]} (expected: ${expectedVersion})`);
            if (deps[dep] !== expectedVersion && !deps[dep].includes(expectedVersion.replace(/[~^]/, ''))) {
              this.warnings.push(`Version mismatch: ${dep} is ${deps[dep]}, expected ${expectedVersion}`);
            }
          }
        }

        if (issues.length > 0) {
          resolve({ success: false, error: issues.join(', ') });
        } else {
          resolve({ success: true, details });
        }
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  // Validation: Firebase Configuration
  validateFirebaseConfig() {
    return new Promise((resolve) => {
      const requiredFiles = [
        'google-services.json',
        'GoogleService-Info.plist',
        'firestore.rules',
        'firestore.indexes.json'
      ];

      const foundFiles = [];
      const missingFiles = [];

      for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
          foundFiles.push(file);
        } else {
          missingFiles.push(file);
        }
      }

      // Validate google-services.json structure
      if (fs.existsSync('google-services.json')) {
        try {
          const googleServices = JSON.parse(fs.readFileSync('google-services.json', 'utf8'));
          if (!googleServices.project_info || !googleServices.client) {
            resolve({ success: false, error: 'Invalid google-services.json structure' });
            return;
          }
        } catch (error) {
          resolve({ success: false, error: 'Invalid google-services.json format' });
          return;
        }
      }

      if (missingFiles.length > 0) {
        this.warnings.push(`Missing Firebase files: ${missingFiles.join(', ')}`);
      }

      resolve({ 
        success: foundFiles.length >= 2, // At least Android and iOS config
        details: [`Found: ${foundFiles.join(', ')}`]
      });
    });
  }

  // Validation: App Configuration
  validateAppConfig() {
    return new Promise((resolve) => {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        const expo = appJson.expo;

        const issues = [];
        const details = [];

        // Check basic config
        if (!expo.name) issues.push('Missing app name');
        if (!expo.version) issues.push('Missing app version');
        if (!expo.slug) issues.push('Missing app slug');

        // Check platform configs
        if (!expo.ios || !expo.ios.bundleIdentifier) {
          issues.push('Missing iOS bundle identifier');
        } else {
          details.push(`iOS Bundle ID: ${expo.ios.bundleIdentifier}`);
        }

        if (!expo.android || !expo.android.package) {
          issues.push('Missing Android package name');
        } else {
          details.push(`Android Package: ${expo.android.package}`);
        }

        // Check EAS config
        if (!expo.extra || !expo.extra.eas || !expo.extra.eas.projectId) {
          issues.push('Missing EAS project ID');
        } else {
          details.push(`EAS Project ID: ${expo.extra.eas.projectId}`);
        }

        if (issues.length > 0) {
          resolve({ success: false, error: issues.join(', ') });
        } else {
          resolve({ success: true, details });
        }
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  // Validation: EAS Build Configuration
  validateEASConfig() {
    return new Promise((resolve) => {
      if (!fs.existsSync('eas.json')) {
        resolve({ success: false, error: 'eas.json not found' });
        return;
      }

      try {
        const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
        
        if (!easConfig.build) {
          resolve({ success: false, error: 'No build configuration in eas.json' });
          return;
        }

        const profiles = Object.keys(easConfig.build);
        const details = [`Build profiles: ${profiles.join(', ')}`];

        // Check for production profile
        if (!easConfig.build.production) {
          this.warnings.push('No production build profile found');
        } else {
          details.push('Production profile configured');
        }

        resolve({ success: true, details });
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  // Validation: TypeScript Configuration
  validateTypeScriptConfig() {
    return new Promise((resolve) => {
      try {
        // Run TypeScript compiler check
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        resolve({ success: true, details: ['TypeScript compilation successful'] });
      } catch (error) {
        const output = error.stdout ? error.stdout.toString() : error.message;
        resolve({ success: false, error: `TypeScript errors: ${output.substring(0, 200)}...` });
      }
    });
  }

  // Validation: Security Configuration
  validateSecurityConfig() {
    return new Promise((resolve) => {
      const securityChecks = [];
      const issues = [];

      // Check for sensitive data in code
      const sensitivePatterns = [
        /sk_live_[a-zA-Z0-9]+/, // Stripe secret keys
        /AIzaSy[a-zA-Z0-9_-]{33}/, // Google API keys in code
        /firebase.*admin.*sdk.*key/i // Firebase admin keys
      ];

      const codeFiles = this.getAllCodeFiles();
      
      for (const file of codeFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          for (const pattern of sensitivePatterns) {
            if (pattern.test(content)) {
              issues.push(`Potential sensitive data in ${file}`);
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Check environment variable usage
      const appJsonContent = fs.readFileSync('app.json', 'utf8');
      if (appJsonContent.includes('${EXPO_PUBLIC_')) {
        securityChecks.push('Environment variables properly referenced');
      } else {
        issues.push('Environment variables not properly configured');
      }

      if (issues.length > 0) {
        resolve({ success: false, error: issues.join(', ') });
      } else {
        resolve({ success: true, details: securityChecks });
      }
    });
  }

  getAllCodeFiles() {
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    function scanDir(dir) {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDir(fullPath);
          } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    scanDir('src');
    return files.slice(0, 50); // Limit to first 50 files for performance
  }

  // Main validation runner
  async runAllValidations() {
    console.log('Running comprehensive pre-deployment validation...\n');

    this.addValidation('Environment Configuration', () => this.validateEnvironmentConfig());
    this.addValidation('Package Dependencies', () => this.validatePackageDependencies());
    this.addValidation('Firebase Configuration', () => this.validateFirebaseConfig());
    this.addValidation('App Configuration', () => this.validateAppConfig());
    this.addValidation('EAS Build Configuration', () => this.validateEASConfig());
    this.addValidation('TypeScript Configuration', () => this.validateTypeScriptConfig());
    this.addValidation('Security Configuration', () => this.validateSecurityConfig());

    let passedValidations = 0;
    
    for (const validation of this.validations) {
      const passed = await this.runValidation(validation.name, validation.fn);
      if (passed) passedValidations++;
    }

    // Generate report
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`✅ Passed: ${passedValidations}/${this.validations.length} validations`);
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    const successRate = Math.round((passedValidations / this.validations.length) * 100);
    
    console.log('\n' + '-'.repeat(50));
    if (successRate === 100 && this.errors.length === 0) {
      console.log('🎉 ALL VALIDATIONS PASSED - READY FOR DEPLOYMENT!');
      return true;
    } else if (successRate >= 80) {
      console.log('⚠️  MOSTLY READY - Review warnings before deployment');
      return false;
    } else {
      console.log('❌ NOT READY FOR DEPLOYMENT - Fix errors first');
      return false;
    }
  }
}

// Run validations
const validator = new PreDeploymentValidator();
validator.runAllValidations().then(success => {
  process.exit(success ? 0 : 1);
});