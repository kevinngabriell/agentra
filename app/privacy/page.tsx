import type { Metadata } from "next"
import { Box, Text, Heading, VStack } from "@chakra-ui/react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi Agentra: data yang kami kumpulkan, cara kami melindungi data agen dan nasabah, serta komitmen kami terhadap UU Perlindungan Data Pribadi (UU PDP).",
  alternates: {
    canonical: "/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <Box maxW="800px" mx="auto" px={{ base: 6, md: 12 }} py={{ base: 8, md: 16 }} bg="white" minH="100vh">
      <VStack align="flex-start" gap={6} textAlign="left">
        <Link href="/" style={{ color: "#3B82F6", fontSize: "14px" }}>← Kembali ke beranda</Link>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color="#0D1B3E">
          Kebijakan Privasi
        </Heading>
        <Text fontSize="sm" color="gray.500">
          Versi ringkas — dokumen lengkap sedang disusun.
        </Text>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Agentra berkomitmen untuk melindungi privasi data Anda. Halaman ini akan diperbarui dengan
          kebijakan privasi lengkap sesuai UU Perlindungan Data Pribadi (UU PDP) Indonesia.
        </Text>
        <Heading as="h2" fontSize="lg" color="#0D1B3E">
          Pengumpulan Data
        </Heading>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Kami mengumpulkan data yang Anda berikan saat mendaftar dan menggunakan layanan Agentra,
          termasuk nama, email, nomor telepon, dan informasi bisnis asuransi Anda.
        </Text>
        <Heading as="h2" fontSize="lg" color="#0D1B3E">
          Keamanan Data
        </Heading>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Data Anda disimpan dengan enkripsi dan tindakan keamanan yang sesuai. Akses ke data
          dibatasi hanya untuk personel yang berwenang.
        </Text>
      </VStack>
    </Box>
  )
}
