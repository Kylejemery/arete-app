# Arete Onboarding Agent — Claude Code Instructions

## Overview

Replace the static Know Thyself form with a conversational AI agent that interviews new users on first launch and auto-populates their profile. The user has a natural conversation; the agent extracts and structures the data behind the scenes using tool use.

---

## What You Are Building

A first-launch onboarding flow powered by the Anthropic API. The agent conducts a warm, conversational interview that covers all 12 Know Thyself questions. When it has sufficient signal across all fields, it calls a `generate_profile` tool with structured JSON output. That output is written to the user's Supabase profile record and pre-populates the Know Thyself form for review and editing before the user enters the app.

This runs **once only** — on first launch when `profiles.know_thyself_complete` is `false`.

---

## UX Flow

```
First launch
  → Check profiles.know_thyself_complete
  → If false: open OnboardingAgent screen
  → Conversational interview (natural chat UI)
  → Agent calls generate_profile tool internally
  → Parse structured JSON from tool call
  → Write fields to profiles table in Supabase
  → Transition to KnowThyself screen (pre-filled, editable)
  → User reviews and confirms
  → Set profiles.know_thyself_complete = true
  → Enter app normally
```

---

## Database Changes Required

### 1. Add `know_thyself_complete` to profiles table

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS know_thyself_complete boolean DEFAULT false;
```

### 2. Add onboarding output fields to profiles table

Add any of the following columns that do not already exist:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS background text,
ADD COLUMN IF NOT EXISTS professional_role text,
ADD COLUMN IF NOT EXISTS life_situation text,
ADD COLUMN IF NOT EXISTS strengths text,
ADD COLUMN IF NOT EXISTS weaknesses text,
ADD COLUMN IF NOT EXISTS failure_modes text,
ADD COLUMN IF NOT EXISTS feedback_preference text,
ADD COLUMN IF NOT EXISTS professional_goals text,
ADD COLUMN IF NOT EXISTS personal_goals text,
ADD COLUMN IF NOT EXISTS big_audacious_goal text,
ADD COLUMN IF NOT EXISTS app_usage_intent text,
ADD COLUMN IF NOT EXISTS accountability_style text,
ADD COLUMN IF NOT EXISTS recommended_readings jsonb,
ADD COLUMN IF NOT EXISTS archetype text;
```

Create a timestamped migration file (e.g. `20260327000001_onboarding_agent_fields.sql`) and apply via the Supabase SQL editor.

---

## Agent System Prompt

Use this as the system prompt for the onboarding agent API call:

```
You are the onboarding guide for Arete — an app built on Stoic philosophy to help people become the best version of themselves. Your job is to conduct a warm, thoughtful intake interview with a new user.

Your goal is to gather enough information to populate their profile across all of the following areas:
- Background and life story (career path, major life moments, where they live)
- Professional role and what they do
- Current life situation (family, daily structure, relevant context)
- Strengths — what is working for them
- Weaknesses — what they want to improve
- Failure modes — what tends to derail them
- Feedback preference — tough love, nurturing, Socratic, or a mix
- Top 3 professional goals
- Top 3 personal goals
- Big audacious goal — the one that feels almost too big to say out loud
- How they want to use the app (check-ins, coaching, tracking)
- How they want the cabinet to handle it when they fall short
- Any topics that are off-limits

Guidelines:
- Ask questions conversationally, not as a form. One or two questions at a time.
- Be warm but purposeful. This is an intake conversation, not small talk.
- Ask follow-up questions when an answer is vague or incomplete.
- Do not ask all questions at once. Let the conversation flow naturally.
- Track a completeness_score internally (0.0 to 1.0) across all required fields.
- Only call the generate_profile tool when completeness_score is above 0.85.
- Never mention the tool, the score, or any technical mechanics to the user.
- When you call generate_profile, do so silently — do not tell the user you are generating their profile.
```

---

## Tool Definition

Pass this tool to the Anthropic API call:

