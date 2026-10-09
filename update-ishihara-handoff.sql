-- Requires update-ishihara.sql. Additive; existing answers and scoring stay intact.
begin;
create schema if not exists recruitment_private;
revoke all on schema recruitment_private from public, anon, authenticated;
create table if not exists recruitment_private.ishihara_access (
 code uuid primary key default gen_random_uuid(),
 session_token uuid not null,
 code_expires timestamptz not null default now()+interval '5 minutes',
 access_token uuid unique,
 access_expires timestamptz
);
alter table recruitment_private.ishihara_access enable row level security;
revoke all on recruitment_private.ishihara_access from public, anon, authenticated;

create or replace function public.create_ishihara_handoff(p_session_token uuid)
returns uuid language plpgsql security definer set search_path=public,recruitment_private
as $$ declare v_code uuid; begin
 if not exists(select 1 from public.candidates where session_token=p_session_token) then raise exception 'Sesi peserta tidak ditemukan'; end if;
 -- Validate/start through the existing server-side session rules.
 perform public.ishihara_session(p_session_token,true);
 delete from recruitment_private.ishihara_access where code_expires<now() and coalesce(access_expires,code_expires)<now();
 insert into recruitment_private.ishihara_access(session_token) values(p_session_token) returning code into v_code;
 return v_code;
end $$;

create or replace function public.exchange_ishihara_handoff(p_code uuid)
returns uuid language plpgsql security definer set search_path=public,recruitment_private
as $$ declare v_token uuid; begin
 update recruitment_private.ishihara_access set access_token=gen_random_uuid(),access_expires=now()+interval '24 hours'
 where code=p_code and code_expires>now() and access_token is null returning access_token into v_token;
 if v_token is null then raise exception 'Tautan tes kedaluwarsa atau sudah digunakan. Buka kembali dari recruitment.'; end if;
 return v_token;
end $$;

create or replace function public.ishihara_external_session(p_access_token uuid,p_start boolean default false)
returns jsonb language plpgsql security definer set search_path=public,recruitment_private
as $$ declare v_session uuid; begin
 select session_token into v_session from recruitment_private.ishihara_access where access_token=p_access_token and access_expires>now();
 if v_session is null then raise exception 'Akses tes kedaluwarsa. Buka kembali dari recruitment.'; end if;
 return public.ishihara_session(v_session,p_start);
end $$;

create or replace function public.save_ishihara_external_answers(p_access_token uuid,p_answers jsonb,p_revision integer,p_finish boolean default false)
returns jsonb language plpgsql security definer set search_path=public,recruitment_private
as $$ declare v_session uuid; begin
 select session_token into v_session from recruitment_private.ishihara_access where access_token=p_access_token and access_expires>now();
 if v_session is null then raise exception 'Akses tes kedaluwarsa. Buka kembali dari recruitment.'; end if;
 return public.save_ishihara_answers(v_session,p_answers,p_revision,p_finish);
end $$;
revoke all on function public.create_ishihara_handoff(uuid),public.exchange_ishihara_handoff(uuid),public.ishihara_external_session(uuid,boolean),public.save_ishihara_external_answers(uuid,jsonb,integer,boolean) from public;
grant execute on function public.create_ishihara_handoff(uuid),public.exchange_ishihara_handoff(uuid),public.ishihara_external_session(uuid,boolean),public.save_ishihara_external_answers(uuid,jsonb,integer,boolean) to anon,authenticated;
commit;
