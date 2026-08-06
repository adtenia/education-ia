-- Le score officiel passe désormais exclusivement par
-- record_quiz_attempt_details, qui le calcule depuis les réponses en base.
-- La fonction SECURITY DEFINER propriétaire reste autorisée à appeler
-- record_quiz_completion en interne.

revoke execute on function public.record_quiz_completion(uuid, numeric, text)
  from authenticated;
