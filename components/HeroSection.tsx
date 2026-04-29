"use client"

import { Box, Flex, VStack, HStack, Button, Text, Heading, Badge } from "@chakra-ui/react"
import Link from "next/link"

function DashboardMockup() {
  const rows = [
    { name: "Budi Santoso", policy: "PA-2024-001", due: "30 Apr", status: "Jatuh Tempo" },
    { name: "Rina Wijaya", policy: "PA-2024-002", due: "05 Mei", status: "Aktif" },
    { name: "Hendra Kusuma", policy: "PA-2024-003", due: "12 Mei", status: "Aktif" },
    { name: "Siti Rahayu", policy: "PA-2024-004", due: "18 Mei", status: "Aktif" },
  ]

  return (
    <Box
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
        <Text color="gray.300" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
          Dashboard Renewal
        </Text>
        <Box bg="#3B82F6" px={3} py={1} borderRadius="md">
          <Text color="white" fontSize="xs" fontWeight="bold">Live</Text>
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
            <Text color="gray.400" fontSize="9px" mb={1}>{stat.label}</Text>
            <Text color="white" fontSize="sm" fontWeight="bold">{stat.value}</Text>
          </Box>
        ))}
      </HStack>

      {/* Table */}
      <Box bg="#0D1B3E" borderRadius="lg" overflow="hidden">
        <Box px={3} py={2} borderBottom="1px solid rgba(255,255,255,0.06)">
          <HStack gap={0}>
            <Text color="gray.500" fontSize="9px" flex={2}>NASABAH</Text>
            <Text color="gray.500" fontSize="9px" flex={2}>NO. POLIS</Text>
            <Text color="gray.500" fontSize="9px" flex={1}>JATUH TEMPO</Text>
            <Text color="gray.500" fontSize="9px" flex={1} textAlign="right">STATUS</Text>
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
              <Text color="gray.300" fontSize="10px" flex={2} fontWeight="medium">{row.name}</Text>
              <Text color="gray.400" fontSize="10px" flex={2}>{row.policy}</Text>
              <Text color="gray.400" fontSize="10px" flex={1}>{row.due}</Text>
              <Box flex={1} display="flex" justifyContent="flex-end">
                <Box
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  bg={row.status === "Jatuh Tempo" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)"}
                >
                  <Text
                    fontSize="9px"
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
      <Text color="gray.500" fontSize="9px" textAlign="center" mt={3}>
        Disbursement · Safe to work
      </Text>
    </Box>
  )
}

export function HeroSection() {
  return (
    <Box as="section" bg="#0D1B3E" px={{ base: 6, md: 12 }} py={{ base: 16, md: 24 }}>
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
            bg="rgba(255,255,255,0.08)"
            color="gray.200"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
            border="1px solid rgba(255,255,255,0.12)"
          >
            ✦ Solusi Digital No. 1 Indonesia
          </Badge>

          <Heading
            as="h1"
            fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
            fontWeight="bold"
            color="white"
            lineHeight="1.15"
          >
            Kelola Bisnis Asuransi Lebih Cerdas dengan Agentra
          </Heading>

          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="gray.300"
            lineHeight="1.75"
            maxW="480px"
          >
            Solusi CRM terintegrasi untuk pelacakan renewal, notifikasi WhatsApp, dan
            transparansi komisi dalam satu platform yang aman.
          </Text>

          <HStack gap={4} flexWrap="wrap">
            <Link href="/register">
              <Button
                size="lg"
                bg="#3B82F6"
                color="white"
                _hover={{ bg: "#2563EB" }}
                minH="48px"
                px={8}
                fontWeight="semibold"
              >
                Coba Gratis
              </Button>
            </Link>
            <Link href="#demo">
              <Button
                size="lg"
                variant="outline"
                color="white"
                borderColor="rgba(255,255,255,0.4)"
                _hover={{ bg: "rgba(255,255,255,0.08)", borderColor: "white" }}
                minH="48px"
                px={8}
                fontWeight="semibold"
              >
                Lihat Demo
              </Button>
            </Link>
          </HStack>

          {/* Social proof */}
          <HStack gap={3} pt={2}>
            <HStack gap={0}>
              {["#94A3B8", "#64748B", "#475569"].map((color, i) => (
                <Box
                  key={i}
                  w={9}
                  h={9}
                  borderRadius="full"
                  bg={color}
                  border="2px solid #0D1B3E"
                  ml={i > 0 ? "-10px" : 0}
                  position="relative"
                  zIndex={3 - i}
                />
              ))}
            </HStack>
            <Text fontSize="sm" color="gray.400">
              Bergabung dengan{" "}
              <Text as="span" color="white" fontWeight="semibold">
                500+ agen asuransi
              </Text>{" "}
              terkemuka.
            </Text>
          </HStack>

          {/* Stats */}
          <HStack gap={8} pt={4} display={{ base: "flex", lg: "none" }}>
            <VStack align="flex-start" gap={0}>
              <HStack gap={1} align="baseline">
                <Text fontSize="2xl" fontWeight="bold" color="white">5rb+</Text>
              </HStack>
              <Text fontSize="xs" color="gray.400">Agen Aktif</Text>
            </VStack>
            <VStack align="flex-start" gap={0}>
              <Text fontSize="2xl" fontWeight="bold" color="white">99%</Text>
              <Text fontSize="xs" color="gray.400">Tingkat Retensi</Text>
            </VStack>
          </HStack>
        </VStack>

        {/* Right: Dashboard mockup */}
        <Box
          flex={1}
          display={{ base: "none", lg: "flex" }}
          justifyContent="center"
          alignItems="center"
        >
          <DashboardMockup />
        </Box>
      </Flex>

      {/* Desktop stats strip */}
      <Flex
        maxW="1200px"
        mx="auto"
        mt={16}
        gap={8}
        display={{ base: "none", lg: "flex" }}
        borderTop="1px solid rgba(255,255,255,0.08)"
        pt={10}
      >
        {[
          { value: "5rb+", label: "Agen Aktif" },
          { value: "99%", label: "Tingkat Retensi" },
          { value: "500+", label: "Perusahaan Asuransi" },
          { value: "< 3 dtk", label: "Waktu Muat Halaman" },
        ].map((stat) => (
          <VStack key={stat.label} align="flex-start" gap={0} flex={1}>
            <Text fontSize="3xl" fontWeight="bold" color="white">{stat.value}</Text>
            <Text fontSize="sm" color="gray.400">{stat.label}</Text>
          </VStack>
        ))}
      </Flex>
    </Box>
  )
}
