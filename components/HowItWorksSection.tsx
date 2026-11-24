import { Box, Flex, VStack, Grid, Text, Heading, Button } from "@chakra-ui/react"
import Link from "next/link"

// Mirrors the real flow: register (Akun, Profil, Paket), enter policies, then work from the renewal list.
const steps = [
  {
    title: "Daftar dan atur akun",
    description:
      "Buat akun dalam tiga langkah: akun, profil agen, dan paket. Tambahkan perusahaan asuransi yang Anda pakai.",
  },
  {
    title: "Catat nasabah dan polis",
    description:
      "Masukkan nasabah perorangan atau badan usaha, lengkap dengan polis, item pertanggungan, dan porsi koasuransi.",
  },
  {
    title: "Tindak lanjuti renewal setiap hari",
    description:
      "Buka daftar renewal, kirim pesan WhatsApp ke nasabah, lalu catat komisi yang masuk dari perusahaan asuransi.",
  },
]

export function HowItWorksSection() {
  return (
    <Box as="section" id="how" bg="#F8FAFC" px={{ base: 6, md: 12 }} py={{ base: 16, md: 24 }}>
      <VStack maxW="1200px" mx="auto" gap={12}>
        <VStack gap={4} textAlign="center" maxW="600px">
          <Text fontSize="sm" fontWeight="semibold" color="#3B82F6" textTransform="uppercase" letterSpacing="wide">
            Cara Kerja
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Mulai pakai CRM asuransi dalam tiga langkah
          </Heading>
        </VStack>

        <Grid as="ol" templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} w="100%" listStyleType="none" m={0} p={0}>
          {steps.map((step, i) => (
            <Box as="li" key={step.title} bg="white" borderRadius="2xl" p={8} border="1px solid" borderColor="gray.200">
              <VStack align="flex-start" gap={4}>
                <Flex w={10} h={10} borderRadius="full" bg="#0D1B3E" color="white" align="center" justify="center" fontWeight="bold" aria-hidden="true">
                  {i + 1}
                </Flex>
                <Heading as="h3" fontSize="lg" fontWeight="semibold" color="#0D1B3E">{step.title}</Heading>
                <Text fontSize="sm" color="gray.600" lineHeight="1.75">{step.description}</Text>
              </VStack>
            </Box>
          ))}
        </Grid>

        <Button asChild size="lg" bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }} minH="48px" px={8} fontWeight="semibold">
          <Link href="/register">Coba Gratis</Link>
        </Button>
      </VStack>
    </Box>
  )
}
