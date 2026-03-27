import { supabase } from './supabase';
import type { GeneratedProfile } from '@/types/onboarding';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const ONBOARDING_SYSTEM_PROMPT = `You are the onboarding guide for Arete — an app built on Stoic philosophy to help people become the best version of themselves. Your job is to conduct a warm, thoughtful intake interview with a new user.

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
- When you call generate_profile, do so silently — do not tell the user you are generating their profile.`;

const GENERATE_PROFILE_TOOL = {
  name: 'generate_profile',
  description:
    'Called when the agent has gathered sufficient information across all profile fields. Generates a structured profile from the conversation. Only call this when completeness_score is above 0.85.',
  input_schema: {
    type: 'object',
    properties: {
      background: {
        type: 'string',
        description: 'Career path, where they live, major life moments — broad strokes',
      },
      professional_role: {
        type: 'string',
        description: 'What they do professionally, their role, organization, relevant context',
      },
      life_situation: {
        type: 'string',
        description: 'Family, location, daily structure, anything relevant to their current life',
      },
      strengths: {
        type: 'string',
        description: 'What is working for them — capabilities, practices, traits they identified',
      },
      weaknesses: {
        type: 'string',
        description: 'What they want to improve; honest self-assessment from the conversation',
      },
      failure_modes: {
        type: 'string',
        description: 'What tends to derail them; recurring patterns they named',
      },
      feedback_preference: {
        type: 'string',
        description:
          'How they want to receive feedback — tough love, nurturing, Socratic, or a mix',
      },
      professional_goals: {
        type: 'string',
        description: 'Top 3 professional goals right now',
      },
      personal_goals: {
        type: 'string',
        description: 'Top 3 personal goals right now',
      },
      big_audacious_goal: {
        type: 'string',
        description:
          'The goal that feels almost too big to say out loud — their biggest long-term ambition',
      },
      app_usage_intent: {
        type: 'string',
        description:
          'How they want to use Arete — check-ins, coaching, tracking, accountability',
      },
      accountability_style: {
        type: 'string',
        description: 'How they want the cabinet to handle it when they fall short',
      },
      recommended_readings: {
        type: 'array',
        description:
          '3 to 5 books or resources matched to their goals and interests based on your knowledge.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            reason: {
              type: 'string',
              description: 'One sentence: why this is relevant to this specific user',
            },
          },
          required: ['title', 'author', 'reason'],
        },
      },
      archetype: {
        type: 'string',
        enum: ['Emperor', 'Exile', 'Seeker', 'Builder'],
        description:
          'Stoic archetype that best fits this user based on the conversation',
      },
      completeness_score: {
        type: 'number',
        description:
          'Internal score 0.0 to 1.0 representing how complete the profile is. Only call this tool when above 0.85. Do not display this value to the user.',
      },
    },
    required: [
      'background',
      'professional_role',
      'life_situation',
      'strengths',
      'weaknesses',
      'failure_modes',
      'feedback_preference',
      'professional_goals',
      'personal_goals',
      'big_audacious_goal',
      'app_usage_intent',
      'accountability_style',
      'recommended_readings',
      'archetype',
      'completeness_score',
    ],
  },
};

export interface OnboardingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type OnboardingResult =
  | { type: 'message'; text: string }
  | { type: 'profile'; data: GeneratedProfile };

export async function sendOnboardingMessage(
  messages: OnboardingMessage[]
): Promise<OnboardingResult> {
  const response = await fetch(`${API_BASE_URL}/api/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages,
      tools: [GENERATE_PROFILE_TOOL],
    }),
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {}
    throw new Error(`Server error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  for (const block of data.content || []) {
    if (block.type === 'tool_use' && block.name === 'generate_profile') {
      return { type: 'profile', data: block.input as GeneratedProfile };
    }
  }

  const textBlock = (data.content || []).find((b: any) => b.type === 'text');
  const text = textBlock?.text;
  if (typeof text === 'string' && text.length > 0) {
    return { type: 'message', text };
  }

  throw new Error('No response from guide. Please try again.');
}

export async function writeProfileToSupabase(profileData: GeneratedProfile): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const goalsText = [
    profileData.professional_goals && `Professional goals:\n${profileData.professional_goals}`,
    profileData.personal_goals && `Personal goals:\n${profileData.personal_goals}`,
    profileData.big_audacious_goal &&
      `Big audacious goal:\n${profileData.big_audacious_goal}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        kt_background: profileData.background,
        kt_identity: profileData.professional_role,
        kt_life_situation: profileData.life_situation,
        kt_strengths: profileData.strengths,
        kt_weaknesses: profileData.weaknesses,
        kt_patterns: profileData.failure_modes,
        kt_goals: goalsText,
        user_goals: goalsText,
        feedback_preference: profileData.feedback_preference,
        app_usage_intent: profileData.app_usage_intent,
        accountability_style: profileData.accountability_style,
        recommended_readings: profileData.recommended_readings,
        archetype: profileData.archetype,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

export async function setKnowThyselfComplete(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ know_thyself_complete: true })
    .eq('id', user.id);

  if (error) throw error;
}