```typescript
const tools = [
  {
    name: "generate_profile",
    description: "Called when the agent has gathered sufficient information across all profile fields. Generates a structured profile from the conversation. Only call this when completeness_score is above 0.85.",
    input_schema: {
      type: "object",
      properties: {
        background: {
          type: "string",
          description: "Career path, where they live, major life moments — broad strokes"
        },
        professional_role: {
          type: "string",
          description: "What they do professionally, their role, organization, relevant context"
        },
        life_situation: {
          type: "string",
          description: "Family, location, daily structure, anything relevant to their current life"
        },
        strengths: {
          type: "string",
          description: "What is working for them — capabilities, practices, traits they identified"
        },
        weaknesses: {
          type: "string",
          description: "What they want to improve; honest self-assessment from the conversation"
        },
        failure_modes: {
          type: "string",
          description: "What tends to derail them; recurring patterns they named"
        },
        feedback_preference: {
          type: "string",
          description: "How they want to receive feedback — tough love, nurturing, Socratic, or a mix"
        },
        professional_goals: {
          type: "string",
          description: "Top 3 professional goals right now"
        },
        personal_goals: {
          type: "string",
          description: "Top 3 personal goals right now"
        },
        big_audacious_goal: {
          type: "string",
          description: "The goal that feels almost too big to say out loud — their biggest long-term ambition"
        },
        app_usage_intent: {
          type: "string",
          description: "How they want to use Arete — check-ins, coaching, tracking, accountability"
        },
        accountability_style: {
          type: "string",
          description: "How they want the cabinet to handle it when they fall short"
        },
        recommended_readings: {
          type: "array",
          description: "3 to 5 books or resources matched to their goals and interests. Use web search to find current, relevant recommendations. Do not hardcode.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              author: { type: "string" },
              reason: { type: "string", description: "One sentence: why this is relevant to this specific user" }
            },
            required: ["title", "author", "reason"]
          }
        },
        archetype: {
          type: "string",
          enum: ["Emperor", "Exile", "Seeker", "Builder"],
          description: "Stoic archetype that best fits this user based on the conversation"
        },
        completeness_score: {
          type: "number",
          description: "Internal score 0.0 to 1.0 representing how complete the profile is. Only call this tool when above 0.85. Do not display this value to the user."
        }
      },
      required: [
        "background",
        "professional_role",
        "life_situation",
        "strengths",
        "weaknesses",
        "failure_modes",
        "feedback_preference",
        "professional_goals",
        "personal_goals",
        "big_audacious_goal",
        "app_usage_intent",
        "accountability_style",
        "recommended_readings",
        "archetype",
        "completeness_score"
      ]
    }
  }
];
```

---

## API Call Pattern

Enable web search so the agent can generate relevant reading recommendations:

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: ONBOARDING_SYSTEM_PROMPT,
  tools: [
    ...tools,
    {
      type: "web_search_20250305",
      name: "web_search"
    }
  ],
  messages: conversationHistory
});
```

---

## Tool Use Loop

Handle the response to detect when `generate_profile` is called:

```typescript
for (const block of response.content) {
  if (block.type === "tool_use" && block.name === "generate_profile") {
    const profileData = block.input;
    await writeProfileToSupabase(profileData);
    // Transition to pre-filled KnowThyself screen
    navigation.navigate("KnowThyself", { prefilled: profileData });
    return;
  }

  if (block.type === "text") {
    // Append agent message to conversation UI
    appendAgentMessage(block.text);
  }
}
```

---

## Writing to Supabase

```typescript
async function writeProfileToSupabase(profileData: GeneratedProfile) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      background: profileData.background,
      professional_role: profileData.professional_role,
      life_situation: profileData.life_situation,
      strengths: profileData.strengths,
      weaknesses: profileData.weaknesses,
      failure_modes: profileData.failure_modes,
      feedback_preference: profileData.feedback_preference,
      professional_goals: profileData.professional_goals,
      personal_goals: profileData.personal_goals,
      big_audacious_goal: profileData.big_audacious_goal,
      app_usage_intent: profileData.app_usage_intent,
      accountability_style: profileData.accountability_style,
      recommended_readings: profileData.recommended_readings,
      archetype: profileData.archetype,
      // do not write completeness_score — internal only
    })
    .eq("id", user.id);

  if (error) throw error;
}
```

---

## Setting `know_thyself_complete`

Set this flag **after** the user reviews and confirms the pre-filled Know Thyself form — not immediately after the interview:

```typescript
async function confirmOnboarding() {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from("profiles")
    .update({ know_thyself_complete: true })
    .eq("id", user.id);

  navigation.navigate("Home");
}
```

---

## Trigger Condition

In the root layout or auth handler, after the user is authenticated:

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("know_thyself_complete")
  .eq("id", user.id)
  .single();

if (!profile?.know_thyself_complete) {
  navigation.navigate("OnboardingAgent");
} else {
  navigation.navigate("Home");
}
```

---

## Files to Create

```
app/
  onboarding/
    index.tsx          ← OnboardingAgent screen (conversational chat UI)
    confirm.tsx        ← KnowThyself pre-fill review screen

lib/
  onboardingAgent.ts   ← API call logic, tool use loop, writeProfileToSupabase

types/
  onboarding.ts        ← GeneratedProfile type matching tool output schema
```

Use the existing cabinet conversation UI as the reference for the chat interface — same navy/gold design language, same message bubble pattern.

---

## Out of Scope (v1)

- Personalized journal prompt — tabled
- Re-running the interview after first completion (user edits profile manually via Know Thyself screen)
- Multi-session onboarding — completes in a single conversation

---

## Definition of Done

- [ ] Migration applied — `know_thyself_complete` and all profile fields added to `profiles` table
- [ ] `OnboardingAgent` screen renders a working chat UI
- [ ] Agent conducts a full conversational interview covering all 12 Know Thyself areas
- [ ] `generate_profile` tool is called correctly when completeness threshold is met
- [ ] Profile fields written to Supabase on tool call
- [ ] Know Thyself screen pre-populates from profile data and is fully editable
- [ ] `know_thyself_complete` set to `true` after user confirms
- [ ] New users are routed to onboarding on first launch; returning users bypass it
- [ ] `completeness_score` never displayed to the user
- [ ] Web search used for `recommended_readings` — no hardcoded lists
- [ ] Tested with a second test account (free tier)
