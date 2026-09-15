-- Perbaikan login: jalankan file ini jika muncul error
-- "function digest(text, unknown) does not exist".

create extension if not exists pgcrypto with schema extensions;

create or replace function public.start_candidate_session(p_full_name text,p_nik text)
returns table(session_token uuid,full_name text)
language plpgsql security definer set search_path=public
as $$
declare v_candidate public.candidates;
begin
  if length(trim(p_full_name))<3 then raise exception 'Nama peserta tidak valid'; end if;
  if p_nik !~ '^[0-9]{16}$' then raise exception 'NIK harus terdiri dari 16 angka'; end if;

  select * into v_candidate
  from public.candidates
  where nik_hash=encode(extensions.digest(p_nik,'sha256'),'hex');

  if found then
    if lower(trim(v_candidate.full_name))<>lower(trim(p_full_name)) then
      raise exception 'Nama dan NIK tidak sesuai';
    end if;
  else
    insert into public.candidates(full_name,nik_hash)
    values(trim(p_full_name),encode(extensions.digest(p_nik,'sha256'),'hex'))
    returning * into v_candidate;
  end if;

  return query select v_candidate.session_token,v_candidate.full_name;
end;
$$;

revoke all on function public.start_candidate_session(text,text) from public;
grant execute on function public.start_candidate_session(text,text) to anon,authenticated;
