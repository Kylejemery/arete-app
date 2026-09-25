// The practice-module registry (personalization run C, Part C1). The single
// place a module is defined: what it is, how the Cabinet may offer it, who it
// is never offered to, and the shape of its settings. Everything that writes
// user_app_config validates against this file first.
//
// tier
//   surface_existing  the feature already exists; the module pins a shortcut
//                     to it on Home. Nothing about the feature changes.
//   enable_module     a new practice card on Home.
// excluded_for
//   'teen'             never proposed to the 13-15 and 16-17 bands.
//   'recent_distress'  never proposed within 14 days of a distress flag.
// existingFeature     the route of the feature a surface_existing module pins.
// freeTextField       the one free-text setting every tier may set (Part C6);
//                     every other setting stays at its default on free.
//
// Adding a module: add an entry here, mirror its key, label and routes in
// lib/modules.ts and web/src/lib/modules.ts (a test checks the three agree),
// and give it a card in components/YourPractices.tsx and
// web/src/components/YourPractices.tsx. No migration: user_app_config stores
// module_key as text and the server refuses any key not listed here.
const { z } = require('zod');

const freeText = z.string().trim().max(280);

const MODULES = {
  focus_timer: {
    key: 'focus_timer',
    label: 'Focus timer',
    description: 'A shortcut on Home to the focus timer you already have, with the length you like and a line on what the time is for.',
    tier: 'surface_existing',
    existingFeature: { mobile: '/timer', web: '/focus' },
    excludedFor: [],
    freeTextField: 'intention',
    settings: z.object({
      minutes: z.number().int().min(5).max(90).default(25),
      intention: freeText.default(''),
    }).strict(),
  },
  evening_review: {
    key: 'evening_review',
    label: 'Evening review',
    description: 'A shortcut on Home to the evening check-in, with one question of your own to close the day on.',
    tier: 'surface_existing',
    existingFeature: { mobile: '/evening', web: '/evening' },
    excludedFor: [],
    freeTextField: 'question',
    settings: z.object({
      question: freeText.default(''),
      show_after_hour: z.number().int().min(12).max(23).default(17),
    }).strict(),
  },
  premeditatio: {
    key: 'premeditatio',
    label: 'Premeditatio',
    description: 'A morning card to rehearse, calmly, one hard thing the day might bring and how you would meet it.',
    tier: 'enable_module',
    existingFeature: null,
    // Rehearsing what could go wrong is not for someone already struggling,
    // or for a teenager without a person beside them.
    excludedFor: ['teen', 'recent_distress'],
    freeTextField: 'focus',
    settings: z.object({
      focus: freeText.default(''),
      time_of_day: z.enum(['morning', 'evening']).default('morning'),
    }).strict(),
  },
  habit_tracker: {
    key: 'habit_tracker',
    label: 'Habit tracker',
    description: 'One habit on Home that you tick off each day, with this week\'s count.',
    tier: 'enable_module',
    existingFeature: null,
    excludedFor: [],
    freeTextField: 'habit',
    settings: z.object({
      habit: freeText.default(''),
      target_per_week: z.number().int().min(1).max(7).default(7),
    }).strict(),
  },
};

const MODULE_KEYS = Object.keys(MODULES);
const TIERS = ['surface_existing', 'enable_module'];

function getModule(key) {
  return Object.prototype.hasOwnProperty.call(MODULES, key) ? MODULES[key] : null;
}

function defaultSettings(key) {
  const mod = getModule(key);
  return mod ? mod.settings.parse({}) : null;
}

// Validates settings for a module. On the free tier only the free-text field
// is kept from the input; every other setting is its default. Returns
// { ok, settings } or { ok: false, error } — the error names the field, never
// echoes the value.
function validateSettings(key, input, { tier = 'free' } = {}) {
  const mod = getModule(key);
  if (!mod) return { ok: false, error: 'unknown_module' };
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const candidate = tier === 'free'
    ? (raw[mod.freeTextField] !== undefined ? { [mod.freeTextField]: raw[mod.freeTextField] } : {})
    : raw;
  const parsed = mod.settings.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `invalid_setting:${issue && issue.path.length ? issue.path.join('.') : 'settings'}` };
  }
  return { ok: true, settings: parsed.data };
}

// Why a module may not be offered to this person, or null when it may.
function exclusionFor(key, { isTeen = false, recentDistress = false } = {}) {
  const mod = getModule(key);
  if (!mod) return 'unknown_module';
  if (isTeen && mod.excludedFor.includes('teen')) return 'teen';
  if (recentDistress && mod.excludedFor.includes('recent_distress')) return 'recent_distress';
  return null;
}

module.exports = {
  MODULES,
  MODULE_KEYS,
  TIERS,
  getModule,
  defaultSettings,
  validateSettings,
  exclusionFor,
};
