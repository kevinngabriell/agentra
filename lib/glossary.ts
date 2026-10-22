// Single source of truth for page names and the one-line "what is this page for" hint.
// Keys are the titles pages pass to <TopBar>; values are the plain Bahasa shown to agents.
// Keep wording to what agents already say in daily work, not literal translations.
export const PAGE_INFO: Record<string, { title: string; hint: string }> = {
  Dashboard: { title: "Beranda", hint: "Ringkasan pekerjaan Anda hari ini: polis yang akan habis, tugas, dan komisi." },
  Customer: { title: "Nasabah", hint: "Daftar semua nasabah Anda. Tekan nama nasabah untuk melihat polis dan riwayatnya." },
  Customers: { title: "Nasabah", hint: "Daftar semua nasabah Anda. Tekan nama nasabah untuk melihat polis dan riwayatnya." },
  Renewals: { title: "Perpanjangan Polis", hint: "Polis yang akan habis masa berlakunya. Hubungi nasabah sebelum tanggal habis." },
  Policies: { title: "Polis", hint: "Semua polis nasabah Anda. Tekan Tambah Polis untuk mencatat polis baru." },
  Prospects: { title: "Calon Nasabah", hint: "Orang yang belum menjadi nasabah. Catat dan hubungi mereka sampai jadi polis." },
  Claims: { title: "Klaim", hint: "Pengajuan klaim nasabah dan perkembangannya." },
  "Premium Billing": { title: "Tagihan Premi", hint: "Premi yang sudah dibayar dan yang belum dibayar nasabah." },
  Commissions: { title: "Komisi", hint: "Komisi yang Anda terima dari setiap polis." },
  Communications: { title: "Pesan ke Nasabah", hint: "Riwayat pesan WhatsApp dan email ke nasabah, serta contoh pesan siap pakai." },
  Tasks: { title: "Tugas & Pengingat", hint: "Daftar pekerjaan yang perlu Anda lakukan. Centang jika sudah selesai." },
  "Sub Agents": { title: "Tim Saya", hint: "Agen yang bekerja di bawah Anda dan polis yang mereka bawa." },
  "Sub-Agents": { title: "Tim Saya", hint: "Agen yang bekerja di bawah Anda dan polis yang mereka bawa." },
  Documents: { title: "Dokumen", hint: "Simpan dan buka kembali dokumen polis dan KTP nasabah." },
  Reports: { title: "Laporan", hint: "Ringkasan penjualan, komisi, dan perpanjangan. Bisa diunduh." },
  "Import Data": { title: "Pindahkan Data dari Excel", hint: "Masukkan daftar nasabah atau polis lama dari file Excel sekaligus." },
  Settings: { title: "Pengaturan", hint: "Data akun Anda, kata sandi, dan paket langganan." },
  "Tambah Polis Baru": { title: "Tambah Polis Baru", hint: "Isi data langkah demi langkah. Kolom bertanda * wajib diisi." },
  "Detail Polis": { title: "Detail Polis", hint: "Semua keterangan polis ini: nasabah, premi, dan dokumen." },
  "Detail Nasabah": { title: "Detail Nasabah", hint: "Data nasabah, polis yang dimiliki, dan riwayat hubungan." },
  "Tambah Nasabah": { title: "Tambah Nasabah", hint: "Isi data nasabah baru. Kolom bertanda * wajib diisi." },
}

export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "") ?? ""

export const helpUrl = (topic = "") =>
  SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Halo, saya butuh bantuan Agentra${topic ? ` di halaman ${topic}` : ""}.`)}`
    : "/help"
