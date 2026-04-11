create table if not exists public.study_sessions (
  id text primary key,
  user_id text not null,
  source_id text,
  source_title text not null default 'Study kit',
  mode text not null check (mode in ('standard', 'focus', 'weak_review', 'fast_drill')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  question_cap integer not null default 0,
  attempt_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  accuracy integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_attempts (
  id text primary key,
  user_id text not null,
  session_id text not null references public.study_sessions(id) on delete cascade,
  question_id text not null,
  source_id text,
  source_title text not null default 'Study kit',
  prompt text not null,
  answer text not null,
  canonical_answer text not null,
  outcome text not null check (outcome in ('exact', 'accent_near', 'typo_near', 'correct_after_retry', 'incorrect')),
  is_retry boolean not null default false,
  final boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.question_progress (
  user_id text not null,
  question_id text not null,
  source_id text,
  source_title text not null default 'Study kit',
  prompt text not null,
  stability numeric not null default 1,
  difficulty numeric not null default 0.45,
  next_due_at timestamptz not null default now(),
  last_seen_at timestamptz,
  recent_error_count numeric not null default 0,
  near_miss_count integer not null default 0,
  retry_success_count integer not null default 0,
  total_attempts integer not null default 0,
  correct_attempts integer not null default 0,
  last_outcome text check (last_outcome in ('exact', 'accent_near', 'typo_near', 'correct_after_retry', 'incorrect')),
  mastery_score integer not null default 0,
  pressure_score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists study_sessions_user_ended_idx
  on public.study_sessions (user_id, ended_at desc);

create index if not exists study_sessions_user_source_idx
  on public.study_sessions (user_id, source_id, ended_at desc);

create index if not exists session_attempts_user_created_idx
  on public.session_attempts (user_id, created_at desc);

create index if not exists session_attempts_user_source_idx
  on public.session_attempts (user_id, source_id, created_at desc);

create index if not exists session_attempts_user_question_idx
  on public.session_attempts (user_id, question_id, created_at desc);

create index if not exists question_progress_user_source_idx
  on public.question_progress (user_id, source_id, updated_at desc);

alter table public.study_sessions enable row level security;
alter table public.session_attempts enable row level security;
alter table public.question_progress enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
drop policy if exists "study_sessions_insert_own" on public.study_sessions;
drop policy if exists "study_sessions_update_own" on public.study_sessions;
drop policy if exists "study_sessions_delete_own" on public.study_sessions;

create policy "study_sessions_select_own"
on public.study_sessions
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "study_sessions_insert_own"
on public.study_sessions
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "study_sessions_update_own"
on public.study_sessions
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "study_sessions_delete_own"
on public.study_sessions
for delete
to authenticated
using ((select auth.uid())::text = user_id);

drop policy if exists "session_attempts_select_own" on public.session_attempts;
drop policy if exists "session_attempts_insert_own" on public.session_attempts;
drop policy if exists "session_attempts_update_own" on public.session_attempts;
drop policy if exists "session_attempts_delete_own" on public.session_attempts;

create policy "session_attempts_select_own"
on public.session_attempts
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "session_attempts_insert_own"
on public.session_attempts
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "session_attempts_update_own"
on public.session_attempts
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "session_attempts_delete_own"
on public.session_attempts
for delete
to authenticated
using ((select auth.uid())::text = user_id);

drop policy if exists "question_progress_select_own" on public.question_progress;
drop policy if exists "question_progress_insert_own" on public.question_progress;
drop policy if exists "question_progress_update_own" on public.question_progress;
drop policy if exists "question_progress_delete_own" on public.question_progress;

create policy "question_progress_select_own"
on public.question_progress
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "question_progress_insert_own"
on public.question_progress
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "question_progress_update_own"
on public.question_progress
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "question_progress_delete_own"
on public.question_progress
for delete
to authenticated
using ((select auth.uid())::text = user_id);

alter table public.user_states enable row level security;

drop policy if exists "user_states_select_own" on public.user_states;
drop policy if exists "user_states_insert_own" on public.user_states;
drop policy if exists "user_states_update_own" on public.user_states;
drop policy if exists "user_states_delete_own" on public.user_states;

create policy "user_states_select_own"
on public.user_states
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "user_states_insert_own"
on public.user_states
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "user_states_update_own"
on public.user_states
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "user_states_delete_own"
on public.user_states
for delete
to authenticated
using ((select auth.uid())::text = user_id);
