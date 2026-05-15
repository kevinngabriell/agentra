"use client"

import { MobileBottomNav, MobileHeader, Sidebar, TopBar } from "@/components/layout";
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Input,
  Pagination,
  Table,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEye, FaFilter, FaPlus, FaUserPlus } from "react-icons/fa";
import { LuChevronLeft, LuChevronRight, LuSearch } from "react-icons/lu";
import { TbFileExport } from "react-icons/tb";

type CustomerStatus = "Aktif" | "Lapse" | "Pending"
type CustomerType = "Individu" | "Korporat"

interface Customer {
  id: string
  name: string
  type: CustomerType
  nik: string
  pic: string
  picRole: string
  contact: string
  status: CustomerStatus
}

const customers: Customer[] = [
  { id: "1", name: "Andi Ardiansyah",  type: "Individu", nik: "3275081203840001",       pic: "0812-3456-7890", picRole: "andi.a@gmail.com",       contact: "0812-3456-7890", status: "Aktif"   },
  { id: "2", name: "PT Surya Gemilang", type: "Korporat", nik: "81.234.567.8-812.000", pic: "Bambang Wijaya",  picRole: "HR Manager",              contact: "0821-9876-5432", status: "Aktif"   },
  { id: "3", name: "Siti Aminah",       type: "Individu", nik: "3276019203860902",       pic: "0877-1234-5678", picRole: "siti.aminah@outlook.com", contact: "0877-1234-5678", status: "Lapse"   },
  { id: "4", name: "CV Jaya Abadi",     type: "Korporat", nik: "82.111.222.3-444.000", pic: "Dewi Sartika",   picRole: "Owner",                   contact: "0813-5555-1234", status: "Pending" },
  { id: "5", name: "Budi Santoso",      type: "Individu", nik: "3201010101010001",       pic: "0856-6789-0123", picRole: "budi.s@yahoo.com",        contact: "0856-6789-0123", status: "Aktif"   },
  { id: "6", name: "PT Maju Bersama",   type: "Korporat", nik: "73.123.456.7-999.000", pic: "Rudi Hartono",   picRole: "Finance Director",        contact: "0811-2222-3333", status: "Aktif"   },
  { id: "7", name: "Rahma Wati",        type: "Individu", nik: "3273055404870003",       pic: "0899-0001-1122", picRole: "rahma.w@gmail.com",       contact: "0899-0001-1122", status: "Lapse"   },
  { id: "8", name: "Hendra Gunawan",    type: "Individu", nik: "3201125606710009",       pic: "0812-8888-9999", picRole: "hendra.g@gmail.com",      contact: "0812-8888-9999", status: "Aktif"   },
  { id: "9", name: "CV Cahaya Terang",  type: "Korporat", nik: "91.001.002.3-555.000", pic: "Lina Marlina",   picRole: "Owner",                   contact: "0822-7777-6666", status: "Pending" },
  { id: "10",name: "Farida Hanim",      type: "Individu", nik: "3275026806900005",       pic: "0878-4444-3333", picRole: "farida.h@hotmail.com",    contact: "0878-4444-3333", status: "Aktif"   },
]

const PAGE_SIZE = 10
const TOTAL = 428

const statusConfig: Record<CustomerStatus, { bg: string; color: string }> = {
  Aktif:   { bg: "#DCFCE7", color: "#16A34A" },
  Lapse:   { bg: "#FEE2E2", color: "#DC2626" },
  Pending: { bg: "#FEF9C3", color: "#CA8A04" },
}

