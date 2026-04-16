Onboarding Agent
Replace the Know Thyself form with a conversational AI interview that auto-populates the user profile.
Overview
On first launch, instead of presenting a form, the app opens a conversational flow powered by the Anthropic API. The agent conducts a natural interview that mirrors the Know Thyself questions. When it determines it has sufficient signal, it calls a generate_profile tool with structured output that maps directly to the Know Thyself form fields. The user never sees the tool mechanics. The form is pre-populated and editable after the interview.
UX flow
First launch
→
Conversational interview
→
Profile generated
→
Know Thyself pre-filled
→
User confirms / edits
→
Enter app
Agent behavior
— Conducts a warm, conversational interview covering all Know Thyself questions
— Questions are conversational, not form-like — the agent should feel like a thoughtful intake conversation
— Decides autonomously when it has sufficient signal across all fields before calling the tool
— Uses a completeness_score (0–1) internally; only calls generate_profile when score is above threshold
— Never exposes tool mechanics to the user
— Stores results to the user's Supabase profile record
— Form fields remain fully editable after population
Output fields — maps to Know Thyself form
Field
Description
background
Career path, where they live, major life moments
professional_role
What they do, their organization, relevant context
life_situation
Family, location, daily structure
strengths
What is working — capabilities, practices, traits
weaknesses
What they want to improve; honest self-assessment
failure_modes
What tends to derail them; recurring patterns
feedback_preference
Tough love / nurturing / Socratic / mix
professional_goals
Top 3 professional goals right now
personal_goals
Top 3 personal goals right now
big_audacious_goal
The goal that feels almost too big to say out loud
app_usage_intent
How they want to use Arete — check-ins, coaching, tracking
accountability_style
How they want the cabinet to handle shortfalls
recommended_readings
3–5 books or resources matched to their profile and goals. Use web search tool to find relevant, current recommendations.
archetype
Stoic archetype: Emperor / Exile / Seeker / Builder
completeness_score
0–1 float. Agent internal use only. Do not display to user. Only call generate_profile when above 0.85.
Tech implementation
Model
claude-sonnet-4-20250514 via Anthropic API (existing backend on Railway)
Pattern
Tool use loop. Stream conversation turns until the agent calls generate_profile. On tool call: parse structured JSON, write to user profile in Supabase, transition to pre-filled Know Thyself form.
Recommended readings — web search
Pass the web search tool to the API call. Agent uses it to find current, relevant book and resource recommendations matched to the user's stated goals and interests. Do not hardcode reading lists.
Trigger condition
Runs once on first launch only. Check profiles.know_thyself_complete boolean. If false → onboarding agent. If true → normal app entry. Set flag to true after user confirms the pre-filled form.
Storage
Results written to the existing profiles table in Supabase. All fields editable post-onboarding via the Know Thyself screen.
Out of scope (v1)
— Personalized journal prompt (tabled — risk of generic output outweighs value at this stage)
— Re-running the interview (user edits profile manually after first run)
— Multi-session onboarding (single conversation, completes in one sitting)