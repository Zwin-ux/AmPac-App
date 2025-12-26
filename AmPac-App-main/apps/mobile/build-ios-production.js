#!/usr/bin/env node

/**
 * iOS Production Build Script
 * 
 * Focused script to execute iOS production build for App Store submission
 */

const { spawn, execSync } = require('child_process');

console.log('🍎 AmPac iOS Production Build');
console.log('=' .repeat(40));
console.log('🎯 Target: App Store Ready iOS Build');
console.log('');

class iOSProductionBuilder {
  constructor() {
    this.startTime = Date.now();
    this.buildId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      build: '🏗️',
      ios: '🍎'
    };
    console.log(`[${timestamp}] ${icons[type]} ${message}`);
  }

  checkPrerequisites() {
    this.log('Checking iOS build prerequisites...', 'info');

    // Check EAS authentication
    try {
      const whoami = execSync('npx eas whoami', { encoding: 'utf8', stdio: 'pipe' });
      this.log(`EAS authenticated as: ${whoami.trim()}`, 'success');
    } catch (error) {
      this.log('EAS authentication required', 'error');
      console.log('\n🔐 Please authenticate:');
      console.log('   npx eas login');
      return false;
    }

    // Check iOS configuration in app.json
    const fs = require('fs');
    try {
      const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      if (appConfig.expo.ios && appConfig.expo.ios.bundleIdentifier) {
        this.log(`iOS Bundle ID: ${appConfig.expo.ios.bundleIdentifier}`, 'success');
      } else {
        this.log('iOS configuration missing in app.json', 'error');
        return false;
      }
    } catch (error) {
      this.log('Failed to read app.json', 'error');
      return false;
    }

    // Check EAS configuration
    try {
      const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
      if (easConfig.build && easConfig.build.production) {
        this.log('EAS production profile found', 'success');
      } else {
        this.log('EAS production profile missing', 'error');
        return false;
      }
    } catch (error) {
      this.log('Failed to read eas.json', 'error');
      return false;
    }

    this.log('All prerequisites met ✅', 'success');
    return true;
  }

  async executeiOSBuild() {
    return new Promise((resolve) => {
      this.log('🍎 Starting iOS production build...', 'ios');
      console.log('⏰ Estimated time: 15-20 minutes');
      console.log('📱 Target: App Store Connect submission');
      console.log('');

      const buildProcess = spawn('npx', [
        'eas', 'build',
        '--platform', 'ios',
        '--profile', 'production',
        '--non-interactive',
        '--clear-cache'
      ], {
        stdio: 'pipe'
      });

      let buildOutput = '';

      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        
        // Parse important build events
        if (output.includes('Build ID:')) {
          const buildIdMatch = output.match(/Build ID: ([a-f0-9-]+)/);
          if (buildIdMatch) {
            this.buildId = buildIdMatch[1];
            this.log(`iOS Build ID: ${this.buildId}`, 'ios');
            console.log(`📊 Dashboard: https://expo.dev/accounts/ampac/projects/ampac-business-capital/builds/${this.buildId}`);
          }
        }

        if (output.includes('Uploading to EAS Build')) {
          this.log('📤 Uploading project to EAS servers...', 'build');
        }

        if (output.includes('Build started')) {
          this.log('🏗️ Build started on EAS servers', 'build');
        }

        if (output.includes('Build completed')) {
          this.log('🎉 iOS build completed successfully!', 'success');
        }

        if (output.includes('https://expo.dev/artifacts/')) {
          const urlMatch = output.match(/https:\/\/expo\.dev\/artifacts\/[^\s]+/);
          if (urlMatch) {
            console.log(`\n🎁 iOS Build Artifact:`);
            console.log(`   ${urlMatch[0]}`);
            console.log('');
          }
        }

        // Show progress indicators
        if (output.includes('Installing dependencies')) {
          this.log('📦 Installing dependencies...', 'build');
        }
        if (output.includes('Compiling')) {
          this.log('⚙️ Compiling iOS app...', 'build');
        }
        if (output.includes('Archiving')) {
          this.log('📦 Creating iOS archive...', 'build');
        }
      });

      buildProcess.stderr.on('data', (data) => {
        const error = data.toString();
        // Only show actual errors, not warnings
        if (error.includes('error') && !error.includes('warning')) {
          this.log(`Build error: ${error.trim()}`, 'error');
        }
      });

      buildProcess.on('close', (code) => {
        const duration = Math.round((Date.now() - this.startTime) / 1000 / 60);
        
        if (code === 0) {
          console.log('\n' + '='.repeat(50));
          this.log('🎉 iOS BUILD SUCCESSFUL! 🎉', 'success');
          console.log('='.repeat(50));
          console.log(`⏱️ Build Duration: ${duration} minutes`);
          if (this.buildId) {
            console.log(`📱 Build ID: ${this.buildId}`);
            console.log(`📊 Dashboard: https://expo.dev/accounts/ampac/projects/ampac-business-capital/builds/${this.buildId}`);
          }
          console.log('');
          console.log('📋 Next Steps:');
          console.log('   1. Download the IPA file from EAS dashboard');
          console.log('   2. Test on physical iOS device');
          console.log('   3. Submit to App Store Connect');
          console.log('   4. Complete App Store review process');
          console.log('');
          console.log('🏆 iOS App Store deployment ready!');
          resolve(true);
        } else {
          console.log('\n' + '='.repeat(50));
          this.log('❌ iOS BUILD FAILED', 'error');
          console.log('='.repeat(50));
          console.log(`⏱️ Build Duration: ${duration} minutes`);
          console.log(`❌ Exit Code: ${code}`);
          if (this.buildId) {
            console.log(`📊 Check logs: https://expo.dev/accounts/ampac/projects/ampac-business-capital/builds/${this.buildId}`);
          }
          console.log('');
          console.log('🔧 Troubleshooting:');
          console.log('   1. Check build logs in EAS dashboard');
          console.log('   2. Verify iOS certificates and provisioning profiles');
          console.log('   3. Check app.json iOS configuration');
          console.log('   4. Retry build after fixing issues');
          resolve(false);
        }
      });

      // Timeout after 30 minutes
      setTimeout(() => {
        this.log('⏰ Build timeout - check EAS dashboard for status', 'warning');
        buildProcess.kill();
        resolve(false);
      }, 30 * 60 * 1000);
    });
  }

  async execute() {
    console.log('🔍 Pre-build checks...\n');

    if (!this.checkPrerequisites()) {
      console.log('\n❌ Prerequisites not met - cannot proceed with build');
      return false;
    }

    console.log('\n✅ All checks passed - starting iOS production build\n');
    console.log('🚨 This will create a production build for App Store submission');
    console.log('📱 Bundle ID: com.ampac.borrower');
    console.log('🏪 Target: App Store Connect');
    console.log('');

    const success = await this.executeiOSBuild();
    return success;
  }
}

// Execute iOS build
const builder = new iOSProductionBuilder();
builder.execute().then(success => {
  if (success) {
    console.log('\n🎊 iOS production build completed successfully!');
    console.log('🍎 Ready for App Store submission!');
    process.exit(0);
  } else {
    console.log('\n🔧 iOS build encountered issues - check logs and retry');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Build execution failed:', error.message);
  process.exit(1);
});