-- Durcissement complémentaire de import_sessions, appliqué après 0002.
--
-- Ces deux contraintes avaient été proposées lors de l'audit RLS
-- (0002_import_sessions_rls.sql) mais pas appliquées à ce moment-là.
-- Diagnostic préalable effectué manuellement : aucune ligne existante
-- ne violait ces contraintes (statuts limités à waiting/uploaded,
-- aucune session avec plus de 5 images).
--
-- Ne pas ré-exécuter tel quel sur la même base : destiné à une nouvelle
-- base ou à la revue de code.

-- 1. Verrouille les valeurs possibles de status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'import_sessions'::regclass
      and conname = 'import_sessions_status_check'
  ) then
    alter table import_sessions
      add constraint import_sessions_status_check
      check (status in ('waiting', 'uploaded'));
  end if;
end $$;

-- 2. Empêche l'abus de stockage/bande passante via un appel direct à
-- l'API REST (contournement de la limite MAX_IMAGES côté React).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'import_sessions'::regclass
      and conname = 'import_sessions_images_max_length'
  ) then
    alter table import_sessions
      add constraint import_sessions_images_max_length
      check (jsonb_array_length(images) <= 5);
  end if;
end $$;
