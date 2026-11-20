# Panduan Kontribusi

Workspace untuk merancang dan membangun proyek eksperimental. Proyek utama yang disiapkan adalah SimuForge, simulation sandbox yang bisa diprogram.

## Menjalankan

```bash
# belum ada build step; mulai dari docs/ dan projects/
```

## Sebelum mengirim perubahan

- Ikuti standar engineering di `docs/development/`.
- Tulis keputusan teknis di dokumen sebelum menulis kode.
- Jangan commit `.env`, kunci API, atau hasil build.

## Alur kontribusi

1. `git checkout -b fix/nama-singkat`
2. Commit dengan pesan yang jelas.
3. Buka pull request ke `main`, jelaskan **apa** dan **kenapa**.

Untuk masalah keamanan, ikuti `SECURITY.md`, jangan buka issue publik.

## Lisensi

Dengan mengirim pull request, kontribusimu dirilis di bawah [MIT License](LICENSE).