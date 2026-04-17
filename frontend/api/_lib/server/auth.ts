import { createSupabaseServerClient } from "./supabase-server.js";

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

function allowDevUserOverride(request: Request): boolean {
  if (process.env.SNAPLET_ALLOW_DEV_USER_OVERRIDE !== "true") {
    return false;
  }

  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export async function resolveAuthContext(request: Request): Promise<AuthContext> {
  const headerUserId = request.headers.get("x-snaplet-user-id")?.trim();
  if (headerUserId && headerUserId.length >= 6 && headerUserId.length <= 128 && allowDevUserOverride(request)) {
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

    const supabase = createSupabaseServerClient(token);
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

  throw new Error("Authentication required");
}

export async function resolveUserId(request: Request): Promise<string> {
  const auth = await resolveAuthContext(request);
  return auth.userId;
}

export async function resolveOptionalAuthContext(request: Request): Promise<AuthContext | null> {
  try {
    return await resolveAuthContext(request);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authentication required")) {
      return null;
    }

    throw error;
  }
}
