import type { Metadata } from "next"
import { Box, Text, Heading, VStack, Link as ChakraLink } from "@chakra-ui/react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi tim Agentra untuk pertanyaan seputar aplikasi CRM asuransi, paket harga, atau bantuan akun. Kirim email ke halo@agentra.id.",
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
          Punya pertanyaan tentang Agentra? Tim kami siap membantu Anda.
        </Text>
        <VStack align="flex-start" gap={2}>
          <Text fontSize="md" color="gray.700">
            Email:{" "}
            <ChakraLink href="mailto:halo@agentra.id" color="#3B82F6">
              halo@agentra.id
            </ChakraLink>
          </Text>
          <Text fontSize="md" color="gray.700">
            Website:{" "}
            <ChakraLink href="https://agentra.id" target="_blank" rel="noopener noreferrer" color="#3B82F6">
              agentra.id
            </ChakraLink>
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}
