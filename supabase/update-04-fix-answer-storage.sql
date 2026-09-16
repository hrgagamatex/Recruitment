-- Recruitment Test Gamatex - perbaikan penyimpanan jawaban
-- Aman dijalankan tanpa menghapus data yang sudah ada.

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

alter table public.test_answers enable row level security;

drop policy if exists "admin read answers" on public.test_answers;
create policy "admin read answers" on public.test_answers
for select to authenticated using(public.is_active_admin());

create or replace function public.save_test_answer(
  p_session_token uuid,
  p_test_code text,
  p_question_number integer,
  p_answer jsonb,
  p_timed_out boolean,
  p_elapsed_seconds integer
)
returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt_id uuid; v_max integer;
begin
  v_max:=case p_test_code
    when 'test1' then 90
    when 'test2' then 24
    when 'tiu5' then 30
    else 0
  end;
  if p_question_number<1 or p_question_number>v_max then
    raise exception 'Nomor soal tidak valid';
  end if;

  select a.id into v_attempt_id
  from public.test_attempts a
  join public.candidates c on c.id=a.candidate_id
  where c.session_token=p_session_token
    and a.test_code=p_test_code
    and a.status='in_progress';

  if v_attempt_id is null then raise exception 'Sesi tes tidak aktif'; end if;

  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  values(
    v_attempt_id,
    p_question_number,
    case when coalesce(p_timed_out,false) then null else p_answer end,
    coalesce(p_timed_out,false),
    greatest(0,coalesce(p_elapsed_seconds,0))
  )
  on conflict(attempt_id,question_number) do update set
    answer=excluded.answer,
    timed_out=excluded.timed_out,
    elapsed_seconds=excluded.elapsed_seconds,
    answered_at=now();
end; $$;

revoke all on function public.save_test_answer(uuid,text,integer,jsonb,boolean,integer) from public;
grant execute on function public.save_test_answer(uuid,text,integer,jsonb,boolean,integer) to anon,authenticated;
grant select on public.test_answers to authenticated;
