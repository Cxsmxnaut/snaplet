create table if not exists public.user_states (
  user_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sources (
  id text primary key,
  user_id text not null,
  title text not null,
  content text not null default '',
  kind text not null check (kind in ('paste', 'upload', 'csv')),
  extraction_status text not null check (extraction_status in ('extracting', 'ready', 'needs_attention', 'failed')),
  question_generation_status text not null check (question_generation_status in ('pending', 'generating', 'ready', 'failed')),
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_files (
  id text primary key,
  user_id text not null,
  source_id text not null references public.study_sources(id) on delete cascade,
  file_name text not null,
  mime_type text not null default '',
  size_bytes integer not null default 0,
  extractor_mode text not null check (extractor_mode in ('direct', 'ocr_fallback', 'csv')),
  extraction_status text not null check (extraction_status in ('extracting', 'ready', 'needs_attention', 'failed')),
  quality_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extraction_runs (
  id text primary key,
  user_id text not null,
  source_file_id text not null references public.source_files(id) on delete cascade,
  parser_path text not null,
  ocr_used boolean not null default false,
  duration_ms integer not null default 0,
  quality_score numeric not null default 0,
  status text not null check (status in ('extracting', 'ready', 'needs_attention', 'failed')),
  error_details text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_questions (
  id text primary key,
  user_id text not null,
  source_id text not null references public.study_sources(id) on delete cascade,
  prompt text not null,
  answer text not null,
  status text not null check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_sessions
  add column if not exists time_cap_seconds integer not null default 300,
  add column if not exists pointer integer not null default 0,
  add column if not exists pending_retry_question_id text,
  add column if not exists queue jsonb not null default '[]'::jsonb;

create index if not exists study_sources_user_updated_idx
  on public.study_sources (user_id, updated_at desc);

create index if not exists source_files_user_source_idx
  on public.source_files (user_id, source_id, updated_at desc);

create index if not exists extraction_runs_user_file_idx
  on public.extraction_runs (user_id, source_file_id, created_at desc);

create index if not exists study_questions_user_source_idx
  on public.study_questions (user_id, source_id, updated_at desc);

alter table public.user_states enable row level security;
alter table public.study_sources enable row level security;
alter table public.source_files enable row level security;
alter table public.extraction_runs enable row level security;
alter table public.study_questions enable row level security;

drop policy if exists "study_sources_select_own" on public.study_sources;
drop policy if exists "study_sources_insert_own" on public.study_sources;
drop policy if exists "study_sources_update_own" on public.study_sources;
drop policy if exists "study_sources_delete_own" on public.study_sources;

create policy "study_sources_select_own"
on public.study_sources
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "study_sources_insert_own"
on public.study_sources
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "study_sources_update_own"
on public.study_sources
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "study_sources_delete_own"
on public.study_sources
for delete
to authenticated
using ((select auth.uid())::text = user_id);

drop policy if exists "source_files_select_own" on public.source_files;
drop policy if exists "source_files_insert_own" on public.source_files;
drop policy if exists "source_files_update_own" on public.source_files;
drop policy if exists "source_files_delete_own" on public.source_files;

create policy "source_files_select_own"
on public.source_files
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "source_files_insert_own"
on public.source_files
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "source_files_update_own"
on public.source_files
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "source_files_delete_own"
on public.source_files
for delete
to authenticated
using ((select auth.uid())::text = user_id);

drop policy if exists "extraction_runs_select_own" on public.extraction_runs;
drop policy if exists "extraction_runs_insert_own" on public.extraction_runs;
drop policy if exists "extraction_runs_update_own" on public.extraction_runs;
drop policy if exists "extraction_runs_delete_own" on public.extraction_runs;

create policy "extraction_runs_select_own"
on public.extraction_runs
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "extraction_runs_insert_own"
on public.extraction_runs
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "extraction_runs_update_own"
on public.extraction_runs
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "extraction_runs_delete_own"
on public.extraction_runs
for delete
to authenticated
using ((select auth.uid())::text = user_id);

drop policy if exists "study_questions_select_own" on public.study_questions;
drop policy if exists "study_questions_insert_own" on public.study_questions;
drop policy if exists "study_questions_update_own" on public.study_questions;
drop policy if exists "study_questions_delete_own" on public.study_questions;

create policy "study_questions_select_own"
on public.study_questions
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "study_questions_insert_own"
on public.study_questions
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "study_questions_update_own"
on public.study_questions
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create policy "study_questions_delete_own"
on public.study_questions
for delete
to authenticated
using ((select auth.uid())::text = user_id);
