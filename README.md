# Timeline Proker KKN Sub Unit Gunung Kelir

Website statis multi halaman untuk menampilkan:

- halaman utama / judul proker
- timeline bersama per jam untuk 6 orang, dengan baris anggota dan kolom jam
- halaman kalender untuk Naldo, Hafiz, Rachma, Livia, Laras, dan Tata
- panduan deploy ke Google Sites

Status: siap di-host sebagai website publik, lalu di-embed ke Google Sites.

Catatan penting: supaya input tiap orang benar-benar masuk ke timeline bersama dari perangkat yang berbeda, isi backend Google Apps Script di [config.js](/Users/user/Desktop/developer/kkn-timeline/config.js).

Fitur yang sudah disiapkan:

- create: tambah proker dari halaman masing-masing anggota
- read: tampilkan daftar data tersimpan dan timeline bersama
- update: edit entri yang sudah tersimpan
- delete: hapus entri dari halaman anggota

## Cara menjalankan lokal

Buka file `index.html` di browser, atau jalankan server statis sederhana dari folder ini.

Contoh:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Cara deploy agar bisa dipakai di Google Sites

Google Sites tidak menjalankan file HTML lokal langsung. Alurnya:

1. Upload folder ini ke GitHub.
2. Aktifkan GitHub Pages pada branch utama, atau pakai Netlify/Vercel.
3. Pastikan URL publik bisa dibuka langsung di browser, misalnya `https://username.github.io/nama-repo/`.
4. Untuk sinkronisasi data, buat Google Sheet lalu jalankan Apps Script dari file [google-apps-script.gs](/Users/user/Desktop/developer/kkn-timeline/google-apps-script.gs).
5. Deploy Apps Script sebagai Web App dan salin URL-nya.
6. Buka [config.js](/Users/user/Desktop/developer/kkn-timeline/config.js), isi `window.KKN_BACKEND_URL` dengan URL Web App tadi.
7. Untuk Google Sites, pakai halaman yang paling aman di-embed: `timeline.html`.
8. Buka Google Sites > `Sisipkan` > `Embed` > `By URL`.
9. Tempel URL publik halaman tadi, misalnya `https://username.github.io/nama-repo/timeline.html`.
10. Atur ukuran frame agar kalender terlihat penuh, lalu `Publikasikan` situs.

## Alur Data

- Setiap halaman anggota punya form input sendiri.
- Form bisa memilih kategori `Proker Pokok` atau `Proker Bantu`.
- Jam proker pokok dan jam bantu dihitung di bagian atas halaman anggota.
- Saat backend Apps Script aktif, data dari semua anggota dikirim ke Google Sheet yang sama.
- Halaman `timeline.html` membaca data itu untuk menampilkan timeline bersama.
- Data tersimpan per entri memakai `id`, jadi tombol edit dan hapus bisa bekerja dengan stabil.

## Template Backend

File [google-apps-script.gs](/Users/user/Desktop/developer/kkn-timeline/google-apps-script.gs) berisi template Apps Script. Ganti `PASTE_YOUR_SHEET_ID_HERE` dengan ID spreadsheet kamu, lalu deploy sebagai Web App.

## Halaman yang Disarankan

- `index.html` untuk halaman utama / menu
- `timeline.html` untuk tampilan timeline bersama per jam
- `naldo.html`, `hafiz.html`, `rachma.html`, `livia.html`, `laras.html`, `tata.html` untuk halaman per orang

Kalau tujuan utamanya Google Sites, paling praktis adalah men-embed `timeline.html` dan menaruh link ke halaman anggota dari menu Google Sites.

## Catatan

Kalau kamu mau, saya bisa lanjut bantu isi kalendernya menjadi jadwal yang lebih spesifik sesuai proker asli yang kamu punya.
