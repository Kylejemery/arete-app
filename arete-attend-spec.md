# Attend — Attention Coaching via the Cabinet of Invisible Counselors

**Feature Specification · v2.0 · March 2026**

---

## 1. Overview

Attend is a feature within the Arete app that helps users understand and reduce their phone use through AI-powered pattern recognition and conversational coaching. Rather than a standalone coach, Attend integrates directly into the existing **Cabinet of Invisible Counselors** — any Cabinet member can access the user's Screen Time context and respond in their own voice, grounded in their own philosophy.

This means a user can ask Marcus Aurelius why they keep reaching for their phone at 10pm and receive a response that is both informed by *Meditations* and aware that they've done it five nights running.

> *"You have power over your mind, not outside events. Realize this, and you will find strength."*
> — Marcus Aurelius

Attend treats phone overuse not as a discipline failure, but as a pattern to understand and redirect — entirely consistent with Arete's core thesis: **be who you want to be.**

---

## 2. Core Concept: Cabinet Integration (Option B)

### 2.1 How It Works

- The user opts into Screen Time data sharing within Arete settings
- A **usage context block** is derived from local Screen Time data and injected into the system prompt of whichever Cabinet counselor the user is speaking with
- Every counselor can see the same underlying data, but responds through their own lens
- No new UI surface is required for the coaching conversation — it happens inside the existing Cabinet chat

### 2.2 Why This Is Better Than a Standalone Coach

| Standalone "Attend Coach" | Cabinet Integration |
|---|---|
| New persona to onboard | Familiar counselors the user already trusts |
| Generic wellness voice | Distinct philosophical voices grounded in real thought |
| Separate feature silo | Deepens the existing Cabinet feature |
| One coaching style | Multiple perspectives on the same data |

### 2.3 Example Interactions

**Marcus Aurelius**, seeing 67 pickups/day and a 10pm Instagram spike:
> *"You tell me you wish to live with more purpose, yet you hand your evenings to a small glass rectangle. Not from necessity — from habit. What would it cost you to sit with the discomfort for five minutes instead?"*

**Seneca**, seeing the same data:
> *"Reckon up the days you have squandered. They are gone. The question is not how many hours Instagram stole — it is how many you surrendered without resistance. Begin now."*

**A modern productivity counselor**, seeing the same data:
> *"Your best phone-free block this week was Tuesday 2–4:30pm. Something was different that afternoon. What was it?"*

---

## 3. Feature Scope

### 3.1 Core Modules

| Module | Description | Priority |
|---|---|---|
| Screen Time Context Injection | Derive usage summary and inject into Cabinet system prompt | P0 |
| Pattern Dashboard | Visual summary of usage patterns, triggers, and trends | P0 |
| Weekly Review Letter | AI-narrated weekly letter, written in the voice of a chosen counselor | P1 |
| Goal Setting | User-defined intentions that inform counselor tone and thresholds | P1 |
| Friction Layer | Optional pause prompt (counselor quote) before opening flagged apps | P2 |
| Usage Insights | Deeper analytics: app-by-app breakdown, time-of-day heatmap | P2 |

### 3.2 Out of Scope (v1)

- Hard app blocking or parental controls
- Cross-device sync (iOS only for v1)
- Social or accountability features
- Integration with Apple Health beyond Screen Time

---

## 4. Data & Permissions

### 4.1 iOS Screen Time API

Attend uses Apple's Screen Time API (Family Controls / Device Activity frameworks) to access usage data on-device. All raw data is processed locally — it is never transmitted to any server.

> **Privacy principle:** Raw Screen Time data never leaves the device. Only anonymized, aggregated summaries are used in counselor prompts sent to the Anthropic API.

### 4.2 Required Permissions

| Permission | Purpose |
|---|---|
| `com.apple.developer.family-controls` | Screen Time API access — **requires Apple entitlement request, submit early (1–2 week approval)** |
| Device Activity Monitor | Real-time usage monitoring and trigger detection |
| Local Notifications | Weekly review alerts and optional friction layer prompts |
| Background App Refresh | Process pattern data and prepare weekly summaries |

### 4.3 Data Storage

- Usage summaries stored in encrypted local SQLite via `expo-secure-store`
- Conversation history stored locally; optionally synced to iCloud
- No raw usage data sent to Anthropic API — only derived summaries
- Users can delete all Attend data from Settings at any time

---

## 5. Context Injection Architecture

### 5.1 Usage Context Block

At the start of each Cabinet session (or on first message after a new day), a context block is derived from the local usage database and appended to the counselor's existing system prompt.

```
[ATTEND CONTEXT — injected when Screen Time sharing is enabled]

Usage this week:
- Daily average: 4.2 hrs (↓ 18 min from last week)
- Peak window: 9–11pm, avg 1.4 hrs
- Most opened app: Instagram — 23 opens/day, avg session 4m 12s
- Pickups: 67/day
- Identified triggers: pre-sleep anxiety, transition moments, morning drift
- Best phone-free streak: 2.5 hrs (Tue 2–4:30pm)
- Last Attend check-in: 3 days ago

[END ATTEND CONTEXT]
```

