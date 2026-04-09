import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type SnapletState, type UserBucket } from "../domain/types.js";

function resolveStateDirectory(): string {
  const configured = process.env.SNAPLET_STATE_DIR?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "snaplet", ".snaplet");
  }

  return path.join(process.cwd(), ".snaplet");
}

const STATE_DIRECTORY = resolveStateDirectory();
const STATE_FILE = path.join(STATE_DIRECTORY, "state.json");

let cachedState: SnapletState | null = null;
let writeChain = Promise.resolve();
let supabaseClient: SupabaseClient | null | undefined;
const bucketCache = new Map<string, UserBucket>();

function emptyBucket(): UserBucket {
  return {
    sources: {},
    sourceFiles: {},
    extractionRuns: {},
    questions: {},
    reviewStates: {},
    sessions: {},
    attempts: {},
  };
}

function emptyState(): SnapletState {
  return {
    users: {},
  };
}

async function loadState(): Promise<SnapletState> {
  if (cachedState) {
    return cachedState;
  }

  try {
    const content = await fs.readFile(STATE_FILE, "utf-8");
    cachedState = JSON.parse(content) as SnapletState;
    return cachedState;
  } catch {
    cachedState = emptyState();
    return cachedState;
  }
}

async function persistState(state: SnapletState): Promise<void> {
  await fs.mkdir(STATE_DIRECTORY, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function getBucket(state: SnapletState, userId: string): UserBucket {
  if (!state.users[userId]) {
    state.users[userId] = emptyBucket();
  }

  return state.users[userId];
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
}

async function loadBucketFromSupabase(userId: string): Promise<UserBucket | null> {
  const cached = bucketCache.get(userId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("user_states").select("state").eq("user_id", userId).maybeSingle();
  if (error) {
    return null;
  }

  const maybeState = data?.state;
  if (!maybeState || typeof maybeState !== "object") {
    return null;
  }

  const parsed = maybeState as Partial<UserBucket>;
  const hydrated = {
    sources: parsed.sources ?? {},
    sourceFiles: parsed.sourceFiles ?? {},
    extractionRuns: parsed.extractionRuns ?? {},
    questions: parsed.questions ?? {},
    reviewStates: parsed.reviewStates ?? {},
    sessions: parsed.sessions ?? {},
    attempts: parsed.attempts ?? {},
  };
  bucketCache.set(userId, hydrated);
  return hydrated;
}

async function persistBucketToSupabase(userId: string, bucket: UserBucket): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("user_states").upsert(
    {
      user_id: userId,
      state: bucket,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return !error;
}

export async function readUserBucket<T>(
  userId: string,
  reader: (bucket: UserBucket, state: SnapletState) => T | Promise<T>,
): Promise<T> {
  const remoteBucket = await loadBucketFromSupabase(userId);
  if (remoteBucket) {
    const state = emptyState();
    state.users[userId] = remoteBucket;
    return reader(remoteBucket, state);
  }

  const state = await loadState();
  const bucket = getBucket(state, userId);
  bucketCache.set(userId, bucket);
  return reader(bucket, state);
}

export async function mutateUserBucket<T>(
  userId: string,
  mutator: (bucket: UserBucket, state: SnapletState) => T | Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const remoteBucket = await loadBucketFromSupabase(userId);
    if (remoteBucket) {
      const remoteState = emptyState();
      remoteState.users[userId] = remoteBucket;
      const result = await mutator(remoteBucket, remoteState);
      bucketCache.set(userId, remoteBucket);
      const persisted = await persistBucketToSupabase(userId, remoteBucket);
      if (persisted) {
        return result;
      }
    }

    const state = await loadState();
    const bucket = getBucket(state, userId);
    const result = await mutator(bucket, state);
    bucketCache.set(userId, bucket);
    await persistState(state);
    await persistBucketToSupabase(userId, bucket);
    return result;
  };

  const scheduled = writeChain.then(run, run);
  writeChain = scheduled.then(
    () => undefined,
    () => undefined,
  );

  return scheduled;
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
