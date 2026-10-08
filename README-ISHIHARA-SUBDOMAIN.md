# Ishihara terpisah dan hasil admin

## Cloudflare Pages

1. Gunakan repository Recruitment untuk project Pages kedua.
2. Build command: `node build-ishihara-site.mjs`. Output directory: `dist-ishihara`. Root directory tetap root repository.
3. Pilih nama project, misalnya `ishihara-gamatex`. Cloudflare menentukan alamat akhir; verifikasi deployment sukses.
4. Isi `ishiharaUrl` di `config.js` dengan alamat HTTPS hasil deployment. Sampai alamat diisi, recruitment tetap menggunakan halaman tes yang ada.
5. `recruitmentOrigin` harus merupakan alamat recruitment yang digunakan peserta. Deployment kedua menggunakan konfigurasi backend yang sama.

## Database

Migrasi `update-ishihara-handoff.sql` telah dipasang di project recruitment pada 8 Oktober 2026. Untuk project database lain, pasang setelah migrasi Ishihara awal. Kode sekali pakai berlaku 5 menit, akses terbatas Ishihara berlaku 24 jam dan disimpan hanya di sessionStorage tab tes. Token recruitment tidak dikirim ke situs tes. Fragment tautan dihapus setelah dibaca. RPC menyimpan pada attempt/jawaban yang sama; panel admin dan cetak hasil tetap memakai data yang ada.

Pemeriksaan database berhasil untuk pertukaran kode, membaca sesi, penyimpanan sesi selesai, penolakan kode yang digunakan ulang, token salah/kedaluwarsa, dan larangan membaca tabel akses langsung. Perubahan data uji di-rollback. Advisor menandai RPC SECURITY DEFINER yang dapat dipanggil peserta dan tabel RLS tanpa policy: keduanya disengaja pada desain token peserta ini; tabel berada pada schema privat tanpa izin akses, RPC memvalidasi token. Panduan advisor: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable dan https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

## Verifikasi

Uji peserta percobaan: mulai dari recruitment, jawab angka dan jalur, refresh tab tes, selesaikan, kembali ke urutan sesi berikutnya, periksa hasil di admin. Token kedaluwarsa meminta peserta kembali ke recruitment. Kode sekali pakai tidak dapat ditukar ulang. Jika halaman recruitment dibuka langsung pada rute Ishihara yang sudah selesai, ia melanjutkan ke sesi berikutnya.

## Diagram kepribadian

Pencocokan opsi sebelumnya membandingkan tag HTML dan ejaan secara literal. Penekanan em/strong/b/i diabaikan; varian ejaan/kalimat yang ditemukan dalam snapshot tersimpan dipetakan melalui daftar eksplisit. Urutan opsi tetap dipetakan berdasarkan teks, bukan menebak dari nomor soal. Opsi baru dengan makna berbeda tetap diblokir untuk menghindari skor yang keliru. Rumus skor dan jawaban database tidak diubah.

Pemeriksaan: `node personality.test.mjs`, `node ishihara.test.mjs`, `node build-ishihara-site.mjs`.
