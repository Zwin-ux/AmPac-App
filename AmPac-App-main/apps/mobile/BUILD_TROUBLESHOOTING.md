# AmPac iOS Build Troubleshooting Guide

## Current Build Error Analysis

The build is failing during the "Prebuild build phase" which typically indicates:

1. **Configuration conflicts** in app.json/eas.json
2. **Dependency version mismatches**
3. **Native module compatibility issues**
4. **Metro bundler configuration problems**

## 🔧 Step-by-Step Fix Process

### Step 1: Clean Everything
```bash
# Remove all build artifacts
rm -rf node_modules
rm -rf .expo
rm package-lock.json

# Clean npm cache
npm cache clean --force

# Reinstall dependencies
npm install
```

### Step 2: Fix App Configuration Issues

The current app.json has some issues that need fixing:

1. **Remove buildNumber from app.json** (EAS manages this)
2. **Fix notification plugin configuration**
3. **Ensure proper iOS entitlements**

### Step 3: Simplify EAS Configuration

Create a minimal working eas.json first, then add complexity:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 4: Test Local Build First
```bash
# Test local iOS build to catch issues early
npx expo run:ios --configuration Release
```

### Step 5: Common Build Fixes

#### Fix 1: Metro Configuration
The current metro.config.js might need updates for React Native 0.81.5:

```javascript
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper source extensions
config.resolver.sourceExts.push('cjs');

// Fix for React Native 0.81.5 compatibility
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
```

#### Fix 2: Package.json Scripts
Add proper build scripts:

```json
{
  "scripts": {
    "prebuild": "expo prebuild --clean",
    "build:ios": "eas build --platform ios --profile production",
    "build:ios-local": "expo run:ios --configuration Release"
  }
}
```

#### Fix 3: Babel Configuration
Ensure babel.config.js is properly configured:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add any required plugins here
    ],
  };
};
```

## 🚨 Critical Issues to Check

### 1. React Native Version Compatibility
- Current: React Native 0.81.5
- Expo SDK 54 expects: React Native 0.81.x ✅
- All dependencies must be compatible with RN 0.81.5

### 2. Firebase Configuration
- Ensure GoogleService-Info.plist is present ✅
- Firebase SDK version 12.6.0 should be compatible

### 3. Sentry Configuration
- Sentry React Native 7.2.0 might have compatibility issues
- Consider updating to latest compatible version

### 4. Navigation Dependencies
- React Navigation 7.x should be compatible
- Ensure all navigation dependencies are aligned

## 🔍 Debugging Commands

### Check Expo Doctor
```bash
npx expo doctor
```

### Check Dependencies
```bash
npx expo install --check
```

### Prebuild Locally (to see errors)
```bash
npx expo prebuild --clean --platform ios
```

### Check Bundle
```bash
npx expo export --platform ios
```

## 📱 Alternative Build Approach

If EAS continues to fail, try local build approach:

### 1. Generate iOS Project
```bash
npx expo prebuild --platform ios --clean
```

### 2. Open in Xcode
```bash
open ios/AmPacCapital.xcworkspace
```

### 3. Build in Xcode
- Select "Any iOS Device" as target
- Product → Archive
- Distribute App → App Store Connect

## 🎯 Next Steps

1. **Implement the simplified eas.json**
2. **Remove buildNumber from app.json**
3. **Test local prebuild first**
4. **Fix any prebuild errors before trying EAS**
5. **Consider updating problematic dependencies**

## 📞 If All Else Fails

Contact Expo Support with:
- Build ID: 97fef23a-4a10-41be-9383-0bc6aa881b3d
- Full build logs from Expo dashboard
- This troubleshooting document

The key is to get the prebuild working locally first, then EAS should work.