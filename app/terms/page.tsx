import type { Metadata } from "next"
import { Box, Text, Heading, VStack } from "@chakra-ui/react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan Agentra, platform CRM untuk agen asuransi: ketentuan penggunaan layanan, tanggung jawab akun, dan keamanan.",
  alternates: {
    canonical: "/terms",
  },
}

export default function TermsPage() {
  return (
    <Box maxW="800px" mx="auto" px={{ base: 6, md: 12 }} py={{ base: 8, md: 16 }} bg="white" minH="100vh">
      <VStack align="flex-start" gap={6} textAlign="left">
        <Link href="/" style={{ color: "#3B82F6", fontSize: "14px" }}>← Kembali ke beranda</Link>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color="#0D1B3E">
          Syarat & Ketentuan
        </Heading>
        <Text fontSize="sm" color="gray.500">
          Versi ringkas — dokumen lengkap sedang disusun.
        </Text>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Dengan menggunakan layanan Agentra, Anda menyetujui syarat dan ketentuan berikut.
          Halaman ini akan diperbarui dengan ketentuan lengkap.
        </Text>
        <Heading as="h2" fontSize="lg" color="#0D1B3E">
          Penggunaan Layanan
        </Heading>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Agentra menyediakan platform CRM untuk agen asuransi. Anda bertanggung jawab atas
          keakuratan data yang dimasukkan dan kepatuhan terhadap regulasi OJK.
        </Text>
        <Heading as="h2" fontSize="lg" color="#0D1B3E">
          Akun dan Keamanan
        </Heading>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda. Segera hubungi kami
          jika mencurigai penggunaan tidak sah.
        </Text>
      </VStack>
    </Box>
  )
}
