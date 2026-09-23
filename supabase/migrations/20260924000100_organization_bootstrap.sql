-- =============================================================================
-- Retailer organization bootstrap.
--
-- Creates a retailer organization and its first owner membership in one
-- transaction. Called only by the application server (service role) after it
-- has authenticated the user.
--
-- Duplicate-submission safety uses a per-request key, NOT a one-user /
-- one-organization rule: the onboarding screen issues a creation_request_id,
-- and repeating the same request returns the organization it already created.
-- A person may still create or join other organizations with new requests.
-- =============================================================================

alter table public.organization
  add column created_by          uuid,  -- auth user who created it (kept if the user is later deleted)
  add column creation_request_id uuid;  -- idempotency key for the creating request

create unique index organization_creation_request_idx
  on public.organization (creation_request_id)
  where creation_request_id is not null;

-- Members may edit the organization's profile, but not its identity or
-- provenance fields (kind, industry, created_by, creation_request_id...).
revoke update on public.organization from authenticated;
grant update (name, legal_name, website, default_country,
              primary_contact_name, primary_contact_email, primary_contact_phone,
              billing_address_line1, billing_address_line2, billing_city,
              billing_region, billing_postal_code, billing_country)
  on public.organization to authenticated;

create or replace function public.bootstrap_retailer_organization(
  p_user_id         uuid,
  p_request_id      uuid,
  p_name            text,
  p_default_country public.country_code,
  p_legal_name      text default null,
  p_website         text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org_id  uuid;
  v_creator uuid;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'user id and request id are required';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'organization name is required';
  end if;

  -- Same request again (double submit, retry): return what it created.
  select o.id, o.created_by into v_org_id, v_creator
    from public.organization o
   where o.creation_request_id = p_request_id;
  if v_org_id is not null then
    if v_creator is distinct from p_user_id then
      raise exception 'request id already used by another user';
    end if;
    return v_org_id;
  end if;

  perform set_config('app.change_reason', 'retailer bootstrap by user ' || p_user_id::text, true);

  insert into public.organization (kind, name, legal_name, website, default_country, created_by, creation_request_id)
  values ('retailer', btrim(p_name), nullif(btrim(p_legal_name), ''), nullif(btrim(p_website), ''),
          p_default_country, p_user_id, p_request_id)
  on conflict (creation_request_id) where creation_request_id is not null do nothing
  returning id into v_org_id;

  if v_org_id is null then
    -- A concurrent identical request won the race; return its organization.
    select o.id, o.created_by into v_org_id, v_creator
      from public.organization o
     where o.creation_request_id = p_request_id;
    if v_creator is distinct from p_user_id then
      raise exception 'request id already used by another user';
    end if;
    return v_org_id;
  end if;

  insert into public.membership (organization_id, user_id, role, status)
  values (v_org_id, p_user_id, 'owner', 'active');

  return v_org_id;
end;
$$;

-- Server-only: signed-in users and signed-out visitors cannot call it.
revoke all on function public.bootstrap_retailer_organization(uuid, uuid, text, public.country_code, text, text)
  from public, anon, authenticated;
grant execute on function public.bootstrap_retailer_organization(uuid, uuid, text, public.country_code, text, text)
  to service_role;
