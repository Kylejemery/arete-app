# Arete Design System

**Arete: Know thyself.** Arete is a philosophical companion. A *cabinet of counselors* (Marcus Aurelius, Seneca, Epictetus, Future Self and others) answers in their own voice; there are morning and evening routines, a journal, a focus timer, a Library of primary texts, and an Academy of seminar-style courses. The design has to feel like a quiet study at night, not a productivity dashboard.

## Sources

This system was built entirely from one attached, read-only codebase:

- `arete-design-system/` (mounted local folder) — the shipped design-system docs folder from the product repo. Contents read:
  - `DESIGN.md` — the design language in prose (69 lines).
  - `tokens.json` / `tokens.css` — the authoritative values.
  - `previews/foundations/*.html`, `previews/components/*.html`, `previews/screens/*.html`, `previews/web/academy-web.html` — fifteen ground-truth HTML cards, each already carrying an `@dsCard` marker.
  - `assets/icon.png` — the 1024px app icon (copied to `assets/app-icon.png`).
  - Referenced but **not** present in the mount: the Expo app source, `web/`, `academy/web/`, and `build.js`. Every value here traces to `tokens.json`, `tokens.css`, or a preview file.

No Figma file, slide deck, or font binary was provided. Do not assume the reader has access to the mount.

## Products

| Surface | Scope class | Background | Card | Type |
|---|---|---|---|---|
| Mobile app (Expo, iOS/Android) | `:root` | `#1a1a2e` | `#16213e` | platform system sans |
| Web app v2 (`web/`) | `.web` | `#0f1724` | 4% white glass, 12px blur | Cormorant Garamond + Inter |
| Academy + Library (`academy/web/`) | `.academy`, `.library` | `#0a1628` | `#111d30` | Playfair Display (Academy), Cormorant Garamond (Library) |

Gold is identical in all three. The mobile paywall deliberately borrows the academy navy set — it is the one place the app feels editorial.

---

## CONTENT FUNDAMENTALS

**The voice is classical, dry, and specific.** It is the voice of someone who has read the books and is not going to perform about it. Nothing is chirpy, nothing is exclamatory, nothing congratulates the user.

- **Labels are short and classical, never product-speak.** "Cabinet", "Scrolls", "Know Thyself", "Always Present", "Starter", "The Cabinet", "Marginalia", "Dispatches", "Counselors", "Sessions". Not "My Space", "Insights Hub", "Get Started".
- **Casing:** sentence case for titles ("Today's question", "The full Cabinet", "Request a scroll"). Tracked UPPERCASE only for kickers, eyebrows, the wordmark, and academy buttons ("ARETE", "ENROLL", "BEST VALUE", "START"). Proper nouns of the product — Cabinet, Library, Academy, Future Self, Scrolls — are capitalised.
- **You, not I.** The app addresses the user in second person: "Your counselors, in session", "Let your counselors write to you each morning", "Keep the chain unbroken". The *counselors* speak in first person, and they are blunt: "You call it putting off. I would call it rehearsing his reaction, which is not yours to script."
- **No dashes in interface copy.** Commas and colons instead. This is an explicit rule from `DESIGN.md`. Middots separate metadata: "Stoic · direct", "Meditations · Marcus Aurelius", "Marcus · Seneca · Epictetus".
- **Counselor blurbs are honest, not promotional.** "Rich, compromised, honest about both." / "No wasted motion. The way is in training." / "Emperor who wrote to himself at night about how to be a decent man by morning." One or two sentences. Never a value proposition.
- **Waiting states are considered, not typing.** "Seneca is considering..." — keep that word.
- **Empty states are an italic quote or an italic sentence in `--muted`, centered. Never an illustration, never a mascot, never a call to action.** "Nothing else this week. Request a scroll from any counselor."
- **Numbers are stated flatly.** "14 day streak", "2 of 4 complete", "1h 12m", "7 days free, then your plan". No "Amazing! 14 days!"
- **Emoji:** effectively no. A few legacy pills and hero cards use a sun and moon (`☀️` `🌙`) in the morning/evening toggle; the stated direction is Ionicons. Do not add emoji to new screens.
- **Micro-copy examples worth copying verbatim in tone:** "Speak to your cabinet" (composer placeholder), "What should we call you?" (onboarding field), "Keep the chain unbroken" (streak note), "Read with the texts", "Sunday, with your counselors", "Billed through the App Store. Restore purchases · Terms · Privacy".

