// The oldest iOS build the server still supports. Builds below it show a
// mandatory update screen at launch (app/_layout.tsx, lib/updateGate.ts).
//
// Set by the MIN_IOS_BUILD environment variable on Railway, so raising the
// floor is a variable change, not a deploy. Unset, empty, or anything that is
// not a positive whole number means 0: no build is gated. That is the safe
// default, because a wrong floor locks people out of the app.
//
// Only builds that carry the gate can obey it. Build 94 and every build before
// the one that ships this check never ask, so for them the floor does nothing.
function minIosBuildFromEnv(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{1,6}$/.test(s)) return 0;
  return Number(s);
}

module.exports = { minIosBuildFromEnv };
