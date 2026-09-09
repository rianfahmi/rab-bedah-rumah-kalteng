# RAB Bedah Rumah Kalteng

Dashboard BNBA dan impor pembaruan dari empat sumber Excel. Situs mempertahankan identitas Sites yang sama dengan versi awal.

## Sumber awal

Data awal berasal dari file pengguna tertanggal 8 September 2026:

- Data_CPB-Semua_CPB: 5.478 BNBA hasil verifikasi lapangan.
- Daftar_CPB_Penetapan: 2.355 BNBA yang telah ditetapkan sebagai CPB.
- Progres_Proposal: 2.355 BNBA dengan status dan kelengkapan format lama.
- Daftar_PB_Penetapan: 2.071 BNBA dengan nomor SK PB; 15 tidak tercantum pada file CPB.

`lib/seed.json` menyimpan hasil normalisasi awal di sisi server. Pembaruan Excel disimpan di D1, lalu digabung di atas sumber awal per jenis sumber, tahun, dan BNBA. Identitas utama mengutamakan sumber verifikasi lapangan; penetapan CPB/PB mengikuti keanggotaan sumber resminya. Nomor CPB pada sumber PB tetap ditampilkan sebagai referensi ketika BNBA tidak ada pada daftar CPB. Status, dokumen terisi, dan progres Proposal lama hanya menjadi referensi, bukan bukti dokumen RAB baru atau dasar otomatis penetapan PB.

## Impor

Buka `/#import`. Unggah satu `.xlsx` per impor. Jenis sumber dideteksi dari kolom; lembar rekap diabaikan. Pratinjau menunjukkan data baru, berubah, tetap, serta perbedaan sumber. Import adalah upsert pada sumber yang dipilih: baris yang tidak tercantum pada file pembaruan tidak dihapus. Tidak ada penyimpanan data bisnis di browser.

Data dikirim bertahap ke staging D1. Finalisasi memperbarui sumber dan riwayat secara atomik. Kegagalan pengiriman tidak mengubah data aktif. Revisi mencegah finalisasi impor berdasarkan data yang sudah berubah. Chunks dan finalisasi aman untuk dikirim ulang. Ukuran file maksimal 25 MB; maksimal 15.000 baris. NIK/KK sebaiknya bertipe teks di Excel.

Filter wilayah berjenjang: Kabupaten/Kota → Kecamatan → Desa/Kelurahan. Pilihan menampilkan nama tanpa awalan jenis wilayah. Filter anak direset ketika induk berubah.

## Struktur

- `public/app.js`, `style.css`: tampilan dashboard, rekap, detail BNBA.
- `public/excel-reader.js`: pembacaan OOXML lokal di browser.
- `public/import-model.js`: normalisasi, pencocokan, dan validasi bersama.
- `public/import-ui.js`: pemilihan file, pratinjau, dan penyimpanan.
- `app/api/data`, `app/api/imports`: API server dan penyimpanan D1.
- `db/schema.ts`, `drizzle/`: skema dan migrasi D1.

Build memakai skrip Sites. Akses situs tetap privat. File Excel asli tidak disajikan sebagai aset publik; data awal terstruktur berada pada bundel server. Pengisian dan ekspor dokumen RAB masih merupakan tahap pengembangan berikutnya.
