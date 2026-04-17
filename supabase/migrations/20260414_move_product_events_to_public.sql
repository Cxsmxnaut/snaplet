create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  event_name text not null,
  source_id text,
  session_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_events_created_at_idx
  on public.product_events (created_at desc);

create index if not exists product_events_user_created_at_idx
  on public.product_events (user_id, created_at desc);

create index if not exists product_events_name_created_at_idx
  on public.product_events (event_name, created_at desc);

alter table public.product_events enable row level security;

drop policy if exists "product_events_select_own" on public.product_events;
drop policy if exists "product_events_insert_own" on public.product_events;
drop policy if exists "product_events_insert_anon" on public.product_events;

create policy "product_events_select_own"
on public.product_events
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "product_events_insert_own"
on public.product_events
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "product_events_insert_anon"
on public.product_events
for insert
to anon
with check (user_id is null);

insert into public.product_events (id, user_id, event_name, source_id, session_id, properties, created_at)
select id, user_id, event_name, source_id, session_id, properties, created_at
from private.product_events
on conflict (id) do nothing;

drop table if exists private.product_events;
