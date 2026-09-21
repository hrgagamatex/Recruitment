# Pembaruan tampilan interaksi Recruitment Gamatex

Basis: branch `main` commit `8012954cf2df9415ae8e63828fe13e599c6e0a43`.

## File yang dipasang

Unggah `app.js`, `index.html`, dan `experience.css` ke akar repository. Timpa dua file yang sudah ada dan tambahkan `experience.css`. File lain tidak perlu diubah.

## Perubahan

- Halaman peserta memakai kotak bergaya jendela desktop: tiga indikator warna, bilah atas, latar biru berpola grid, tipografi monospace, dan tombol/kotak jawaban interaktif.
- Deskripsi pada setiap halaman petunjuk muncul karakter demi karakter dan berhenti setelah teks lengkap.
- Perpindahan halaman melalui tombol aplikasi memakai glitch singkat 260 ms, dilanjutkan fade-in 430 ms.
- Halaman akhir menampilkan: “Terima kasih telah menyelesaikan tes. Mohon menunggu proses seleksi.”
- Tata letak disesuaikan untuk desktop dan ponsel.
- Panel HR tetap memakai struktur dashboard lama; gaya jendela hanya diberikan ke halaman peserta.
- Preferensi sistem `prefers-reduced-motion` dihormati: animasi dan pengetikan langsung diselesaikan bagi pengguna yang mengurangi gerakan.

Tidak ada perubahan pada soal, urutan tes, durasi, penilaian, Supabase, atau jawaban peserta. Tidak memerlukan SQL.

`Preview-Recruitment-Interaction.html` adalah preview mandiri dan tidak terhubung ke Supabase.
