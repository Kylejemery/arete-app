import { supabase } from '@/lib/supabase';

type Tier = 'free' | 'arete' | 'arete_pro';

export async function syncTierToSupabase(tier: Tier): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, tier, is_premium: tier !== 'free' }, { onConflict: 'id' });

    if (error) console.error('[syncTierToSupabase] upsert error:', error.message);
  } catch (e) {
    console.error('[syncTierToSupabase] unexpected error:', e);
  }
}
