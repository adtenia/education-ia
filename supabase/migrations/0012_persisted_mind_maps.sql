-- Persistance additive des cartes mentales générées.

create table if not exists public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.cours (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mind_maps_user_course_unique unique (user_id, course_id)
);

create index if not exists mind_maps_user_updated_idx
  on public.mind_maps (user_id, updated_at desc);

alter table public.mind_maps enable row level security;
revoke all on table public.mind_maps from public, anon, authenticated;
grant select, insert, update on table public.mind_maps to authenticated;
grant all on table public.mind_maps to service_role;

drop policy if exists "users read own mind maps" on public.mind_maps;
create policy "users read own mind maps"
  on public.mind_maps for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users create own mind maps" on public.mind_maps;
create policy "users create own mind maps"
  on public.mind_maps for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.cours
      where public.cours.id = course_id
        and public.cours.user_id = (select auth.uid())
    )
  );

drop policy if exists "users update own mind maps" on public.mind_maps;
create policy "users update own mind maps"
  on public.mind_maps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.cours
      where public.cours.id = course_id
        and public.cours.user_id = (select auth.uid())
    )
  );

create or replace function public.set_mind_map_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter function public.set_mind_map_updated_at() owner to postgres;
revoke all on function public.set_mind_map_updated_at() from public, anon, authenticated;

drop trigger if exists mind_maps_set_updated_at on public.mind_maps;
create trigger mind_maps_set_updated_at
before update on public.mind_maps
for each row execute function public.set_mind_map_updated_at();
