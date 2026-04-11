import { createSupabaseServerClient } from "./supabase-server.js";

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

export type AuthContext = {
  userId: string;
  accessToken: string | null;
};

function createSupabaseAdminClient() {
  return createSupabaseServerClient(null);
}

export async function resolveAuthContext(request: Request): Promise<AuthContext> {
  const headerUserId = request.headers.get("x-snaplet-user-id")?.trim();
  if (headerUserId && headerUserId.length >= 6 && headerUserId.length <= 128) {
    return {
      userId: headerUserId,
      accessToken: readBearerToken(request),
    };
  }

  const token = readBearerToken(request);
  if (token) {
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        userId: cached.userId,
        accessToken: token,
      };
    }

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser(token);
      if (data.user?.id) {
        tokenCache.set(token, {
          userId: data.user.id,
          expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
        });
        return {
          userId: data.user.id,
          accessToken: token,
        };
      }
    }
  }

  return {
    userId: FALLBACK_USER_ID,
    accessToken: null,
  };
}

export async function resolveUserId(request: Request): Promise<string> {
  const auth = await resolveAuthContext(request);
  return auth.userId;
}
