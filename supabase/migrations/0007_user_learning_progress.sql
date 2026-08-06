-- Architecture additive de progression EducationIA.
-- Cette migration ne supprime ni ne modifie les contenus pédagogiques existants.

create table if not exists public.user_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (char_length(event_type) between 3 and 80),
  course_id uuid references public.cours (id) on delete set null,
  quiz_id uuid references public.quiz (id) on delete set null,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  idempotency_key text not null check (char_length(idempotency_key) between 3 and 200),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_learning_events_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists user_learning_events_user_occurred_idx
  on public.user_learning_events (user_id, occurred_at desc);
create index if not exists user_learning_events_user_type_idx
  on public.user_learning_events (user_id, event_type);
create index if not exists user_learning_events_course_idx
  on public.user_learning_events (course_id) where course_id is not null;
create index if not exists user_learning_events_quiz_idx
  on public.user_learning_events (quiz_id) where quiz_id is not null;

create table if not exists public.user_daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  events_count integer not null default 0 check (events_count >= 0),
  revision_seconds integer not null default 0 check (revision_seconds >= 0),
  first_activity_at timestamptz not null,
  last_activity_at timestamptz not null,
  primary key (user_id, activity_date)
);

create index if not exists user_daily_activity_recent_idx
  on public.user_daily_activity (user_id, activity_date desc);

