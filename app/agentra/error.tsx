"use client"

import { useEffect } from "react"
import { Box, Button, Text, VStack } from "@chakra-ui/react"

export default function AgentraError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" bg="white">
      <VStack gap={4} textAlign="center" maxW="400px" px={6}>
        <Text as="h1" fontSize="18px" fontWeight="semibold" color="#DC2626">
          Terjadi kesalahan
        </Text>
        <Text fontSize="16px" color="#64748B">
          Halaman gagal dimuat. Silakan coba lagi{error.digest ? ` (kode ${error.digest})` : ""}.
        </Text>
        <Button bg="#1D4ED8" color="white" _hover={{ bg: "#1E40AF" }} onClick={() => unstable_retry()}>
          Coba Lagi
        </Button>
      </VStack>
    </Box>
  )
}
