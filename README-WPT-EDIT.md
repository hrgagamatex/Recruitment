# WPT Bank Soal Edit & Nonaktifkan

Perubahan pada versi ini:
- Bank Soal WPT sekarang menampilkan tombol **Edit** dan **Nonaktifkan/Aktifkan** pada setiap soal.
- HR dapat memperbaiki teks pertanyaan, pilihan jawaban, durasi, dan status aktif/nonaktif.
- Nomor soal WPT tidak diubah melalui editor agar pemetaan artwork SVG tetap konsisten.
- SVG WPT No. 7, 38, 42, dan 49 tetap menggunakan artwork yang sudah disetujui.
- Peserta WPT mengambil prompt/pilihan/durasi dari snapshot database, lalu artwork SVG digabung berdasarkan nomor soal. Dengan demikian perubahan teks di Bank Soal dapat tampil pada sesi peserta baru.
- Tidak ada perubahan SQL/database schema pada paket ini.
