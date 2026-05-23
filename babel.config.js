/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  bundleMode: true,
  strictGlobal: true, // recommended: enforces worklet globals are not shadowed
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-worklets/plugin', workletsPluginOptions],
    ],
  };
};
