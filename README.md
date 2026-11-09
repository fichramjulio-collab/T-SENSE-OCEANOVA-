# T-SENSE by OCEANOVA — GitHub Pages Dashboard

Dashboard frontend statis untuk prototipe T-SENSE.

## Isi fitur
- Halaman login dan pendaftaran akun demo.
- GNSS: latitude, longitude, jumlah satelit, dan status fix contoh.
- Pemantauan jarak sensor A01NYUB ke permukaan air dengan grafik demo per detik.
- Pilihan tampilan periode detik/jam/hari.
- Panel indikator potensi banjir rob dengan status belum dikalibrasi.
- Diagnostics, riwayat data, serta ekspor CSV, TXT, dan GeoJSON.
- Tema gelap dan tata letak responsif.

## Cara menjalankan
Buka `index.html` di browser, atau unggah seluruh isi folder ini ke root repository GitHub Pages.

## Publikasi GitHub Pages
1. Buat repository GitHub, misalnya `tsense-oceanova`.
2. Unggah `index.html`, folder `assets`, dan `README.md` ke root repository.
3. Buka Settings → Pages.
4. Pilih Deploy from a branch → `main` → `/(root)` → Save.
5. Buka alamat `https://USERNAME.github.io/tsense-oceanova/`.

## PENTING: login demo bukan autentikasi produksi
Karena GitHub Pages hanya menyajikan file statis, pendaftaran/login dalam ZIP ini hanya simulasi lokal:
- Akun disimpan di `localStorage` browser yang sama.
- Sesi disimpan di `sessionStorage`.
- Password demo disimpan sebagai teks biasa di browser. Jangan gunakan password asli atau password yang dipakai pada akun lain.
- Akun tidak tersinkron antarperangkat/browser dan tidak aman untuk penggunaan publik.

Untuk login Gmail/email + password yang sesungguhnya, integrasikan layanan autentikasi seperti Supabase Auth atau Firebase Authentication. Jangan menyimpan password pengguna sendiri di frontend.

## Data alat
Semua koordinat, jumlah satelit, jarak, grafik, dan status diagnostik yang tampil saat ini adalah DATA SIMULASI. Koordinat hanya contoh sekitar Palembang, bukan lokasi alat. Dashboard ini belum menerima POST dari ESP32 dan tidak memiliki backend/database.
Untuk menghubungkan ESP32, siapkan API/backend dan database terpisah. Jangan menaruh API secret, password Wi-Fi, token ThingSpeak, atau kunci privat di repository publik.

## Kalibrasi dan indikator rob
Dashboard tidak menetapkan status aman/waspada/bahaya. Tentukan elevasi referensi sensor, datum vertikal, ambang lokal berdasarkan data pasang surut, dan validasi lapangan sebelum mengaktifkan interpretasi risiko. GNSS NEO-M8N standar bukan penerima RTK presisi sentimeter.
