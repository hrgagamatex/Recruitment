# Recruitment Test Gamatex — build desain 17 September 2026

## Isi
- Portal peserta dan HR dari proyek terakhir yang tersedia di percakapan.
- TIU 5: SVG 30 soal dan tampilan satu sesi yang ada tetap dipertahankan.
- Sesi TIU 6: 8 kelompok, 40 gambar SVG, bulatan B/S, termasuk koreksi acuan dan gambar 5 kelompok 7 yang sudah disetujui. Masuk sebagai sesi tes peserta, bank soal, dan Hasil TIU 6 di HR.
- Data TIU 6 tersedia di data/tiu6-svg.csv. Isi CSV dipertahankan identik dengan versi yang disetujui; label draft_visual_review adalah metadata dari ekspor sebelumnya.
- Perhitungan DISC/PAPI belum ditambahkan karena menunggu kunci dan pedoman.

## Membuka desain
Jalankan server statis dari folder ini: `python3 -m http.server 8080`, kemudian buka http://localhost:8080/preview.html.
Portal utama: /index.html. Preview TIU 6: /preview/tiu6/index.html.
Jangan membuka portal melalui file:// karena modul JavaScript dan pembacaan CSV memerlukan HTTP.

## Cloudflare Pages
1. Untuk database yang sudah memiliki TIU 5, jalankan hanya supabase/update-04-tiu6.sql di SQL Editor Supabase. File ini memasang bank 40 gambar dan fungsi simpan TIU 6 tanpa menghapus jawaban lama. Prasyarat: update-02 dan update-03 sudah terpasang. Jangan menjalankan ulang update lama pada database yang sudah diperbarui.
2. Unggah file web dari ZIP ini ke repository atau Cloudflare Pages.
3. Masuk sebagai HR: Pengaturan Tes > TIU 6. Sesi awalnya aktif setelah sesi terakhir. Atur posisi dan waktu total (kosong = tanpa batas waktu). Perubahan durasi berlaku untuk peserta yang baru memulai sesi.
4. Uji dengan peserta khusus pengujian: mulai TIU 6, isi B/S, tunggu Jawaban tersimpan, muat ulang, pastikan pilihan kembali, selesaikan, lalu buka HR > Hasil TIU 6 > Lihat jawaban / Unduh CSV.

Ini paket statis: framework None, build command kosong, output directory sesuai root unggahan.
Ekstrak ZIP dan unggah isinya pada root repository hrgagamatex/Recruitment (index.html berada di root).
Untuk Direct Upload, gunakan ZIP ini atau folder hasil ekstraknya. Build ini belum diterbitkan ke situs aktif.

## Batas build
TIU 6 menggunakan test_attempts untuk sesi dan test_answers untuk 40 jawaban, dengan nomor soal tetap: (kelompok-1)*5+gambar. Nilai adalah {"choice":"B"}, {"choice":"S"}, atau SQL NULL. Tidak ada penilaian benar/salah karena kunci belum ditetapkan.
Sesi mengambil salinan soal saat dimulai. Waktu opsional tersimpan pada server dan tidak kembali ke awal saat reload. Jawaban setelah deadline tidak diterima; jawaban terakhir yang berhasil tersimpan dipertahankan, sisanya kosong. Sesi yang melewati deadline ketika peserta offline akan ditutup saat sesi diakses kembali. Preview terpisah tetap tersedia untuk koreksi gambar tanpa menyimpan ke database.
Portal memakai Supabase asli dari config.js. Akun HR, akses RLS, dan RPC mengikuti database yang sudah terpasang. Tidak ada SQL yang dijalankan atau data peserta yang diubah saat build.
SQL lama disertakan sebagai referensi instalasi; jalankan hanya update-04-tiu6.sql untuk fitur TIU 6 pada instalasi yang sudah diperbarui sampai update-03. tiu6-functions.sql adalah sumber pembentuk migrasi, bukan langkah instalasi tambahan.
Pemeriksaan paket mencakup referensi lokal, kesamaan file aplikasi utama, SVG, serta sintaks JavaScript. Login, penyimpanan, dan interaksi browser belum diuji pada build ini.
