"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout";
import { Avatar, Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuPencil, LuFlag, LuCalendar, LuCreditCard, LuMessageSquare, LuPhone, LuMail, LuFileText, LuUpload, LuUser, LuCircleCheck } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";

const policy = {
  id: "POL-88293-JKT", insurer: "CHUBB", status: "AKTIF",
  nasabah: "PT. Sejahtera Abadi Jaya", address: "Jl. Sudirman No. 45, Jakarta Selatan",
  periodeStart: "01 Jan 2023", periodeEnd: "01 Jan 2024", sisaHari: 82,
  objek: "Gudang & Inventaris Kantor", rate: "0.05 % (Per-mille)",
  tsi: 2500000000, premiNett: 2125000, komisiPct: 15, komisiNom: 318750,
  pph: 7968, meterai: 10000, total: 2135000,
  updatedAt: "12 Okt 2023",
}

const renewalHistory = [
  { polisLama:"POL-7720-JKT",  tahun:2023, status:"Expired", premi:2135000 },
  { polisLama:"POL-66104-JKT", tahun:2021, status:"Expired", premi:1950000 },
]

const followUpLog = [
  { Icon:LuPhone, type:"Telepon - Mengingatkan Renewal", time:"17 Okt, 14:20",
    note:"Nasabah mengkonfirmasi akan melakukan perpanjangan. Meminta penawaran dikirim via WhatsApp sebelum ini." },
  { Icon:LuMail,  type:"Email - Pengiriman Softcopy",    time:"25 Okt, 09:15",
    note:"Softcopy polis terbaru telah dikirim ke email finance@sejahteraabadi.com" },
]

const documents = [
  { name:"Polis_Final_PT.S...", meta:"5.4 MB • 12 Okt 2023" },
  { name:"Bukti_Bayar_001...",  meta:"602 KB • 1 Okt 2023"  },
]

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID")

const lbl = { color:"#94A3B8", fontSize:"11px", fontWeight:"semibold", letterSpacing:"0.05em" }

