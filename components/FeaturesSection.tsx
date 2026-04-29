"use client"

import { Box, Flex, VStack, Grid, Text, Heading } from "@chakra-ui/react"

const features = [
  {
    icon: "🔔",
    title: "Pelacakan Renewal Otomatis",
    description:
      "Pantau semua polis yang akan jatuh tempo secara real-time. Dapatkan notifikasi otomatis sebelum polis kadaluarsa sehingga tidak ada renewal yang terlewat.",
  },
  {
    icon: "💬",
    title: "Notifikasi WhatsApp",
    description:
      "Kirim laporan dan pengingat renewal langsung ke WhatsApp nasabah secara otomatis. Hemat waktu dan tingkatkan respons nasabah tanpa keluar dari platform.",
  },
  {
    icon: "💰",
    title: "Transparansi Komisi",
    description:
      "Lihat rincian komisi setiap polis secara transparan dan akurat. Rekam jejak pembayaran komisi tersedia kapan saja sehingga Anda selalu tahu penghasilan Anda.",
  },
]

export function FeaturesSection() {
  return (
    <Box
      as="section"
      id="features"
      bg="white"
      px={{ base: 6, md: 12 }}
      py={{ base: 16, md: 24 }}
    >
      <VStack maxW="1200px" mx="auto" gap={12}>
        {/* Section header */}
        <VStack gap={4} textAlign="center" maxW="600px">
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color="#3B82F6"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Fitur Unggulan
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Semua yang Anda Butuhkan dalam Satu Platform
          </Heading>
          <Text fontSize="md" color="gray.500" lineHeight="1.75">
            Agentra dirancang khusus untuk agen asuransi Indonesia agar bisnis Anda tumbuh lebih
            cepat dengan lebih sedikit kerja manual.
          </Text>
        </VStack>

        {/* Feature cards */}
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={6}
          w="100%"
        >
          {features.map((feature) => (
            <Box
              key={feature.title}
              bg="gray.50"
              borderRadius="2xl"
              p={8}
              border="1px solid"
              borderColor="gray.100"
              _hover={{ borderColor: "#3B82F6", boxShadow: "0 4px 20px rgba(59,130,246,0.1)" }}
              transition="all 0.2s"
            >
              <VStack align="flex-start" gap={4}>
                <Flex
                  w={12}
                  h={12}
                  bg="#EFF6FF"
                  borderRadius="xl"
                  align="center"
                  justify="center"
                  fontSize="22px"
                >
                  {feature.icon}
                </Flex>
                <Heading as="h3" fontSize="lg" fontWeight="semibold" color="#0D1B3E">
                  {feature.title}
                </Heading>
                <Text fontSize="sm" color="gray.500" lineHeight="1.75">
                  {feature.description}
                </Text>
              </VStack>
            </Box>
          ))}
        </Grid>
      </VStack>
    </Box>
  )
}
