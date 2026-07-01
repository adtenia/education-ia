-- Progression par chapitre : table chapter_progress, RPC atomiques,
-- synchronisation automatique vers progress.
--
-- Documente des changements déjà appliqués manuellement via le SQL Editor
-- de Supabase. Ne pas ré-exécuter tel quel sur la même base (certaines
-- instructions, comme la contrainte unique sur progress, ne sont pas
-- idempotentes) : ce fichier est destiné à une nouvelle base (staging,
-- restauration) ou à la revue de code.

-- 1. Policies sur la table progress existante (owner uniquement)
alter table progress enable row level security;

drop policy if exists "select own progress" on progress;
create policy "select own progress"
on progress for select
using (auth.uid() = user_id);

drop policy if exists "insert own progress" on progress;
create policy "insert own progress"
on progress for insert
with check (auth.uid() = user_id);

drop policy if exists "update own progress" on progress;
create policy "update own progress"
on progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 2. Contrainte unique nécessaire pour l'upsert automatique (trigger plus bas).
-- Pré-requis vérifié manuellement avant application : aucun doublon
-- (user_id, subject_id) dans progress au moment de la migration.
alter table progress
  add constraint progress_user_subject_unique unique (user_id, subject_id);

-- 3. Table de progression par chapitre
create table chapter_progress (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references chapters (id) on delete cascade,

  mastery_percent integer not null default 0
    check (mastery_percent >= 0 and mastery_percent <= 100),

  -- Statut 100% dérivé de mastery_percent : ne peut jamais diverger.
  status text generated always as (
    case
      when mastery_percent >= 80 then 'maitrise'
      when mastery_percent >= 40 then 'en_cours'
      else 'a_reprendre'
    end
  ) stored,

  quiz_attempts_count integer not null default 0
    check (quiz_attempts_count >= 0),

  last_quiz_score integer
    check (last_quiz_score is null or (last_quiz_score >= 0 and last_quiz_score <= 100)),

  revision_sheets_count integer not null default 0
    check (revision_sheets_count >= 0),

  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chapter_progress_user_chapter_unique unique (user_id, chapter_id)
);

create index chapter_progress_user_id_idx on chapter_progress (user_id);
create index chapter_progress_chapter_id_idx on chapter_progress (chapter_id);

-- 4. updated_at automatique
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chapter_progress_set_updated_at
before update on chapter_progress
for each row
execute function set_updated_at();

-- 5. RLS chapter_progress (chacun ne voit/écrit que ses propres lignes)
alter table chapter_progress enable row level security;

create policy "select own chapter progress"
on chapter_progress for select
using (auth.uid() = user_id);

create policy "insert own chapter progress"
on chapter_progress for insert
with check (auth.uid() = user_id);

create policy "update own chapter progress"
on chapter_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 6. Fonctions RPC atomiques, appelées depuis les server actions Next.js
-- (app/cours/[id]/actions.ts et app/quiz/[id]/actions.ts)
create or replace function record_quiz_attempt(
  p_chapter_id uuid,
  p_score integer
)
returns chapter_progress
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_result chapter_progress;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if p_score < 0 or p_score > 100 then
    raise exception 'Score invalide : %', p_score;
  end if;

  insert into chapter_progress (
    user_id, chapter_id, mastery_percent,
    quiz_attempts_count, last_quiz_score, last_activity_at
  )
  values (v_user_id, p_chapter_id, p_score, 1, p_score, now())
  on conflict (user_id, chapter_id)
  do update set
    mastery_percent = round(
      (chapter_progress.mastery_percent + excluded.mastery_percent) / 2.0
    )::integer,
    quiz_attempts_count = chapter_progress.quiz_attempts_count + 1,
    last_quiz_score = excluded.last_quiz_score,
    last_activity_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function record_quiz_attempt(uuid, integer) to authenticated;

create or replace function record_revision_sheet(
  p_chapter_id uuid
)
returns chapter_progress
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_result chapter_progress;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  insert into chapter_progress (
    user_id, chapter_id, revision_sheets_count, last_activity_at
  )
  values (v_user_id, p_chapter_id, 1, now())
  on conflict (user_id, chapter_id)
  do update set
    revision_sheets_count = chapter_progress.revision_sheets_count + 1,
    last_activity_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function record_revision_sheet(uuid) to authenticated;

-- 7. Synchronisation automatique de progress (moyenne des chapitres commencés)
create or replace function sync_subject_progress()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_subject_id uuid;
  v_user_id uuid;
  v_avg_mastery integer;
begin
  v_user_id := coalesce(new.user_id, old.user_id);

  select subject_id into v_subject_id
  from chapters
  where id = coalesce(new.chapter_id, old.chapter_id);

  if v_subject_id is null then
    return coalesce(new, old);
  end if;

  select round(avg(cp.mastery_percent))::integer
  into v_avg_mastery
  from chapter_progress cp
  join chapters c on c.id = cp.chapter_id
  where cp.user_id = v_user_id
    and c.subject_id = v_subject_id;

  insert into progress (user_id, subject_id, mastery_percent)
  values (v_user_id, v_subject_id, coalesce(v_avg_mastery, 0))
  on conflict (user_id, subject_id)
  do update set mastery_percent = excluded.mastery_percent;

  return coalesce(new, old);
end;
$$;

create trigger chapter_progress_sync_subject
after insert or update or delete on chapter_progress
for each row
execute function sync_subject_progress();
