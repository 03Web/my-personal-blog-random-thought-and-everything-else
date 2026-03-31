# Debug Like Button - Checklist

## ✅ Yang Sudah Diperbaiki:
1. Tambah `data-content-id` pada reaction-buttons
2. Tambah `data-reaction-type` pada setiap button  
3. Tambah setTimeout(100ms) sebelum updateReactionUI

## 🧪 Test Manual:

### Step 1: Buka Console Browser
1. Tekan F12
2. Pilih tab "Console"

### Step 2: Test Like Button
1. Klik tombol Like pada project
2. Di console, cari pesan error (warna merah)
3. Pastikan Firebase terhubung

### Step 3: Cek Firebase Path
Reaction data tersimpan di:
```
Firebase Path: /reactions/{project-id}/
```

Project IDs yang ada:
- project-001 (Telegram AI)
- project-002 (Karang Taruna)
- project-003 (RT03)
- project-004 (Edukasi Judol)

## 🔍 Kemungkinan Masalah:

### Masalah 1: Firebase Belum Login
**Solusi:** Pilih identitas (Anonim/Teman/Custom) saat muncul modal

### Masalah 2: Project ID Salah
**Solusi:** Pastikan project.id di JSON match dengan yang di Firebase

### Masalah 3: DOM Belum Siap
**Solusi:** ✅ Sudah diperbaiki dengan setTimeout

## 📝 Notes:
- Like button harus trigger identity modal dulu
- Setelah pilih identitas, counter langsung update
- Data tersimpan di Firebase Realtime Database
