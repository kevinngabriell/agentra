"use client"

import { Sidebar, TopBar, MobileHeader, MobileBottomNav } from "@/components/layout"
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { FiSearch, FiFilter, FiDownload, FiEye, FiPlusCircle, FiChevronLeft, FiChevronRight, FiUserPlus, FiUsers } from "react-icons/fi"

// ─── Data ────────────────────────────────────────────────────────────────────

const recentSearches = ["PT Wahana Makmur", "Siti Aminah", "32750192830002"]

const customers = [
  {
    initials: "AA",
    avatarBg: "#EEF2FF",
    avatarColor: "#4F46E5",
    name: "Andi Ardiansyah",
    type: "Individu",
    nik: "3275081203840001",
    pic: "0812-3456-7890",
    picSub: "andi.a@gmail.com",
    status: "Aktif",
    statusColor: "#166534",
    statusBg: "#DCFCE7",
  },
  {
    initials: "PT",
    avatarBg: "#EFF6FF",
    avatarColor: "#2563EB",
    name: "PT Surya Gemilang",
    type: "Korporat",
    nik: "01.234.567.8-012.000",
    pic: "Bambang Wijaya",
    picSub: "HR Manager",
    status: "Aktif",
    statusColor: "#166534",
    statusBg: "#DCFCE7",
  },
  {
    initials: "SA",
    avatarBg: "#F0FDF4",
    avatarColor: "#16A34A",
    name: "Siti Aminah",
    type: "Individu",
    nik: "327S0192830002",
    pic: "0877-1234-5678",
    picSub: "siti.aminah@outlook.com",
    status: "Lapse",
    statusColor: "#991B1B",
    statusBg: "#FEE2E2",
  },
  {
    initials: "CV",
    avatarBg: "#FEF3C7",
    avatarColor: "#D97706",
    name: "CV Jaya Abadi",
    type: "Korporat",
    nik: "02.111.222.3-444.000",
    pic: "Dewi Sartika",
    picSub: "Owner",
    status: "Pending",
    statusColor: "#92400E",
    statusBg: "#FEF3C7",
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, bg, color }: { initials: string; bg: string; color: string }) {
  return (
    <Flex w="40px" h="40px" borderRadius="full" bg={bg} align="center" justify="center" flexShrink={0}>
      <Text fontSize="13px" fontWeight="bold" color={color}>{initials}</Text>
    </Flex>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isKorporat = type === "Korporat"
  return (
    <Flex
      display="inline-flex" px="8px" py="2px" borderRadius="full"
      bg={isKorporat ? "#EFF6FF" : "#F5F3FF"}
      border="1px solid"
      borderColor={isKorporat ? "#BFDBFE" : "#DDD6FE"}
      mt="4px"
    >
      <Text fontSize="11px" fontWeight="medium" color={isKorporat ? "#1D4ED8" : "#6D28D9"}>{type}</Text>
    </Flex>
  )
}

function StatusBadge({ status, statusColor, statusBg }: { status: string; statusColor: string; statusBg: string }) {
  return (
    <Flex display="inline-flex" px="12px" py="5px" borderRadius="full" bg={statusBg}>
      <Text fontSize="12px" fontWeight="semibold" color={statusColor}>{status}</Text>
    </Flex>
  )
}

function PaginationBtn({
  children, active, disabled,
}: { children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <Flex
      w="36px" h="36px" align="center" justify="center"
      borderRadius="8px" border="1px solid"
      borderColor={active ? "#006397" : "#DDE1E7"}
      bg={active ? "#006397" : "white"}
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.4 : 1}
      _hover={!active && !disabled ? { bg: "#F8FAFC" } : {}}
    >
      <Text fontSize="13px" fontWeight={active ? "bold" : "medium"} color={active ? "white" : "#1C2833"}>
        {children}
      </Text>
    </Flex>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerPage() {
  const router = useRouter();

  const handleCreateNewCustomer = () => {
    router.push('/agentra/customer/detail');
  }


  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}><TopBar /></Box>

        <Flex p="24px" gap="24px" flexDir="column">

          {/* Page header */}
          <Box>
            <Text fontSize="24px" fontWeight="bold" color="#001F40">Cari Nasabah</Text>
            <Text fontSize="14px" color="#5D6D7E" mt="4px">
              Cari data nasabah atau entitas bisnis di seluruh database agensi.
            </Text>
          </Box>

          {/* Search bar */}
          <Box>
            <Box position="relative">
              <Box position="absolute" left="16px" top="50%" transform="translateY(-50%)" zIndex={1} color="#8B9BB4">
                <FiSearch size={18} />
              </Box>
              <Input
                pl="44px"
                pr="16px"
                h="52px"
                bg="white"
                border="1px solid"
                borderColor="#DDE1E7"
                borderRadius="12px"
                fontSize="15px"
                color="#1C2833"
                placeholder="Cari Nama, NIK, NPWP, atau PIC..."
                _placeholder={{ color: "#8B9BB4" }}
                _focus={{ borderColor: "#006397", boxShadow: "0 0 0 3px rgba(0,99,151,0.12)" }}
              />
            </Box>

            {/* Recent searches */}
            <Flex align="center" gap="8px" mt="12px" flexWrap="wrap">
              <Text fontSize="13px" color="#5D6D7E" flexShrink={0}>Pencarian Terakhir:</Text>
              {recentSearches.map((s) => (
                <Flex
                  key={s}
                  px="12px" py="5px" borderRadius="full"
                  bg="#EFF6FF" border="1px solid" borderColor="#BFDBFE"
                  cursor="pointer"
                  _hover={{ bg: "#DBEAFE" }}
                >
                  <Text fontSize="13px" color="#1D4ED8">{s}</Text>
                </Flex>
              ))}
            </Flex>
          </Box>

          {/* Results card */}
          <Box bg="white" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" overflow="hidden">

            {/* Card header */}
            <Flex justify="space-between" align="center" px="24px" py="16px" borderBottom="1px solid" borderColor="#DDE1E7">
              <Flex align="center" gap="8px">
                <Text fontSize="18px" fontWeight="semibold" color="#001F40">Hasil Pencarian</Text>
                <Flex px="10px" py="3px" borderRadius="full" bg="#F1F5F9">
                  <Text fontSize="13px" color="#5D6D7E" fontWeight="medium">428 ditemukan</Text>
                </Flex>
              </Flex>
              <Flex gap="10px">
                <Button
                  h="38px" px="16px" bg="white" border="1px solid" borderColor="#DDE1E7"
                  borderRadius="8px" fontSize="13px" color="#1C2833" fontWeight="medium"
                  _hover={{ bg: "#F8FAFC" }}
                >
                  <Flex align="center" gap="6px">
                    <FiFilter size={14} />
                    Filter
                  </Flex>
                </Button>
                <Button
                  h="38px" px="16px" bg="white" border="1px solid" borderColor="#DDE1E7"
                  borderRadius="8px" fontSize="13px" color="#1C2833" fontWeight="medium"
                  _hover={{ bg: "#F8FAFC" }}
                >
                  <Flex align="center" gap="6px">
                    <FiDownload size={14} />
                    Ekspor
                  </Flex>
                </Button>
              </Flex>
            </Flex>

            {/* Table header */}
            <Grid
              templateColumns={{ base: "1fr 100px", md: "2fr 1.4fr 1.6fr 120px 80px" }}
              borderBottom="1px solid" borderColor="#DDE1E7"
              bg="#FAFBFC"
            >
              <Text px="24px" py="12px" fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.05em">
                NAMA NASABAH
              </Text>
              <Text px="16px" py="12px" fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.05em"
                display={{ base: "none", md: "block" }}>
                NIK / NPWP
              </Text>
              <Text px="16px" py="12px" fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.05em"
                display={{ base: "none", md: "block" }}>
                PIC / KONTAK
              </Text>
              <Text px="16px" py="12px" fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.05em">
                STATUS
              </Text>
              <Text px="16px" py="12px" fontSize="12px" fontWeight="semibold" color="#5D6D7E" letterSpacing="0.05em" textAlign="right">
                AKSI
              </Text>
            </Grid>

            {/* Table rows */}
            <Flex flexDir="column">
              {customers.map((c, i) => (
                <Grid
                  key={i}
                  templateColumns={{ base: "1fr 100px", md: "2fr 1.4fr 1.6fr 120px 80px" }}
                  alignItems="center"
                  borderBottom={i < customers.length - 1 ? "1px solid" : "none"}
                  borderColor="#DDE1E7"
                  _hover={{ bg: "#F8FAFC" }}
                >
                  {/* Name */}
                  <Flex px="24px" py="16px" align="center" gap="12px">
                    <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} />
                    <Box>
                      <Text fontSize="15px" fontWeight="semibold" color="#1C2833">{c.name}</Text>
                      <TypeBadge type={c.type} />
                    </Box>
                  </Flex>

                  {/* NIK/NPWP */}
                  <Box px="16px" py="16px" display={{ base: "none", md: "block" }}>
                    <Text fontSize="13px" color="#5D6D7E" fontFamily="mono">{c.nik}</Text>
                  </Box>

                  {/* PIC/Kontak */}
                  <Box px="16px" py="16px" display={{ base: "none", md: "block" }}>
                    <Text fontSize="14px" color="#1C2833" fontWeight="medium">{c.pic}</Text>
                    <Text fontSize="12px" color="#8B9BB4" mt="2px">{c.picSub}</Text>
                  </Box>

                  {/* Status */}
                  <Box px="16px" py="16px">
                    <StatusBadge status={c.status} statusColor={c.statusColor} statusBg={c.statusBg} />
                  </Box>

                  {/* Actions */}
                  <Flex px="16px" py="16px" justify="flex-end" gap="8px">
                    <Flex
                      w="32px" h="32px" align="center" justify="center"
                      borderRadius="8px" border="1px solid" borderColor="#DDE1E7"
                      cursor="pointer" color="#5D6D7E"
                      _hover={{ bg: "#EFF6FF", borderColor: "#BFDBFE", color: "#006397" }}
                    >
                      <FiEye size={16} />
                    </Flex>
                    <Flex
                      w="32px" h="32px" align="center" justify="center"
                      borderRadius="8px" border="1px solid" borderColor="#DDE1E7"
                      cursor="pointer" color="#5D6D7E"
                      _hover={{ bg: "#F0FDF4", borderColor: "#BBF7D0", color: "#16A34A" }}
                    >
                      <FiPlusCircle size={16} />
                    </Flex>
                  </Flex>
                </Grid>
              ))}
            </Flex>

            {/* Pagination */}
            <Flex
              justify="space-between" align="center"
              px="24px" py="16px"
              borderTop="1px solid" borderColor="#DDE1E7"
              flexWrap="wrap" gap="12px"
            >
              <Text fontSize="13px" color="#5D6D7E">
                Menampilkan <Text as="span" fontWeight="semibold" color="#1C2833">1 - 10</Text> dari{" "}
                <Text as="span" fontWeight="semibold" color="#1C2833">428</Text> nasabah
              </Text>
              <Flex align="center" gap="6px">
                <PaginationBtn disabled><FiChevronLeft size={14} /></PaginationBtn>
                <PaginationBtn active>1</PaginationBtn>
                <PaginationBtn>2</PaginationBtn>
                <PaginationBtn>3</PaginationBtn>
                <Flex w="36px" h="36px" align="center" justify="center">
                  <Text fontSize="13px" color="#8B9BB4">...</Text>
                </Flex>
                <PaginationBtn>43</PaginationBtn>
                <PaginationBtn><FiChevronRight size={14} /></PaginationBtn>
              </Flex>
            </Flex>
          </Box>

          {/* Empty state / CTA */}
          <Box
            bg="white" border="2px dashed" borderColor="#DDE1E7"
            borderRadius="12px" p="48px" textAlign="center"
          >
            <Flex
              w="64px" h="64px" borderRadius="full" bg="#F1F5F9"
              align="center" justify="center" mx="auto" mb="16px"
            >
              <FiUsers size={28} color="#8B9BB4" />
            </Flex>
            <Text fontSize="18px" fontWeight="semibold" color="#1C2833" mb="8px">
              Tidak menemukan yang Anda cari?
            </Text>
            <Text fontSize="14px" color="#5D6D7E" mb="24px" maxW="360px" mx="auto">
              Pastikan ejaan nama benar atau gunakan nomor identitas (NIK/NPWP) untuk hasil yang lebih akurat.
            </Text>
            <Button
              h="44px" px="24px"
              bg="#001F40" color="white"
              borderRadius="10px" fontSize="14px" fontWeight="medium"
              _hover={{ bg: "#0a3060" }}
              onClick={handleCreateNewCustomer}
            >
              <Flex align="center" gap="8px">
                <FiUserPlus size={16} />
                Daftarkan Nasabah Baru
              </Flex>
            </Button>
          </Box>

        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
