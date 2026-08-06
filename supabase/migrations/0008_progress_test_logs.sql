-- Logs temporaires de validation du pipeline de progression.
-- À retirer dans une future migration après la phase de recette.

create or replace function public.record_generated_content_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cours' then
    perform public.append_learning_event(
      new.user_id,
      'course_generated',
      'course_generated:' || new.id::text,
      new.id
    );
    raise log '[progress] événement course_generated traité';
  elsif tg_table_name = 'revision_sheets' then
    perform public.append_learning_event(
      new.user_id,
      'revision_sheet_generated',
      'revision_sheet_generated:' || new.id::text,
      new.cours_id
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
