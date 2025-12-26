#!/usr/bin/env node

/**
 * Production Build Script
 * 
 * Orchestrates iOS and Android production builds with comprehensive monitoring
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  AmPac Production Build System');
console.log('=' .repeat(50));

class ProductionBuilder {
  constructor() {
    this.buildResults = {
      ios: { started: false, completed: false, success: false, url: null },
      android: { started: false, completed: false, success: false, url: null }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄',
      build: '🏗️'
    }[type] || '📋';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking build prerequisites...', 'progress');

    // Check EAS CLI
    try {
      const easVersion = execSync('npx eas --version', { encoding: 'utf8' });
      this.log(`EAS CLI version: ${easVersion.trim()}`, 'success');
    } catch (error) {
      this.log('EAS CLI not found - installing...', 'warning');
      try {
        execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
        this.log('EAS CLI installed successfully', 'success');
      } catch (installError) {
        this.log('Failed to install EAS CLI', 'error');
        return false;
      }
    }

    // Check authentication
    try {
      execSync('npx eas whoami', { stdio: 'pipe' });
      this.log('EAS authentication verified', 'success');
    } catch (error) {
      this.log('EAS authentication required', 'warning');
      console.log('Please run: npx eas login');
      return false;
    }

    // Validate configuration files
    const requiredFiles = ['app.json', 'eas.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.log(`Missing required file: ${file}`, 'error');
        return false;
      }
    }

    this.log('All prerequisites met', 'success');
    return true;
  }

  async runPreDeploymentValidation() {
    this.log('Running pre-deployment validation...', 'progress');
    
    try {
      execSync('node pre-deployment-validation.js', { stdio: 'inherit' });
      this.log('Pre-deployment validation passed', 'success');
      return true;
    } catch (error) {
      this.log('Pre-deployment validation failed', 'error');
      return false;
    }
  }

  async buildPlatform(platform) {
    return new Promise((resolve) => {
      this.log(`Starting ${platform} production build...`, 'build');
      this.buildResults[platform].started = true;

      const buildProcess = spawn('npx', [
        'eas', 'build', 
        '--platform', platform, 
        '--profile', 'production',
        '--non-interactive'
      ], {
        stdio: 'pipe'
      });

      let buildOutput = '';

      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        
        // Parse build progress
        if (output.includes('Build started')) {
          this.log(`${platform} build started on EAS servers`, 'build');
        }
        if (output.includes('Build completed')) {
          this.log(`${platform} build completed`, 'success');
        }
        if (output.includes('https://expo.dev/artifacts/')) {
          const urlMatch = output.match(/https:\/\/expo\.dev\/artifacts\/[^\s]+/);
          if (urlMatch) {
            this.buildResults[platform].url = urlMatch[0];
            this.log(`${platform} build artifact: ${urlMatch[0]}`, 'success');
          }
        }
      });

      buildProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('warning') && !error.includes('info')) {
          this.log(`${platform} build error: ${error}`, 'error');
        }
      });

      buildProcess.on('close', (code) => {
        this.buildResults[platform].completed = true;
        this.buildResults[platform].success = code === 0;
        
        if (code === 0) {
          this.log(`${platform} build completed successfully`, 'success');
        } else {
          this.log(`${platform} build failed with code ${code}`, 'error');
        }
        
        resolve(code === 0);
      });

      // Timeout after 30 minutes
      setTimeout(() => {
        if (!this.buildResults[platform].completed) {
          this.log(`${platform} build timeout - check EAS dashboard`, 'warning');
          buildProcess.kill();
          resolve(false);
        }
      }, 30 * 60 * 1000);
    });
  }

  async buildBothPlatforms() {
    this.log('Starting parallel builds for iOS and Android...', 'build');
    
    const iosPromise = this.buildPlatform('ios');
    const androidPromise = this.buildPlatform('android');
    
    const results = await Promise.allSettled([iosPromise, androidPromise]);
    
    return {
      ios: results[0].status === 'fulfilled' && results[0].value,
      android: results[1].status === 'fulfilled' && results[1].value
    };
  }

  async buildSequentially() {
    this.log('Starting sequential builds (iOS first, then Android)...', 'build');
    
    const iosSuccess = await this.buildPlatform('ios');
    if (!iosSuccess) {
      this.log('iOS build failed - skipping Android build', 'error');
      return { ios: false, android: false };
    }
    
    const androidSuccess = await this.buildPlatform('android');
    return { ios: iosSuccess, android: androidSuccess };
  }

  generateBuildReport() {
    const duration = Math.round((Date.now() - this.startTime) / 1000 / 60); // minutes
    
    console.log('\n' + '='.repeat(60));
    this.log('PRODUCTION BUILD REPORT', 'info');
    console.log('='.repeat(60));

    // iOS Results
    console.log('\n📱 iOS Build:');
    if (this.buildResults.ios.started) {
      const status = this.buildResults.ios.success ? '✅ SUCCESS' : 
                    this.buildResults.ios.completed ? '❌ FAILED' : '⏳ IN PROGRESS';
      console.log(`   Status: ${status}`);
      if (this.buildResults.ios.url) {
        console.log(`   Artifact: ${this.buildResults.ios.url}`);
      }
    } else {
      console.log('   Status: ⏸️  NOT STARTED');
    }

    // Android Results
    console.log('\n🤖 Android Build:');
    if (this.buildResults.android.started) {
      const status = this.buildResults.android.success ? '✅ SUCCESS' : 
                    this.buildResults.android.completed ? '❌ FAILED' : '⏳ IN PROGRESS';
      console.log(`   Status: ${status}`);
      if (this.buildResults.android.url) {
        console.log(`   Artifact: ${this.buildResults.android.url}`);
      }
    } else {
      console.log('   Status: ⏸️  NOT STARTED');
    }

    console.log(`\n⏱️  Total Duration: ${duration} minutes`);

    // Success summary
    const successCount = (this.buildResults.ios.success ? 1 : 0) + 
                        (this.buildResults.android.success ? 1 : 0);
    
    if (successCount === 2) {
      console.log('\n🎉 ALL BUILDS SUCCESSFUL!');
      console.log('✅ iOS and Android production builds completed');
      console.log('\n📋 Next Steps:');
      console.log('1. Download and test the build artifacts');
      console.log('2. Submit iOS build to App Store Connect');
      console.log('3. Submit Android build to Google Play Console');
      console.log('4. Monitor app store review process');
      return true;
    } else if (successCount === 1) {
      console.log('\n⚠️  PARTIAL SUCCESS');
      console.log('One platform build succeeded, one failed');
      console.log('Review the failed build and retry if needed');
      return false;
    } else {
      console.log('\n❌ ALL BUILDS FAILED');
      console.log('Check build logs and configuration');
      console.log('Run pre-deployment validation again');
      return false;
    }
  }

  async showBuildOptions() {
    console.log('\n🏗️  Build Options:');
    console.log('1. Build both platforms (parallel) - Faster but uses more resources');
    console.log('2. Build both platforms (sequential) - Slower but more stable');
    console.log('3. Build iOS only');
    console.log('4. Build Android only');
    console.log('5. Show build status only');
    console.log('');

    // For automation, we'll default to parallel builds
    return 'parallel';
  }

  async executeBuild() {
    const prerequisites = await this.checkPrerequisites();
    if (!prerequisites) {
      this.log('Prerequisites not met - aborting build', 'error');
      return false;
    }

    const validationPassed = await this.runPreDeploymentValidation();
    if (!validationPassed) {
      this.log('Pre-deployment validation failed - aborting build', 'error');
      return false;
    }

    const buildOption = await this.showBuildOptions();
    
    let buildResults;
    
    switch (buildOption) {
      case 'parallel':
        buildResults = await this.buildBothPlatforms();
        break;
      case 'sequential':
        buildResults = await this.buildSequentially();
        break;
      case 'ios':
        const iosResult = await this.buildPlatform('ios');
        buildResults = { ios: iosResult, android: false };
        break;
      case 'android':
        const androidResult = await this.buildPlatform('android');
        buildResults = { ios: false, android: androidResult };
        break;
      default:
        this.log('Invalid build option', 'error');
        return false;
    }

    return this.generateBuildReport();
  }
}

// Execute build
const builder = new ProductionBuilder();
builder.executeBuild().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Build execution failed:', error);
  process.exit(1);
});