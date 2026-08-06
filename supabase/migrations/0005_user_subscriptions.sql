create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'none' check (plan in ('none', 'standard', 'premium', 'pro')),
  subscription_status text not null default 'inactive' check (subscription_status in ('inactive', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  plan_unlocked_at timestamptz,
  last_stripe_event_created_at bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_customer_id_unique on public.user_subscriptions (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists user_subscriptions_subscription_id_unique on public.user_subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;
alter table public.user_subscriptions enable row level security;
revoke all on table public.user_subscriptions from anon, authenticated;
grant select on table public.user_subscriptions to authenticated;
grant all on table public.user_subscriptions to service_role;
drop policy if exists "users can read their own subscription" on public.user_subscriptions;
create policy "users can read their own subscription" on public.user_subscriptions for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_user_subscription_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
alter function public.set_user_subscription_updated_at() owner to postgres;
revoke all on function public.set_user_subscription_updated_at() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_trigger where tgname = 'user_subscriptions_set_updated_at' and tgrelid = pg_catalog.to_regclass('public.user_subscriptions') and not tgisinternal) then
    create trigger user_subscriptions_set_updated_at before update on public.user_subscriptions for each row execute function public.set_user_subscription_updated_at();
  end if;
end;
$$;

insert into public.user_subscriptions (user_id) select id from auth.users on conflict (user_id) do nothing;

create or replace function public.create_user_subscription_row() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
alter function public.create_user_subscription_row() owner to postgres;
revoke all on function public.create_user_subscription_row() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_trigger where tgname = 'create_user_subscription_after_signup' and tgrelid = pg_catalog.to_regclass('auth.users') and not tgisinternal) then
    create trigger create_user_subscription_after_signup after insert on auth.users for each row execute function public.create_user_subscription_row();
  end if;
end;
$$;

create or replace function public.sync_stripe_subscription(
  p_user_id uuid,
  p_plan text,
  p_subscription_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_access_allowed boolean,
  p_event_created_at bigint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_plan not in ('standard', 'premium', 'pro') then raise exception 'Plan invalide'; end if;
  insert into public.user_subscriptions (user_id, plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, plan_unlocked_at, last_stripe_event_created_at)
  values (p_user_id, case when p_access_allowed then p_plan else 'none' end, p_subscription_status, p_stripe_customer_id, p_stripe_subscription_id, p_current_period_end, coalesce(p_cancel_at_period_end, false), case when p_access_allowed then now() else null end, p_event_created_at)
  on conflict (user_id) do update set
    plan = case when p_access_allowed then p_plan else 'none' end,
    subscription_status = p_subscription_status,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.user_subscriptions.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.user_subscriptions.stripe_subscription_id),
    current_period_end = coalesce(excluded.current_period_end, public.user_subscriptions.current_period_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    plan_unlocked_at = coalesce(public.user_subscriptions.plan_unlocked_at, case when p_access_allowed then now() else null end),
    last_stripe_event_created_at = p_event_created_at
  where p_event_created_at >= public.user_subscriptions.last_stripe_event_created_at;
end;
$$;
alter function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint) owner to postgres;
revoke all on function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint) to service_role;
