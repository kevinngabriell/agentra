"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Box, Flex, Skeleton, Table, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LuTrendingUp, LuUsers, LuFileText } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { getRevenueSummary, type RevenueSummaryResponse } from "@/lib/api/revenue"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { localMonth } from "@/lib/format"
import { MonthPickerButton } from "@/components/ui/month-picker"
import { REPORT_DEFS, ReportView } from "@/components/reports/ReportView"

const PRODUCTION_TAB = "production"

function fmt(n: number) {
  return "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

const colHeader = { color: "#64748B", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px" } as const

export default function Reports() {
  const router = useRouter()
  const [tab, setTab]         = useState(PRODUCTION_TAB)
  const [month, setMonth]     = useState(() => localMonth())
  // Tagged with the month it answers so `loading` is derived and stale months are ignored.
  const [result, setResult]   = useState<{ month: string; data: RevenueSummaryResponse | null; error: string | null } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    if (tab !== PRODUCTION_TAB) return

    let cancelled = false
    getRevenueSummary(token, month)
      .then((data) => { if (!cancelled) setResult({ month, data, error: null }) })
      .catch((err: unknown) => {
        if (!cancelled && errorStatus(err) !== 401) {
          setResult({ month, data: null, error: errorMessage(err, "Data laporan produksi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
        }
      })
    return () => { cancelled = true }
  }, [month, tab, router])

  const loading = result?.month !== month
  const data    = loading ? null : result?.data ?? null
  const error   = loading ? null : result?.error ?? null

  const cards = data ? [
    { label: "Jumlah Polis", value: String(data.totals.policies_count), accent: "#1D4ED8", bg: "#EFF6FF", Icon: LuFileText },
    { label: "Total Premi (Produksi)", value: fmt(data.totals.total_premium), accent: "#7C3AED", bg: "#F3E8FF", Icon: LuTrendingUp },
    { label: "Total Komisi", value: fmt(data.totals.total_commission_amount), accent: "#D97706", bg: "#FEF3C7", Icon: LuTrendingUp },
    { label: "Komisi Bersih (Netto)", value: fmt(data.totals.total_net_commission_amount), accent: "#16A34A", bg: "#DCFCE7", Icon: LuTrendingUp },
  ] : []

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Box className="no-print"><Sidebar /></Box>
      <Box className="no-print"><MobileHeader /></Box>

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: 0 }} css={{ "@media print": { marginLeft: 0, padding: 0 } }}>
        <Box display={{ base: "none", md: "block" }} className="no-print">
          <TopBar title="Reports" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">
          {/* Report picker */}
          <Flex gap="6px" flexWrap="wrap" role="tablist" aria-label="Jenis laporan" className="no-print">
            {[{ key: PRODUCTION_TAB, label: "Produksi" }, ...REPORT_DEFS].map((t) => (
              <Box key={t.key} as="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                px="14px" py="7px" borderRadius="full" fontSize="16px" fontWeight="medium" border="1px solid"
                bg={tab === t.key ? "#1A3557" : "white"} color={tab === t.key ? "white" : "#475569"}
                borderColor={tab === t.key ? "#1A3557" : "#E2E8F0"}>
                {t.label}
              </Box>
            ))}
          </Flex>

          {/* Heading */}
          {tab === PRODUCTION_TAB ? (
          <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="16px">
            <Flex flexDir="column" gap="4px">
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Laporan Produksi</Text>
              <Text color="#5D6D7E" fontSize="16px">
                Total produksi bulanan dan mingguan untuk rekonsiliasi komisi secara manual.
              </Text>
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
          </Flex>
          ) : (() => {
            const def = REPORT_DEFS.find((d) => d.key === tab)!
            return (
              <>
                <Flex flexDir="column" gap="4px">
                  <Text color="#1C2833" fontSize="24px" fontWeight="bold">{def.label}</Text>
                  <Text color="#5D6D7E" fontSize="16px">{def.description}</Text>
                </Flex>
                <ReportView key={def.key} def={def} />
              </>
            )
          })()}

          {tab === PRODUCTION_TAB && error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="16px">{error}</Text>
            </Box>
          )}

          {tab !== PRODUCTION_TAB ? null : loading ? (
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
                      <Text fontSize="14px" fontWeight="bold" color="#64748B" letterSpacing="0.03em">{label.toUpperCase()}</Text>
                    </Flex>
                    <Text color="#1C2833" fontSize="20px" fontWeight="bold">{value}</Text>
                  </Box>
                ))}
              </Flex>

              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                <Text color="#5D6D7E" fontSize="14px">
                  Total premi mencerminkan premi bruto yang diterbitkan (produksi), bukan komisi yang sudah diterima dari insurer.
                  Bandingkan komisi di atas dengan pembayaran aktual insurer melalui halaman{" "}
                  <Link href="/agentra/commissions" style={{ color: "#1D4ED8", fontWeight: 500 }}>
                    Komisi
                  </Link>.
                </Text>
              </Box>

              {/* Weekly breakdown */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0">
                  <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Rincian Mingguan</Text>
                </Flex>
                {data.weekly.length === 0 ? (
                  <Flex align="center" justify="center" py="32px">
                    <Text color="#64748B" fontSize="15px">Tidak ada data untuk bulan ini</Text>
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
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">
                            {fmtDate(w.week_start)} – {fmtDate(w.week_end)}
                          </Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="15px">{w.policies_count}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{fmt(w.total_premium)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="15px">{fmt(w.total_commission_amount)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#16A34A" fontSize="15px" fontWeight="medium">{fmt(w.total_net_commission_amount)}</Table.Cell>
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
                  <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Rincian per Agen</Text>
                </Flex>
                {data.by_agent.length === 0 ? (
                  <Flex align="center" justify="center" py="32px">
                    <Text color="#64748B" fontSize="15px">Tidak ada data untuk bulan ini</Text>
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
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="medium">{a.agent_name}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="15px">{a.policies_count}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{fmt(a.total_premium)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#64748B" fontSize="15px">{fmt(a.total_commission_amount)}</Table.Cell>
                          <Table.Cell px="16px" py="10px" color="#16A34A" fontSize="15px" fontWeight="medium">{fmt(a.total_net_commission_amount)}</Table.Cell>
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

      <Box className="no-print"><MobileBottomNav /></Box>
    </Box>
  )
}
