"use client"

import { Box, Flex, Skeleton, Text } from "@chakra-ui/react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAccessToken } from "@/lib/auth/session"
import { getRenewalCalendar, RENEWAL_STAGE_LABELS, type RenewalCalendarItem, type RenewalFilters } from "@/lib/api/renewals"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { fmtIDR, localISODate, monthLabel } from "@/lib/format"

type CalendarStatus = "renewed" | "urgent" | "pending" | "lapsed" | "cancelled"

const STATUS_STYLE: Record<CalendarStatus, { label: string; bg: string; color: string }> = {
  renewed:   { label: "Diperpanjang", bg: "#DCFCE7", color: "#15803D" },
  urgent:    { label: "Pending ≤ 7 hari / lewat", bg: "#FED7AA", color: "#C2410C" },
  pending:   { label: "Pending", bg: "#FEF3C7", color: "#B45309" },
  lapsed:    { label: "Lapsed", bg: "#FEE2E2", color: "#DC2626" },
  cancelled: { label: "Dibatalkan", bg: "#F1F5F9", color: "#64748B" },
}

function statusOf(r: RenewalCalendarItem): CalendarStatus {
  if (r.renewal_status === "pending") return r.days_until_expiry <= 7 ? "urgent" : "pending"
  return r.renewal_status
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
const MAX_VISIBLE = 3

export function RenewalCalendarLegend() {
  return (
    <Flex gap="12px" flexWrap="wrap">
      {Object.values(STATUS_STYLE).map((s) => (
        <Flex key={s.label} align="center" gap="6px">
          <Box w="10px" h="10px" borderRadius="3px" bg={s.bg} border="1px solid" borderColor={s.color} />
          <Text fontSize="16px" color="#64748B">{s.label}</Text>
        </Flex>
      ))}
    </Flex>
  )
}

/** One month grid of policies by expiry date. Fetches its own data so two months can sit side by side. */
export function RenewalCalendar({ month, filters }: { month: string; filters: RenewalFilters }) {
  const filterKey = JSON.stringify(filters)
  const requestKey = `${month}|${filterKey}`
  const [result, setResult] = useState<{ key: string; items: RenewalCalendarItem[]; error: string | null } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    const ctrl = new AbortController()
    getRenewalCalendar(token, month, JSON.parse(filterKey) as RenewalFilters, ctrl.signal)
      .then((items) => setResult({ key: requestKey, items, error: null }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || errorStatus(err) === 401) return
        setResult({ key: requestKey, items: [], error: errorMessage(err, "Data kalender perpanjangan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => ctrl.abort()
  }, [month, filterKey, requestKey])

  const loading = result?.key !== requestKey
  const items = useMemo(() => (loading ? [] : result?.items ?? []), [loading, result])
  const error = loading ? null : result?.error ?? null

  const byDay = useMemo(() => {
    const map = new Map<string, RenewalCalendarItem[]>()
    for (const r of items) map.set(r.coverage_end, [...(map.get(r.coverage_end) ?? []), r])
    return map
  }, [items])

  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Monday-first
  const today = localISODate()
  const iso = (d: number) => `${month}-${String(d).padStart(2, "0")}`
  const selectedItems = selected ? byDay.get(selected) ?? [] : []

  return (
    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" flex="1" minW="300px">
      <Flex px="16px" py="12px" borderBottom="1px solid" borderColor="#E2E8F0" justify="space-between" align="center">
        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{monthLabel(month)}</Text>
        <Text color="#64748B" fontSize="16px">{loading ? "…" : `${items.length} polis`}</Text>
      </Flex>

      {error && <Text color="#DC2626" fontSize="16px" p="16px" role="alert">{error}</Text>}

      {loading ? <Skeleton h="320px" /> : (
        <>
          <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))">
            {WEEKDAYS.map((d) => (
              <Text key={d} fontSize="16px" fontWeight="bold" color="#64748B" textAlign="center" py="6px" bg="#F8FAFC" letterSpacing="0.05em">{d.toUpperCase()}</Text>
            ))}
            {Array.from({ length: lead }, (_, i) => <Box key={`b${i}`} minH="84px" bg="#FAFBFC" borderTop="1px solid" borderColor="#F1F5F9" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const date = iso(day)
              const list = byDay.get(date) ?? []
              const isSelected = selected === date
              return (
                <Box key={date} as="button" textAlign="left" minH="84px" p="4px"
                  borderTop="1px solid" borderLeft={(lead + i) % 7 === 0 ? "none" : "1px solid"} borderColor="#F1F5F9"
                  bg={isSelected ? "#EFF6FF" : "white"} cursor={list.length ? "pointer" : "default"}
                  aria-label={`${day} ${monthLabel(month)}: ${list.length} polis`} aria-pressed={isSelected}
                  onClick={() => list.length && setSelected(isSelected ? null : date)}>
                  <Text fontSize="16px" fontWeight={date === today ? "bold" : "medium"} mb="2px"
                    color={date === today ? "white" : "#64748B"} bg={date === today ? "#1A3557" : "transparent"}
                    w="max-content" minW="18px" textAlign="center" borderRadius="full" px="4px">{day}</Text>
                  <Flex flexDir="column" gap="2px">
                    {list.slice(0, MAX_VISIBLE).map((r) => {
                      const st = STATUS_STYLE[statusOf(r)]
                      return (
                        <Text key={r.policy_id} fontSize="16px" lineHeight="1.3" px="4px" borderRadius="3px" bg={st.bg} color={st.color}
                          overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {r.customer_name ?? r.policy_number}
                        </Text>
                      )
                    })}
                    {list.length > MAX_VISIBLE && <Text fontSize="16px" color="#64748B" px="4px">+{list.length - MAX_VISIBLE} lagi</Text>}
                  </Flex>
                </Box>
              )
            })}
          </Box>

          {selected && (
            <Box borderTop="1px solid" borderColor="#E2E8F0" p="12px">
              <Text fontSize="16px" fontWeight="bold" color="#1C2833" mb="8px">
                {new Date(selected).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
              <Flex flexDir="column" gap="6px">
                {selectedItems.map((r) => {
                  const st = STATUS_STYLE[statusOf(r)]
                  return (
                    <Link key={r.policy_id} href={`/agentra/policies/${r.policy_id}`} style={{ textDecoration: "none" }}>
                      <Flex justify="space-between" align="center" gap="8px" p="8px" borderRadius="8px" border="1px solid" borderColor="#E2E8F0" _hover={{ bg: "#F8FAFC" }}>
                        <Flex flexDir="column" minW={0}>
                          <Text fontSize="16px" fontWeight="semibold" color="#1C2833" truncate>{r.customer_name ?? "-"}</Text>
                          <Text fontSize="16px" color="#64748B" truncate>
                            {r.policy_number} · {r.insurer_name} · {fmtIDR(r.premium_amount)}
                          </Text>
                          <Text fontSize="16px" color="#64748B">Tahap: {RENEWAL_STAGE_LABELS[r.workflow_stage]}</Text>
                        </Flex>
                        <Text fontSize="16px" fontWeight="semibold" px="8px" py="2px" borderRadius="full" bg={st.bg} color={st.color} whiteSpace="nowrap">{st.label}</Text>
                      </Flex>
                    </Link>
                  )
                })}
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
