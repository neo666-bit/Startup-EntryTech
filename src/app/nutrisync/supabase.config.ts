export const SUPABASE_CONFIG = {

  url: 'https://vpkpcrhexoxeypxkbymk.supabase.co',

  anonKey: 'sb_publishable_s-JQnXX_Yco6K1Dl4ofH8g_x64_ro42',
};

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_CONFIG.url.trim().startsWith('https://') &&
    SUPABASE_CONFIG.anonKey.trim().length > 20
  );
}
