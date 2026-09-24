-- =============================================================================
-- Quick answers stay structured; the conversation stays conversational.
--
-- A quick answer ("Yes", "Not sure yet") is recorded on the question itself
-- and does not add a message to the retailer's conversation. A written
-- answer ("Tell us more") is part of the conversation: it is stored as an
-- 'answer' message and linked from the question.
-- =============================================================================

alter table public.intelligence_question
  -- The quick answer chosen, exactly as offered.
  add column answer_choice text;

grant update (answer_choice) on public.intelligence_question to authenticated;

create or replace function public.answer_intelligence_question(
  p_question_id uuid,
  p_choice      text,
  p_body        text,
  p_surface     text default 'panel'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_question public.intelligence_question%rowtype;
  v_user     uuid := app.current_user_id();
  v_body     text := nullif(btrim(p_body), '');
  v_message  uuid;
begin
  if v_user is null then
    raise exception 'sign in to answer';
  end if;

  select * into v_question from public.intelligence_question
   where id = p_question_id
   for update;
  if not found then
    raise exception 'question not found';
  end if;
  if v_question.status not in ('open', 'deferred') then
    raise exception 'this question is no longer open';
  end if;
  if p_choice is not null and not (v_question.choices ? p_choice) then
    raise exception 'that answer was not offered';
  end if;
  if p_choice is null and v_body is null then
    raise exception 'an answer needs a choice or some words';
  end if;

  -- Only a written answer becomes part of the conversation.
  if v_body is not null then
    insert into public.intelligence_message
      (organization_id, author_type, author_user_id, kind, body, question_id, answer_choice, surface)
    values
      (v_question.organization_id, 'retailer', v_user, 'answer', v_body, p_question_id, p_choice, p_surface)
    returning id into v_message;
  end if;

  update public.intelligence_question
     set status = 'answered', answered_at = now(), answered_by = v_user,
         answer_choice = p_choice, answer_message_id = v_message, deferred_until = null
   where id = p_question_id;

  -- The question id: the thing that was resolved (a message may not exist).
  return p_question_id;
end;
$$;

revoke all on function public.answer_intelligence_question(uuid, text, text, text) from public, anon;
grant execute on function public.answer_intelligence_question(uuid, text, text, text) to authenticated;
