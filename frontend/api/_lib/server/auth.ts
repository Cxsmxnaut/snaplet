import { createClient } from "@supabase/supabase-js";

const FALLBACK_USER_ID = "demo_user";
const TOKEN_CACHE_TTL_MS = 5 * 60_000;
const tokenCache = new Map<string, { userId: string; expiresAt: number }>();

function readBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  return value.slice("Bearer ".length).trim();
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function resolveUserId(request: Request): Promise<string> {
  const headerUserId = request.headers.get("x-snaplet-user-id")?.trim();
  if (headerUserId && headerUserId.length >= 6 && headerUserId.length <= 128) {
    return headerUserId;
  }

  const token = readBearerToken(request);
  if (token) {
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.userId;
    }

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser(token);
      if (data.user?.id) {
        tokenCache.set(token, {
          userId: data.user.id,
          expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
        });
        return data.user.id;
      }
    }
  }

  return FALLBACK_USER_ID;
}
