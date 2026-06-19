const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * nodejs-assets is not JS — tell Metro to ignore it so it doesn't try to bundle
 * the embedded server files. The native module copies them at build time.
 */
const config = {
  resolver: {
    blockList: [/nodejs-assets\/.*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
