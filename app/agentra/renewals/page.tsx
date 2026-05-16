"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout";
import { Avatar, Badge, Box, Button, Flex, Input, Table, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuSearch, LuCalendar, LuList, LuChevronDown, LuChevronUp, LuBell, LuClock, LuCircleCheck} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";

type Urgency = "urgent" | "followup" | "done"

interface Policy {
  id: string; initials: string; avatarBg: string; name: string
  product: string; policyNo: string; dueDate: string; daysLeft: number; urgency: Urgency
}

const policies: Policy[] = [
  { id:"1", initials:"BS", avatarBg:"#F97316", name:"Budi Santoso",   product:"Asuransi Jiwa",         policyNo:"#LF-882910", dueDate:"12 Okt 2023", daysLeft:2,  urgency:"urgent"   },
  { id:"2", initials:"SN", avatarBg:"#0369A1", name:"Siti Nurhaliza", product:"Asuransi Kendaraan",    policyNo:"#VH-112233", dueDate:"15 Okt 2023", daysLeft:5,  urgency:"urgent"   },
  { id:"3", initials:"AS", avatarBg:"#047857", name:"Anwar Saputra",  product:"Kesehatan",             policyNo:"#HL-445522", dueDate:"28 Okt 2023", daysLeft:16, urgency:"followup" },
  { id:"4", initials:"DK", avatarBg:"#7C3AED", name:"Dewi Kartika",   product:"Investasi (Unit Link)", policyNo:"#UL-993577", dueDate:"02 Nov 2023", daysLeft:23, urgency:"followup" },
]

const sections = [
  { key:"urgent",   Icon:LuBell,        label:"SEGERA (≤ 7 HARI)",               count:3,  accent:"#F97316", badgeBg:"#FFF0E6", badgeColor:"#F97316", defaultOpen:true  },
  { key:"followup", Icon:LuClock,       label:"PERLU TINDAK LANJUT (8-30 HARI)", count:12, accent:"#F59E0B", badgeBg:"#FFFBEB", badgeColor:"#D97706", defaultOpen:true  },
  { key:"done",     Icon:LuCircleCheck, label:"SUDAH DIPERBARUI BULAN INI",      count:45, accent:"#16A34A", badgeBg:"#DCFCE7", badgeColor:"#16A34A", defaultOpen:false },
]

const colHeader = { color:"#64748B", fontSize:"11px", fontWeight:"bold", letterSpacing:"0.05em", px:"20px", py:"10px" }

function DaysLeftBadge({ days }: { days: number }) {
  const urgent = days <= 7
  return (
    <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" fontWeight="semibold"
      bg={urgent ? "#FED7AA" : "#FEF3C7"} color={urgent ? "#EA580C" : "#D97706"}>
      {days} Hari Lagi
    </Badge>
  )
}

function ActionButton({ urgency }: { urgency: Urgency }) {
  if (urgency === "urgent") return (
    <Button size="sm" bg="#1A3557" color="white" fontSize="12px" fontWeight="semibold" borderRadius="8px" px="14px">
      Follow Up
    </Button>
  )
  return (
    <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" fontWeight="medium" borderRadius="8px" px="14px" gap="6px">
      <FaWhatsapp color="#25D366" size={13}/> Kirim WhatsApp
    </Button>
  )
}

export default function Renewals() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Record<string, boolean>>({ urgent:true, followup:true, done:false })
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }))

  const filtered = (urgency: Urgency) =>
    policies.filter((p) => p.urgency === urgency &&
      (!query.trim() || [p.name, p.policyNo, p.product].some((f) => f.toLowerCase().includes(query.toLowerCase())))
    )

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base:0, md:"200px" }} paddingY={{ base:"56px", md:0 }}>
        <Box display={{ base:"none", md:"block" }}>
          <TopBar title="Renewals" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">
          {/* Heading */}
          <Flex flexDir="column" gap="4px">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Manajemen Perpanjangan</Text>
            <Text color="#5D6D7E" fontSize="14px">Pantau dan kelola polis yang mendekati masa jatuh tempo untuk memastikan retensi nasabah yang optimal.</Text>
          </Flex>

          {/* Search + controls */}
          <Flex gap="12px" align="center">
            <Flex flex="1" align="center" gap="10px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={15} color="#94A3B8" />
              <Input flex="1" outline="none" border="none" fontSize="14px" color="#1C2833"
                placeholder="Cari nama atau nomor polis..."
                value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background:"transparent" }}
              />
            </Flex>
            <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" gap="8px" bg="white">
              <LuCalendar size={14}/> Oktober 2023
            </Button>
            <Flex bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" overflow="hidden">
              <Button size="sm" bg="#1A3557" color="white" borderRadius="0" fontSize="12px" gap="6px" px="14px">
                <LuList size={13}/> List
              </Button>
              <Button size="sm" variant="ghost" color="#64748B" borderRadius="0" fontSize="12px" gap="6px" px="14px">
                <LuCalendar size={13}/> Calendar
              </Button>
            </Flex>
          </Flex>

          {/* Sections */}
          <Flex flexDir="column" gap="12px">
            {sections.map(({ key, Icon, label, count, accent, badgeBg, badgeColor, defaultOpen: _ }) => {
              const rows = filtered(key as Urgency)
              const isOpen = open[key]
              return (
                <Box key={key} bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                  {/* Section header */}
                  <Flex px="20px" py="14px" align="center" gap="10px" cursor="pointer" onClick={() => toggle(key)}
                    borderBottom={isOpen ? "1px solid" : "none"} borderColor="#E2E8F0">
                    <Icon size={16} color={accent} />
                    <Text fontSize="13px" fontWeight="bold" color={accent} flex="1">{label}</Text>
                    <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg={badgeBg} color={badgeColor}>
                      {count} Polis
                    </Badge>
                    {key === "done" && !isOpen && (
                      <Text fontSize="12px" color="#3B82F6" mr="8px">Klik untuk melihat detail</Text>
                    )}
                    {isOpen ? <LuChevronUp size={16} color="#94A3B8"/> : <LuChevronDown size={16} color="#94A3B8"/>}
                  </Flex>

                  {/* Table */}
                  {isOpen && key !== "done" && (
                    <Table.Root>
                      <Table.Header>
                        <Table.Row bg="#F8FAFC">
                          {["NASABAH","JENIS PRODUK","NO. POLIS","TGL. JATUH TEMPO","SISA HARI","AKSI"].map((h) => (
                            <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                          ))}
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {rows.map((p) => (
                          <Table.Row key={p.id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg:"#F8FAFC" }}>
                            <Table.Cell px="20px" py="12px">
                              <Flex align="center" gap="10px">
                                <Avatar.Root w="32px" h="32px" bg={p.avatarBg} borderRadius="full">
                                  <Avatar.Fallback color="white" fontSize="11px" fontWeight="bold">{p.initials}</Avatar.Fallback>
                                </Avatar.Root>
                                <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{p.name}</Text>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">{p.product}</Table.Cell>
                            <Table.Cell px="20px" py="12px" color="#64748B" fontSize="12px" fontFamily="mono">{p.policyNo}</Table.Cell>
                            <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">{p.dueDate}</Table.Cell>
                            <Table.Cell px="20px" py="12px"><DaysLeftBadge days={p.daysLeft}/></Table.Cell>
                            <Table.Cell px="20px" py="12px"><ActionButton urgency={p.urgency}/></Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  )}
                </Box>
              )
            })}
          </Flex>
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
