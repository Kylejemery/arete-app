const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');
const path = require('path');

let config = getDefaultConfig(__dirname);
config = getBundleModeMetroConfig(config);

// Bundle mode generates .worklets/ temp files inside node_modules/react-native-worklets
// Metro doesn't watch node_modules subdirs by default — add it explicitly
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'node_modules/react-native-worklets/.worklets'),
];

module.exports = config;
