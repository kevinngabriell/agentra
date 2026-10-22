"use client"

import { useEffect } from "react"
import { Box, Button, Text, VStack } from "@chakra-ui/react"

// Next 16 error boundary: `unstable_retry` re-fetches and re-renders the segment,
// which is what a "try again" button should do (plain `reset` only re-renders).
export default function RootError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="#F8FAFC">
      <VStack gap={4} textAlign="center" maxW="400px" px={6}>
        <Text as="h1" fontSize="18px" fontWeight="semibold" color="#DC2626">
          Terjadi kesalahan tak terduga
        </Text>
        {/* Raw error messages can leak internals, so only a reference code is shown. */}
        <Text fontSize="14px" color="#64748B">
          Silakan coba lagi. Jika masalah berlanjut, hubungi dukungan{error.digest ? ` dengan kode ${error.digest}` : ""}.
        </Text>
        <Button bg="#006397" color="white" _hover={{ bg: "#004f78" }} onClick={() => unstable_retry()}>
          Coba Lagi
        </Button>
      </VStack>
    </Box>
  )
}
