# Update alur peserta dan kunci WPT

Paket ini dibuat terhadap branch `main` repository `hrgagamatex/Recruitment` pada tree `6ec7fb86dee1471865f40ac4484c1a69c88229ae`.

## Berkas web

Timpa dua berkas berikut di root repository:

- `app.js`
- `experience.css`

Timpa `scoring.js` untuk mengaktifkan pemeriksaan variasi jawaban WPT dan jawaban lengkap berbentuk pasangan/himpunan.

Perubahan tampilan dan alur:

- teks `INDEX` diganti sesuai halaman: Seleksi Karyawan, Formulir Karyawan, Pemberitahuan, Sesi Tes, atau Tes Selesai;
- pergantian soal berlangsung langsung tanpa animasi;
- efek pixel glitch hanya muncul pada halaman awal dan halaman petunjuk tes;
- typing effect dimulai setelah panel petunjuk selesai muncul;
- setelah formulir tersimpan, peserta melihat Pemberitahuan Pelaksanaan Psikotes Online sebelum petunjuk sesi pertama.

## Database Supabase

Jalankan `update-07-wpt-answer-keys.sql` sekali di SQL Editor Supabase. Skrip hanya mengganti `config.wpt.keys`; tabel konversi skor dan kategori WPT yang sudah ada tetap dipertahankan.

Ketentuan khusus yang ditangani:

- nomor 8, 27, 31 menerima semua bentuk jawaban setara yang tercantum di Excel;
- nomor 4, 22, 32 tidak peka huruf besar/kecil dan menerima bentuk yang tercantum di Excel;
- nomor 23, 38, 41, 42, 49 dinilai benar hanya jika seluruh angka kunci diberikan, tanpa angka tambahan;
- urutan angka pada jawaban lengkap boleh dibalik, tetapi anggotanya harus sama persis.

## Urutan penerapan

1. Unggah/timpa `app.js`, `experience.css`, dan `scoring.js` di GitHub.
2. Jalankan `update-07-wpt-answer-keys.sql` di Supabase.
3. Tunggu deployment Cloudflare Pages selesai.
4. Uji satu peserta percobaan sampai WPT, lalu buka menu **Hasil Tes → WPT** sebagai HR.

