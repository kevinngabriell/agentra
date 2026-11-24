import { Box, VStack, HStack, Button, Text, Heading } from "@chakra-ui/react"
import Link from "next/link"
import { Logo } from "./Logo"
import { SUPPORT_WHATSAPP_URL } from "../app/seo"

export function CtaSection() {
  return (
    <Box
      as="section"
      bg="#0D1B3E"
      bgImage="radial-gradient(ellipse 60% 80% at 50% 120%, rgba(59,130,246,0.35), transparent 70%)"
      px={{ base: 6, md: 12 }}
      py={{ base: 16, md: 20 }}
    >
      <VStack maxW="720px" mx="auto" gap={6} textAlign="center">
        <Logo variant="mark" tone="light" height={56} alt="" />
        <Heading as="h2" fontSize={{ base: "2xl", md: "4xl" }} fontWeight="bold" color="white" lineHeight="1.2">
          Pastikan tidak ada polis yang kelewat
        </Heading>
        <Text fontSize="md" color="gray.300" lineHeight="1.75">
          Pindahkan polis, renewal, dan komisi Anda ke satu aplikasi. Agentra dibuat oleh Movira
          dan sudah dipakai oleh seorang agen asuransi umum.
        </Text>
        <HStack gap={4} flexWrap="wrap" justify="center">
          <Button asChild size="lg" bg="#3B82F6" color="white" _hover={{ bg: "#2563EB" }} minH="48px" px={8} fontWeight="semibold">
            <Link href="/register">Coba Gratis</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            color="white"
            borderColor="rgba(255,255,255,0.4)"
            _hover={{ bg: "rgba(255,255,255,0.08)", borderColor: "white" }}
            minH="48px"
            px={8}
            fontWeight="semibold"
          >
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Tanya via WhatsApp</a>
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
