// Custom entry: diagnostics first, then the app.
//
// Deliberately require()-based, not import-based: imports hoist, so a
// try/catch around an `import` is impossible. With require(), a fatal error
// thrown anywhere in the app's module-graph evaluation lands in our catch
// SYNCHRONOUSLY, with the real stack — no reliance on ErrorUtils, timers,
// or networking being alive (Builds 51/52 showed none of them are during
// early boot).
const { breadcrumb, reportBootFatal, startBootDiagnostics } = require('./lib/crashCapture');

startBootDiagnostics();

try {
  require('expo-router/entry');
  breadcrumb('entry: app module graph evaluated');
} catch (error) {
  reportBootFatal(error);
}
