// Learn more: https://docs.swmansion.com/react-native-worklets/docs/bundleMode/setup/
const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

let config = getDefaultConfig(__dirname);
config = getBundleModeMetroConfig(config);

module.exports = config;
