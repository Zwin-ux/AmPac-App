# AmPac Capital Mobile App - Deployment Guide

## 🚀 Expo Application Services (EAS) Deployment

This guide covers deploying the AmPac Capital mobile app to both iOS App Store and Google Play Store using Expo Application Services (EAS).

## Prerequisites

### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Verify Project Setup
```bash
cd AmPac-App-main/apps/mobile
eas whoami
```

## 🍎 iOS App Store Deployment

### Step 1: Prepare iOS Build
```bash
# Build for iOS production
eas build --platform ios --profile production
```

### Step 2: Submit to App Store
```bash
# Submit to App Store Connect
eas submit --platform ios --profile production
```

### iOS Configuration Details:
- **Bundle ID**: `com.ampac.borrower`
- **Apple ID**: `info@ampac.com`
- **Team ID**: `Q87HNHL9QW`
- **App Store Connect**: Configured for automatic submission

## 🤖 Android Google Play Store Deployment

### Step 1: Prepare Android Build
```bash
# Build for Android production
eas build --platform android --profile production
```

### Step 2: Submit to Google Play
```bash
# Submit to Google Play Console
eas submit --platform android --profile production
```

### Android Configuration Details:
- **Package Name**: `com.ampac.borrower`
- **Adaptive Icon**: Configured with white background
- **Target SDK**: Latest Android version

## 🔄 Build Both Platforms Simultaneously
```bash
# Build for both iOS and Android
eas build --platform all --profile production
```

## 📱 Testing Builds

### Internal Distribution (TestFlight/Internal Testing)
```bash
# Build preview version for testing
eas build --platform all --profile preview
```

### Development Build
```bash
# Build development version
eas build --platform all --profile development
```

## 🔧 Environment Configuration

### Production Environment Variables
Ensure your `.env.production` file contains:
```env
APP_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAGejlfxWLXlDlWOM3c0V1JzUJhsSpCtxY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ampac-database.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ampac-database
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=ampac-database.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=381306899120
EXPO_PUBLIC_FIREBASE_APP_ID=1:381306899120:web:37bafe7b048a4212bdc975
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-HG722LLTKZ
EXPO_PUBLIC_BRAIN_API_URL=https://ampac-brain-381306899120.us-central1.run.app
EXPO_PUBLIC_SENTRY_DSN=https://fab09605387e458a58d829d4b2443eac@o4510579949305856.ingest.us.sentry.io/4510579952517120
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ShfimE4qtfgmbNl8luZeGHcNWMuJ7XJYJvdnllszM0uFci2zJlOMVhvZeC7dSqaBrVH3Phc8UtDqYAlODNgJ3G300xwf5Te4m
```

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] No console errors or warnings
- [ ] All features tested on physical devices
- [ ] Performance optimizations implemented

### App Store Requirements
- [ ] Microsoft 365 dependencies removed ✅
- [ ] Push notifications configured ✅
- [ ] Offline functionality working ✅
- [ ] Content moderation implemented ✅
- [ ] Privacy policy and terms of service linked
- [ ] App icons and splash screens optimized

### Security & Compliance
- [ ] API keys secured in environment variables
- [ ] No hardcoded secrets in code
- [ ] Financial data handling compliant
- [ ] User data privacy controls implemented

## 🔍 Build Status Monitoring

### Check Build Status
```bash
# View build status
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

### Download Build Artifacts
```bash
# Download .ipa or .apk file
eas build:download [BUILD_ID]
```

## 📤 Submission Status

### Check Submission Status
```bash
# View submission status
eas submit:list

# View specific submission
eas submit:view [SUBMISSION_ID]
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
1. **TypeScript Errors**: Run `npm run typecheck` and fix all errors
2. **Missing Dependencies**: Ensure all packages are installed with `npm install`
3. **Environment Variables**: Verify all required env vars are set

#### iOS Specific Issues
1. **Provisioning Profile**: Ensure Apple Developer account is active
2. **Bundle ID**: Verify bundle ID matches App Store Connect
3. **Certificates**: Check if certificates are valid and not expired

#### Android Specific Issues
1. **Package Name**: Ensure package name is unique on Google Play
2. **Signing Key**: Verify app signing configuration
3. **Permissions**: Check all required permissions are declared

### Getting Help
```bash
# View EAS CLI help
eas --help

# View specific command help
eas build --help
eas submit --help
```

## 📈 Post-Deployment

### Monitor App Performance
1. **Sentry**: Monitor crashes and errors
2. **Firebase Analytics**: Track user engagement
3. **App Store Connect**: Monitor reviews and ratings
4. **Google Play Console**: Track app performance metrics

### Update Process
1. Increment version in `app.json`
2. Build new version: `eas build --platform all --profile production`
3. Submit update: `eas submit --platform all --profile production`

## 🎯 Success Metrics

### Target KPIs
- **Crash Rate**: <0.1%
- **App Store Rating**: >4.5 stars
- **Load Time**: <2 seconds
- **User Retention**: >70% after 7 days

### Monitoring Tools
- **Sentry**: Error tracking and performance monitoring
- **Firebase**: User analytics and engagement metrics
- **App Store Connect**: iOS app performance and reviews
- **Google Play Console**: Android app performance and reviews

---

## Quick Deployment Commands

### Full Production Deployment
```bash
# 1. Final checks
npm run typecheck
npm install

# 2. Build for production
eas build --platform all --profile production

# 3. Submit to stores (after build completes)
eas submit --platform all --profile production
```

### Emergency Hotfix
```bash
# 1. Fix critical issue
# 2. Increment patch version in app.json
# 3. Quick build and deploy
eas build --platform all --profile production --non-interactive
eas submit --platform all --profile production --non-interactive
```

Your app is now ready for deployment! 🚀