export default function PolicyDetail() {
  const router = useRouter()

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base:0, md:"200px" }} paddingY={{ base:"56px", md:0 }}>
        <Box display={{ base:"none", md:"block" }}>
          <TopBar title="Detail Polis" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">

          {/* Page header */}
          <Flex align="center" justify="space-between">
            <Flex align="center" gap="12px">
              <Button size="sm" variant="ghost" color="#64748B" onClick={() => router.back()} px="0">
                <LuArrowLeft size={16}/>
              </Button>
              <Box p="8px" bg="#EFF6FF" borderRadius="10px" color="#1D4ED8"><LuFileText size={20}/></Box>
              <Flex align="center" gap="8px">
                <Text color="#1C2833" fontSize="20px" fontWeight="bold">{policy.id}</Text>
                <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg="#DBEAFE" color="#1D4ED8">{policy.insurer}</Badge>
                <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg="#DCFCE7" color="#16A34A">● {policy.status}</Badge>
              </Flex>
            </Flex>
            <Flex gap="8px">
              <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="13px">
                <LuPencil size={13}/> Edit Polis
              </Button>
              <Button size="sm" bg="#EF4444" color="white" gap="6px" fontSize="13px">
                <LuFlag size={13}/> Lapor
              </Button>
            </Flex>
          </Flex>

          <Flex gap="24px" align="flex-start">
            {/* ── Left column ── */}
            <Flex flexDir="column" gap="16px" flex="1">

              {/* Detail Polis */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                <Flex justify="space-between" align="center" mb="20px">
                  <Flex align="center" gap="8px">
                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Detail Polis</Text>
                  </Flex>
                  <Text color="#94A3B8" fontSize="11px">Terakhir diupdate: {policy.updatedAt}</Text>
                </Flex>

                <Flex gap="32px" mb="20px">
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>NASABAH</Text>
                    <Text color="#1C2833" fontSize="14px" fontWeight="semibold">{policy.nasabah}</Text>
                    <Text color="#64748B" fontSize="12px">{policy.address}</Text>
                  </Flex>
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>PERIODE POLIS</Text>
                    <Text color="#1C2833" fontSize="14px">{policy.periodeStart} – {policy.periodeEnd}</Text>
                    <Text color="#3B82F6" fontSize="12px">Sisa {policy.sisaHari} hari</Text>
                  </Flex>
                </Flex>

                <Flex gap="32px" mb="24px">
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>OBJEK PERTANGGUNGAN</Text>
                    <Text color="#1C2833" fontSize="14px">{policy.objek}</Text>
                  </Flex>
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>RATE PREMI</Text>
                    <Text color="#1C2833" fontSize="14px">{policy.rate}</Text>
                  </Flex>
                </Flex>

                {/* Rincian Keuangan */}
                <Box bg="#F8FAFC" borderRadius="10px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                  <Box px="16px" py="10px" borderBottom="1px solid" borderColor="#E2E8F0">
                    <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Rincian Keuangan</Text>
                  </Box>
                  {[
                    { label:"Nilai Pertanggungan (TSI)", value:fmt(policy.tsi),      sub:null,                              bold:false },
                    { label:"KOMISI (%)",                value:`${policy.komisiPct}%`, sub:fmt(policy.komisiNom),           bold:false },
                    { label:"PREMI NETT",                value:fmt(policy.premiNett), sub:null,                             bold:false },
                    { label:"PPH KOMISI",                value:fmt(policy.pph),       sub:null,                             bold:false },
                    { label:"METERAI",                   value:fmt(policy.meterai),   sub:null,                             bold:false },
                  ].map(({ label, value, sub }) => (
                    <Flex key={label} px="16px" py="10px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9">
                      <Text color="#64748B" fontSize="13px">{label}</Text>
                      <Flex align="center" gap="8px">
                        {sub && <Text color="#94A3B8" fontSize="12px">{sub}</Text>}
                        <Text color="#1C2833" fontSize="13px">{value}</Text>
                      </Flex>
                    </Flex>
                  ))}
                  <Flex px="16px" py="12px" justify="space-between" align="center" bg="#EFF6FF">
                    <Text color="#1D4ED8" fontSize="13px" fontWeight="bold">TOTAL TAGIHAN</Text>
                    <Text color="#1D4ED8" fontSize="14px" fontWeight="bold">{fmt(policy.total)}</Text>
                  </Flex>
                </Box>
              </Box>

              {/* Riwayat Renewal */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                <Flex align="center" gap="8px" px="24px" py="16px" borderBottom="1px solid" borderColor="#E2E8F0">
                  <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Riwayat Renewal</Text>
                </Flex>
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="#F8FAFC">
                      {["NO. POLIS LAMA","TAHUN","STATUS","PREMI"].map((h) => (
                        <Table.ColumnHeader key={h} color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="10px">{h}</Table.ColumnHeader>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {renewalHistory.map((r) => (
                      <Table.Row key={r.polisLama} borderBottom="1px solid" borderColor="#F1F5F9">
                        <Table.Cell px="20px" py="12px" color="#1C2833" fontSize="13px" fontFamily="mono">{r.polisLama}</Table.Cell>
                        <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">{r.tahun}</Table.Cell>
                        <Table.Cell px="20px" py="12px">
                          <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg="#FEE2E2" color="#DC2626">{r.status}</Badge>
                        </Table.Cell>
                        <Table.Cell px="20px" py="12px" color="#1C2833" fontSize="13px">{fmt(r.premi)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Follow-up Log */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                <Flex align="center" gap="8px" mb="20px">
                  <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Follow-up Log</Text>
                </Flex>
                <Flex flexDir="column" gap="16px">
                  {followUpLog.map(({ Icon, type, time, note }) => (
                    <Flex key={type} gap="12px">
                      <Box p="8px" bg="#F1F5F9" borderRadius="full" h="fit-content" color="#64748B" flexShrink={0}>
                        <Icon size={14}/>
                      </Box>
                      <Flex flexDir="column" gap="4px">
                        <Flex align="center" gap="8px">
                          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{type}</Text>
                          <Text color="#94A3B8" fontSize="11px">{time}</Text>
                        </Flex>
                        <Text color="#64748B" fontSize="12px" lineHeight="1.6">{note}</Text>
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </Flex>

            {/* ── Right column ── */}
            <Flex flexDir="column" gap="16px" w="280px" flexShrink={0}>

              {/* Days to expiry */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px" textAlign="center">
                <Text color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.08em" mb="12px">HARI MENUJU EXPIRY</Text>
                <Text color="#1A3557" fontSize="52px" fontWeight="bold" lineHeight="1">{policy.sisaHari}</Text>
                <Text color="#1A3557" fontSize="18px" fontWeight="semibold" mb="12px">Hari</Text>
                <Flex align="center" justify="center" gap="6px" color="#94A3B8" fontSize="12px" mb="20px">
                  <LuCalendar size={13}/> Berakhir: {policy.periodeEnd}
                </Flex>
                <Flex flexDir="column" gap="8px">
                  <Button w="100%" variant="outline" borderColor="#3B82F6" color="#3B82F6" fontSize="13px" gap="6px" _hover={{ bg:"#EFF6FF" }}>
                    <LuCreditCard size={13}/> Catat Pembayaran
                  </Button>
                  <Button w="100%" bg="#16A34A" color="white" fontSize="13px" gap="6px" _hover={{ bg:"#15803D" }}>
                    <LuCircleCheck size={13}/> Tandai Sudah Diperbarui
                  </Button>
                  <Button w="100%" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" gap="6px">
                    <LuMessageSquare size={13}/> Catat Follow-up
                  </Button>
                </Flex>
              </Box>

              {/* Dokumen */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
                <Flex justify="space-between" align="center" mb="16px">
                  <Text color="#1C2833" fontSize="14px" fontWeight="semibold">Dokumen</Text>
                  <Flex align="center" gap="4px" color="#3B82F6" fontSize="12px" cursor="pointer">
                    <LuUpload size={12}/> Upload
                  </Flex>
                </Flex>
                <Flex flexDir="column" gap="10px">
                  {documents.map(({ name, meta }) => (
                    <Flex key={name} align="center" gap="10px" p="10px" bg="#F8FAFC" borderRadius="8px" border="1px solid" borderColor="#F1F5F9">
                      <Box p="8px" bg="#FEE2E2" borderRadius="6px" color="#DC2626" flexShrink={0}><LuFileText size={14}/></Box>
                      <Flex flexDir="column" gap="2px">
                        <Text color="#1C2833" fontSize="12px" fontWeight="medium">{name}</Text>
                        <Text color="#94A3B8" fontSize="11px">{meta}</Text>
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              {/* Agen Penanggung Jawab */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
                <Text color="#1C2833" fontSize="14px" fontWeight="semibold" mb="14px">Agen Penanggung Jawab</Text>
                <Flex align="center" gap="10px" mb="14px">
                  <Avatar.Root w="36px" h="36px" bg="#1D4ED8" borderRadius="full">
                    <Avatar.Fallback color="white" fontSize="12px" fontWeight="bold">AP</Avatar.Fallback>
                  </Avatar.Root>
                  <Flex flexDir="column">
                    <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Agus Pratama</Text>
                    <Text color="#94A3B8" fontSize="11px">Agent Code: AG-5001</Text>
                  </Flex>
                </Flex>
                <Flex gap="8px">
                  <Button flex="1" size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" gap="4px">
                    <LuUser size={12}/> Hubungi
                  </Button>
                  <Button flex="1" size="sm" bg="#25D366" color="white" fontSize="12px" gap="4px">
                    <FaWhatsapp size={12}/> WhatsApp
                  </Button>
                </Flex>
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
