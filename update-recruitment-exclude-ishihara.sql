-- Ishihara stays active on its standalone site. Existing answers are preserved.
begin;
create or replace function public.get_active_test_sequence()
returns jsonb language sql security definer set search_path=public
as $$ select coalesce(jsonb_agg(test_code order by sort_order),'[]'::jsonb)
from public.test_settings where active and test_code<>'ishihara'; $$;

create or replace function public.get_candidate_session_state(p_session_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare v_candidate public.candidates; v_next text; v_has_attempt boolean; v_all_completed boolean;
begin
 select * into v_candidate from public.candidates where session_token=p_session_token;
 if not found then raise exception 'Sesi peserta tidak ditemukan'; end if;
 select exists(select 1 from public.test_attempts a where a.candidate_id=v_candidate.id and a.test_code<>'ishihara') into v_has_attempt;
 select s.test_code into v_next from public.test_settings s
 where s.active and s.test_code<>'ishihara'
 and not exists(select 1 from public.test_attempts a where a.candidate_id=v_candidate.id and a.test_code=s.test_code and a.status='completed')
 order by s.sort_order limit 1;
 select exists(select 1 from public.test_settings where active and test_code<>'ishihara')
 and not exists(select 1 from public.test_settings s where s.active and s.test_code<>'ishihara'
 and not exists(select 1 from public.test_attempts a where a.candidate_id=v_candidate.id and a.test_code=s.test_code and a.status='completed'))
 into v_all_completed;
 return jsonb_build_object('application_saved',v_candidate.application<>'{}'::jsonb,'has_any_attempt',v_has_attempt,'all_tests_completed',v_all_completed,'next_test_code',v_next);
end $$;
commit;