---

## VISUAL FOUNDATIONS

### One idea: ink and gold
Every surface is a deep blue-black; every point of emphasis is a single antique gold, `#c9a84c`. **There is no second accent.** Semantic hues (green, red, blue, purple) appear only for state. Gold is used at nine documented opacities from 5% to 53% for hairlines, tints and washes, so the UI reads tonal rather than colorful. **Reach for a gold opacity before reaching for a new color.**

### Color
- Ink: `#1a1a2e` app / `#0f1724` web / `#0a1628` academy. Never pure black, never a white card.
- Text: white → `#e0e0e0` body → `#e0d5b5` warm (anything a counselor or author says) → `#888` muted → `#555` faint.
- Category badges (six counselor schools) at 20% alpha with pastel text, challenge levels at 15%. These are the only non-gold hues used at any size.
- Insight purple (`#b39ddb` on `#241f3d`) marks a pattern the app noticed. Evening blue (`#4a6fa5`) marks the evening routine. Neither is decorative.

### Type
Mobile uses the platform system font: hierarchy comes from **weight, size and gold**, not a display face. Web and Academy add serifs — Cormorant Garamond (web app, Library), Playfair Display (Academy), Inter for UI, JetBrains Mono for code and small labels.
Two signature devices: **kickers** (10–11px bold uppercase gold, tracked 1.2–3px) and **numbers as heroes** (streak 52px, focus timer 72px tracked 4px, both bold gold). Quotes are italic 14/22 in warm off-white with a 3px gold left rule and a gold semibold attribution.

### Backgrounds and imagery
**Flat color. No photography ships in the source, no illustration, no pattern, no texture, no grain, no full-bleed image.** The only gradient permitted anywhere is `.text-gold-gradient` (135deg `#c9a84c` → `#e8c96a` → `#c9a84c`) applied to a single emphasised word in a web headline — never to a surface. If imagery is ever introduced, the tonal register to match is cool, dark and low-contrast; nothing warm or bright.

### Shape and corners
Radii step deliberately: 4 xs, 6 badge, 8 chip, 10 button, 12 card, 14 card lg, 16 panel, 18 sheet (top corners only), 20 hero, 999 pill. The Academy is the exception: cards are **2px — near square** — and its buttons are **0px**, which is what makes those pages read as academic rather than app-like.

### Cards, borders and shadows
**Cards are flat: 1px borders, no shadows. There is no shadow system in Arete — inner or outer.** A card is `#16213e` with a gold hairline at 13%, 20% or 27%. Emphasis escalates in three steps: a **3px gold left rule** (quotes, prompts, affirmations) → a **solid gold 1–2px border** (selected, active) → **full inversion to a solid gold fill with ink text** (a completed task). Dashed 27% gold hairlines are add-something affordances.

### Buttons and states
Primary is a solid gold fill with ink text, bold, 10–14px radius; tall CTAs are 16–18px vertical padding at 17px bold. Secondary is gold text on 13% gold with a 53% gold border. Tertiary is bare muted text with no chrome. Destructive is `#ff4444`.
- **Hover** is not a native idiom here (the primary product is a phone app). On web, hover lightens gold toward `--gold-light` (`#e3c77a`) or raises a gold tint one step on the opacity ladder. Never darken, never shift hue.
- **Press** is the same tint escalation, one step up; nothing scales or bounces.
- **Disabled** is 50% opacity, except the composer send key, which goes to a surface fill with a `--faint` border and glyph.
- **Selected** is always a border change, never a fill change (the completed-task inversion is a state, not a selection).

### Animation
Restrained to the point of near-absence. The source ships **no keyframes, no bounce, no spring, no parallax.** The motion that exists is structural: sheets slide up from the bottom, the side menu slides in from the right, the "considering" indicator is a gold three-quarter ring. Use short linear or ease-out fades and slides (150–250ms). Nothing overshoots. Nothing draws attention to itself.

