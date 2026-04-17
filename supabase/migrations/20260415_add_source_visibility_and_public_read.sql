alter table public.study_sources
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

update public.study_sources
set visibility = 'private'
where visibility is null;

drop policy if exists "study_sources_select_public" on public.study_sources;
drop policy if exists "study_questions_select_public" on public.study_questions;

create policy "study_sources_select_public"
on public.study_sources
for select
to anon, authenticated
using (visibility = 'public');

create policy "study_questions_select_public"
on public.study_questions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.study_sources
    where public.study_sources.id = study_questions.source_id
      and public.study_sources.visibility = 'public'
  )
);
