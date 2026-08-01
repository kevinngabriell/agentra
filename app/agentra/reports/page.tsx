"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Box, Flex, Skeleton, Table, Text, Button } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuCalendar, LuTrendingUp, LuUsers, LuFileText } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { getRevenueSummary, type RevenueSummaryResponse } from "@/lib/api/revenue"

function fmt(n: number) {
  return "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
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

const colHeader = { color: "#64748B", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px" } as const

export default function Reports() {
  const router = useRouter()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [month, setMonth]     = useState(currentMonth)
  const [data, setData]       = useState<RevenueSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    setLoading(true)
    setError(null)
    getRevenueSummary(token, month)
      .then(setData)
      .catch((err) => setError(err.message ?? "Gagal memuat laporan produksi"))
      .finally(() => setLoading(false))
  }, [month])

  const cards = data ? [
    { label: "Jumlah Polis", value: String(data.totals.policies_count), accent: "#1D4ED8", bg: "#EFF6FF", Icon: LuFileText },
    { label: "Total Premi (Produksi)", value: fmt(data.totals.total_premium), accent: "#7C3AED", bg: "#F3E8FF", Icon: LuTrendingUp },
    { label: "Total Komisi", value: fmt(data.totals.total_commission_amount), accent: "#D97706", bg: "#FEF3C7", Icon: LuTrendingUp },
    { label: "Komisi Bersih (Netto)", value: fmt(data.totals.total_net_commission_amount), accent: "#16A34A", bg: "#DCFCE7", Icon: LuTrendingUp },
  ] : []

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Reports" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">
          {/* Heading */}
          <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="16px">
            <Flex flexDir="column" gap="4px">
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Laporan Produksi</Text>
              <Text color="#5D6D7E" fontSize="14px">
                Total produksi bulanan dan mingguan untuk rekonsiliasi komisi secara manual.
              </Text>
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
          </Flex>

          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="14px">{error}</Text>
            </Box>
          )}

          {loading ? (
            <Flex flexDir="column" gap="16px">
              <Flex gap="16px" flexWrap="wrap">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="90px" flex="1" minW="180px" borderRadius="12px" />)}
              </Flex>
              <Skeleton h="240px" borderRadius="12px" />
              <Skeleton h="240px" borderRadius="12px" />
            </Flex>
          ) : data ? (
            <>
              {/* Totals cards */}
              <Flex gap="16px" flexWrap="wrap">
                {cards.map(({ label, value, accent, bg, Icon }) => (
                  <Box key={label} flex="1" minW="200px" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                    <Flex align="center" gap="8px" mb="8px">
                      <Flex w="28px" h="28px" borderRadius="8px" bg={bg} align="center" justify="center">
                        <Icon size={14} color={accent} />
                      </Flex>
                      <Text fontSize="11px" fontWeight="bold" color="#64748B" letterSpacing="0.03em">{label.toUpperCase()}</Text>
                    </Flex>
                    <Text color="#1C2833" fontSize="20px" fontWeight="bold">{value}</Text>
                  </Box>
                ))}
              </Flex>

              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                <Text color="#5D6D7E" fontSize="12px">
                  Total premi mencerminkan premi bruto yang diterbitkan (produksi), bukan komisi yang sudah diterima dari insurer.
                  Bandingkan komisi di atas dengan pembayaran aktual insurer melalui halaman{" "}
                  <Text as="span" color="#1D4ED8" fontWeight="medium" cursor="pointer" onClick={() => router.push("/agentra/commisions")}>
                    Komisi
                  </Text>.
                </Text>
              </Box>

              {/* Weekly breakdown */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0">
                  <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Rincian Mingguan</Text>
                </Flex>
                {data.weekly.length === 0 ? (
                  <Flex align="center" justify="center" py="32px">
                    <Text color="#94A3B8" fontSize="13px">Tidak ada data untuk bulan ini</Text>
                  </Flex>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row bg="#F8FAFC">
                        {["MINGGU", "JUMLAH POLIS", "TOTAL PREMI", "KOMISI", "KOMISI NETTO"].map((h) => (
                          <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.weekly.map((w) => (
                        <Table.Row key={w.week_start} borderBottom="1px solid" borderColor="#F1F5F9">
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="13px">
                            {fmtDate(w.week_start)} – {fmtDate(w.week_end)}
                          </Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="13px">{w.policies_count}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="13px">{fmt(w.total_premium)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="13px">{fmt(w.total_commission_amount)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#16A34A" fontSize="13px" fontWeight="medium">{fmt(w.total_net_commission_amount)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Box>

              {/* By agent breakdown */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0" align="center" gap="8px">
                  <LuUsers size={15} color="#64748B" />
                  <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Rincian per Agen</Text>
                </Flex>
                {data.by_agent.length === 0 ? (
                  <Flex align="center" justify="center" py="32px">
                    <Text color="#94A3B8" fontSize="13px">Tidak ada data untuk bulan ini</Text>
                  </Flex>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row bg="#F8FAFC">
                        {["AGEN", "JUMLAH POLIS", "TOTAL PREMI", "KOMISI", "KOMISI NETTO"].map((h) => (
                          <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.by_agent.map((a) => (
                        <Table.Row key={a.agent_id ?? "main"} borderBottom="1px solid" borderColor="#F1F5F9">
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="13px" fontWeight="medium">{a.agent_name}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="13px">{a.policies_count}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="13px">{fmt(a.total_premium)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="13px">{fmt(a.total_commission_amount)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#16A34A" fontSize="13px" fontWeight="medium">{fmt(a.total_net_commission_amount)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Box>
            </>
          ) : null}
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