### Transparency and blur
One place only: the **web app v2** glass surface — 4% white fill, 8% white border, `blur(12px)`. Mobile and Academy surfaces are fully opaque. Scrims are flat black at 55% / 65% / 75%; there are no protection gradients anywhere, because there is no imagery to protect text against. Capsules (pills, chips, wells) do the job gradients would.

### Layout
Screen padding 25px, 16px on dense list screens, with 52–56px of top inset for the status bar. Card padding 14–20px. Gaps step 8 / 10 / 12 / 16. Fixed elements: the 60px bottom tab bar (ink, **no top border**, gold active tint, grey inactive, 9px labels), the chat composer pinned above it, and a screen header that may carry a 13% gold bottom hairline when tabs follow. The device shell used throughout the previews is 375px wide with a 32px radius.

### Iconography
See ICONOGRAPHY below.

---

## ICONOGRAPHY

- **The set is Ionicons, outline variants**, per `tokens.json` (`"set": "Ionicons (outline variants)"`). Filled variants are used **only for state**: `flame` (streak), `checkmark-circle` (done), `lock-closed` (paid).
- **What ships in the source:** no icon font, no SVG sprite, no PNG icon set. The fifteen preview files draw each glyph as **inline SVG paths** — 24×24 viewBox, `stroke: currentColor`, `fill: none`, `stroke-width: 1.8` inline and `1.7` in the tab bar, round caps and joins. Those exact paths have been lifted into `components/icons/Icon.jsx` as `areteGlyphs`, so the system carries the source's own geometry rather than a substitute. **Use `<Icon name="…" />`; never hand-draw a new glyph.**
- Glyphs available: `home`, `sunny`, `moon`, `mic`, `book`, `library`, `newspaper`, `trophy`, `send`, `checkmark`, `add`, `close`, `chevronForward`, `search`, `flame`, `lockClosed`.
- **If you need a glyph outside that list**, take it from Ionicons (outline) — `https://unpkg.com/ionicons@7/dist/svg/<name>-outline.svg`, or the `ionicons` web component from CDN — matching stroke weight. This is the source's own set, not a substitution.
- **Icon wells** are the brand's dominant icon container: 38–48px circles, 8–15% gold fill, 20–30% gold hairline, gold glyph. 38/40 in menu rows, 44 standalone, 48 holding a counselor's initial letter.
- **Unicode as icons:** a gold `✓` for counselor selection, `“` at 40–44px as the quote glyph, `·` as the universal metadata separator, `←` in academy back links. Small caps (`font-variant: small-caps`) mark the counselor roster line.
- **Emoji:** sun and moon in the legacy morning/evening toggle only. Do not extend.
- **Brand mark:** **no logotype or logo file exists in the source.** The wordmark is set in plain type — `ARETE` at 13px/800 tracked 3px in gold, or `Arete` at 13px/700 tracked 2px uppercase in the side panel. `assets/app-icon.png` is the 1024px app icon and is the only brand image available. Nothing here was drawn or reconstructed.

---

## Index

Root manifest:

| File | What it is |
|---|---|
| `styles.css` | Global entry. `@import` lines only — link this one file. |
| `tokens/fonts.css` | Font families + the Google Fonts import for the four webfonts. |
| `tokens/colors.css` | Gold, the gold alpha ladder, text ink, semantic state, category and level badges, scrims. |
| `tokens/surfaces.css` | `:root` (app) plus the `.web`, `.academy`, `.library` scope overrides. |
| `tokens/typography.css` | Size, line-height, tracking and weight scales. |
| `tokens/shape.css` | Radii, border widths, blur. |
| `tokens/spacing.css` | Spacing steps and layout constants. |
| `thumbnail.html` | Homepage tile. |
| `readme.md` | This file. |
| `SKILL.md` | Agent-skill front matter for use outside this project. |
| `assets/app-icon.png` | 1024px app icon, copied from the source. |
| `guidelines/*.html` | 19 foundation specimen cards (Colors, Type, Shape, Spacing, Brand). |

### Components

