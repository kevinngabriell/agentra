import { Box, Flex, VStack, HStack, Button, Text, Heading, Badge } from "@chakra-ui/react"
import { LuCheck, LuMessageCircle } from "react-icons/lu"
import Link from "next/link"

// Feature-based facts (verified against the app), not usage statistics.
const heroFacts = [
  { value: "WhatsApp", label: "Pengingat renewal dan ringkasan harian" },
  { value: "Koasuransi", label: "Beberapa penanggung dan porsinya" },
  { value: "Komisi", label: "Pending, diterima, atau ada selisih" },
  { value: "Sub-agen", label: "Pembagian komisi per sub-agen" },
]

function DashboardMockup() {
  const rows = [
    { name: "Budi Santoso", policy: "PA-2024-001", due: "30 Apr", status: "Jatuh Tempo" },
    { name: "Rina Wijaya", policy: "PA-2024-002", due: "05 Mei", status: "Aktif" },
    { name: "Hendra Kusuma", policy: "PA-2024-003", due: "12 Mei", status: "Aktif" },
    { name: "Siti Rahayu", policy: "PA-2024-004", due: "18 Mei", status: "Aktif" },
  ]

  return (
    <Box
      role="img"
      aria-label="Contoh tampilan dashboard renewal Agentra dengan data ilustrasi: total polis, polis jatuh tempo, dan komisi bulan ini"
      w="100%"
      maxW="520px"
      bg="#1a2f5c"
      borderRadius="2xl"
      border="1px solid rgba(255,255,255,0.12)"
      p={5}
      boxShadow="0 30px 80px rgba(0,0,0,0.5)"
    >
      {/* Dashboard header bar */}
      <HStack justify="space-between" mb={4}>
        <Text color="gray.300" fontSize="sm" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
          Dashboard Renewal
        </Text>
        <Box bg="#3B82F6" px={3} py={1} borderRadius="md">
          <Text color="white" fontSize="sm" fontWeight="bold">Contoh</Text>
        </Box>
      </HStack>

      {/* Stats row */}
      <HStack gap={3} mb={4}>
        {[
          { label: "Total Polis", value: "1.248" },
          { label: "Jatuh Tempo", value: "34" },
          { label: "Komisi Bulan Ini", value: "Rp 18 jt" },
        ].map((stat) => (
          <Box key={stat.label} flex={1} bg="#0D1B3E" borderRadius="lg" p={3}>
            <Text color="gray.400" fontSize="14px" mb={1}>{stat.label}</Text>
            <Text color="white" fontSize="sm" fontWeight="bold">{stat.value}</Text>
          </Box>
        ))}
      </HStack>

      {/* Table */}
      <Box bg="#0D1B3E" borderRadius="lg" overflow="hidden">
        <Box px={3} py={2} borderBottom="1px solid rgba(255,255,255,0.06)">
          <HStack gap={0}>
            <Text color="gray.500" fontSize="14px" flex={2}>NASABAH</Text>
            <Text color="gray.500" fontSize="14px" flex={2}>NO. POLIS</Text>
            <Text color="gray.500" fontSize="14px" flex={1}>JATUH TEMPO</Text>
            <Text color="gray.500" fontSize="14px" flex={1} textAlign="right">STATUS</Text>
          </HStack>
        </Box>
        {rows.map((row, i) => (
          <Box
            key={row.policy}
            px={3}
            py={2}
            borderBottom={i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"}
          >
            <HStack gap={0} align="center">
              <Text color="gray.300" fontSize="14px" flex={2} fontWeight="medium">{row.name}</Text>
              <Text color="gray.400" fontSize="14px" flex={2}>{row.policy}</Text>
              <Text color="gray.400" fontSize="14px" flex={1}>{row.due}</Text>
              <Box flex={1} display="flex" justifyContent="flex-end">
                <Box
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  bg={row.status === "Jatuh Tempo" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)"}
                >
                  <Text
                    fontSize="14px"
                    fontWeight="semibold"
                    color={row.status === "Jatuh Tempo" ? "#F87171" : "#4ADE80"}
                  >
                    {row.status}
                  </Text>
                </Box>
              </Box>
            </HStack>
          </Box>
        ))}
      </Box>

      {/* Footer note */}
      <Text color="gray.500" fontSize="14px" textAlign="center" mt={3}>
        Contoh tampilan · data hanya ilustrasi
      </Text>
    </Box>
  )
}

const heroBullets = [
  "Pengingat renewal per polis, dikelompokkan menurut kedekatan jatuh tempo",
  "Pesan WhatsApp ke nasabah dari daftar renewal, template bisa diubah",
  "Komisi pending, diterima, atau selisih tercatat per polis",
]

export function HeroSection() {
  return (
    <Box
      as="section"
      bg="#0D1B3E"
      bgImage="radial-gradient(ellipse 60% 50% at 85% 0%, rgba(59,130,246,0.28), transparent 70%)"
      px={{ base: 6, md: 12 }}
      py={{ base: 14, md: 24 }}
    >
      <Flex
        maxW="1200px"
        mx="auto"
        align="center"
        direction={{ base: "column", lg: "row" }}
        gap={{ base: 12, lg: 16 }}
      >
        {/* Left: text content */}
        <VStack align="flex-start" flex={1} gap={6}>
          <Badge
            bg="rgba(96,165,250,0.12)"
            color="#93C5FD"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
            border="1px solid rgba(96,165,250,0.3)"
          >
            Dibuat khusus untuk agen asuransi umum
          </Badge>

          <Heading
            as="h1"
            fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
            fontWeight="bold"
            color="white"
            lineHeight="1.15"
            letterSpacing="-0.02em"
          >
            CRM Asuransi untuk Agen Asuransi Umum:{" "}
            <Box as="span" color="#60A5FA">Tidak Ada Polis yang Kelewat</Box>
          </Heading>

          <Text fontSize={{ base: "md", md: "lg" }} color="gray.300" lineHeight="1.75" maxW="520px">
            Berhenti mengandalkan Excel dan buku catatan. Agentra mengingatkan renewal, mengirim
            pesan WhatsApp ke nasabah, dan mencocokkan komisi dari semua perusahaan asuransi
            Anda, dalam satu aplikasi.
          </Text>

          <VStack as="ul" align="flex-start" gap={3} listStyleType="none" m={0} p={0}>
            {heroBullets.map((b) => (
              <HStack as="li" key={b} align="flex-start" gap={3}>
                <Box color="#60A5FA" mt="3px" flexShrink={0} aria-hidden="true"><LuCheck size={18} /></Box>
                <Text fontSize="sm" color="gray.200" lineHeight="1.6" maxW="480px">{b}</Text>
              </HStack>
            ))}
          </VStack>

          <HStack gap={4} flexWrap="wrap" pt={2}>
            {/* Button styled links: a <button> nested inside <a> is invalid interactive content. */}
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
              <Link href="#how">Lihat Cara Kerjanya</Link>
            </Button>
          </HStack>

          {/* Honest provenance line: no customer counts or ratings are claimed. */}
          <Text fontSize="sm" color="gray.400" maxW="480px">
            Dibangun untuk agen asuransi umum dan sudah dipakai oleh seorang agen asuransi umum.
          </Text>
        </VStack>

        {/* Right: dashboard mockup + WhatsApp reminder card */}
        <Box flex={1} display={{ base: "none", lg: "flex" }} justifyContent="center" alignItems="center" position="relative" w="100%">
          <DashboardMockup />
          <Box
            position="absolute"
            left={{ lg: "-8px", xl: "-32px" }}
            bottom="-64px"
            bg="white"
            borderRadius="xl"
            p={4}
            maxW="260px"
            boxShadow="0 20px 50px rgba(0,0,0,0.35)"
            role="img"
            aria-label="Contoh pesan WhatsApp pengingat renewal ke nasabah (ilustrasi)"
          >
            <HStack gap={2} mb={2}>
              <Box color="#16A34A" aria-hidden="true"><LuMessageCircle size={18} /></Box>
              <Text fontSize="sm" fontWeight="semibold" color="#0D1B3E">Pesan renewal</Text>
            </HStack>
            <Text fontSize="sm" color="gray.600" lineHeight="1.5">
              Yth. Bapak Budi, polis PA-2024-001 akan berakhir dalam 7 hari. Mau kami proses perpanjangannya?
            </Text>
          </Box>
        </Box>
      </Flex>

      {/* Product facts strip */}
      <Flex
        maxW="1200px"
        mx="auto"
        mt={{ base: 12, lg: 20 }}
        gap={{ base: 6, lg: 8 }}
        wrap="wrap"
        borderTop="1px solid rgba(255,255,255,0.08)"
        pt={10}
      >
        {heroFacts.map((stat) => (
          <VStack key={stat.label} align="flex-start" gap={0} flex={{ base: "1 1 40%", lg: 1 }}>
            <Text fontSize={{ base: "xl", lg: "3xl" }} fontWeight="bold" color="white">{stat.value}</Text>
            <Text fontSize="sm" color="gray.400">{stat.label}</Text>
          </VStack>
        ))}
      </Flex>
    </Box>
  )
}