### 5.2 Counselor System Prompt Augmentation

Each counselor's existing system prompt is extended with an Attend instruction block:

```
If the user asks about phone use, attention, distraction, or screen time — or if 
their usage patterns are relevant to the current conversation — you may reference 
the ATTEND CONTEXT above. Respond in your own voice and philosophical tradition. 
Do not mention "Screen Time" or "Attend" by name — simply speak to what you observe 
about the user's habits as if you have been watching.
```

### 5.3 Conversation Memory

| Layer | Contents |
|---|---|
| Active context (injected) | This week's usage stats, top triggers, goals |
| Recent history (10 turns) | Last 10 counselor/user message pairs verbatim |
| Long-term summary (AI-generated) | Key themes and patterns from past weeks |
| User-stated goals | Explicit intentions set in Goal Setting module |

---

## 6. Screen Specifications

### 6.1 Pattern Dashboard

**Purpose:** Home screen for Attend. Shows users a clear, non-shaming picture of their week.

**Components:**
- Stat cards: daily average, peak window, most-used app, best phone-free streak, week-over-week delta
- Pickup heatmap: 7-day × 18-hour grid showing pickup density
- Trigger list: top 3 identified behavioral triggers with plain-language explanations
- Sparkline: daily average over 4 weeks

**Design notes:**
- Use green/teal for improvement, warm amber for focus areas — avoid red or alarm language
- Trigger copy should read as observation, not judgment ("Usage spikes 9–11pm" not "You waste 2 hours at night")
- Entry point to Cabinet chat should be prominent: "Ask a counselor about this →"

### 6.2 Weekly Review Letter

**Purpose:** Every Sunday evening, a chosen counselor writes the user a personal letter narrating their week — grounded in usage data but written in their voice.

**Letter structure:**
1. Opening: 1–2 sentence acknowledgment of the week
2. What was observed: 2–3 specific pattern observations
3. What shifted: improvements or new patterns vs. prior weeks
4. One question to sit with: a single reflective prompt tied to the counselor's philosophy

**No action items. No task lists. Purely reflective.**

**Delivery:**
- Push notification Sunday ~7pm local time (opt-in, configurable)
- Letters saved locally in a Review History tab within the Cabinet

### 6.3 Friction Layer (P2)

**Purpose:** Optional pause before opening a flagged app. Instead of a generic "are you sure?" prompt, a brief quote or question from a chosen counselor appears for 5–8 seconds.

**Example (Marcus Aurelius, user opening Instagram at 10:45pm):**
> *"Is this worthy of the time remaining to you?"*

---

## 7. React Native Implementation Notes

### 7.1 Key Libraries

| Library / API | Use |
|---|---|
| `expo-family-controls` | Screen Time API access (requires Apple entitlement) |
| `expo-device-activity` | Real-time usage monitoring and pickup detection |
| `expo-sqlite` | Local storage of usage summaries and conversation history |
| `expo-secure-store` | Encrypted storage for sensitive user data |
| `expo-notifications` | Weekly review and friction layer prompts |
| `@anthropic-ai/sdk` | Cabinet counselor API calls (already integrated) |
| `react-native-reanimated` | Heatmap and chart animations |

### 7.2 Apple Entitlement — Act Early

> ⚠️ The Screen Time API requires `com.apple.developer.family-controls` — a special entitlement that must be requested via the Apple Developer portal. This is separate from standard App Store review. **Submit the request before you're ready to build** — approval typically takes 1–2 weeks.

### 7.3 Arete Integration Points

- Attend settings live under a new **Attend** section in the existing Arete Settings screen
- Pattern Dashboard added as a tab within the existing Cabinet navigation (or as a home screen widget)
- No new design language needed — use existing Arete tokens (navy, gold, serif type)
- Onboarding step connects Screen Time opt-in to the user's existing Arete goals

---

## 8. Phased Rollout

| Phase | Scope | Target |
|---|---|---|
| Phase 1 — Foundation | Screen Time context injection + Pattern Dashboard. Cabinet counselors can reference usage data in conversation. | Q3 2026 |
| Phase 2 — Depth | Weekly Review letter in counselor's voice. Goal Setting. Long-term coaching memory summarization. | Q4 2026 |
| Phase 3 — Friction | Optional pause layer with counselor quotes. Deeper analytics. iCloud sync for review history. | Q1 2027 |

---

## 9. Open Questions

- **Which counselors should be "Attend-aware" by default?** All of them, or only those whose philosophy naturally touches attention and distraction (Marcus Aurelius, Seneca, Cal Newport, etc.)?
- **Onboarding baseline:** Require 1–2 weeks passive data collection before context injection activates, or allow manual self-report to start sooner?
- **Weekly Review counselor:** Should the user choose who writes their weekly letter, or should it rotate?
- **Monetization:** Included in base Arete subscription, or a premium add-on given the Screen Time entitlement complexity?

---

*Spec drafted March 2026. Working prototypes exist for Pattern Dashboard and Cabinet coaching conversation. Next step: Apple entitlement request + Screen Time API spike on a real device.*
