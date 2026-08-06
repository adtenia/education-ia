-- Suivi détaillé et durable des réponses aux quiz.
-- Migration additive : aucune donnée existante n'est supprimée ou remplacée.
-- p_answers utilise exclusivement question_id et selected_answer.

alter table public.quiz_questions add column if not exists topic text;
alter table public.quiz_questions add column if not exists topic_key text;

alter table public.quiz_questions drop constraint if exists quiz_questions_topic_length_check;
alter table public.quiz_questions add constraint quiz_questions_topic_length_check
check (topic is null or char_length(btrim(topic)) between 2 and 120);

alter table public.quiz_questions drop constraint if exists quiz_questions_topic_key_format_check;
alter table public.quiz_questions add constraint quiz_questions_topic_key_format_check
check (
  topic_key is null or (
    char_length(topic_key) between 2 and 100
    and topic_key = btrim(topic_key)
    and topic_key = lower(topic_key)
    and topic_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  )
);

comment on column public.quiz_questions.topic is
  'Nom lisible de la notion ou compétence évaluée. Nullable pour les anciens quiz.';
comment on column public.quiz_questions.topic_key is
  'Identifiant pédagogique stable fourni avec le quiz. Nullable pour les anciens quiz.';

create table if not exists public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null,
  course_id uuid,
  attempt_id text not null check (char_length(attempt_id) between 8 and 100),
  question_id uuid not null,
  question_text text not null check (char_length(question_text) > 0),
  topic text check (topic is null or char_length(btrim(topic)) between 2 and 120),
  topic_key text check (
    topic_key is null or (
      char_length(topic_key) between 2 and 100
      and topic_key = btrim(topic_key)
      and topic_key = lower(topic_key)
      and topic_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    )
  ),
  selected_answer text not null check (selected_answer in ('A', 'B', 'C', 'D')),
  selected_answer_text text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  correct_answer_text text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  constraint quiz_attempt_answers_attempt_question_unique
    unique (user_id, attempt_id, question_id)
);

create index if not exists quiz_attempt_answers_user_created_idx
  on public.quiz_attempt_answers (user_id, created_at desc);
create index if not exists quiz_attempt_answers_user_quiz_idx
  on public.quiz_attempt_answers (user_id, quiz_id, created_at desc);
create index if not exists quiz_attempt_answers_user_course_idx
  on public.quiz_attempt_answers (user_id, course_id, created_at desc)
  where course_id is not null;
create index if not exists quiz_attempt_answers_user_topic_idx
  on public.quiz_attempt_answers (user_id, topic_key, created_at desc)
  where topic_key is not null;
create index if not exists quiz_attempt_answers_user_attempt_idx
  on public.quiz_attempt_answers (user_id, attempt_id);

alter table public.quiz_attempt_answers enable row level security;
revoke all on table public.quiz_attempt_answers from public, anon, authenticated;
grant select on table public.quiz_attempt_answers to authenticated;
grant all on table public.quiz_attempt_answers to service_role;

