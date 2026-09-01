/** @type {import('@bacons/apple-targets').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'AreteWidget',
  deploymentTarget: '17.0',
  // Matches the app's Apple team (eas.json submit config).
  appleTeamId: 'VAAKMM3C9G',
});
