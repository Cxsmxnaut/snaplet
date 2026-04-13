import { createClient } from '@supabase/supabase-js';
import { logError } from './debug';

function normalizeSupabaseUrl(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return '';
  }

  // Accept direct project URL: https://<ref>.supabase.co
  if (/^https?:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(raw)) {
    return raw.replace(/\/$/, '');
  }

  // Accept dashboard URL and convert it:
  // https://supabase.com/dashboard/project/<ref>
  const dashboardMatch = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  return raw.replace(/\/$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseBrowserConfig) {
  logError('supabase', 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  hasSupabaseBrowserConfig ? supabaseUrl : 'https://missing-project.invalid',
  hasSupabaseBrowserConfig ? supabaseAnonKey : 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export { hasSupabaseBrowserConfig };
