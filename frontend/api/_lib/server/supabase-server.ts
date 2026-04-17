import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || null;
}

function readAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || null;
}

function readServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function createSupabaseServerClient(accessToken?: string | null): SupabaseClient | null {
  const url = readSupabaseUrl();
  const anonKey = readAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = readSupabaseUrl();
  const serviceRoleKey = readServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