create table if not exists public.user_progress_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_courses integer not null default 0 check (total_courses >= 0),
  total_quizzes integer not null default 0 check (total_quizzes >= 0),
  total_revision_sheets integer not null default 0 check (total_revision_sheets >= 0),
  total_mind_maps integer not null default 0 check (total_mind_maps >= 0),
  quiz_score_sum numeric(14,2) not null default 0 check (quiz_score_sum >= 0),
  average_quiz_score numeric(5,2),
  best_quiz_score numeric(5,2),
  last_activity_at timestamptz,
  active_days integer not null default 0 check (active_days >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  total_revision_seconds bigint not null default 0 check (total_revision_seconds >= 0),
  future_counters jsonb not null default '{}'::jsonb check (jsonb_typeof(future_counters) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_revision_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.cours (id) on delete set null,
  activity_type text not null default 'revision' check (char_length(activity_type) between 3 and 80),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists user_revision_sessions_user_started_idx
  on public.user_revision_sessions (user_id, started_at desc);
create unique index if not exists user_revision_sessions_one_active_idx
  on public.user_revision_sessions (user_id)
  where status = 'active';

alter table public.user_learning_events enable row level security;
alter table public.user_daily_activity enable row level security;
alter table public.user_progress_stats enable row level security;
alter table public.user_revision_sessions enable row level security;

revoke all on table public.user_learning_events from anon, authenticated;
revoke all on table public.user_daily_activity from anon, authenticated;
revoke all on table public.user_progress_stats from anon, authenticated;
revoke all on table public.user_revision_sessions from anon, authenticated;
grant select on table public.user_learning_events to authenticated;
grant select on table public.user_daily_activity to authenticated;
grant select on table public.user_progress_stats to authenticated;
grant select on table public.user_revision_sessions to authenticated;
grant all on table public.user_learning_events to service_role;
grant all on table public.user_daily_activity to service_role;
grant all on table public.user_progress_stats to service_role;
grant all on table public.user_revision_sessions to service_role;

drop policy if exists "users read own learning events" on public.user_learning_events;
create policy "users read own learning events" on public.user_learning_events
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users read own daily activity" on public.user_daily_activity;
create policy "users read own daily activity" on public.user_daily_activity
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users read own progress stats" on public.user_progress_stats;
create policy "users read own progress stats" on public.user_progress_stats
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users read own revision sessions" on public.user_revision_sessions;
create policy "users read own revision sessions" on public.user_revision_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.append_learning_event(
  p_user_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_course_id uuid default null,
  p_quiz_id uuid default null,
  p_score numeric default null,
  p_duration_seconds integer default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_day date := (p_occurred_at at time zone 'UTC')::date;
  v_previous_day date;
  v_current_streak integer;
  v_total_quizzes integer;
  v_score_sum numeric(14,2);
begin
  if p_user_id is null then raise exception 'Utilisateur manquant'; end if;
  if p_event_type is null or char_length(p_event_type) not between 3 and 80 then raise exception 'Type événement invalide'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 3 and 200 then raise exception 'Clé idempotence invalide'; end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then raise exception 'Score invalide'; end if;
  if coalesce(p_duration_seconds, 0) < 0 then raise exception 'Durée invalide'; end if;

  insert into public.user_learning_events (
    user_id, event_type, course_id, quiz_id, score, duration_seconds,
    idempotency_key, metadata, occurred_at
  ) values (
    p_user_id, p_event_type, p_course_id, p_quiz_id, p_score,
    coalesce(p_duration_seconds, 0), p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb), p_occurred_at
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.user_learning_events
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
    return v_event_id;
  end if;

  insert into public.user_daily_activity (
    user_id, activity_date, events_count, revision_seconds,
    first_activity_at, last_activity_at
  ) values (
    p_user_id, v_event_day, 1, coalesce(p_duration_seconds, 0),
    p_occurred_at, p_occurred_at
  )
  on conflict (user_id, activity_date) do update set
    events_count = public.user_daily_activity.events_count + 1,
    revision_seconds = public.user_daily_activity.revision_seconds + excluded.revision_seconds,
    first_activity_at = least(public.user_daily_activity.first_activity_at, excluded.first_activity_at),
    last_activity_at = greatest(public.user_daily_activity.last_activity_at, excluded.last_activity_at);

  insert into public.user_progress_stats (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select (last_activity_at at time zone 'UTC')::date, current_streak
  into v_previous_day, v_current_streak
  from public.user_progress_stats
  where user_id = p_user_id
  for update;

  if v_previous_day is null then
    v_current_streak := 1;
  elsif v_event_day = v_previous_day then
    v_current_streak := greatest(v_current_streak, 1);
  elsif v_event_day = v_previous_day + 1 then
    v_current_streak := v_current_streak + 1;
  elsif v_event_day > v_previous_day + 1 then
    v_current_streak := 1;
  end if;

  update public.user_progress_stats set
    total_courses = total_courses + case when p_event_type = 'course_generated' then 1 else 0 end,
    total_quizzes = total_quizzes + case when p_event_type = 'quiz_completed' then 1 else 0 end,
    total_revision_sheets = total_revision_sheets + case when p_event_type = 'revision_sheet_generated' then 1 else 0 end,
    total_mind_maps = total_mind_maps + case when p_event_type = 'mind_map_generated' then 1 else 0 end,
    quiz_score_sum = quiz_score_sum + case when p_event_type = 'quiz_completed' then coalesce(p_score, 0) else 0 end,
    best_quiz_score = case when p_event_type = 'quiz_completed' then greatest(coalesce(best_quiz_score, 0), coalesce(p_score, 0)) else best_quiz_score end,
    last_activity_at = greatest(coalesce(last_activity_at, p_occurred_at), p_occurred_at),
    active_days = (select count(*)::integer from public.user_daily_activity where user_id = p_user_id),
    current_streak = v_current_streak,
    longest_streak = greatest(longest_streak, v_current_streak),
    total_revision_seconds = total_revision_seconds + coalesce(p_duration_seconds, 0),
    future_counters = case
      when p_event_type in ('course_generated', 'quiz_completed', 'revision_sheet_generated', 'mind_map_generated', 'revision_session_completed') then future_counters
      else jsonb_set(future_counters, array[p_event_type], to_jsonb(coalesce((future_counters ->> p_event_type)::integer, 0) + 1), true)
    end,
    updated_at = now()
  where user_id = p_user_id;

  select total_quizzes, quiz_score_sum into v_total_quizzes, v_score_sum
  from public.user_progress_stats where user_id = p_user_id;

  update public.user_progress_stats set
    average_quiz_score = case when v_total_quizzes > 0 then round(v_score_sum / v_total_quizzes, 2) else null end
  where user_id = p_user_id;

  return v_event_id;
end;
$$;
alter function public.append_learning_event(uuid, text, text, uuid, uuid, numeric, integer, jsonb, timestamptz) owner to postgres;
revoke all on function public.append_learning_event(uuid, text, text, uuid, uuid, numeric, integer, jsonb, timestamptz) from public, anon, authenticated;

create or replace function public.record_generated_content_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cours' then
    perform public.append_learning_event(new.user_id, 'course_generated', 'course_generated:' || new.id::text, new.id);
  elsif tg_table_name = 'revision_sheets' then
    perform public.append_learning_event(new.user_id, 'revision_sheet_generated', 'revision_sheet_generated:' || new.id::text, new.cours_id);
  end if;
  return new;
exception when others then
  raise warning 'Progression non enregistrée pour %.%: %', tg_table_name, new.id, sqlerrm;
  return new;
end;
$$;
alter function public.record_generated_content_event() owner to postgres;
revoke all on function public.record_generated_content_event() from public, anon, authenticated;

drop trigger if exists cours_record_learning_event on public.cours;
create trigger cours_record_learning_event after insert on public.cours
for each row execute function public.record_generated_content_event();
drop trigger if exists revision_sheets_record_learning_event on public.revision_sheets;
create trigger revision_sheets_record_learning_event after insert on public.revision_sheets
for each row execute function public.record_generated_content_event();

create or replace function public.record_quiz_completion(
  p_quiz_id uuid,
  p_score numeric,
  p_attempt_id text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_course_id uuid;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'Score invalide'; end if;
  if p_attempt_id is null or char_length(p_attempt_id) not between 8 and 100 then raise exception 'Tentative invalide'; end if;

  select cours_id into v_course_id from public.quiz
  where id = p_quiz_id and user_id = v_user_id;
  if not found then raise exception 'Quiz introuvable'; end if;

  return public.append_learning_event(
    v_user_id, 'quiz_completed',
    'quiz_completed:' || p_quiz_id::text || ':' || p_attempt_id,
    v_course_id, p_quiz_id, p_score, 0,
    jsonb_build_object('attempt_id', p_attempt_id)
  );
end;
$$;
alter function public.record_quiz_completion(uuid, numeric, text) owner to postgres;
revoke all on function public.record_quiz_completion(uuid, numeric, text) from public, anon;
grant execute on function public.record_quiz_completion(uuid, numeric, text) to authenticated;

create or replace function public.record_mind_map_generation(
  p_course_id uuid,
  p_generation_id text default 'default'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if not exists (select 1 from public.cours where id = p_course_id and user_id = v_user_id) then raise exception 'Cours introuvable'; end if;
  return public.append_learning_event(
    v_user_id, 'mind_map_generated',
    'mind_map_generated:' || p_course_id::text || ':' || coalesce(p_generation_id, 'default'),
    p_course_id, null, null, 0,
    jsonb_build_object('generation_id', coalesce(p_generation_id, 'default'))
  );
end;
$$;
alter function public.record_mind_map_generation(uuid, text) owner to postgres;
revoke all on function public.record_mind_map_generation(uuid, text) from public, anon;
grant execute on function public.record_mind_map_generation(uuid, text) to authenticated;

create or replace function public.start_revision_session(
  p_course_id uuid default null,
  p_activity_type text default 'revision'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_session_id uuid;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if p_course_id is not null and not exists (select 1 from public.cours where id = p_course_id and user_id = v_user_id) then raise exception 'Cours introuvable'; end if;
  insert into public.user_revision_sessions (user_id, course_id, activity_type)
  values (v_user_id, p_course_id, coalesce(nullif(trim(p_activity_type), ''), 'revision'))
  returning id into v_session_id;
  return v_session_id;
end;
$$;
alter function public.start_revision_session(uuid, text) owner to postgres;
revoke all on function public.start_revision_session(uuid, text) from public, anon;
grant execute on function public.start_revision_session(uuid, text) to authenticated;

create or replace function public.finish_revision_session(p_session_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_started_at timestamptz;
  v_duration integer;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  select course_id, started_at into v_course_id, v_started_at
  from public.user_revision_sessions
  where id = p_session_id and user_id = v_user_id and status = 'active'
  for update;
  if not found then raise exception 'Session active introuvable'; end if;

  v_duration := greatest(0, extract(epoch from (now() - v_started_at))::integer);
  update public.user_revision_sessions set
    ended_at = now(), duration_seconds = v_duration, status = 'completed', updated_at = now()
  where id = p_session_id;

  perform public.append_learning_event(
    v_user_id, 'revision_session_completed', 'revision_session:' || p_session_id::text,
    v_course_id, null, null, v_duration,
    jsonb_build_object('revision_session_id', p_session_id)
  );
  return p_session_id;
end;
$$;
alter function public.finish_revision_session(uuid) owner to postgres;
revoke all on function public.finish_revision_session(uuid) from public, anon;
grant execute on function public.finish_revision_session(uuid) to authenticated;

create or replace function public.create_user_progress_stats_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_progress_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
alter function public.create_user_progress_stats_row() owner to postgres;
revoke all on function public.create_user_progress_stats_row() from public, anon, authenticated;

drop trigger if exists create_user_progress_stats_after_signup on auth.users;
create trigger create_user_progress_stats_after_signup after insert on auth.users
for each row execute function public.create_user_progress_stats_row();

insert into public.user_progress_stats (user_id)
select id from auth.users on conflict (user_id) do nothing;

-- Reconstitution additive des compteurs existants. Les clés idempotentes
-- empêchent tout double comptage si la migration est rejouée.
select public.append_learning_event(
  c.user_id, 'course_generated', 'course_generated:' || c.id::text,
  c.id, null, null, 0, jsonb_build_object('backfilled', true), coalesce(c.created_at, now())
) from public.cours c;

select public.append_learning_event(
  r.user_id, 'revision_sheet_generated', 'revision_sheet_generated:' || r.id::text,
  r.cours_id, null, null, 0, jsonb_build_object('backfilled', true), coalesce(r.created_at, now())
) from public.revision_sheets r;

select public.append_learning_event(
  q.user_id, 'quiz_completed', 'quiz_completed:legacy:' || q.id::text,
  q.cours_id, q.id, q.score, 0, jsonb_build_object('backfilled', true), coalesce(q.created_at, now())
) from public.quiz q where q.score is not null;

-- Les événements historiques peuvent être insérés hors ordre chronologique.
-- Recalcule donc les séries à partir des jours réellement actifs.
with numbered_days as (
  select
    user_id,
    activity_date,
    activity_date - (row_number() over (partition by user_id order by activity_date))::integer as streak_group
  from public.user_daily_activity
), streaks as (
  select user_id, streak_group, count(*)::integer as streak_length, max(activity_date) as streak_end
  from numbered_days
  group by user_id, streak_group
), streak_summary as (
  select
    user_id,
    max(streak_length)::integer as longest_streak,
    max(streak_end) as latest_day
  from streaks
  group by user_id
), current_summary as (
  select s.user_id, s.streak_length
  from streaks s
  join streak_summary ss on ss.user_id = s.user_id and ss.latest_day = s.streak_end
)
update public.user_progress_stats stats set
  longest_streak = ss.longest_streak,
  current_streak = case
    when ss.latest_day >= (now() at time zone 'UTC')::date - 1 then cs.streak_length
    else 0
  end,
  updated_at = now()
from streak_summary ss
join current_summary cs on cs.user_id = ss.user_id
where stats.user_id = ss.user_id;
