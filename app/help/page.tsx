import type { Metadata } from "next"
import { Box, Text, Heading, VStack } from "@chakra-ui/react"
import Link from "next/link"
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_URL } from "../seo"

export const metadata: Metadata = {
  title: "Pusat Bantuan & Panduan Memulai",
  description:
    "Panduan Agentra untuk agen asuransi umum: tambah nasabah, catat polis, pantau renewal lewat WhatsApp, dan lihat komisi. Butuh bantuan? Hubungi kami.",
  alternates: {
    canonical: "/help",
  },
}

export default function HelpPage() {
  return (
    <Box maxW="800px" mx="auto" px={{ base: 6, md: 12 }} py={{ base: 8, md: 16 }} bg="white" minH="100vh">
      <VStack align="flex-start" gap={6} textAlign="left">
        <Link href="/" style={{ color: "#3B82F6", fontSize: "16px" }}>← Kembali ke beranda</Link>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color="#0D1B3E">
          Pusat Bantuan
        </Heading>
        <Text fontSize="18px" color="gray.700" lineHeight="1.75">
          Selamat datang di pusat bantuan Agentra. Di sini Anda dapat menemukan panduan dan
          jawaban atas pertanyaan umum.
        </Text>
        <Heading as="h2" fontSize="xl" color="#0D1B3E">
          Panduan Langkah demi Langkah
        </Heading>
        <Heading as="h3" fontSize="lg" color="#0D1B3E">
          Cara menambah nasabah
        </Heading>
        <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Buka menu Nasabah.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Tekan tombol Tambah Nasabah.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Isi nama, nomor HP, dan data lain. Kolom bertanda * wajib diisi.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Tekan Simpan. Nasabah akan muncul di daftar.</li>
        </ol>
        <Heading as="h3" fontSize="lg" color="#0D1B3E">
          Cara mencatat polis baru
        </Heading>
        <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Buka menu Polis, lalu tekan Tambah Polis.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Pilih nasabah, perusahaan asuransi, dan jenis produk.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Isi nomor polis, tanggal mulai, tanggal berakhir, dan premi.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Tekan Simpan. Polis tersimpan dan pengingat perpanjangan dibuat otomatis.</li>
        </ol>
        <Heading as="h3" fontSize="lg" color="#0D1B3E">
          Cara melihat polis yang akan habis
        </Heading>
        <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Buka menu Perpanjangan Polis.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Polis diurutkan dari yang paling dekat tanggal berakhirnya.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Tekan polis, lalu tekan tombol WhatsApp untuk menghubungi nasabah.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Setelah nasabah setuju, tandai perpanjangan sebagai berhasil.</li>
        </ol>
        <Heading as="h3" fontSize="lg" color="#0D1B3E">
          Cara melihat komisi
        </Heading>
        <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Buka menu Komisi.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Pilih bulan di bagian atas.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Total komisi dan rincian per polis tampil di bawahnya.</li>
        </ol>
        <Heading as="h3" fontSize="lg" color="#0D1B3E">
          Cara mengingatkan diri sendiri
        </Heading>
        <ol style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Buka menu Tugas & Pengingat.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Tekan Tambah Tugas, tulis apa yang harus dilakukan dan tanggalnya.</li>
          <li style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151" }}>Centang tugas jika sudah selesai.</li>
        </ol>
        <Heading as="h2" fontSize="lg" color="#0D1B3E">
          Butuh Bantuan Lebih Lanjut?
        </Heading>
        <Text fontSize="18px" color="gray.700" lineHeight="1.75">
          Kirim email ke {SUPPORT_EMAIL}, kirim pesan WhatsApp ke{" "}
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6" }}>
            {SUPPORT_WHATSAPP_DISPLAY}
          </a>
          , atau lihat halaman <Link href="/contact" style={{ color: "#3B82F6" }}>Hubungi Kami</Link>.
          Belum punya akun?{" "}
          <Link href="/register" style={{ color: "#3B82F6" }}>Daftar Agentra</Link>.
        </Text>
      </VStack>
    </Box>
  )
}
