-- Colonnes additives pour conserver les contenus pédagogiques structurés.
-- Cette migration ne supprime ni ne transforme aucune donnée existante.

alter table cours
  add column if not exists course_content jsonb;

alter table quiz_questions
  add column if not exists explanation text;

