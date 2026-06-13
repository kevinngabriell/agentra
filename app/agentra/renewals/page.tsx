"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Avatar, Badge, Box, Button, Flex, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuSearch, LuCalendar, LuList, LuChevronDown, LuChevronUp, LuBell, LuClock, LuCircleCheck, LuRefreshCw } from "react-icons/lu"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import { getRenewals, getRenewalStats, type ApiRenewal, type RenewalStatsResponse } from "@/lib/api/renewals"

type Urgency = "urgent" | "followup" | "done"

function getUrgency(r: ApiRenewal): Urgency {
  if (r.renewal_status === "renewed") return "done"
  if (r.days_until_expiry <= 7) return "urgent"
  return "followup"
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const avatarColors = ["#F97316", "#0369A1", "#047857", "#7C3AED", "#BE123C", "#1D4ED8"]
function getAvatarColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const PRODUCT_LABELS: Record<string, string> = {
  fire:       "Asuransi Kebakaran",
  motorcycle: "Asuransi Motor",
  car:        "Asuransi Kendaraan",
  travel:     "Asuransi Perjalanan",
  cargo:      "Asuransi Kargo",
  other:      "Asuransi Lainnya",
}

function DaysLeftBadge({ days }: { days: number }) {
  const urgent = days <= 7
  return (
    <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" fontWeight="semibold"
      bg={urgent ? "#FED7AA" : "#FEF3C7"} color={urgent ? "#EA580C" : "#D97706"}>
      {days > 0 ? `${days} Hari Lagi` : "Hari Ini / Lewat"}
    </Badge>
  )
}

function MonthPickerButton({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const label = new Date(month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  return (
    <Flex align="center" gap="8px">
      <Button
        size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px"
        onClick={() => {
          const d = new Date(month + "-01")
          d.setMonth(d.getMonth() - 1)
          onChange(d.toISOString().slice(0, 7))
        }}
      >‹</Button>
      <Flex align="center" gap="6px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" py="6px">
        <LuCalendar size={14} color="#64748B" />
        <Text fontSize="13px" color="#374151" fontWeight="medium">{label}</Text>
      </Flex>
      <Button
        size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px"
        onClick={() => {
          const d = new Date(month + "-01")
          d.setMonth(d.getMonth() + 1)
          onChange(d.toISOString().slice(0, 7))
        }}
      >›</Button>
    </Flex>
  )
}

const colHeader = { color: "#64748B", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", px: "20px", py: "10px" }

export default function Renewals() {
  const router = useRouter()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [month, setMonth]   = useState(currentMonth)
  const [query, setQuery]   = useState("")
  const [open, setOpen]     = useState<Record<string, boolean>>({ urgent: true, followup: true, done: false })
  const [renewals, setRenewals] = useState<ApiRenewal[]>([])
  const [stats, setStats]   = useState<RenewalStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }))

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    setLoading(true)
    setError(null)

    Promise.all([
      getRenewals(token, { month, limit: 200 }),
      getRenewalStats(token, month),
    ])
      .then(([renewalsRes, statsRes]) => {
        setRenewals(renewalsRes.data ?? [])
        setStats(statsRes)
      })
      .catch((err) => setError(err.message ?? "Gagal memuat data perpanjangan"))
      .finally(() => setLoading(false))
  }, [month])

  const filtered = (urgency: Urgency) =>
    renewals.filter((r) => getUrgency(r) === urgency &&
      (!query.trim() || [r.customer_name, r.policy_number, r.product_type].some(
        (f) => f.toLowerCase().includes(query.toLowerCase())
      ))
    )

  const sections = [
    { key: "urgent",   Icon: LuBell,        label: "SEGERA (≤ 7 HARI)",               accent: "#F97316", badgeBg: "#FFF0E6", badgeColor: "#F97316" },
    { key: "followup", Icon: LuClock,       label: "PERLU TINDAK LANJUT (8–30 HARI)", accent: "#F59E0B", badgeBg: "#FFFBEB", badgeColor: "#D97706" },
    { key: "done",     Icon: LuCircleCheck, label: "SUDAH DIPERBARUI",                accent: "#16A34A", badgeBg: "#DCFCE7", badgeColor: "#16A34A" },
  ]

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Renewals" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">
          {/* Heading */}
          <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="16px">
            <Flex flexDir="column" gap="4px">
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Manajemen Perpanjangan</Text>
              <Text color="#5D6D7E" fontSize="14px">
                Pantau dan kelola polis yang mendekati masa jatuh tempo untuk memastikan retensi nasabah yang optimal.
              </Text>
            </Flex>
          </Flex>

          {/* Stats cards */}
          {stats && (
            <Flex gap="16px" flexWrap="wrap">
              {[
                { label: "Total Polis", value: stats.total, accent: "#1D4ED8", bg: "#EFF6FF" },
                { label: "Berhasil Diperbarui", value: `${stats.breakdown.renewed.count} (${Math.round(stats.breakdown.renewed.pct)}%)`, accent: "#16A34A", bg: "#DCFCE7" },
                { label: "Sedang Proses", value: `${stats.breakdown.in_progress.count} (${Math.round(stats.breakdown.in_progress.pct)}%)`, accent: "#D97706", bg: "#FEF3C7" },
                { label: "Omzet Tercapai", value: `Rp ${(stats.achieved_omzet / 1_000_000).toFixed(1)}jt`, accent: "#7C3AED", bg: "#F3E8FF" },
              ].map(({ label, value, accent, bg }) => (
                <Box key={label} flex="1" minW="140px" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                  <Box px="8px" py="3px" borderRadius="6px" bg={bg} w="max-content" mb="8px">
                    <Text fontSize="11px" fontWeight="bold" color={accent}>{label.toUpperCase()}</Text>
                  </Box>
                  <Text color="#1C2833" fontSize="20px" fontWeight="bold">{value}</Text>
                </Box>
              ))}
            </Flex>
          )}

          {/* Search + month */}
          <Flex gap="12px" align="center" flexWrap="wrap">
            <Flex flex="1" minW="200px" align="center" gap="10px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={15} color="#94A3B8" />
              <Input flex="1" outline="none" border="none" fontSize="14px" color="#1C2833"
                placeholder="Cari nama atau nomor polis..."
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background: "transparent" }}
              />
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
            <Flex bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" overflow="hidden">
              <Button size="sm" bg="#1A3557" color="white" borderRadius="0" fontSize="12px" gap="6px" px="14px">
                <LuList size={13} /> List
              </Button>
            </Flex>
          </Flex>

          {/* Error */}
          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="14px">{error}</Text>
            </Box>
          )}

          {/* Sections */}
          {loading ? (
            <Flex flexDir="column" gap="12px">
              {[1, 2].map((i) => <Skeleton key={i} h="200px" borderRadius="12px" />)}
            </Flex>
          ) : (
            <Flex flexDir="column" gap="12px">
              {sections.map(({ key, Icon, label, accent, badgeBg, badgeColor }) => {
                const rows = filtered(key as Urgency)
                const isOpen = open[key]
                return (
                  <Box key={key} bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                    {/* Section header */}
                    <Flex px="20px" py="14px" align="center" gap="10px" cursor="pointer" onClick={() => toggle(key)}
                      borderBottom={isOpen && rows.length > 0 ? "1px solid" : "none"} borderColor="#E2E8F0">
                      <Icon size={16} color={accent} />
                      <Text fontSize="13px" fontWeight="bold" color={accent} flex="1">{label}</Text>
                      <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg={badgeBg} color={badgeColor}>
                        {rows.length} Polis
                      </Badge>
                      {isOpen ? <LuChevronUp size={16} color="#94A3B8" /> : <LuChevronDown size={16} color="#94A3B8" />}
                    </Flex>

                    {/* Table */}
                    {isOpen && rows.length > 0 && (
                      <Table.Root>
                        <Table.Header>
                          <Table.Row bg="#F8FAFC">
                            {["NASABAH", "JENIS PRODUK", "NO. POLIS", "TGL. JATUH TEMPO", "SISA HARI", "STATUS FOLLOW-UP", "AKSI"].map((h) => (
                              <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                            ))}
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {rows.map((r) => (
                            <Table.Row key={r.policy_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>
                              <Table.Cell px="20px" py="12px">
                                <Flex align="center" gap="10px">
                                  <Avatar.Root w="32px" h="32px" bg={getAvatarColor(r.customer_name)} borderRadius="full">
                                    <Avatar.Fallback color="white" fontSize="11px" fontWeight="bold">
                                      {getInitials(r.customer_name)}
                                    </Avatar.Fallback>
                                  </Avatar.Root>
                                  <Flex flexDir="column" gap="1px">
                                    <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{r.customer_name}</Text>
                                    <Text color="#94A3B8" fontSize="11px">{r.insurer_name}</Text>
                                  </Flex>
                                </Flex>
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">
                                {PRODUCT_LABELS[r.product_type] ?? r.product_type}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="12px" fontFamily="mono">
                                {r.policy_number}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">
                                {formatDate(r.coverage_end)}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                <DaysLeftBadge days={r.days_until_expiry} />
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                {r.last_follow_up_status ? (
                                  <Badge px="8px" py="2px" borderRadius="full" fontSize="11px"
                                    bg="#EFF6FF" color="#1D4ED8">
                                    {r.last_follow_up_status}
                                  </Badge>
                                ) : (
                                  <Text color="#94A3B8" fontSize="12px">—</Text>
                                )}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                <Flex gap="6px">
                                  {key !== "done" && (
                                    <Button size="sm" bg="#1A3557" color="white" fontSize="12px" fontWeight="semibold" borderRadius="8px" px="14px"
                                      onClick={() => router.push(`/agentra/policies/${r.policy_id}`)}>
                                      Follow Up
                                    </Button>
                                  )}
                                  {r.customer_whatsapp && (
                                    <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" borderRadius="8px" px="14px" gap="6px"
                                      onClick={() => window.open(`https://wa.me/${r.customer_whatsapp.replace(/\D/g, "")}`, "_blank")}>
                                      <FaWhatsapp color="#25D366" size={13} /> WhatsApp
                                    </Button>
                                  )}
                                </Flex>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    )}

                    {isOpen && rows.length === 0 && (
                      <Flex align="center" justify="center" py="24px">
                        <Text color="#94A3B8" fontSize="13px">Tidak ada data</Text>
                      </Flex>
                    )}
                  </Box>
                )
              })}
            </Flex>
          )}
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
