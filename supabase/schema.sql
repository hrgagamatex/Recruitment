-- Recruitment Test Gamatex - jalankan seluruh file ini di Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nik_hash text not null,
  session_token uuid not null unique default gen_random_uuid(),
  application jsonb not null default '{}'::jsonb,
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nik_hash)
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  test_code text not null check (test_code in ('test1','test2')),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(candidate_id,test_code)
);

create table if not exists public.test_answers (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_number integer not null,
  answer jsonb,
  timed_out boolean not null default false,
  elapsed_seconds integer not null default 0,
  answered_at timestamptz not null default now(),
  unique(attempt_id,question_number)
);

alter table public.admin_profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_answers enable row level security;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_profiles where user_id=auth.uid() and active); $$;

drop policy if exists "admin read profiles" on public.admin_profiles;
create policy "admin read profiles" on public.admin_profiles for select to authenticated using (public.is_active_admin());
drop policy if exists "admin read candidates" on public.candidates;
create policy "admin read candidates" on public.candidates for select to authenticated using (public.is_active_admin());
drop policy if exists "admin read attempts" on public.test_attempts;
create policy "admin read attempts" on public.test_attempts for select to authenticated using (public.is_active_admin());
drop policy if exists "admin read answers" on public.test_answers;
create policy "admin read answers" on public.test_answers for select to authenticated using (public.is_active_admin());

create or replace function public.start_candidate_session(p_full_name text,p_nik text)
returns table(session_token uuid,full_name text)
language plpgsql security definer set search_path=public
as $$
declare v_candidate public.candidates;
begin
  if length(trim(p_full_name))<3 then raise exception 'Nama peserta tidak valid'; end if;
  if p_nik !~ '^[0-9]{16}$' then raise exception 'NIK harus terdiri dari 16 angka'; end if;
  select * into v_candidate from public.candidates where nik_hash=encode(extensions.digest(p_nik,'sha256'),'hex');
  if found then
    if lower(trim(v_candidate.full_name))<>lower(trim(p_full_name)) then raise exception 'Nama dan NIK tidak sesuai'; end if;
  else
    insert into public.candidates(full_name,nik_hash) values(trim(p_full_name),encode(extensions.digest(p_nik,'sha256'),'hex')) returning * into v_candidate;
  end if;
  return query select v_candidate.session_token,v_candidate.full_name;
end; $$;

create or replace function public.save_candidate_application(p_session_token uuid,p_application jsonb)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.candidates set application=p_application,position=nullif(trim(p_application->>'position'),''),updated_at=now()
  where session_token=p_session_token;
  if not found then raise exception 'Sesi peserta tidak ditemukan'; end if;
end; $$;

create or replace function public.start_test_attempt(p_session_token uuid,p_test_code text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_candidate_id uuid; v_attempt_id uuid;
begin
  if p_test_code not in ('test1','test2') then raise exception 'Jenis tes tidak valid'; end if;
  select id into v_candidate_id from public.candidates where session_token=p_session_token;
  if v_candidate_id is null then raise exception 'Sesi peserta tidak ditemukan'; end if;
  insert into public.test_attempts(candidate_id,test_code) values(v_candidate_id,p_test_code)
  on conflict(candidate_id,test_code) do update set status=case when test_attempts.status='completed' then 'completed' else 'in_progress' end
  returning id into v_attempt_id;
  return v_attempt_id;
end; $$;

create or replace function public.save_test_answer(p_session_token uuid,p_test_code text,p_question_number integer,p_answer jsonb,p_timed_out boolean,p_elapsed_seconds integer)
returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt_id uuid; v_max integer;
begin
  v_max:=case p_test_code when 'test1' then 90 when 'test2' then 24 else 0 end;
  if p_question_number<1 or p_question_number>v_max then raise exception 'Nomor soal tidak valid'; end if;
  select a.id into v_attempt_id from public.test_attempts a join public.candidates c on c.id=a.candidate_id
  where c.session_token=p_session_token and a.test_code=p_test_code and a.status='in_progress';
  if v_attempt_id is null then raise exception 'Sesi tes tidak aktif'; end if;
  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  values(v_attempt_id,p_question_number,p_answer,coalesce(p_timed_out,false),greatest(0,coalesce(p_elapsed_seconds,0)))
  on conflict(attempt_id,question_number) do nothing;
end; $$;

create or replace function public.complete_test_attempt(p_session_token uuid,p_test_code text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.test_attempts a set status='completed',completed_at=coalesce(completed_at,now())
  from public.candidates c where c.id=a.candidate_id and c.session_token=p_session_token and a.test_code=p_test_code;
  if not found then raise exception 'Sesi tes tidak ditemukan'; end if;
end; $$;

revoke all on function public.start_candidate_session(text,text) from public;
revoke all on function public.save_candidate_application(uuid,jsonb) from public;
revoke all on function public.start_test_attempt(uuid,text) from public;
revoke all on function public.save_test_answer(uuid,text,integer,jsonb,boolean,integer) from public;
revoke all on function public.complete_test_attempt(uuid,text) from public;
grant execute on function public.start_candidate_session(text,text) to anon,authenticated;
grant execute on function public.save_candidate_application(uuid,jsonb) to anon,authenticated;
grant execute on function public.start_test_attempt(uuid,text) to anon,authenticated;
grant execute on function public.save_test_answer(uuid,text,integer,jsonb,boolean,integer) to anon,authenticated;
grant execute on function public.complete_test_attempt(uuid,text) to anon,authenticated;

create or replace view public.admin_candidate_summary with (security_invoker=true) as
select c.id,c.full_name,c.position,c.application,c.created_at,
 max(case when a.test_code='test1' then a.status end) as test_1_status,
 max(case when a.test_code='test2' then a.status end) as test_2_status
from public.candidates c left join public.test_attempts a on a.candidate_id=c.id
group by c.id;
grant select on public.admin_candidate_summary to authenticated;

-- Setelah membuat akun HR di Authentication > Users, ganti email berikut lalu jalankan:
-- insert into public.admin_profiles(user_id,display_name)
-- select id,'Admin HRGA' from auth.users where lower(email)=lower('EMAIL_HR_ANDA')
-- on conflict(user_id) do update set active=true,display_name=excluded.display_name;
