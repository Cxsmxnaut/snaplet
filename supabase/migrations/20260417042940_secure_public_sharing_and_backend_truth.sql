alter table public.study_sources
  add column if not exists generation_provenance text not null default 'none'
  check (generation_provenance in ('provider', 'heuristic', 'none')),
  add column if not exists generation_provider text,
  add column if not exists generation_degraded boolean not null default false;

drop policy if exists "study_sources_select_public" on public.study_sources;
drop policy if exists "study_questions_select_public" on public.study_questions;

create table if not exists public.published_sources (
  source_id text primary key references public.study_sources(id) on delete cascade,
  owner_user_id text not null,
  title text not null,
  kind text not null check (kind in ('paste', 'upload', 'csv')),
  question_count integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz not null default now()
);

create table if not exists public.published_questions (
  id text primary key,
  source_id text not null references public.published_sources(source_id) on delete cascade,
  prompt text not null,
  answer text not null,
  position integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists published_questions_source_position_idx
  on public.published_questions (source_id, position asc);

create unique index if not exists study_sessions_one_open_session_per_source_idx
  on public.study_sessions (user_id, coalesce(source_id, '__global__'))
  where ended_at is null;

insert into public.published_sources (
  source_id,
  owner_user_id,
  title,
  kind,
  question_count,
  created_at,
  updated_at,
  published_at
)
select
  study_sources.id,
  study_sources.user_id,
  study_sources.title,
  study_sources.kind,
  coalesce((
    select count(*)
    from public.study_questions
    where public.study_questions.source_id = study_sources.id
      and public.study_questions.status = 'active'
  ), 0)::integer,
  study_sources.created_at,
  study_sources.updated_at,
  now()
from public.study_sources
where study_sources.visibility = 'public'
on conflict (source_id) do update
set
  owner_user_id = excluded.owner_user_id,
  title = excluded.title,
  kind = excluded.kind,
  question_count = excluded.question_count,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  published_at = excluded.published_at;

insert into public.published_questions (
  id,
  source_id,
  prompt,
  answer,
  position,
  created_at,
  updated_at
)
select
  ranked.id,
  ranked.source_id,
  ranked.prompt,
  ranked.answer,
  ranked.position,
  ranked.created_at,
  ranked.updated_at
from (
  select
    study_questions.id,
    study_questions.source_id,
    study_questions.prompt,
    study_questions.answer,
    row_number() over (partition by study_questions.source_id order by study_questions.created_at asc, study_questions.id asc) - 1 as position,
    study_questions.created_at,
    study_questions.updated_at
  from public.study_questions
  join public.study_sources on public.study_sources.id = study_questions.source_id
  where public.study_sources.visibility = 'public'
    and study_questions.status = 'active'
) as ranked
on conflict (id) do update
set
  source_id = excluded.source_id,
  prompt = excluded.prompt,
  answer = excluded.answer,
  position = excluded.position,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

alter table public.published_sources enable row level security;
alter table public.published_questions enable row level security;

drop policy if exists "published_sources_select_public" on public.published_sources;
drop policy if exists "published_questions_select_public" on public.published_questions;

create policy "published_sources_select_public"
on public.published_sources
for select
to anon, authenticated
using (true);

create policy "published_questions_select_public"
on public.published_questions
for select
to anon, authenticated
using (true);

drop policy if exists "product_events_insert_own" on public.product_events;
drop policy if exists "product_events_insert_anon" on public.product_events;

revoke execute on function public.get_landing_stats() from anon, authenticated;
drop function if exists public.get_landing_stats();