`components/actions/` — **Button**, **IconButton**
`components/icons/` — **Icon**, **IconWell**
`components/display/` — **Kicker**, **Card**, **QuoteCard**, **PromptCard**, **StreakCard**, **StatTile**, **Badge**, **StreakPill**, **DispatchCard**, **InsightCard**, **ReflectionCard**, **PlanCard**, **ShareCard**
`components/forms/` — **Input**, **SearchBar**, **TaskRow**, **EditCard**, **ProgressBar**
`components/navigation/` — **Chip**, **SegmentedTabs**, **UnderlineTabs**, **TabBar**, **RoutineToggle**, **ScreenHeader**, **MenuRow**, **SidePanel**
`components/chat/` — **ChatBubble**, **TypingIndicator**, **Composer**
`components/cabinet/` — **CounselorCard**, **CabinetPill**, **CounselorRow**
`components/data/` — **WeekStrip**
`components/overlay/` — **BottomSheet**, **PhoneFrame**
`components/editorial/` — **GoldRule**, **GoldGradientText**, **AcademyButton**, **AcademyCard**, **GlassCard**
`components/agora/` — **EssayRow**, **Comment**, **CommentComposer**, **SubmissionNotice**, **EssayIndexCard**

Every component has a sibling `.d.ts` (props contract) and `.prompt.md` (what and when, with a usage example). Each directory has one `@dsCard` HTML showing its states.

`components/agora/` is the one group with **no counterpart in the source**: it was added for The Agora, a new essays-with-comments surface requested after the system was built. Its values are taken entirely from existing patterns (hairline cards, the 3px accent rule for anything a counselor says, the dashed gold affordance for a locked action, academy 2px cards for the web index). See "The Agora" below.

The rest of the inventory is the inventory the source defines — each family appears in `previews/components/*.html`, `previews/screens/*.html` or `previews/web/academy-web.html`.

**Intentional additions** (not families in the source, added because the source's own markup repeats them verbatim):

- **Icon** — a wrapper over the inline SVG paths the previews repeat in every file. Without it every consumer would re-paste path data.
- **IconWell** — the 38–48px gold circle, repeated in five preview files with identical values.
- **PhoneFrame** — the 375px device shell every preview screen is composed inside.
- **Kicker / StreakPill / GoldRule / GoldGradientText** — one-line brand details repeated across previews with fixed values.

### UI kits

| Kit | Screens |
|---|---|
| `ui_kits/mobile_app/` | Home, Morning, Cabinet (chat / counselors / sessions), Journal, Focus, Scrolls, Progress, the Agora (feed, essay with comments, write and submit), side menu, evening sheet, paywall. Click-through: switch tabs, tick routine tasks, send a message and get a reply, open a locked counselor or the locked comment box to trigger the paywall. |
| `ui_kits/academy_web/` | Academy home, the Agora (essay index, reader with comments, topic page, submit form), course page with syllabus, web app v2 (glass Cabinet replay), Library reader with marginalia. Click-through via the top nav. |

## Caveat: fonts

No font binaries ship with the source. The four families (Cormorant Garamond, Playfair Display, Inter, JetBrains Mono) are loaded from Google Fonts, exactly as the source previews do — these are the real families, not substitutions. The mobile app uses the platform system font (`SF Pro Text` on iOS) and loads no webfont; that family has no `@font-face` here by design.


---

## The Agora (new surface, not in the source)

An essays-and-comments section, added after this system was built from the source. Decisions as specified:

- **Name:** The Agora. `Scrolls` stays reserved for counselor dispatches.
- **Publishing:** any subscriber can submit; an editor approves before an essay appears. `SubmissionNotice` carries the four states: draft, in review, published, returned.
- **Authorship:** name only. **No avatars, no initial wells for essay authors** — the source has no profile imagery, and the initial well belongs to counselors.
- **Comments:** a flat list under the essay. A counselor invited to answer gets the italic-plus-3px-gold-rule treatment the system reserves for anything a counselor says; readers get neither.
- **Paywall:** reading is free, commenting is not. `CommentComposer locked` renders the dashed gold affordance and opens the paywall rather than greying out a field.
- **Web idiom:** academy navy with Playfair Display. Essay bodies run at 18px / 1.8 in parchment `#e8d9b0`; index cards keep the 2px academy radius.
- **App placement:** the tab bar is already full at eight tabs, so the Agora is reached from the side menu. Change this if you would rather it replace a tab.
