-- Durcissement RLS de import_sessions (flux QR code mobile-upload).
--
-- Contexte : deux policies anonymes préexistantes ("Anyone can read import
-- session for QR upload", "Anyone can upload photos to an import session")
-- autorisaient une lecture/écriture anonyme totalement ouverte (qual = true),
-- sans notion d'expiration ni de restriction d'état. Ce fichier documente le
-- correctif réellement appliqué.
--
-- Note : les policies "Users can create/view/update their own import
-- sessions" (rôle authenticated) existaient déjà avant cet audit et n'ont
-- pas été modifiées — elles ne sont pas recréées ici.
--
-- Ne pas ré-exécuter tel quel sur la même base : destiné à une nouvelle base
-- ou à la revue de code.

-- 1. Expiration des sessions (15 minutes)
alter table import_sessions
  add column if not exists expires_at timestamptz;

update import_sessions
set expires_at = created_at + interval '15 minutes'
where expires_at is null;

alter table import_sessions
  alter column expires_at set default (now() + interval '15 minutes');

alter table import_sessions
  alter column expires_at set not null;

-- 2. Suppression des policies anonymes ouvertes (qual = true)
drop policy if exists "Anyone can read import session for QR upload" on import_sessions;
drop policy if exists "Anyone can upload photos to an import session" on import_sessions;

-- 3. Écriture anonyme restreinte : uniquement une session "waiting" non
-- expirée, et uniquement pour passer à "uploaded" (une seule fois).
create policy "mobile upload session"
on import_sessions for update
to anon
using (status = 'waiting' and now() < expires_at)
with check (status = 'uploaded');

-- 4. Lecture anonyme strictement bornée dans le temps.
-- Nécessaire pour que le .select() après .update() côté mobile-upload
-- fonctionne (Postgres filtre le RETURNING d'un UPDATE avec la policy
-- SELECT, en plus de la policy UPDATE).
create policy "anon read within validity window"
on import_sessions for select
to anon
using (now() < expires_at);
