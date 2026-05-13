const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRCTTurboModulePatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        'Pods/Headers/Private/React-Core/RCTTurboModule.mm'
      );

      // Fallback path — location varies by RN version
      const fallbackPath = path.join(
        config.modRequest.platformProjectRoot,
        '../node_modules/react-native/React/CxxBridge/RCTTurboModule.mm'
      );

      let targetPath = null;
      if (fs.existsSync(filePath)) {
        targetPath = filePath;
      } else if (fs.existsSync(fallbackPath)) {
        targetPath = fallbackPath;
      }

      if (!targetPath) {
        console.warn(
          '[withRCTTurboModulePatch] RCTTurboModule.mm not found — ' +
          'patch not applied. Check file path for your RN version.'
        );
        return config;
      }

      let contents = fs.readFileSync(targetPath, 'utf8');

      const unsafe = `throw convertNSExceptionToJSError(runtime, exception,`;
      const safe = `@throw exception; // iOS 26 patch — facebook/react-native#56694\n      // throw convertNSExceptionToJSError(runtime, exception,`;

      if (contents.includes('iOS 26 patch')) {
        console.log('[withRCTTurboModulePatch] Patch already applied — skipping.');
        return config;
      }

      if (!contents.includes(unsafe)) {
        console.warn(
          '[withRCTTurboModulePatch] Target string not found — ' +
          'RN version may have already fixed this or the patch needs updating.'
        );
        return config;
      }

      // Only patch the performVoidMethodInvocation @catch block
      // Scope: find performVoidMethodInvocation, then replace the first
      // occurrence of the unsafe throw after it
      const voidMethodIdx = contents.indexOf('performVoidMethodInvocation');
      const unsafeIdx = contents.indexOf(unsafe, voidMethodIdx);

      if (unsafeIdx === -1) {
        console.warn('[withRCTTurboModulePatch] Could not locate patch target in correct scope.');
        return config;
      }

      contents = contents.slice(0, unsafeIdx) + safe + contents.slice(unsafeIdx + unsafe.length);
      fs.writeFileSync(targetPath, contents, 'utf8');
      console.log('[withRCTTurboModulePatch] iOS 26 patch applied to ' + targetPath);

      return config;
    },
  ]);
};

module.exports = withRCTTurboModulePatch;
