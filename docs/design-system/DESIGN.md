# Arete Design Language

Arete is a philosophical companion: a cabinet of counselors (Marcus Aurelius, Seneca, Epictetus and others) who answer in their own voice, morning and evening routines, a journal, a focus timer, and a Library. The design has to feel like a quiet study at night, not a productivity dashboard. Everything below is derived from the shipped code (Expo app, `web/`, `academy/web/`); this document is the plain-language version of `tokens.json`.

## One idea

**Ink and gold.** Every surface is a deep blue-black; every point of emphasis is a single antique gold, `#c9a84c`. There is no second accent. Semantic colors (green, red, blue, purple) appear only for state, never for decoration. Gold is used at many opacities (5% to 55%) for hairlines, tints and washes, so the UI reads as tonal rather than colorful.

## Three siblings, one family

| Surface | Background | Card | Text | Serif |
|---|---|---|---|---|
| Mobile app (Expo) | `#1a1a2e` | `#16213e` | `#fff` / `#e0e0e0` / `#888` | none, system sans |
| Web app v2 (`web/`) | `#0f1724` | `rgba(255,255,255,0.04)` glass | `#e6eef8` / `#9aa0a6` | Cormorant Garamond |
| Academy + Library (`academy/web/`) | `#0a1628` | `#111d30` | `#f5edd6` / `#e8d9b0` / `#7a8fa6` | Playfair Display (academy), Cormorant Garamond (library) |

The mobile paywall borrows the academy navy set (`#0A1628` / `#0F1E38` / `#1E3050`), which is the one place the app deliberately feels more "editorial".

When designing new mobile screens, use the **mobile app** column. When designing marketing or Library pages, use the **academy** column. Gold is identical everywhere.

## Type

- **Mobile app** uses the platform system font (SF Pro on iOS). Hierarchy comes from weight, size and gold, not from a display face. Screen titles are 26px bold gold. Section titles 16px bold gold. Body 15px, line-height 22 (24 for counselor replies, which want air). Captions 12px `#888`, meta 11px `#555`.
- **Kickers / eyebrows** are the signature detail: 10 to 11px, bold, uppercase, tracked 1.2 to 3px, gold. They label cards ("Today's question", counselor names above replies, "Always present").
- **Quotes** are italic 14px in a warm off-white (`#e8e0d0` / `#e8e2cf`) with a 3px gold left rule and the attribution in gold 12px semibold.
- **Numbers as heroes**: streak count 52 to 64px bold gold, focus timer 72px bold gold tracked 4px.
- **Web / academy** add a serif for headings and reading text. Cormorant Garamond for the Library and web app, Playfair Display for academy pages. Inter for UI. JetBrains Mono for code and small labels. `.text-gold-gradient` (135deg, `#c9a84c` to `#e8c96a` and back) is the only gradient in the system.

## Shape

- Cards: 12 to 16px radius, 1px border. Default border is a gold hairline at 13 to 27% (`#c9a84c22` / `#c9a84c33` / `#c9a84c44`) on a `#16213e` fill. A selected or emphasized card raises the border to solid gold, sometimes 2px.
- Buttons: solid gold fill, ink text (`#1a1a2e`), bold, 10 to 14px radius. Primary CTAs are tall (16 to 18px vertical padding) with 17px bold text. Secondary is gold text on `#c9a84c22` with a `#c9a84c88` border. Tertiary is muted grey text with no chrome. Destructive uses `#ff4444`.
- Pills and chips: fully rounded (20px or 999px). Inactive `#16213e` with a gold hairline and `#888` text; active `#c9a84c22` or `#c9a84c33` fill, solid gold border, gold text.
- Segmented tabs: a `#16213e` track with 12px radius and 4px padding; the active segment is a solid gold block with ink text. Top-of-screen tabs instead use a 2px gold underline.
- Chat bubbles: user on the right, gold wash 15% with a solid gold border and a 4px "tail" corner (bottom-right). Counselor on the left, `#16213e` with gold hairline and the tail bottom-left, the counselor's name as a gold uppercase kicker above the text.
- Inputs: `#1a1a2e` fill inside a `#16213e` card, gold hairline border, 12 to 20px radius, white 15 to 16px text. Focused editor cards get a solid gold border. Add-item affordances are dashed gold-hairline outlines.
- Accent rules: a 3px gold `border-left` marks quotes, affirmations and prompts.
- Icons: Ionicons, always the `-outline` variant except for filled state icons (`flame`, `checkmark-circle`, `lock-closed`). Icon wells are 38 to 48px circles filled `rgba(201,168,76,0.08)` with a gold hairline.
- Overlays: `rgba(0,0,0,0.55)` to `0.75`. Sheets slide from the bottom on `#16213e` with 18px top radius. Side menu slides from the right, 1px gold hairline on its leading edge.

## Spacing rhythm

Screen padding 25px (16px on dense list screens). Card padding 14 to 20px. Gaps 8 / 10 / 12 / 16. Tab bar 60px, `#1a1a2e`, no top border, gold active tint, grey inactive.

## Voice in the UI

Labels are short and classical, never chirpy: "Cabinet", "Scrolls", "Know Thyself", "Always Present", "Starter". Counselor categories (stoics, warriors, athletes, builders, writers, spiritual) each have a tinted badge; challenge levels (direct, firm, gentle) too. Empty states are an italic quote in `#888`, centered, not an illustration.

## Do

- Reach for gold opacity before reaching for a new color.
- Let numbers and kickers carry hierarchy.
- Keep cards flat: borders, not shadows.
- Use italics for anything a counselor or author "says".

## Don't

- Introduce a second accent hue or gradients beyond the gold text gradient.
- Use pure black backgrounds or pure white cards.
- Use emoji as UI chrome on new screens (a few legacy pills and hero cards still do; the direction is Ionicons).
- Use dashes in interface copy; commas and colons instead.

## Files

- `tokens.json` / `tokens.css`: the values.
- `previews/`: one HTML card per concept, each opening with an `@dsCard` marker so the Claude Design pane can index it.
- `build.js`: regenerates `previews/` from the shared CSS and card definitions (`node docs/design-system/build.js`).
- `assets/icon.png`: the 1024px app icon.
