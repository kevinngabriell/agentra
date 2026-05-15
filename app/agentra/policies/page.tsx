"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout";
import { Avatar, Badge, Box, Button, ButtonGroup, Flex, IconButton, Input, NativeSelect, Pagination, Table, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuEye, LuPencil, LuFileText, LuFlame, LuCar, LuSettings, LuHospital, LuPlus, LuChevronLeft, LuChevronRight, LuUsers, LuFileStack, LuTrendingUp, LuTriangleAlert } from "react-icons/lu";

type PolicyStatus = "Aktif" | "Akan Berakhir" | "Sudah Berakhir"

interface Policy {
  id: string; ref: string; nasabah: string; location: string; type: "individu" | "korporat"
  product: string; ProductIcon: React.ElementType; insurer: string; insurerColor: string
  premi: number; startDate: string; endDate: string; endExpired: boolean; status: PolicyStatus
}

const policies: Policy[] = [
  { id:"62.31.26.000088", ref:"AGT-070/JAT", nasabah:"PT. Global Teknologi Jaya", location:"Jakarta Selatan, DKI",   type:"korporat", product:"Fire / Kebakaran",      ProductIcon:LuFlame,    insurer:"CHUBB",    insurerColor:"#0369A1", premi:45250000,  startDate:"01 Jan 2024", endDate:"31 Des 2024", endExpired:false, status:"Aktif"          },
  { id:"44.12.00.998271", ref:"AGT-031/JAT", nasabah:"Andi Wijaya",               location:"Depok, Jawa Barat",      type:"individu", product:"TPL Kendaraan",          ProductIcon:LuCar,      insurer:"MHD",      insurerColor:"#047857", premi:3120000,   startDate:"12 Feb 2023", endDate:"11 Feb 2024", endExpired:true,  status:"Akan Berakhir"  },
  { id:"99.01.23.112233", ref:"AGT-042/JTM", nasabah:"CV. Surya Abadi Logistik",  location:"Surabaya, Jawa Timur",   type:"korporat", product:"Equipment All Risk",     ProductIcon:LuSettings, insurer:"ALLIANZ",  insurerColor:"#1D4ED8", premi:128500000, startDate:"15 Mar 2024", endDate:"14 Mar 2025", endExpired:false, status:"Aktif"          },
  { id:"12.88.34.009988", ref:"AGT-015/JTT", nasabah:"Rina Kusuma",               location:"Medan, Sumatera Utara",  type:"individu", product:"Hospital Cash Plan",     ProductIcon:LuHospital, insurer:"CHUBB",    insurerColor:"#0369A1", premi:4500000,   startDate:"10 Nov 2022", endDate:"09 Nov 2023", endExpired:true,  status:"Sudah Berakhir" },
]

const PAGE_SIZE = 10
const TOTAL = 1248

const statusCfg: Record<PolicyStatus, { bg: string; color: string }> = {
  "Aktif":          { bg:"#DCFCE7", color:"#16A34A" },
  "Akan Berakhir":  { bg:"#FEF3C7", color:"#D97706" },
  "Sudah Berakhir": { bg:"#FEE2E2", color:"#DC2626" },
}

const stats = [
  { Icon:LuFileStack,    label:"Total Polis Aktif",           value:"1,248", badge:null,     badgeBg:"",        badgeColor:"",        iconBg:"#EFF6FF", iconColor:"#1D4ED8" },
  { Icon:LuTriangleAlert,label:"Akan Berakhir (30 Hari)",     value:"42",    badge:"+12%",   badgeBg:"#DCFCE7", badgeColor:"#16A34A", iconBg:"#FFF7ED", iconColor:"#F97316" },
  { Icon:LuTrendingUp,   label:"Estimasi Komisi (Bulan Ini)", value:"85.4M", badge:"Urgent", badgeBg:"#FEE2E2", badgeColor:"#DC2626", iconBg:"#F0FDF4", iconColor:"#16A34A" },
  { Icon:LuUsers,        label:"Total Nasabah",               value:"892",   badge:"108",    badgeBg:"#EFF6FF", badgeColor:"#1D4ED8", iconBg:"#EFF6FF", iconColor:"#1D4ED8" },
]