const typeConfig: Record<CustomerType, { bg: string; color: string }> = {
  Individu: { bg: "#E5EFF5", color: "#006397" },
  Korporat: { bg: "#F3E8FF", color: "#7E22CE" },
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const avatarColors = ["#1D4ED8", "#047857", "#B45309", "#7C3AED", "#BE123C", "#0369A1"]
function getAvatarColor(id: string) {
  return avatarColors[parseInt(id) % avatarColors.length]
}

const recentSearches = ["PT Utama Makmur", "Siti Aminah", "32750192830002"]

export default function Customer() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? customers.filter((c) =>
        [c.name, c.nik, c.pic, c.picRole].some((f) => f.toLowerCase().includes(query.toLowerCase()))
      )
    : customers

  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, TOTAL)

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Customer" />
        </Box>

        <Flex p="24px" gap="24px" flexDir="column">
          {/* Page heading */}
          <Flex gap="4px" flexDir="column">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Cari Nasabah</Text>
            <Text color="#5D6D7E" fontSize="14px">Cari data nasabah atau entitas bisnis di seluruh database agensi</Text>
          </Flex>

          {/* Search */}
          <Flex flexDir="column" gap="10px">
            <Flex align="center" gap="10px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={16} color="#94A3B8" />
              <Input
                flex="1" outline="none" border="none" fontSize="14px" color="#1C2833"
                placeholder="Cari Nama, NIK, NPWP, atau PIC..."
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background: "transparent" }}
              />
            </Flex>
            <Flex align="center" gap="8px" flexWrap="wrap">
              <Text color="#94A3B8" fontSize="12px">Pencarian Terakhir:</Text>
              {recentSearches.map((s) => (
                <Box key={s} px="10px" py="3px" bg="#EFF6FF" color="#3B82F6" fontSize="12px" borderRadius="full" cursor="pointer" _hover={{ bg: "#DBEAFE" }} onClick={() => setQuery(s)}>
                  {s}
                </Box>
              ))}
            </Flex>
          </Flex>

          {/* Table card */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {/* Table toolbar */}
            <Flex
              px="20px" py="14px"
              justify="space-between" align="center"
              borderBottom="1px solid" borderColor="#E2E8F0"
            >
              <Flex align="baseline" gap="6px">
                <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Hasil Pencarian</Text>
                <Text color="#5D6D7E" fontSize="13px">({TOTAL} ditemukan)</Text>
              </Flex>
              <Flex gap="8px">
                <Button
                  size="sm" variant="outline" borderColor="#E2E8F0"
                  color="#374151" fontWeight="medium" fontSize="13px"
                  gap="6px"
                >
                  <FaFilter size={12} />
                  Filter
                </Button>
                <Button
                  size="sm" variant="outline" borderColor="#E2E8F0"
                  color="#374151" fontWeight="medium" fontSize="13px"
                  gap="6px"
                >
                  <TbFileExport size={14} />
                  Ekspor
                </Button>
              </Flex>
            </Flex>

            {/* Table */}
            <Table.Root>
              <Table.Header>
                <Table.Row bg="#F8FAFC">
                  <Table.ColumnHeader
                    color="#64748B" fontSize="11px" fontWeight="bold"
                    letterSpacing="0.05em" px="20px" py="12px"
                  >
                    NAMA NASABAH
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="#64748B" fontSize="11px" fontWeight="bold"
                    letterSpacing="0.05em" px="20px" py="12px"
                  >
                    NIK / NPWP
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="#64748B" fontSize="11px" fontWeight="bold"
                    letterSpacing="0.05em" px="20px" py="12px"
                  >
                    PIC / KONTAK
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="#64748B" fontSize="11px" fontWeight="bold"
                    letterSpacing="0.05em" px="20px" py="12px"
                  >
                    STATUS
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="#64748B" fontSize="11px" fontWeight="bold"
                    letterSpacing="0.05em" px="20px" py="12px"
                    textAlign="end"
                  >
                    AKSI
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filtered.map((c) => (
                  <Table.Row
                    key={c.id}
                    borderBottom="1px solid" borderColor="#F1F5F9"
                    _hover={{ bg: "#F8FAFC" }} transition="background 0.15s"
                  >
                    {/* Name */}
                    <Table.Cell px="20px" py="14px">
                      <Flex align="center" gap="12px">
                        <Avatar.Root
                          w="36px" h="36px"
                          bg={getAvatarColor(c.id)}
                          borderRadius="full"
                        >
                          <Avatar.Fallback
                            color="white" fontSize="12px" fontWeight="bold"
                          >
                            {getInitials(c.name)}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        <Flex flexDir="column" gap="2px">
                          <Text color="#1C2833" fontSize="14px" fontWeight="semibold">{c.name}</Text>
                          <Badge
                            px="6px" py="1px" borderRadius="4px" fontSize="10px"
                            fontWeight="medium" w="max-content"
                            bg={typeConfig[c.type].bg}
                            color={typeConfig[c.type].color}
                          >
                            {c.type}
                          </Badge>
                        </Flex>
                      </Flex>
                    </Table.Cell>

                    {/* NIK */}
                    <Table.Cell px="20px" py="14px" color="#64748B" fontSize="12px" fontFamily="mono">
                      {c.nik}
                    </Table.Cell>

                    {/* PIC / Kontak */}
                    <Table.Cell px="20px" py="14px">
                      <Text color="#1C2833" fontSize="13px">{c.pic}</Text>
                      <Text color="#64748B" fontSize="11px">{c.picRole}</Text>
                    </Table.Cell>

                    {/* Status */}
                    <Table.Cell px="20px" py="14px">
                      <Badge
                        px="10px" py="3px" borderRadius="full" fontSize="11px"
                        fontWeight="medium"
                        bg={statusConfig[c.status].bg}
                        color={statusConfig[c.status].color}
                      >
                        {c.status}
                      </Badge>
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell px="20px" py="14px" textAlign="end">
                      <Flex justify="end" gap="6px">
                        <IconButton
                          size="sm" variant="ghost" aria-label="Lihat detail"
                          color="#3B82F6" _hover={{ bg: "#EFF6FF" }}
                          onClick={() => router.push("/agentra/customer/detail")}
                        >
                          <FaEye size={14} />
                        </IconButton>
                        <IconButton
                          size="sm" variant="ghost" aria-label="Tambah"
                          color="#64748B" _hover={{ bg: "#F1F5F9" }}
                        >
                          <FaPlus size={14} />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            {/* Pagination footer */}
            <Flex
              px="20px" py="14px"
              justify="space-between" align="center"
              borderTop="1px solid" borderColor="#E2E8F0"
            >
              <Text color="#64748B" fontSize="13px">
                Menampilkan {start}–{end} dari {TOTAL} nasabah
              </Text>

              <Pagination.Root
                count={TOTAL}
                pageSize={PAGE_SIZE}
                page={page}
                onPageChange={(e) => setPage(e.page)}
              >
                <ButtonGroup variant="ghost" size="sm" gap="2px">
                  <Pagination.PrevTrigger asChild>
                    <IconButton
                      aria-label="Previous"
                      borderRadius="6px"
                      border="1px solid" borderColor="#E2E8F0"
                      color="#374151"
                      _hover={{ bg: "#F1F5F9" }}
                    >
                      <LuChevronLeft />
                    </IconButton>
                  </Pagination.PrevTrigger>

                  <Pagination.Items
                    ellipsis={
                      <Flex
                        w="32px" h="32px"
                        align="center" justify="center"
                        color="#64748B" fontSize="13px"
                      >
                        …
                      </Flex>
                    }
                    render={(item) => (
                      <Pagination.Item key={item.value} type="page" value={item.value} asChild>
                        <Button
                          w="32px" h="32px" minW="32px" p="0"
                          borderRadius="6px"
                          border="1px solid"
                          borderColor={item.value === page ? "#1D4ED8" : "#E2E8F0"}
                          bg={item.value === page ? "#1D4ED8" : "white"}
                          color={item.value === page ? "white" : "#374151"}
                          fontSize="13px"
                          fontWeight={item.value === page ? "semibold" : "normal"}
                          _hover={{
                            bg: item.value === page ? "#1E40AF" : "#F1F5F9",
                          }}
                        >
                          {item.value}
                        </Button>
                      </Pagination.Item>
                    )}
                  />

                  <Pagination.NextTrigger asChild>
                    <IconButton
                      aria-label="Next"
                      borderRadius="6px"
                      border="1px solid" borderColor="#E2E8F0"
                      color="#374151"
                      _hover={{ bg: "#F1F5F9" }}
                    >
                      <LuChevronRight />
                    </IconButton>
                  </Pagination.NextTrigger>
                </ButtonGroup>
              </Pagination.Root>
            </Flex>
          </Box>

          {/* Not found section */}
          <Flex
            py="24px" paddingTop="64px" paddingBottom="48px"
            gap="8px" flexDir="column"
            border="1px dashed" borderColor="#DDE1E7"
            alignItems="center" borderRadius="12px"
          >
            <Text color="#1C2833" fontWeight="semibold" fontSize="18px">
              Tidak menemukan yang Anda cari?
            </Text>
            <Text color="#5D6D7E" fontSize="14px" pb="16px" textAlign="center" maxW="360px">
              Pastikan ejaan nama benar atau gunakan nomor identitas (NIK/NPWP) untuk hasil yang lebih akurat
            </Text>
            <Button
              bg="#001F40" color="white" gap="8px"
              paddingX="24px" paddingY="10px"
              onClick={() => router.push("/agentra/customer/detail")}
              w="max-content"
            >
              <FaUserPlus />
              Daftarkan Nasabah Baru
            </Button>
          </Flex>
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
