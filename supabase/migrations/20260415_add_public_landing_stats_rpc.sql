create or replace function public.get_landing_stats()
returns table (user_count bigint)
language sql
security definer
set search_path = public, auth
as $$
  select count(*)::bigint as user_count
  from auth.users;
$$;

grant execute on function public.get_landing_stats() to anon, authenticated;
