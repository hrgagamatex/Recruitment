# Update alur peserta dan kunci WPT

Paket ini diperbarui terhadap branch `main` repository `hrgagamatex/Recruitment` pada tree `4bf412d528be91e999d62de7423f349df098f8dd`.

## Berkas web

Timpa berkas berikut di root repository:

- `index.html`
- `app.js`
- `experience.css`
- `results.css`
- `results.js`
- `disc-job-match.js`
- `wpt-ui.js`

Timpa `scoring.js` untuk mengaktifkan pemeriksaan variasi jawaban WPT dan jawaban lengkap berbentuk pasangan/himpunan.

Perubahan tampilan dan alur:

- teks `INDEX` diganti sesuai halaman: Seleksi Karyawan, Formulir Karyawan, Pemberitahuan, Sesi Tes, atau Tes Selesai;
- pergantian soal berlangsung langsung tanpa animasi;
- efek pixel glitch hanya muncul pada halaman petunjuk tes;
- kotak-kotak latar muncul bertahap dengan fade-in saat web pertama dibuka;
- panel Seleksi Karyawan muncul setelah latar dengan gerakan zoom-out menuju ukuran normal;
- layar selesai menampilkan “The Reliable Denim Company” dan “GAMATEX” di bawah tab selesai dengan warna akhir hitam–biru serta sweep oranye–hitam saat masuk;
- typing effect dimulai setelah panel petunjuk selesai muncul;
- setelah formulir tersimpan, peserta melihat Pemberitahuan Pelaksanaan Psikotes Online sebelum petunjuk sesi pertama;
- isi pemberitahuan ditampilkan dengan typing effect dan tombol lanjut muncul setelah teks selesai;
- tab pemberitahuan memakai struktur compact tanpa tinggi minimum; setiap nomor muncul bersamaan dengan teks poinnya dan poin berikutnya belum mengambil ruang sebelum mulai diketik;
- `index.html` memakai penanda versi pada `app.js` dan `experience.css` agar browser tidak mempertahankan tampilan notice lama dari cache;
- editor Bank Soal menyediakan format **bold**, *italic*, underline, dan strikethrough; format disimpan di kolom teks/JSON yang sudah ada sehingga tidak memerlukan migrasi database;
- tampilan peserta hanya merender tag format yang diizinkan dan membuang elemen serta atribut HTML lain;
- petunjuk peserta untuk PAPI Kostic, DISC, MBTI, dan WPT diperbarui dengan paragraf berformat serta contoh pengerjaan WPT; nama asli sesi tetap disembunyikan sebagai “Urutan Tes”;
- petunjuk TIU 6 diperbarui dan dilengkapi contoh SVG dua bentuk acuan, masing-masing dengan lima guntingan serta bulatan jawaban B/S yang sudah terisi; bentuk kubus, limas, serta pilihan bawah nomor 2 dan 3 digambar ulang presisi mengikuti referensi; 40 SVG soal TIU 6 tidak diubah;
- hasil DISC kini mengikuti bagian Psikogram pada Excel: profil publik, profil saat mendapat tekanan, kepribadian asli, deskripsi kepribadian lengkap, dan Job Match berdasarkan profil Grafik III;
- menu **Hasil Tes** memiliki tombol **Print Hasil Tes** pada setiap tab peserta;
- tombol print di **Data Peserta** dan **Hasil Tes** memakai satu desain laporan A4 compact yang sama, dengan grafik dan ringkasan tetap terbaca tetapi ukuran, jarak, dan tabel dipadatkan agar tidak menghabiskan banyak halaman;
- tampilan serta cetak hasil MBTI dan WPT ditangani oleh modul hasil yang sama sehingga laporan gabungan peserta tidak lagi menggunakan layout besar lama;
- validasi WPT menggunakan teks, pilihan, tipe jawaban, dan SVG dari file acuan yang disetujui sehingga perbedaan format snapshot database tidak lagi memblokir halaman.

## Database Supabase

Jalankan `update-07-wpt-answer-keys.sql` sekali di SQL Editor Supabase. Skrip hanya mengganti `config.wpt.keys`; tabel konversi skor dan kategori WPT yang sudah ada tetap dipertahankan.

Ketentuan khusus yang ditangani:

- nomor 8, 27, 31 menerima semua bentuk jawaban setara yang tercantum di Excel;
- nomor 4, 22, 32 tidak peka huruf besar/kecil dan menerima bentuk yang tercantum di Excel;
- nomor 23, 38, 41, 42, 49 dinilai benar hanya jika seluruh angka kunci diberikan, tanpa angka tambahan;
- urutan angka pada jawaban lengkap boleh dibalik, tetapi anggotanya harus sama persis.

## Urutan penerapan

1. Unggah/timpa `index.html`, `app.js`, `experience.css`, `results.css`, `results.js`, `scoring.js`, `disc-job-match.js`, dan `wpt-ui.js` di GitHub.
2. Jalankan `update-07-wpt-answer-keys.sql` di Supabase.
3. Tunggu deployment Cloudflare Pages selesai.
4. Uji satu peserta percobaan sampai WPT, lalu buka menu **Hasil Tes → WPT** sebagai HR.
