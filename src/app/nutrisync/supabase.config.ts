/**
 * Configuração de conexão com o banco PostgreSQL no Supabase.
 *
 * Como pegar esses 2 valores no painel do seu projeto no Supabase (https://supabase.com/dashboard):
 * 1. No menu lateral esquerdo, clique em "Project Settings" (ícone de engrenagem).
 * 2. Clique em "Data API" (ou "API").
 * 3. Copie a "Project URL" (ex.: https://abcdefghijklm.supabase.co) e cole em SUPABASE_URL.
 * 4. Em "API Keys", copie a chave "anon" / "public" e cole em SUPABASE_ANON_KEY.
 */
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
