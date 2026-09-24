-- =============================================================================
-- Retailer intelligence conversation.
--
-- The conversation is the interface; context_item is the memory. They are
-- kept apart on purpose:
--
--   intelligence_message   RETAILER-PRIVATE, append-only. Everything said in
--                          the retailer's one ongoing conversation: notes,
--                          system questions, answers, attachments, check-in
--                          markers. Never rewritten; corrections are new
--                          messages.
--   intelligence_question  RETAILER-PRIVATE. One row per question the system
--                          wants answered, with a lifecycle
--                          (open / answered / deferred / withdrawn). A
--                          question is answered once, wherever it is shown
--                          (panel, weekly check-in, inline on an order).
--   context_item           (existing) structured beliefs, now linkable to the
--                          exact message or document they were learned from,
--                          with a seasonal lifespan, a review date and
--                          category / product scope.
--
-- Attachments are ordinary `document` rows (bytes in the private `documents`
-- bucket under <organization_id>/...), referenced by an attachment message.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- intelligence_question
-- -----------------------------------------------------------------------------
create table public.intelligence_question (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organization (id) on delete cascade,
  prompt                   text not null check (char_length(prompt) between 1 and 500),
  -- Quick answers, e.g. ["Yes, this spring", "Not sure yet", "No"]. May be empty.
  choices                  jsonb not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array'),
  -- Why we are asking: the recommendation, assumption or decision it can change.
  reason                   text,
  -- Higher asks sooner. Questions must earn their place; most are never asked.
  priority                 smallint not null default 50 check (priority between 0 and 100),
  scope_type               text not null default 'organization'
                           check (scope_type in ('organization', 'location', 'supplier_relationship',
                                                 'category', 'product', 'purchase_order')),
  location_id              uuid,
  supplier_relationship_id uuid,
  category_id              uuid references public.category (id) on delete cascade,
  product_id               uuid references public.product (id) on delete cascade,
  purchase_order_id        uuid,
  status                   text not null default 'open'
                           check (status in ('open', 'answered', 'deferred', 'withdrawn')),
  -- Deferred without a date rolls into the next check-in.
  deferred_until           timestamptz,
  answered_at              timestamptz,
  answered_by              uuid,
  answer_message_id        uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (id, organization_id),
  check ((status = 'answered') = (answered_at is not null and answered_by is not null)),
  check (num_nonnulls(location_id, supplier_relationship_id, category_id, product_id, purchase_order_id)
         = case when scope_type = 'organization' then 0 else 1 end),
  check (scope_type <> 'location' or location_id is not null),
  check (scope_type <> 'supplier_relationship' or supplier_relationship_id is not null),
  check (scope_type <> 'category' or category_id is not null),
  check (scope_type <> 'product' or product_id is not null),
  check (scope_type <> 'purchase_order' or purchase_order_id is not null),
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) on delete cascade,
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) on delete cascade,
  foreign key (purchase_order_id, organization_id)
    references public.purchase_order (id, organization_id) on delete cascade
);

create index intelligence_question_open_idx
  on public.intelligence_question (organization_id, priority desc, created_at)
  where status in ('open', 'deferred');

create trigger intelligence_question_set_updated_at
  before update on public.intelligence_question
  for each row execute function app.set_updated_at();

create trigger intelligence_question_audit
  after insert or update or delete on public.intelligence_question
  for each row execute function app.log_change('organization_id');

create trigger intelligence_question_no_user_delete
  before delete on public.intelligence_question
  for each row execute function app.prevent_user_delete();

-- -----------------------------------------------------------------------------
-- intelligence_message: the retailer's one ongoing conversation.
-- -----------------------------------------------------------------------------
create table public.intelligence_message (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  author_type     text not null check (author_type in ('retailer', 'system')),
  -- Auth user for retailer messages; kept even if the user is later deleted.
  author_user_id  uuid,
  kind            text not null check (kind in ('text', 'question', 'answer', 'attachment', 'check_in')),
  body            text check (char_length(body) <= 10000),
  question_id     uuid,
  -- The quick answer chosen, exactly as offered (null for a free-text answer).
  answer_choice   text,
  document_id     uuid,
  -- Where it was written: 'panel', 'check_in', 'order', ...
  surface         text,
  created_at      timestamptz not null default now(),
  unique (id, organization_id),
  check ((author_type = 'retailer') = (author_user_id is not null)),
  check (kind <> 'text' or nullif(btrim(body), '') is not null),
  check (kind not in ('question', 'answer') or question_id is not null),
  check (kind <> 'answer' or answer_choice is not null or nullif(btrim(body), '') is not null),
  check (kind <> 'attachment' or document_id is not null),
  check (kind in ('question', 'answer') or question_id is null),
  check (kind = 'attachment' or document_id is null),
  foreign key (question_id, organization_id)
    references public.intelligence_question (id, organization_id) deferrable initially deferred,
  foreign key (document_id, organization_id)
    references public.document (id, organization_id) deferrable initially deferred
);

create index intelligence_message_thread_idx
  on public.intelligence_message (organization_id, created_at, id);

