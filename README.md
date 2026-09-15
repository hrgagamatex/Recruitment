# Recruitment Test Gamatex

Web seleksi calon karyawan PT. Gamatex, siap dipasang di Cloudflare Pages dan menggunakan Supabase sebagai backend.

## Isi aplikasi

- Login peserta menggunakan Nama Peserta + NIK 16 digit.
- Formulir aplikasi calon karyawan.
- Tes 1: 90 pasangan pernyataan, 15 detik per soal.
- Tes 2: 24 kelompok Paling/Kurang, 30 detik per kelompok.
- Penyimpanan jawaban otomatis dan status waktu habis.
- Dashboard HR dengan login Supabase Auth.
- Tampilan responsif untuk komputer dan ponsel.

## 1. Menyiapkan Supabase

1. Buka proyek Supabase `ofkkjguaobdepgrvbrnd`.
2. Masuk ke **SQL Editor** lalu pilih **New query**.
3. Salin seluruh isi `supabase/schema.sql`, kemudian klik **Run**.
4. Buka **Authentication > Users > Add user** dan buat akun email HR.
5. Kembali ke SQL Editor dan jalankan perintah `insert into admin_profiles` yang terdapat di bagian paling bawah `schema.sql`. Ganti `EMAIL_HR_ANDA` dengan email akun HR.

Jangan pernah memasukkan secret/service-role key ke file web. File `config.js` hanya memakai publishable key.

## 2. Mengunggah ke GitHub

Unggah seluruh isi folder proyek ini ke repository `hrgagamatex/Recruitment`. Pastikan `index.html` berada di halaman utama repository, bukan di dalam folder tambahan.

## 3. Memasang di Cloudflare Pages

1. Buka Cloudflare Dashboard > **Workers & Pages**.
2. Pilih **Create > Pages > Connect to Git**.
3. Pilih repository `hrgagamatex/Recruitment`.
4. Framework preset: **None**.
5. Build command: kosongkan.
6. Build output directory: `/`.
7. Klik **Save and Deploy**.

## Catatan

Versi ini menyimpan jawaban mentah. Rumus penilaian kepribadian belum ditambahkan karena kunci penilaian belum tersedia.

## Perbaikan login

Jika muncul pesan `function digest(text, unknown) does not exist`, jalankan isi file `supabase/update-01-fix-login.sql` melalui SQL Editor. Tidak perlu mengunggah ulang web ke Cloudflare.
