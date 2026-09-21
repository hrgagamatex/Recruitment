-- Recruitment Gamatex — pembaruan kunci WPT dari "Jawaban WPT.xlsx"
-- Menjaga konfigurasi konversi skor dan kategori WPT yang sudah ada.

begin;

update public.scoring_config
set config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{wpt,keys}',
  '[
    4,
    2,
    3,
    {"mode":"any","values":["Tidak","tidak","TIDAK"]},
    3,
    1,
    3,
    {"mode":"any","values":["0,125","1/8"]},
    1,
    4,
    3,
    6000,
    1,
    2,
    20,
    2,
    "A",
    13,
    3,
    1,
    20,
    {"mode":"any","values":["S","Salah","salah","SALAH"]},
    {"mode":"set","values":[2,5]},
    "2,5",
    3,
    1,
    {"mode":"any","values":["0,033","1/30"]},
    3,
    6,
    10,
    {"mode":"any","values":["0,111","1/9"]},
    {"mode":"any","values":["Ya","YA","ya"]},
    3,
    20,
    "0,250",
    "24",
    "0,0625",
    {"mode":"set","values":[6,9]},
    "2",
    "1",
    {"mode":"set","values":[1,4]},
    {"mode":"set","values":[2,22]},
    "0,33",
    "2",
    "24",
    "2",
    "3",
    "175",
    {"mode":"set","values":[1,2,4,5]},
    12
  ]'::jsonb,
  true
)
where id = 'excel-2026-09-17';

do $$
begin
  if not exists (
    select 1
    from public.scoring_config
    where id = 'excel-2026-09-17'
      and jsonb_array_length(config #> '{wpt,keys}') = 50
  ) then
    raise exception 'Konfigurasi WPT tidak ditemukan atau kunci tidak berjumlah 50.';
  end if;
end $$;

commit;

