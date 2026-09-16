-- Recruitment Test Gamatex - TIU 5 dan urutan sesi tetap
-- Jalankan setelah update-02-admin-question-bank.sql

alter table public.test_attempts drop constraint if exists test_attempts_test_code_check;
alter table public.test_attempts add constraint test_attempts_test_code_check check(test_code in ('test1','test2','tiu5'));

alter table public.question_bank drop constraint if exists question_bank_test_code_check;
alter table public.question_bank add constraint question_bank_test_code_check check(test_code in ('test1','test2','tiu5'));
alter table public.question_bank drop constraint if exists question_bank_question_type_check;
alter table public.question_bank add constraint question_bank_question_type_check check(question_type in ('paired_choice','most_least','image_choice'));
alter table public.question_bank add column if not exists image_url text;

alter table public.test_settings drop constraint if exists test_settings_test_code_check;
alter table public.test_settings add constraint test_settings_test_code_check check(test_code in ('test1','test2','tiu5'));
alter table public.test_settings add column if not exists sort_order integer;
update public.test_settings set sort_order=case test_code when 'test1' then 1 when 'test2' then 2 when 'tiu5' then 3 end where sort_order is null;
alter table public.test_settings alter column sort_order set default 99;
alter table public.test_settings alter column sort_order set not null;

update public.test_settings set randomize_questions=false,randomize_options=false;
insert into public.test_settings(test_code,display_name,randomize_questions,randomize_options,allow_back,active,sort_order)
values('tiu5','TIU 5 - Analogi Gambar',false,false,false,true,3)
on conflict(test_code) do update set display_name=excluded.display_name,randomize_questions=false,randomize_options=false;

insert into public.question_bank(test_code,question_number,prompt,question_type,options,image_url,duration_seconds,active) values
('tiu5',1,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q01.png',45,true),
('tiu5',2,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q02.png',45,true),
('tiu5',3,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q03.png',45,true),
('tiu5',4,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q04.png',45,true),
('tiu5',5,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q05.png',45,true),
('tiu5',6,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q06.png',45,true),
('tiu5',7,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q07.png',45,true),
('tiu5',8,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q08.png',45,true),
('tiu5',9,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q09.png',45,true),
('tiu5',10,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q10.png',45,true),
('tiu5',11,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q11.png',45,true),
('tiu5',12,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q12.png',45,true),
('tiu5',13,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q13.png',45,true),
('tiu5',14,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q14.png',45,true),
('tiu5',15,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q15.png',45,true),
('tiu5',16,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q16.png',45,true),
('tiu5',17,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q17.png',45,true),
('tiu5',18,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q18.png',45,true),
('tiu5',19,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q19.png',45,true),
('tiu5',20,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q20.png',45,true),
('tiu5',21,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q21.png',45,true),
('tiu5',22,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q22.png',45,true),
('tiu5',23,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q23.png',45,true),
('tiu5',24,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q24.png',45,true),
('tiu5',25,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q25.png',45,true),
('tiu5',26,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q26.png',45,true),
('tiu5',27,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q27.png',45,true),
('tiu5',28,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q28.png',45,true),
('tiu5',29,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q29.png',45,true),
('tiu5',30,'Pilih jawaban gambar yang tepat.','image_choice','[1,2,3,4,5]'::jsonb,'assets/tiu5/q30.png',45,true)
on conflict(test_code,question_number) do update set
prompt=excluded.prompt,question_type=excluded.question_type,options=excluded.options,image_url=excluded.image_url,duration_seconds=excluded.duration_seconds;

create or replace function public.get_active_test_sequence()
returns jsonb language sql security definer set search_path=public
as $$ select coalesce(jsonb_agg(test_code order by sort_order),'[]'::jsonb) from public.test_settings where active; $$;

create or replace function public.start_test_attempt_v2(p_session_token uuid,p_test_code text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_candidate_id uuid; v_attempt public.test_attempts; v_snapshot jsonb; v_active boolean;
begin
  if p_test_code not in ('test1','test2','tiu5') then raise exception 'Jenis tes tidak valid'; end if;
  select id into v_candidate_id from public.candidates where session_token=p_session_token;
  if v_candidate_id is null then raise exception 'Sesi peserta tidak ditemukan'; end if;
  select active into v_active from public.test_settings where test_code=p_test_code;
  if coalesce(v_active,false)=false then raise exception 'Tes sedang tidak aktif'; end if;
  select * into v_attempt from public.test_attempts where candidate_id=v_candidate_id and test_code=p_test_code;
  if found and v_attempt.status='completed' then raise exception 'Tes ini sudah selesai'; end if;
  if not found or v_attempt.question_snapshot is null then
    select jsonb_agg(jsonb_build_object(
      'id',q.id,'number',q.question_number,'type',q.question_type,'prompt',q.prompt,
      'options',q.options,'image_url',q.image_url,'duration',q.duration_seconds
    ) order by q.question_number)
    into v_snapshot from public.question_bank q where q.test_code=p_test_code and q.active;
    if v_snapshot is null then raise exception 'Bank soal belum tersedia'; end if;
    insert into public.test_attempts(candidate_id,test_code,question_snapshot) values(v_candidate_id,p_test_code,v_snapshot)
    on conflict(candidate_id,test_code) do update set question_snapshot=excluded.question_snapshot,status='in_progress'
    returning * into v_attempt;
  end if;
  return coalesce(v_attempt.question_snapshot,v_snapshot);
end; $$;

create or replace function public.save_test_answer(p_session_token uuid,p_test_code text,p_question_number integer,p_answer jsonb,p_timed_out boolean,p_elapsed_seconds integer)
returns void language plpgsql security definer set search_path=public
as $$
declare v_attempt_id uuid; v_max integer;
begin
  v_max:=case p_test_code when 'test1' then 90 when 'test2' then 24 when 'tiu5' then 30 else 0 end;
  if p_question_number<1 or p_question_number>v_max then raise exception 'Nomor soal tidak valid'; end if;
  select a.id into v_attempt_id from public.test_attempts a join public.candidates c on c.id=a.candidate_id
  where c.session_token=p_session_token and a.test_code=p_test_code and a.status='in_progress';
  if v_attempt_id is null then raise exception 'Sesi tes tidak aktif'; end if;
  insert into public.test_answers(attempt_id,question_number,answer,timed_out,elapsed_seconds)
  values(v_attempt_id,p_question_number,case when p_timed_out then null else p_answer end,p_timed_out,greatest(0,p_elapsed_seconds))
  on conflict(attempt_id,question_number) do update set answer=excluded.answer,timed_out=excluded.timed_out,elapsed_seconds=excluded.elapsed_seconds,answered_at=now();
end; $$;

revoke all on function public.get_active_test_sequence() from public;
grant execute on function public.get_active_test_sequence() to anon,authenticated;
grant execute on function public.start_test_attempt_v2(uuid,text) to anon,authenticated;
grant execute on function public.save_test_answer(uuid,text,integer,jsonb,boolean,integer) to anon,authenticated;
