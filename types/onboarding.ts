export interface RecommendedReading {
  title: string;
  author: string;
  reason: string;
}

export interface GeneratedProfile {
  background: string;
  professional_role: string;
  life_situation: string;
  strengths: string;
  weaknesses: string;
  failure_modes: string;
  feedback_preference: string;
  professional_goals: string;
  personal_goals: string;
  big_audacious_goal: string;
  app_usage_intent: string;
  accountability_style: string;
  recommended_readings: RecommendedReading[];
  archetype: 'Emperor' | 'Exile' | 'Seeker' | 'Builder';
  completeness_score: number;
}
