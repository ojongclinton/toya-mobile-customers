const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Redirige @expo/vector-icons/MaterialCommunityIcons vers un shim CJS
// car la version v15.x utilise ESM + 'use client' que Metro ne résout pas
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/vector-icons/MaterialCommunityIcons') {
    return {
      filePath: path.resolve(__dirname, 'shims/MaterialCommunityIcons.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
