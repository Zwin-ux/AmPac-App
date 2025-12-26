const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper source extensions for React Native 0.81.5
config.resolver.sourceExts.push('cjs');

// Fix for React Native 0.81.5 compatibility
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper asset extensions
config.resolver.assetExts.push('bin');

// Fix for Node.js compatibility issues
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;