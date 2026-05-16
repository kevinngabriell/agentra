"use client"

import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react"
import { FiBell, FiFileText, FiRefreshCw, FiDollarSign, FiMessageSquare, FiCheckCircle, FiCalendar, FiFilter, FiPlus } from "react-icons/fi"
import { Sidebar, TopBar, MobileHeader, MobileBottomNav } from "@/components/layout"

// ─── Data ────────────────────────────────────────────────────────────────────

const stats = [
  {
    label: "TOTAL POLIS",
    value: "1,248",
    sub: "",
    icon: <FiFileText size={20} />,
    iconBg: "#E5EFF5",
    iconColor: "#006397",
  },
  {
    label: "Pembaruan",
    value: "84",
    sub: "# Pending",
    icon: <FiRefreshCw size={20} />,
    iconBg: "#FEF5E7",
    iconColor: "#F39C12",
    subColor: "#F59E0B",
  },
  {
    label: "Jatuh Tempo",
    value: "12",
    sub: "CRITICAL",
    icon: <FiBell size={20} />,
    iconBg: "#FDEDEB",
    iconColor: "#E74C3C",
    subColor: "#F87171",
    badge: "CRITICAL",
  },
  {
    label: "Komisi",
    value: "42.5jt",
    sub: "# Bulan Ini",
    icon: <FiDollarSign size={20} />,
    iconBg: "#E9F7EF",
    iconColor: "#58C083",
    subColor: "#34D399",
  },
]

const actions = [
  {
    name: "Budi Santoso",
    detail: "Asuransi Kendaraan - Toyota Camry",
    status: "H-2 Expired",
    statusColor: "#991B1B",
    statusBg: "#FEE2E2",
  },
  {
    name: "Siti Aminah",
    detail: "Asuransi Kesehatan - Family Plan",
    status: "H-5 Renewal",
    statusColor: "#92400E",
    statusBg: "#FEF3C7",
  },
  {
    name: "Anton Wijaya",
    detail: "Asuransi Jiwa - Term Life 20y",
    status: "H-6 Renewal",
    statusColor: "#C2410C",
    statusBg: "#FFF7ED",
  },
]

const activities = [
  {
    icon: <FiCheckCircle size={18} />,
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    title: "Polis Baru Diterbitkan",
    descBefore: "Polis #INV-8821 atas nama ",
    descBold: "Reza Rahadian",
    descAfter: " berhasil diterbitkan oleh pusat.",
    time: "10:45 WIB",
  },
  {
    icon: <FiRefreshCw size={18} />,
    iconBg: "#EEF2FF",
    iconColor: "#4F46E5",
    title: "Renewal Berhasil",
    descBefore: "Nasabah ",
    descBold: "Dewi Lestari",
    descAfter: " telah menyelesaikan pembayaran premi tahunan.",
    time: "09:12 WIB",
  },
  {
    icon: <FiCalendar size={18} />,
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    title: "Janji Temu Follow-up",
    descBefore: "Pengingat: Pertemuan dengan ",
    descBold: "Bapak Handoko",
    descAfter: " di Starbucks Senayan City pukul 14:00 besok.",
    time: "Kemarin, 16:30",
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ stat }: { stat: typeof stats[0] }) {
  return (
    <Flex flexDir={"column"} w={"100%"} bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" padding={"24px"} align="center" gap={"16px"}>
      <Flex justifyContent={"space-between"} w={"100%"}>
        <Flex w="32px" h="36px" borderRadius="8px" bg={stat.iconBg} align="center" justify="center" flexShrink={0} padding={"8px"}>
          <Box color={stat.iconColor}>{stat.icon}</Box>
        </Flex>
        <Text fontSize={"12px"} fontWeight="semibold" color={stat.subColor ?? "#8B9BB4"}>{stat.sub}</Text>
      </Flex>
      
      <Box w={"100%"}>
        <Text color="#5D6D7E" fontSize="12px">{stat.label}</Text>
        <Flex align="baseline" gap="6px">
          <Text color="#1C2833" fontSize="24px" fontWeight="bold">{stat.value}</Text>
        </Flex>
      </Box>
    </Flex>
  )
}