create trigger intelligence_message_append_only
  before update on public.intelligence_message
  for each row execute function app.prevent_modification();

create trigger intelligence_message_no_user_delete
  before delete on public.intelligence_message
  for each row execute function app.prevent_user_delete();

alter table public.intelligence_question
  add foreign key (answer_message_id, organization_id)
    references public.intelligence_message (id, organization_id) deferrable initially deferred;

-- -----------------------------------------------------------------------------
-- context_item: provenance, seasonal lifespan, review date, category/product scope.
-- -----------------------------------------------------------------------------
alter table public.context_item
  add column category_id        uuid references public.category (id) on delete cascade,
  add column product_id         uuid references public.product (id) on delete cascade,
  -- When to check whether this still holds (seasonal and durable items too).
  add column review_at          timestamptz,
  -- The exact message or file it was learned from. source_reference stays for
  -- anything else (e.g. an import batch).
  add column source_message_id  uuid,
  add column source_document_id uuid,
  add foreign key (source_message_id, organization_id)
    references public.intelligence_message (id, organization_id) deferrable initially deferred,
  add foreign key (source_document_id, organization_id)
    references public.document (id, organization_id) deferrable initially deferred;

-- Replace the unnamed checks that enumerate lifespans and scopes.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.context_item'::regclass
       and contype = 'c'
       and (pg_get_constraintdef(oid) like '%lifespan%'
            or pg_get_constraintdef(oid) like '%num_nonnulls%'
            or pg_get_constraintdef(oid) like '%scope_type = ANY%')
  loop
    execute format('alter table public.context_item drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.context_item
  add constraint context_item_lifespan_check
    check (lifespan in ('evergreen', 'seasonal', 'temporary')),
  add constraint context_item_scope_type_check
    check (scope_type in ('organization', 'location', 'supplier_relationship', 'category', 'product',
                          'program', 'recommendation', 'purchase_order')),
  add constraint context_item_scope_reference_check
    check (num_nonnulls(location_id, supplier_relationship_id, category_id, product_id, program_id,
                        recommendation_id, purchase_order_id)
           = case when scope_type = 'organization' then 0 else 1 end),
  add constraint context_item_category_scope_check
    check (scope_type <> 'category' or category_id is not null),
  add constraint context_item_product_scope_check
    check (scope_type <> 'product' or product_id is not null);

-- -----------------------------------------------------------------------------
-- document: conversation attachments, and files always inside their owner's folder.
-- -----------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.document'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%document_type%'
  loop
    execute format('alter table public.document drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.document
  add constraint document_type_check
    check (document_type in ('supplier_program', 'price_list', 'catalog', 'terms',
                             'conversation_attachment', 'other')),
  -- A row can only point at bytes in its own organization's folder.
  add constraint document_storage_path_owner_check
    check (storage_bucket <> 'documents' or storage_path like organization_id::text || '/%') not valid;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.intelligence_question enable row level security;
alter table public.intelligence_message enable row level security;

create policy intelligence_question_select on public.intelligence_question
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

-- Questions are created server-side. Members may only move them through the
-- retailer-facing states, and only via these columns.
revoke insert, update on public.intelligence_question from authenticated;
grant update (status, deferred_until, answered_at, answered_by, answer_message_id)
  on public.intelligence_question to authenticated;

create policy intelligence_question_update on public.intelligence_question
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and status in ('open', 'answered', 'deferred')
              and (status <> 'answered' or answered_by = app.current_user_id()));

create policy intelligence_message_select on public.intelligence_message
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

-- Members speak only as themselves; system messages are written server-side.
create policy intelligence_message_insert on public.intelligence_message
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and author_type = 'retailer'
              and author_user_id = app.current_user_id()
              and kind in ('text', 'answer', 'attachment'));

-- context_item: product-scoped items must reference a product the retailer can see.
drop policy context_item_insert on public.context_item;
drop policy context_item_update on public.context_item;

create policy context_item_insert on public.context_item
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and source_type = 'retailer_stated'
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id))
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));

create policy context_item_update on public.context_item
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id))
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));

-- -----------------------------------------------------------------------------
-- Answering a question: the answer message and the question's new state are
-- written together. Runs as the caller, so row-level security applies.
-- A choice must be one of the offered answers; otherwise a written answer.
-- -----------------------------------------------------------------------------
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
  if p_choice is null and nullif(btrim(p_body), '') is null then
    raise exception 'an answer needs a choice or some words';
  end if;

  insert into public.intelligence_message
    (organization_id, author_type, author_user_id, kind, body, question_id, answer_choice, surface)
  values
    (v_question.organization_id, 'retailer', v_user, 'answer', nullif(btrim(p_body), ''), p_question_id,
     p_choice, p_surface)
  returning id into v_message;

  update public.intelligence_question
     set status = 'answered', answered_at = now(), answered_by = v_user,
         answer_message_id = v_message, deferred_until = null
   where id = p_question_id;

  return v_message;
end;
$$;

revoke all on function public.answer_intelligence_question(uuid, text, text, text) from public, anon;
grant execute on function public.answer_intelligence_question(uuid, text, text, text) to authenticated;