drop policy if exists "users read own quiz attempt answers" on public.quiz_attempt_answers;
create policy "users read own quiz attempt answers"
  on public.quiz_attempt_answers for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.record_quiz_attempt_details(
  p_quiz_id uuid,
  p_attempt_id text,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_quiz public.quiz%rowtype;
  v_question public.quiz_questions%rowtype;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_answer text;
  v_selected_answer_text text;
  v_correct_answer text;
  v_correct_answer_text text;
  v_question_count integer;
  v_submitted_count integer;
  v_correct_count integer := 0;
  v_score numeric(5,2);
  v_event_id uuid;
  v_existing_event_id uuid;
  v_existing_score numeric(5,2);
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if p_quiz_id is null then raise exception 'Identifiant du quiz manquant'; end if;
  if p_attempt_id is null or char_length(p_attempt_id) not between 8 and 100 then
    raise exception 'Identifiant de tentative invalide';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'La liste des réponses est invalide';
  end if;

  select quiz.* into v_quiz from public.quiz as quiz
  where quiz.id = p_quiz_id and quiz.user_id = v_user_id;
  if not found then raise exception 'Quiz introuvable'; end if;

  select event.id, event.score into v_existing_event_id, v_existing_score
  from public.user_learning_events as event
  where event.user_id = v_user_id
    and event.idempotency_key = 'quiz_completed:' || p_quiz_id::text || ':' || p_attempt_id;
  if found then
    return jsonb_build_object(
      'event_id', v_existing_event_id,
      'score', v_existing_score,
      'attempt_id', p_attempt_id,
      'already_recorded', true
    );
  end if;

  select count(*) into v_question_count from public.quiz_questions as question
  where question.quiz_id = p_quiz_id;
  if v_question_count = 0 then raise exception 'Ce quiz ne contient aucune question'; end if;

  select count(distinct answer ->> 'question_id') into v_submitted_count
  from jsonb_array_elements(p_answers) as answer;
  if v_submitted_count <> v_question_count or jsonb_array_length(p_answers) <> v_question_count then
    raise exception 'Toutes les questions doivent recevoir exactement une réponse';
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    if not (v_answer ? 'question_id') or not (v_answer ? 'selected_answer') then
      raise exception 'Chaque réponse doit contenir question_id et selected_answer';
    end if;
    begin
      v_question_id := (v_answer ->> 'question_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Identifiant de question invalide';
    end;
    v_selected_answer := upper(btrim(v_answer ->> 'selected_answer'));
    if v_selected_answer not in ('A', 'B', 'C', 'D') then
      raise exception 'Réponse sélectionnée invalide';
    end if;

    select question.* into v_question from public.quiz_questions as question
    where question.id = v_question_id and question.quiz_id = p_quiz_id;
    if not found then raise exception 'Question introuvable dans ce quiz'; end if;

    v_correct_answer := upper(btrim(v_question.correct_answer));
    if v_correct_answer not in ('A', 'B', 'C', 'D') then
      raise exception 'Bonne réponse invalide pour la question %', v_question.id;
    end if;
    v_selected_answer_text := case v_selected_answer
      when 'A' then v_question.answer_a when 'B' then v_question.answer_b
      when 'C' then v_question.answer_c when 'D' then v_question.answer_d
    end;
    v_correct_answer_text := case v_correct_answer
      when 'A' then v_question.answer_a when 'B' then v_question.answer_b
      when 'C' then v_question.answer_c when 'D' then v_question.answer_d
    end;
    if v_selected_answer = v_correct_answer then v_correct_count := v_correct_count + 1; end if;

    insert into public.quiz_attempt_answers (
      user_id, quiz_id, course_id, attempt_id, question_id, question_text,
      topic, topic_key, selected_answer, selected_answer_text,
      correct_answer, correct_answer_text, is_correct, created_at
    ) values (
      v_user_id, p_quiz_id, v_quiz.cours_id, p_attempt_id, v_question.id,
      v_question.question, nullif(btrim(v_question.topic), ''),
      nullif(btrim(v_question.topic_key), ''), v_selected_answer,
      v_selected_answer_text, v_correct_answer, v_correct_answer_text,
      v_selected_answer = v_correct_answer, now()
    );
  end loop;

  v_score := round((v_correct_count::numeric / v_question_count::numeric) * 100, 2);
  v_event_id := public.record_quiz_completion(p_quiz_id, v_score, p_attempt_id);
  update public.quiz set score = v_score
  where id = p_quiz_id and user_id = v_user_id;

  return jsonb_build_object(
    'event_id', v_event_id,
    'score', v_score,
    'correct_answers', v_correct_count,
    'questions_count', v_question_count,
    'attempt_id', p_attempt_id,
    'already_recorded', false
  );
end;
$$;

alter function public.record_quiz_attempt_details(uuid, text, jsonb) owner to postgres;
revoke all on function public.record_quiz_attempt_details(uuid, text, jsonb) from public, anon;
grant execute on function public.record_quiz_attempt_details(uuid, text, jsonb) to authenticated;

create or replace view public.user_quiz_answer_analysis
with (security_invoker = true)
as
select
  answer.id, answer.user_id, answer.quiz_id, answer.course_id,
  answer.attempt_id, answer.question_id, answer.question_text,
  answer.topic, answer.topic_key, answer.selected_answer,
  answer.selected_answer_text, answer.correct_answer,
  answer.correct_answer_text, answer.is_correct, answer.created_at,
  case when answer.topic_key is null then null else
    count(*) filter (where not answer.is_correct) over (
      partition by answer.user_id, answer.topic_key
      order by answer.created_at, answer.id
      rows between unbounded preceding and 1 preceding
    )::integer
  end as prior_topic_error_count
from public.quiz_attempt_answers as answer;

revoke all on public.user_quiz_answer_analysis from public, anon, authenticated;
grant select on public.user_quiz_answer_analysis to authenticated;

create or replace view public.user_topic_progress
with (security_invoker = true)
as
with topic_statistics as (
  select
    answer.user_id,
    answer.topic_key,
    min(answer.topic) as topic,
    count(*)::integer as answered_questions,
    count(*) filter (where not answer.is_correct)::integer as error_count,
    count(*) filter (where answer.is_correct)::integer as success_count,
    count(distinct answer.attempt_id)::integer as distinct_attempts,
    count(distinct answer.attempt_id) filter (where not answer.is_correct)::integer as attempts_with_errors,
    count(distinct answer.attempt_id) filter (where answer.is_correct)::integer as attempts_with_successes,
    round((count(*) filter (where answer.is_correct)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as success_rate,
    max(answer.created_at) filter (where not answer.is_correct) as last_error_at,
    max(answer.created_at) filter (where answer.is_correct) as last_success_at
  from public.quiz_attempt_answers as answer
  where answer.topic_key is not null
  group by answer.user_id, answer.topic_key
), user_statistics as (
  select
    answer.user_id,
    round((count(*) filter (where answer.is_correct)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as overall_success_rate
  from public.quiz_attempt_answers as answer
  where answer.topic_key is not null
  group by answer.user_id
)
select
  topic.user_id, topic.topic_key, topic.topic, topic.answered_questions,
  topic.error_count, topic.success_count, topic.distinct_attempts,
  topic.attempts_with_errors, topic.attempts_with_successes,
  topic.success_rate, users.overall_success_rate,
  topic.last_error_at, topic.last_success_at,
  case
    when topic.answered_questions < 3 then 'insufficient_data'
    when topic.attempts_with_errors >= 2 and topic.success_rate < users.overall_success_rate then 'needs_review'
    when topic.attempts_with_successes >= 2 and topic.success_rate > users.overall_success_rate then 'strength'
    else 'developing'
  end as learning_status
from topic_statistics as topic
join user_statistics as users on users.user_id = topic.user_id;

revoke all on public.user_topic_progress from public, anon, authenticated;
grant select on public.user_topic_progress to authenticated;