function AksiHariIni() {
  return (
    <Box bg={"#FFFFFF"} border={"1px solid"} borderColor={"#DDE1E7"} borderRadius={"12px"} overflow="hidden">
      <Flex justify="space-between" align="center" paddingX={"24px"} paddingY={"16px"} borderBottom="1px solid" borderColor={"#DDE1E7"}>
        <Text color="#001F40" fontWeight="semibold" fontSize="18px">Aksi Hari Ini</Text>
        <Text color="#006397" fontSize="14px" cursor="pointer">Lihat Semua</Text>
      </Flex>

      <Grid templateColumns="1fr 160px 140px" borderBottom="1px solid" borderColor={"#DDE1E7"}>
        <Text color="#5D6D7E" fontSize="13px" fontWeight="medium" paddingX={"24px"} paddingY={"12px"}>Nama Nasabah</Text>
        <Text color="#5D6D7E" fontSize="13px" fontWeight="medium" paddingX={"16px"} paddingY={"12px"}>Status</Text>
        <Text color="#5D6D7E" fontSize="13px" fontWeight="medium" paddingX={"16px"} paddingY={"12px"} textAlign="right">Aksi</Text>
      </Grid>

      <Flex flexDir="column">
        {actions.map((a, i) => (
          <Grid
            key={i}
            templateColumns="1fr 160px 140px"
            alignItems="center"
            borderBottom={i < actions.length - 1 ? "1px solid" : "none"}
            borderColor={"#DDE1E7"}
            _hover={{ bg: "#F8FAFC" }}
          >
            <Box paddingX={"24px"} paddingY={"20px"}>
              <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{a.name}</Text>
              <Text color="#5D6D7E" fontSize="12px" mt="2px">{a.detail}</Text>
            </Box>
            <Box paddingX={"16px"} paddingY={"20px"}>
              <Flex display="inline-flex" px="12px" py="5px" borderRadius="full" bg={a.statusBg} align="center">
                <Text color={a.statusColor} fontSize="12px" fontWeight="semibold">{a.status}</Text>
              </Flex>
            </Box>
            <Flex paddingX={"16px"} paddingY={"20px"} justify="flex-end">
              <Button
                size="sm"
                bg="#001F40"
                color="white"
                fontSize="13px"
                fontWeight="medium"
                borderRadius="8px"
                px="16px"
                py="10px"
                _hover={{ bg: "#0a3060" }}
              >
                <Flex align="center" gap="6px">
                  <FiMessageSquare size={14} />
                  Follow Up
                </Flex>
              </Button>
            </Flex>
          </Grid>
        ))}
      </Flex>
    </Box>
  )
}

