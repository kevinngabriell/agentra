import type { Metadata } from "next"
import { Box, Text, Heading, VStack, Link as ChakraLink } from "@chakra-ui/react"
import Link from "next/link"
import { PARENT_NAME, PARENT_URL, SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_URL } from "../seo"

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi Agentra, CRM untuk agen asuransi umum, lewat email atau WhatsApp untuk pertanyaan produk, paket harga, atau bantuan akun.",
  alternates: {
    canonical: "/contact",
  },
}

export default function ContactPage() {
  return (
    <Box maxW="800px" mx="auto" px={{ base: 6, md: 12 }} py={{ base: 8, md: 16 }} bg="white" minH="100vh">
      <VStack align="flex-start" gap={6} textAlign="left">
        <Link href="/" style={{ color: "#3B82F6", fontSize: "14px" }}>← Kembali ke beranda</Link>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color="#0D1B3E">
          Hubungi Kami
        </Heading>
        <Text fontSize="md" color="gray.700" lineHeight="1.75">
          Punya pertanyaan tentang Agentra? Kirim pesan lewat email atau WhatsApp. Anda juga bisa
          melihat <Link href="/help" style={{ color: "#3B82F6" }}>panduan di Pusat Bantuan</Link>.
        </Text>
        <VStack align="flex-start" gap={2}>
          <Text fontSize="md" color="gray.700">
            Email:{" "}
            <ChakraLink href={`mailto:${SUPPORT_EMAIL}`} color="#3B82F6">
              {SUPPORT_EMAIL}
            </ChakraLink>
          </Text>
          <Text fontSize="md" color="gray.700">
            WhatsApp:{" "}
            <ChakraLink href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" color="#3B82F6">
              {SUPPORT_WHATSAPP_DISPLAY}
            </ChakraLink>
          </Text>
          <Text fontSize="md" color="gray.700">
            Dibuat oleh {PARENT_NAME}:{" "}
            <ChakraLink href={PARENT_URL} target="_blank" rel="noopener noreferrer" color="#3B82F6">
              getmovira.com
            </ChakraLink>
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}
