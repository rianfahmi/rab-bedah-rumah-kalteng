# RAB Bedah Rumah Kalteng

Dashboard BNBA dan impor pembaruan dari empat sumber Excel. Situs mempertahankan identitas Sites yang sama dengan versi awal.

## Sumber awal

Data awal berasal dari file pengguna tertanggal 8–9 September 2026:

- Data_CPB-Semua_CPB: 5.478 BNBA hasil verifikasi lapangan.
- Daftar_CPB_Penetapan: 2.355 BNBA yang telah ditetapkan sebagai CPB.
- Progres_Proposal: 2.355 BNBA dengan status dan kelengkapan RAB terbaru (9 September 2026).
- Daftar_PB_Penetapan: 2.071 BNBA dengan nomor SK PB; 15 tidak tercantum pada file CPB.

`lib/seed.json` menyimpan hasil normalisasi awal di sisi server. Pembaruan Excel disimpan di D1, lalu digabung di atas sumber awal per jenis sumber, tahun, dan BNBA. Dashboard dan identitas utama mengutamakan Progres Proposal, lalu CPB, verifikasi lapangan, dan PB untuk data pelengkap; penetapan CPB/PB mengikuti keanggotaan sumber resminya. Nomor CPB pada sumber PB tetap ditampilkan sebagai referensi ketika BNBA tidak ada pada daftar CPB. Status, dokumen terisi, dan progres dari Progres Proposal merupakan dasar Dashboard RAB. Penetapan PB tetap mengikuti sumber SK PB.

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

## Pembaruan 9 September

Dashboard hanya memuat BNBA pada Progres Proposal. Kartu ringkasan adalah filter status yang dapat diaktifkan dan dilepas. Dalam pemeriksaan menggabungkan Menunggu verifikasi dan Menunggu persetujuan. Jumlah kartu tetap mengikuti filter wilayah dan fasilitator, sehingga pemilihan status tidak menghilangkan perbandingan status lain.

Parser mendukung kedua bentuk ekspor Progres Proposal (No BNBA / Kode BNBA, Status Proposal / Status proposal, Dokumen terisi / Terisi (jenis), Total dokumen / Total jenis). Pratinjau menampilkan parameter, sumber, nilai aktual, ketentuan atau pembanding, dan alasan. Isian tidak valid memblokir penyimpanan. Perbedaan sumber memerlukan pengakuan tinjauan sebelum finalisasi. Validasi kembali dilakukan di server.

Snapshot CPB, PB, dan Progres Proposal diganti dengan file terbaru pengguna. `lib/source-info.json` menyimpan nama sumber, versi dataset, dan batas waktu snapshot. Overlay impor sebelum snapshot terkait tidak mengalahkan pembaruan ini; impor setelahnya tetap berlaku. Riwayat tetap disimpan. Versi dataset mencegah finalisasi pratinjau dari snapshot sebelumnya. Verifikasi lapangan tetap menggunakan sumber 8 September karena tidak ada pengganti baru.

Pemeriksaan awal: 95 temuan pada 95 BNBA, terdiri dari 15 pasangan CPB tidak ditemukan, 17 ketidaksesuaian hasil verifikasi dengan penetapan, dan 63 nomor surat CPB berbeda. Tidak ditemukan format/isian wajib yang tidak valid.
