# Pembaruan Hasil Tes Gamatex

1. Pastikan database sudah memiliki update-04-tiu6.sql dari paket sebelumnya.
2. Jalankan file update-05-results.sql yang diberikan terpisah melalui SQL Editor Supabase. Migrasi mempertahankan soal, peserta, dan jawaban lama.
3. Ekstrak ZIP web ini. Unggah seluruh isinya ke root repository Recruitment, dengan index.html di root. Jangan unggah file Excel, file SQL kunci, atau folder scoring-analysis ke hosting publik.
4. Tunggu deployment Cloudflare berhasil, kemudian muat ulang halaman.
5. HR > Pengaturan Tes: atur waktu total TIU 5 dan TIU 6 dalam menit. Kosong berarti tanpa batas waktu. Perubahan berlaku untuk sesi baru; sesi yang sedang berjalan mempertahankan batas waktunya. TIU 5 awalnya 5 menit.
6. HR > Hasil Tes: pilih peserta, kemudian tab PAPI Kostic, DISC, TIU 5, atau TIU 6. Jawaban dapat diunduh sebagai CSV. Data hasil dibaca dari jawaban tersimpan, termasuk riwayat lama.

## Perubahan
Nama jenis tes hanya tampil di HR. Peserta melihat Urutan Tes 1, Urutan Tes 2, dan seterusnya berdasarkan urutan sesi aktif.
TIU 5 dan TIU 6 menggunakan batas waktu server, simpan otomatis, pemulihan jawaban, dan simpan sesi sekaligus. Reload tidak memulai ulang timer. Jawaban yang belum tersimpan ketika deadline lewat tetap kosong atau memakai nilai terakhir yang diterima server.
Grafik PAPI memuat 20 aspek, kelompok berwarna, dan sumbu K/Z terbalik sesuai Excel. Tabel uraian memakai nilai aspek asli. DISC menampilkan grafik P, K, dan P-K serta profil dari tabel Excel.
Aturan skor mengikuti file yang diberikan, termasuk TIU 5 nilai 24 berada dalam Tinggi dan Sangat Tinggi (keduanya ditampilkan), serta konversi DISC +6,7 dan +7. Nilai tidak dikoreksi diam-diam.
Hasil tidak mengubah jawaban kosong. Tidak ada skor gabungan atau keputusan kelulusan otomatis.
Jika teks soal/opsi versi lama tidak cocok dengan acuan, jawaban asli tetap ditampilkan namun perhitungan kepribadian ditahan agar tidak memakai kunci yang salah.

## Verifikasi
300 nilai PAPI dari 15 peserta cocok dengan Excel. Seluruh 12 titik grafik contoh DISC cocok. Uji kunci TIU, kategori tumpang tindih, jawaban kosong, pemetaan opsi, simpan otomatis, pemulihan, retry, dan timeout lulus di pengujian lokal.
SVG TIU 5 dan CSV SVG TIU 6 identik dengan versi yang disetujui.
Paket belum diterbitkan otomatis. Migrasi PostgreSQL dan alur login/database langsung belum dijalankan dalam lingkungan ini. Setelah pemasangan, uji dengan peserta khusus sebelum dipakai untuk rekrutmen.
