# UI kit: Arete mobile app

A click-through recreation of the Expo app, composed from this system's components. Open `index.html`.

Screens, and the source file each was recreated from:

| Screen | File | Source |
|---|---|---|
| Home | `HomeScreen.jsx` | `previews/screens/home.html` |
| Morning | `MorningScreen.jsx` | `previews/screens/morning.html` |
| Cabinet (chat, counselors, sessions) | `CabinetScreen.jsx` | `previews/screens/cabinet.html`, `previews/components/chat.html`, `previews/components/counselor-card.html` |
| Focus | `FocusScreen.jsx` | `previews/screens/focus.html` |
| Journal | `JournalScreen.jsx` | `previews/components/cards.html`, `chips-tabs.html`, `inputs.html`, `list-rows.html` |
| Paywall | `PaywallScreen.jsx` | `previews/screens/paywall.html` |
| The Agora: feed, essay with comments, write and submit | `AgoraScreen.jsx`, `EssayScreen.jsx`, `ComposeEssayScreen.jsx` | new surface, no source preview |
| Scrolls, Progress, evening sheet, side menu | `App.jsx` | `previews/components/cards.html`, `inputs.html`, `list-rows.html` |

## What works

- All eight tabs switch.
- Morning: tick tasks (the card inverts to gold), watch the progress bar move, add a task via the dashed affordance and the in-place editor.
- Cabinet: send a message and a counselor replies after a "considering" pause; the Counselors tab toggles your cabinet; tapping a locked counselor opens the paywall.
- Focus: a working 25 minute timer.
- Home: the header icon opens the side menu; "Evening reflection" opens the bottom sheet.
- The Agora: reached from the side menu (the tab bar is full). Filter the feed, open an essay, read the counselor's invited answer, tap the locked comment box to hit the paywall, or write and submit an essay for review.

## What is deliberately blank

Journal, Scrolls and Progress do not exist as preview screens in the source. They are assembled **only** from card and row components the source does define (reflection, insight, dispatch, week strip, chips, search). Nothing new was designed for them. If you need those screens exactly, get the real app source.
