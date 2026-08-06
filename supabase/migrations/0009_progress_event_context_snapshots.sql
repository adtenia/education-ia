-- Conserve le contexte lisible des événements même si le cours ou le quiz
-- source est supprimé ultérieurement. Migration additive, sans suppression.

update public.user_learning_events as event
set metadata = event.metadata || jsonb_strip_nulls(jsonb_build_object(
  'course_title', coalesce(course.title, course.detected_chapter),
  'subject_title', course.detected_subject,
  'chapter_title', course.detected_chapter
))
from public.cours as course
where event.course_id = course.id;

update public.user_learning_events as event
set metadata = event.metadata || jsonb_strip_nulls(jsonb_build_object(
  'quiz_title', quiz.title
))
from public.quiz as quiz
where event.quiz_id = quiz.id;

create or replace function public.record_generated_content_event() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_title text;
  v_subject_title text;
  v_chapter_title text;
begin
  if tg_table_name = 'cours' then
    perform public.append_learning_event(
      new.user_id,
      'course_generated',
      'course_generated:' || new.id::text,
      new.id,
      null,
      null,
      0,
      jsonb_strip_nulls(jsonb_build_object(
        'course_title', coalesce(new.title, new.detected_chapter),
        'subject_title', new.detected_subject,
        'chapter_title', new.detected_chapter
      ))
    );
    raise log '[progress] événement course_generated traité';
  elsif tg_table_name = 'revision_sheets' then
    select
      coalesce(course.title, course.detected_chapter),
      course.detected_subject,
      course.detected_chapter
    into v_course_title, v_subject_title, v_chapter_title
    from public.cours as course
    where course.id = new.cours_id and course.user_id = new.user_id;

    perform public.append_learning_event(
      new.user_id,
      'revision_sheet_generated',
      'revision_sheet_generated:' || new.id::text,
      new.cours_id,
      null,
      null,
      0,
      jsonb_strip_nulls(jsonb_build_object(
        'revision_sheet_title', new.title,
        'course_title', v_course_title,
        'subject_title', v_subject_title,
        'chapter_title', v_chapter_title
      ))
    );
    raise log '[progress] événement revision_sheet_generated traité';
  end if;

  return new;
exception when others then
  raise warning '[progress] événement généré non enregistré: %', sqlerrm;
  return new;
end;
$$;

alter function public.record_generated_content_event() owner to postgres;
revoke all on function public.record_generated_content_event()
  from public, anon, authenticated;

create or replace function public.record_quiz_completion(
  p_quiz_id uuid,
  p_score numeric,
  p_attempt_id text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_quiz_title text;
  v_course_title text;
  v_subject_title text;
  v_chapter_title text;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'Score invalide'; end if;
  if p_attempt_id is null or char_length(p_attempt_id) not between 8 and 100 then raise exception 'Tentative invalide'; end if;

  select
    quiz.cours_id,
    quiz.title,
    coalesce(course.title, course.detected_chapter),
    course.detected_subject,
    course.detected_chapter
  into v_course_id, v_quiz_title, v_course_title, v_subject_title, v_chapter_title
  from public.quiz as quiz
  left join public.cours as course
    on course.id = quiz.cours_id and course.user_id = v_user_id
  where quiz.id = p_quiz_id and quiz.user_id = v_user_id;

  if not found then raise exception 'Quiz introuvable'; end if;

  return public.append_learning_event(
    v_user_id,
    'quiz_completed',
    'quiz_completed:' || p_quiz_id::text || ':' || p_attempt_id,
    v_course_id,
    p_quiz_id,
    p_score,
    0,
    jsonb_strip_nulls(jsonb_build_object(
      'attempt_id', p_attempt_id,
      'quiz_title', v_quiz_title,
      'course_title', v_course_title,
      'subject_title', v_subject_title,
      'chapter_title', v_chapter_title
    ))
  );
end;
$$;

alter function public.record_quiz_completion(uuid, numeric, text) owner to postgres;
revoke all on function public.record_quiz_completion(uuid, numeric, text)
  from public, anon;
grant execute on function public.record_quiz_completion(uuid, numeric, text)
  to authenticated;

create or replace function public.record_mind_map_generation(
  p_course_id uuid,
  p_generation_id text default 'default'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_course_title text;
  v_subject_title text;
  v_chapter_title text;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;

  select
    coalesce(course.title, course.detected_chapter),
    course.detected_subject,
    course.detected_chapter
  into v_course_title, v_subject_title, v_chapter_title
  from public.cours as course
  where course.id = p_course_id and course.user_id = v_user_id;

  if not found then raise exception 'Cours introuvable'; end if;

  return public.append_learning_event(
    v_user_id,
    'mind_map_generated',
    'mind_map_generated:' || p_course_id::text || ':' || coalesce(p_generation_id, 'default'),
    p_course_id,
    null,
    null,
    0,
    jsonb_strip_nulls(jsonb_build_object(
      'generation_id', coalesce(p_generation_id, 'default'),
      'course_title', v_course_title,
      'subject_title', v_subject_title,
      'chapter_title', v_chapter_title
    ))
  );
end;
$$;

alter function public.record_mind_map_generation(uuid, text) owner to postgres;
revoke all on function public.record_mind_map_generation(uuid, text)
  from public, anon;
grant execute on function public.record_mind_map_generation(uuid, text)
  to authenticated;
