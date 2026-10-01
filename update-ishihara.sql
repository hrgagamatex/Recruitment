-- Run in Supabase SQL Editor after existing recruitment migrations.
-- New session starts INACTIVE. Existing answers and test settings are preserved.
begin;
alter table public.test_attempts drop constraint if exists test_attempts_test_code_check;
alter table public.test_attempts add constraint test_attempts_test_code_check check(test_code in ('test1','test2','tiu5','tiu6','mbti','wpt','ishihara'));
alter table public.test_settings drop constraint if exists test_settings_test_code_check;
alter table public.test_settings add constraint test_settings_test_code_check check(test_code in ('test1','test2','tiu5','tiu6','mbti','wpt','ishihara'));
insert into public.test_settings(test_code,display_name,randomize_questions,randomize_options,allow_back,active,sort_order)
select 'ishihara','Skrining Penglihatan Warna',false,false,false,false,coalesce(max(sort_order),0)+1 from public.test_settings
on conflict(test_code) do nothing;
-- Included by build-ishihara-migration.py after the schema and question inserts.
create or replace function public._ishihara_state(p_attempt_id uuid)
returns jsonb language sql security definer set search_path=public
as $$
select jsonb_build_object('id',a.id,'status',a.status,'started_at',a.started_at,
 'deadline_at',a.session_deadline_at,'server_now',clock_timestamp(),'revision',a.answer_revision,
 'questions',a.question_snapshot,
 'answers',(select jsonb_agg(coalesce(t.answer,'null'::jsonb) order by n)
 from generate_series(1,34) n left join public.test_answers t on t.attempt_id=a.id and t.question_number=n))
from public.test_attempts a where a.id=p_attempt_id and a.test_code='ishihara';
$$;
revoke all on function public._ishihara_state(uuid) from public,anon,authenticated;

create or replace function public.ishihara_session(p_session_token uuid,p_start boolean default false)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_candidate uuid; v_attempt public.test_attempts; v_settings public.test_settings; v_snapshot jsonb;
begin
 select id into v_candidate from public.candidates where session_token=p_session_token;
 if v_candidate is null then raise exception 'Sesi peserta tidak ditemukan'; end if;
 select * into v_settings from public.test_settings where test_code='ishihara';
 if not found then raise exception 'Ishihara belum dipasang. Hubungi HR.'; end if;
 select * into v_attempt from public.test_attempts where candidate_id=v_candidate and test_code='ishihara' for update;
 if not found then
  if not p_start then return jsonb_build_object('status','not_started','active',v_settings.active,'duration_seconds',v_settings.session_duration_seconds); end if;
  if not v_settings.active then raise exception 'Ishihara sedang tidak aktif'; end if;
  v_snapshot := '{"version":"approved-number-line-v1","number_count":22,"line_count":12}'::jsonb;
  insert into public.test_attempts(candidate_id,test_code,question_snapshot,session_deadline_at)
  values(v_candidate,'ishihara',v_snapshot,case when v_settings.session_duration_seconds is not null then now()+make_interval(secs=>v_settings.session_duration_seconds) end)
  on conflict(candidate_id,test_code) do nothing;
  select * into v_attempt from public.test_attempts where candidate_id=v_candidate and test_code='ishihara' for update;
 end if;
 if v_attempt.status='in_progress' and v_attempt.session_deadline_at<=clock_timestamp() then
  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  select v_attempt.id,n,null,true,greatest(0,extract(epoch from v_attempt.session_deadline_at-v_attempt.started_at)::int) from generate_series(1,34) n
  on conflict(attempt_id,question_number) do update set timed_out=true where public.test_answers.answer is null;
  update public.test_attempts set status='completed',completed_at=session_deadline_at,answer_revision=answer_revision+1 where id=v_attempt.id;
 end if;
 return public._ishihara_state(v_attempt.id);
end; $$;

create or replace function public.save_ishihara_answers(p_session_token uuid,p_answers jsonb,p_revision integer,p_finish boolean default false)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_attempt public.test_attempts; v_expired boolean; v_elapsed integer;
begin
 select a.* into v_attempt from public.test_attempts a join public.candidates c on c.id=a.candidate_id
 where c.session_token=p_session_token and a.test_code='ishihara' for update of a;
 if not found then raise exception 'Mulai Ishihara terlebih dahulu'; end if;
 if v_attempt.status='completed' then return public._ishihara_state(v_attempt.id); end if;
 v_expired:=coalesce(v_attempt.session_deadline_at<=clock_timestamp(),false);
 v_elapsed:=greatest(0,extract(epoch from least(clock_timestamp(),coalesce(v_attempt.session_deadline_at,clock_timestamp()))-v_attempt.started_at)::int);
 if v_expired then
  -- Never accept answers sent after the server deadline. Keep already-saved values.
  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  select v_attempt.id,n,null,true,v_elapsed from generate_series(1,34) n
  on conflict(attempt_id,question_number) do update set timed_out=true where public.test_answers.answer is null;
 else
  if p_revision is distinct from v_attempt.answer_revision then raise exception 'Jawaban berubah di tab lain. Muat ulang halaman sebelum melanjutkan.'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'Format jawaban tidak valid'; end if;
  if jsonb_array_length(p_answers)<>34 then raise exception 'Diperlukan 34 isian jawaban'; end if;
  if octet_length(p_answers::text)>2000000 then raise exception 'Jawaban terlalu besar'; end if;
  if exists(select 1 from jsonb_array_elements(p_answers) e(value) where value<>'null'::jsonb and jsonb_typeof(value)<>'object') then raise exception 'Format jawaban tidak valid'; end if;
  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  select v_attempt.id,ordinality::integer,case when value='null'::jsonb then null else value end,false,v_elapsed
  from jsonb_array_elements(p_answers) with ordinality e(value,ordinality)
  on conflict(attempt_id,question_number) do update set answer=excluded.answer,timed_out=false,elapsed_seconds=excluded.elapsed_seconds,answered_at=now();
 end if;
 update public.test_attempts set answer_revision=answer_revision+1,
 status=case when p_finish or v_expired then 'completed' else 'in_progress' end,
 completed_at=case when v_expired then session_deadline_at when p_finish then now() else null end where id=v_attempt.id;
 return public._ishihara_state(v_attempt.id);
end; $$;
revoke all on function public.ishihara_session(uuid,boolean) from public;
revoke all on function public.save_ishihara_answers(uuid,jsonb,integer,boolean) from public;
grant execute on function public.ishihara_session(uuid,boolean) to anon,authenticated;
grant execute on function public.save_ishihara_answers(uuid,jsonb,integer,boolean) to anon,authenticated;


commit;