const filters = [
  { label:"Jenis Produk",   options:["Semua Produk",   "Jiwa",        "Kendaraan",   "Kesehatan",  "Properti"] },
  { label:"Status Renewal", options:["Semua Status",   "Aktif",       "Akan Berakhir","Sudah Berakhir"] },
  { label:"Insurer",        options:["Semua Asuransi", "CHUBB",       "ALLIANZ",     "MHD",        "AXA"] },
]

const colHdr = { color:"#64748B", fontSize:"11px", fontWeight:"bold", letterSpacing:"0.05em", px:"20px", py:"12px" }

function fmt(n: number) { return n.toLocaleString("id-ID") }

export default function Policies() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, TOTAL)

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base:0, md:"200px" }} paddingY={{ base:"56px", md:0 }}>
        <Box display={{ base:"none", md:"block" }}>
          <TopBar title="Policies" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">

          {/* Filter bar */}
          <Flex gap="12px" align="flex-end" flexWrap="wrap">
            {filters.map(({ label, options }) => (
              <Flex key={label} flexDir="column" gap="4px" minW="160px">
                <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">{label}</Text>
                <NativeSelect.Root>
                  <NativeSelect.Field bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" fontSize="13px" color="#1C2833">
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Flex>
            ))}
            <Flex flexDir="column" gap="4px" minW="160px">
              <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Periode</Text>
              <Input type="text" placeholder="---------- ----"
                style={{ background:"white", border:"1px solid #E2E8F0", borderRadius:"8px", fontSize:"13px", color:"#1C2833", padding:"8px 12px", outline:"none" }}
              />
            </Flex>
            <Button bg="#1A3557" color="white" fontSize="13px" fontWeight="semibold" borderRadius="8px" gap="6px" px="16px" ml="auto">
              <LuPlus size={14}/> Tambah Polis Baru
            </Button>
          </Flex>

          {/* Stats */}
          <Flex gap="16px">
            {stats.map(({ Icon, label, value, badge, badgeBg, badgeColor, iconBg, iconColor }) => (
              <Box key={label} flex="1" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
                <Flex justify="space-between" align="flex-start" mb="12px">
                  <Box p="10px" bg={iconBg} borderRadius="10px" color={iconColor}><Icon size={20}/></Box>
                  {badge && <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg={badgeBg} color={badgeColor}>{badge}</Badge>}
                </Flex>
                <Text color="#5D6D7E" fontSize="12px" mb="4px">{label}</Text>
                <Text color="#1C2833" fontSize="24px" fontWeight="bold">{value}</Text>
              </Box>
            ))}
          </Flex>

          {/* Table */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            <Table.Root>
              <Table.Header>
                <Table.Row bg="#F8FAFC">
                  {["NO. POLIS","NASABAH","PRODUK & INSURER","PREMI (IDR)","PERIODE","STATUS","AKSI"].map((h) => (
                    <Table.ColumnHeader key={h} {...colHdr}>{h}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {policies.map((p) => (
                  <Table.Row key={p.id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg:"#F8FAFC" }} transition="background 0.15s">

                    {/* No. Polis */}
                    <Table.Cell px="20px" py="14px">
                      <Text color="#1C2833" fontSize="13px" fontWeight="semibold" fontFamily="mono">{p.id}</Text>
                      <Text color="#94A3B8" fontSize="11px">Ref: {p.ref}</Text>
                    </Table.Cell>

                    {/* Nasabah */}
                    <Table.Cell px="20px" py="14px" cursor="pointer" onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.id)}`)}>
                      <Flex align="center" gap="6px">
                        <Text color="#3B82F6" fontSize="13px" fontWeight="semibold">{p.nasabah}</Text>
                        <Text color="#3B82F6" fontSize="10px">↗</Text>
                      </Flex>
                      <Text color="#94A3B8" fontSize="11px">{p.location}</Text>
                    </Table.Cell>

                    {/* Produk & Insurer */}
                    <Table.Cell px="20px" py="14px">
                      <Flex align="center" gap="6px" mb="4px">
                        <Box color="#64748B"><p.ProductIcon size={14}/></Box>
                        <Text color="#1C2833" fontSize="13px">{p.product}</Text>
                      </Flex>
                      <Badge px="6px" py="1px" borderRadius="4px" fontSize="10px" fontWeight="bold"
                        bg={p.insurerColor + "20"} color={p.insurerColor}>{p.insurer}</Badge>
                    </Table.Cell>

                    {/* Premi */}
                    <Table.Cell px="20px" py="14px">
                      <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{fmt(p.premi)}</Text>
                    </Table.Cell>

                    {/* Periode */}
                    <Table.Cell px="20px" py="14px">
                      <Text color="#64748B" fontSize="12px">{p.startDate}</Text>
                      <Text color={p.endExpired ? "#DC2626" : "#64748B"} fontSize="12px">s/d {p.endDate}</Text>
                    </Table.Cell>

                    {/* Status */}
                    <Table.Cell px="20px" py="14px">
                      <Badge px="10px" py="3px" borderRadius="full" fontSize="11px" fontWeight="medium"
                        bg={statusCfg[p.status].bg} color={statusCfg[p.status].color}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </Table.Cell>

                    {/* Aksi */}
                    <Table.Cell px="20px" py="14px">
                      <Flex gap="4px">
                        <IconButton size="sm" variant="ghost" aria-label="detail" color="#3B82F6" _hover={{ bg:"#EFF6FF" }}
                          onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.id)}`)}>
                          <LuEye size={14}/>
                        </IconButton>
                        {[LuPencil, LuFileText].map((Icon, i) => (
                          <IconButton key={i} size="sm" variant="ghost" aria-label="action"
                            color="#64748B" _hover={{ bg:"#F1F5F9", color:"#1A3557" }}>
                            <Icon size={14}/>
                          </IconButton>
                        ))}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            {/* Pagination */}
            <Flex px="20px" py="14px" justify="space-between" align="center" borderTop="1px solid" borderColor="#E2E8F0">
              <Text color="#64748B" fontSize="13px">Menampilkan {start} - {end} dari {TOTAL.toLocaleString()} Polis</Text>
              <Pagination.Root count={TOTAL} pageSize={PAGE_SIZE} page={page} onPageChange={(e) => setPage(e.page)}>
                <ButtonGroup variant="ghost" size="sm" gap="2px">
                  <Pagination.PrevTrigger asChild>
                    <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" px="12px" _hover={{ bg:"#F1F5F9" }}>
                      <LuChevronLeft size={14}/> Sebelumnya
                    </Button>
                  </Pagination.PrevTrigger>
                  <Pagination.Items render={(item) => (
                    <Pagination.Item key={item.value} type="page" value={item.value} asChild>
                      <Button w="32px" h="32px" minW="32px" p="0" borderRadius="6px" border="1px solid"
                        borderColor={item.value === page ? "#1A3557" : "#E2E8F0"}
                        bg={item.value === page ? "#1A3557" : "white"}
                        color={item.value === page ? "white" : "#374151"}
                        fontSize="13px" _hover={{ bg: item.value === page ? "#162C47" : "#F1F5F9" }}>
                        {item.value}
                      </Button>
                    </Pagination.Item>
                  )} ellipsis={<Flex w="32px" h="32px" align="center" justify="center" color="#64748B">…</Flex>}/>
                  <Pagination.NextTrigger asChild>
                    <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" px="12px" _hover={{ bg:"#F1F5F9" }}>
                      Selanjutnya <LuChevronRight size={14}/>
                    </Button>
                  </Pagination.NextTrigger>
                </ButtonGroup>
              </Pagination.Root>
            </Flex>
          </Box>
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
