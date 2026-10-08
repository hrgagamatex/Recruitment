# Integrasi penglihatan warna

Sesi angka (22 pelat) dilanjutkan jalur (12 pelat). Tampilan pelat mempertahankan preview yang disetujui. Tombol angka berada di samping pada desktop, di bawah pada ponsel. Jawaban disimpan setiap pelat, menggunakan token sesi peserta dan kontrol revisi database. Laporan HR tersedia di Hasil Tes dan cetak Data Peserta.

## Aktivasi

1. Jalankan seluruh `update-ishihara.sql` di SQL Editor project Supabase recruitment yang sama. Script memerlukan migrasi tes sebelumnya. Jangan menjalankan schema awal ulang.
2. Buka Pengaturan Tes. Sesi Skrining Penglihatan Warna awalnya nonaktif.
3. Uji sebagai peserta percobaan, termasuk refresh, jaringan terputus, dan cetak laporan. Setelah pemeriksaan, aktifkan sesi dan atur urutannya.

## Batasan

Pelat dan penilaian jalur adalah demonstrasi digital yang belum divalidasi klinis. Laporan menampilkan jumlah angka sesuai dan cakupan/ketepatan jalur, bukan tipe defisiensi warna atau keputusan layak/tidak layak kerja. Hasil dipengaruhi layar, filter warna, pencahayaan, dan kemampuan motorik. Gunakan pemeriksaan profesional untuk keputusan kesehatan.

SQL tidak dapat dijalankan melalui koneksi GitHub; pemasangan Supabase dilakukan terpisah. Sintaks JavaScript telah diperiksa, tetapi pengujian end-to-end database memerlukan migrasi tersebut.

## Koreksi tampilan 8 Oktober 2026

- Header situs mengizinkan iframe hanya dari origin yang sama (`SAMEORIGIN`, `frame-src self`, `frame-ancestors self`). Situs lain tetap tidak dapat menyematkan portal.
- Skrip pelat dipindah ke `ishihara-frame.js`; CSP tetap melarang skrip inline.
- Listener pesan dipasang sebelum iframe dinavigasikan, termasuk saat cache browser digunakan.
- Panel luar mengikuti recruitment, disertai status pemuatan, batas tunggu pemuatan pelat, dan pesan kegagalan sesi.
- Deploy seluruh file pada root repository ke Cloudflare Pages; versi baru ada di index, modul, dan iframe.
- Jika muncul pesan fungsi `ishihara_session` belum tersedia, pasang migrasi di bagian Aktivasi. Jika sesi nonaktif, aktifkan lewat Pengaturan Tes. Perubahan frontend tidak memasang SQL atau mengaktifkan sesi secara otomatis.

Pemeriksaan regresi lokal: `node ishihara.test.mjs`.
