import { Box, Flex, VStack, HStack, Grid, Text, Heading } from "@chakra-ui/react"
import Link from "next/link"

// Every card describes something the app does today (see docs/APPLICATION_OVERVIEW.md).
const features = [
  {
    icon: "🔔",
    title: "Pengingat Renewal Polis",
    description:
      "Polis dikelompokkan berdasarkan kedekatan tanggal jatuh tempo, sehingga Anda tahu mana yang perlu ditindaklanjuti hari ini. Batas hari pengingat bisa Anda atur sendiri.",
  },
  {
    icon: "💬",
    title: "Pesan WhatsApp untuk Renewal",
    description:
      "Kirim pesan renewal ke nasabah lewat WhatsApp langsung dari daftar renewal, dengan template yang bisa diubah. Ringkasan harian dan bulanan juga dapat dikirim ke WhatsApp Anda.",
  },
  {
    icon: "💰",
    title: "Pelacakan Komisi",
    description:
      "Setiap polis menghasilkan catatan komisi dengan status pending, diterima, atau selisih. Catat jumlah yang benar-benar diterima agar perbedaannya terlihat.",
  },
  {
    icon: "🏢",
    title: "Polis Asuransi Umum dan Koasuransi",
    description:
      "Catat polis kebakaran, kendaraan, cargo, perjalanan, dan kecelakaan beserta item pertanggungannya, termasuk porsi tiap penanggung pada koasuransi.",
  },
  {
    icon: "👥",
    title: "Manajemen Sub-Agen",
    description:
      "Kelola sub-agen, lihat nasabah dan polis yang mereka bawa, lalu atur pembagian komisinya.",
  },
  {
    icon: "📋",
    title: "Calon Nasabah dan Penawaran",
    description:
      "Catat calon nasabah dan bandingkan penawaran dari beberapa perusahaan asuransi dalam satu tampilan, lalu kirim lewat WhatsApp.",
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
            Fitur
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Fitur CRM untuk Agen Asuransi Umum
          </Heading>
          <Text fontSize="md" color="gray.500" lineHeight="1.75">
            Agentra dirancang untuk agen asuransi umum di Indonesia, dari polis dan nasabah
            (perorangan maupun badan usaha) sampai tim sub-agen. Agentra tidak ditujukan untuk
            asuransi jiwa.
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
                  aria-hidden="true"
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

        {/* Internal links to the next steps */}
        <HStack gap={6} flexWrap="wrap" justify="center">
          <Link href="/help">
            <Text as="span" color="#3B82F6" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Lihat panduan penggunaan di Pusat Bantuan
            </Text>
          </Link>
          <Link href="/register">
            <Text as="span" color="#3B82F6" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Daftar dan coba Agentra
            </Text>
          </Link>
        </HStack>
      </VStack>
    </Box>
  )
}
