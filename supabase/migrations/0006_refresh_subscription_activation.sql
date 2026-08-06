-- Met à jour plan_unlocked_at uniquement lors d'une véritable nouvelle activation.
create or replace function public.sync_stripe_subscription(
  p_user_id uuid,
  p_plan text,
  p_subscription_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_access_allowed boolean,
  p_event_created_at bigint,
  p_replace_subscription boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_plan not in ('standard', 'premium', 'pro') then raise exception 'Plan invalide'; end if;

  insert into public.user_subscriptions (
    user_id, plan, subscription_status, stripe_customer_id,
    stripe_subscription_id, current_period_end, cancel_at_period_end,
    plan_unlocked_at, last_stripe_event_created_at
  ) values (
    p_user_id,
    case when p_access_allowed then p_plan else 'none' end,
    p_subscription_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    case when p_access_allowed then now() else null end,
    p_event_created_at
  )
  on conflict (user_id) do update set
    plan_unlocked_at = case
      when p_access_allowed and (
        public.user_subscriptions.plan = 'none'
        or public.user_subscriptions.subscription_status not in ('active', 'trialing')
        or (
          p_replace_subscription
          and public.user_subscriptions.stripe_subscription_id is distinct from p_stripe_subscription_id
        )
        or public.user_subscriptions.plan is distinct from p_plan
      ) then now()
      else public.user_subscriptions.plan_unlocked_at
    end,
    plan = case when p_access_allowed then p_plan else 'none' end,
    subscription_status = p_subscription_status,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.user_subscriptions.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.user_subscriptions.stripe_subscription_id),
    current_period_end = coalesce(excluded.current_period_end, public.user_subscriptions.current_period_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_stripe_event_created_at = p_event_created_at
  where p_event_created_at >= public.user_subscriptions.last_stripe_event_created_at
    and (
      public.user_subscriptions.stripe_subscription_id is null
      or public.user_subscriptions.stripe_subscription_id = p_stripe_subscription_id
      or p_replace_subscription
    );
end;
$$;

alter function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint, boolean) owner to postgres;
revoke all on function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint, boolean) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean, boolean, bigint, boolean) to service_role;
