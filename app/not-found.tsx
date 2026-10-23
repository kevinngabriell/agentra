import { Box, Button, Text, VStack } from "@chakra-ui/react"
import Link from "next/link"

export default function NotFound() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="#F8FAFC">
      <VStack gap={4} textAlign="center" maxW="400px" px={6}>
        <Text fontSize="48px" fontWeight="bold" color="#0D1B3E" aria-hidden="true">
          404
        </Text>
        <Text as="h1" fontSize="18px" fontWeight="semibold" color="#0D1B3E">
          Halaman tidak ditemukan
        </Text>
        <Text fontSize="14px" color="#64748B">
          Halaman yang Anda cari mungkin telah dipindahkan atau tidak lagi tersedia.
        </Text>
        <Button asChild bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }}>
          <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </VStack>
    </Box>
  )
}