function StatusPerpanjangan() {
  return (
    <Box bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" p="24px">
      <Text color="#001F40" fontWeight="semibold" fontSize="18px" paddingBottom={"24px"}>
        Status Perpanjangan Bln Ini
      </Text>

      <Flex flexDir="column" gap="24px">
        <Box>
          <Flex justify="space-between" mb="8px">
            <Text color="#1C2833" fontSize="13px" fontWeight="medium">Berhasil Diperbarui</Text>
            <Text color="#27AE60" fontSize="13px" fontWeight="bold">65%</Text>
          </Flex>
          <Box h="8px" bg="#F1F5F9" borderRadius="full" overflow="hidden">
            <Box h="100%" w="65%" bg="#27AE60" borderRadius="full" />
          </Box>
          <Text color="#8B9BB4" fontSize="12px" mt="6px">54 dari 84 Polis</Text>
        </Box>

        <Box>
          <Flex justify="space-between" mb="8px">
            <Text color="#1C2833" fontSize="13px" fontWeight="medium">Sedang Proses</Text>
            <Text color="#006397" fontSize="13px" fontWeight="bold">20%</Text>
          </Flex>
          <Box h="8px" bg="#F1F5F9" borderRadius="full" overflow="hidden">
            <Box h="100%" w="20%" bg="#006397" borderRadius="full" />
          </Box>
          <Text color="#8B9BB4" fontSize="12px" mt="6px">17 dari 84 Polis</Text>
        </Box>
      </Flex>

      <Box bg="#0C4A6E" borderRadius="12px" mt={"32px"} padding={"16px"}>
        <Text color="#7DD3FC" fontSize="11px" textTransform="uppercase" fontWeight="semibold" letterSpacing="0.05em" mb="8px">
          Target Omzet Perpanjangan
        </Text>
        <Flex justify="space-between" align="center" mb="12px">
          <Text color="white" fontSize="18px" fontWeight="bold">Rp 850.000.000</Text>
          <Text color={"#BAE6FD"} fontSize={"12px"}>Sisa Rp 230jt</Text>
        </Flex>
        <Box h="4px" bg="rgba(255,255,255,0.2)" borderRadius="full" overflow="hidden">
          <Box h="100%" w="73%" bg="white" borderRadius="full" />
        </Box>
      </Box>
    </Box>
  )
}

function AktivitasTerbaru() {
  return (
    <Box bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" p="24px">
      <Flex justify="space-between" align="center" mb="20px">
        <Text color="#001F40" fontWeight="semibold" fontSize="18px">Aktivitas Terbaru</Text>
        <Box color="#8B9BB4" cursor="pointer"><FiFilter size={18} /></Box>
      </Flex>
      <Flex flexDir="column">
        {activities.map((a, i) => (
          <Flex
            key={i}
            gap="16px"
            py="16px"
            borderBottom={i < activities.length - 1 ? "1px solid" : "none"}
            borderColor="#F1F5F9"
            align="flex-start"
          >
            <Flex
              w="40px" h="40px" borderRadius="full"
              bg={a.iconBg} align="center" justify="center"
              flexShrink={0}
            >
              <Box color={a.iconColor}>{a.icon}</Box>
            </Flex>
            <Box flex={1} minW={0}>
              <Text color="#1C2833" fontSize="14px" fontWeight="bold" mb="4px">{a.title}</Text>
              <Text color="#5D6D7E" fontSize="13px" lineHeight="1.6">
                {a.descBefore}
                <Text as="span" color="#1C2833" fontWeight="bold">{a.descBold}</Text>
                {a.descAfter}
              </Text>
            </Box>
            <Text color="#8B9BB4" fontSize="12px" flexShrink={0} whiteSpace="nowrap" pt="2px">
              {a.time}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Box bg="#F4F6F9" minH="100vh">
        <Sidebar />
        <MobileHeader />

        <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
          <Box display={{ base: "none", md: "block" }}>
            <TopBar title="Dashboard" /></Box>

          <Flex p={"24px"} gap={"24px"} flexDir={"column"}>
            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={{ base: "12px", md: "16px" }}>
                {stats.map((s) => (
                    <StatCard key={s.label} stat={s} />
                ))}
            </Grid>

            <Grid templateColumns={{ base: "1fr", md: "1fr 340px" }} gap="16px">
                <AksiHariIni />
                <StatusPerpanjangan />
            </Grid>

            <AktivitasTerbaru />
          </Flex>
        </Box>

      <Flex
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom="80px"
        right="20px"
        w="52px"
        h="52px"
        borderRadius="full"
        bg="#0D1826"
        align="center"
        justify="center"
        cursor="pointer"
        zIndex={19}
        boxShadow="0 4px 12px rgba(0,0,0,0.25)"
        _hover={{ bg: "#1a2f4a" }}
      >
        <FiPlus size={22} color="white" />
      </Flex>

      <MobileBottomNav />
    </Box>
  )
}
