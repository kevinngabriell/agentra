"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Avatar, Badge, Box, Button, Dialog, Flex, Grid, Input, NativeSelect, Skeleton, Table, Text, Textarea } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuSearch, LuList, LuCalendarDays, LuChevronDown, LuChevronUp, LuBell, LuClock, LuCircleCheck, LuRefreshCw } from "react-icons/lu"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import { getRenewals, getRenewalStats, sendRenewalWhatsapp, type ApiRenewal, type RenewalFilters, type RenewalStatsResponse } from "@/lib/api/renewals"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { getActiveSubAgents, type ApiSubAgent } from "@/lib/api/sub-agents"
import { renewPolicy } from "@/lib/api/policies"
import { RenewalCalendar, RenewalCalendarLegend, RenewalStageBadge, RenewalWorkflowDialog } from "@/components/renewals"
import { RENEWAL_LOST_REASON_LABELS, type RenewalWorkflow } from "@/lib/api/renewals"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { getInitials, localISODate, localMonth, shiftMonth } from "@/lib/format"
import { MonthPickerButton } from "@/components/ui/month-picker"

type Urgency = "urgent" | "followup" | "done"

function getUrgency(r: ApiRenewal): Urgency {
  if (r.renewal_status === "renewed") return "done"
  if (r.days_until_expiry <= 7) return "urgent"
  return "followup"
}

const avatarColors = ["#F97316", "#0369A1", "#047857", "#7C3AED", "#BE123C", "#1D4ED8"]
function getAvatarColor(name: string | null | undefined) {
  const hash = (name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)
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
  kecelakaan: "Asuransi Kecelakaan",
  aep:        "AEP",
}

function DaysLeftBadge({ days }: { days: number }) {
  const urgent = days <= 7
  return (
    <Badge px="8px" py="2px" borderRadius="full" fontSize="14px" fontWeight="semibold"
      bg={urgent ? "#FED7AA" : "#FEF3C7"} color={urgent ? "#EA580C" : "#D97706"}>
      {days > 0 ? `${days} Hari Lagi` : days === 0 ? "Hari Ini" : `Lewat ${Math.abs(days)} Hari`}
    </Badge>
  )
}

const colHeader = { color: "#64748B", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", px: "20px", py: "10px" }

export default function Renewals() {
  const router = useRouter()
  const [month, setMonth]   = useState(() => localMonth())
  const [view, setView]     = useState<"list" | "calendar">("list")
  const [showNext, setShowNext] = useState(false)
  const [filters, setFilters]   = useState<RenewalFilters>({})
  const [insurers, setInsurers] = useState<ApiInsurer[]>([])
  const [subAgents, setSubAgents] = useState<ApiSubAgent[]>([])
  const [query, setQuery]   = useState("")
  const [open, setOpen]     = useState<Record<string, boolean>>({ urgent: true, followup: true, done: false })
  // Tagged with the month + filters it answers, so switching quickly can't show stale data.
  const [result, setResult] = useState<{ month: string; renewals: ApiRenewal[]; stats: RenewalStatsResponse | null; error: string | null } | null>(null)

  // Send WhatsApp (RN-003) dialog state
  const [waTarget, setWaTarget]   = useState<ApiRenewal | null>(null)
  const [waMessage, setWaMessage] = useState("")
  const [waSending, setWaSending] = useState(false)
  const [waError, setWaError]     = useState<string | null>(null)
  const [waSuccess, setWaSuccess] = useState<string | null>(null)

  // Renew policy (6.12) dialog state
  const [renewTarget, setRenewTarget] = useState<ApiRenewal | null>(null)
  const [renewForm, setRenewForm]     = useState({ policy_number: "", coverage_start: "", coverage_end: "" })
  const [renewSaving, setRenewSaving] = useState(false)
  const [renewError, setRenewError]   = useState<string | null>(null)

  // Renewal quote workflow dialog
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  function handleWorkflowChanged(d: RenewalWorkflow) {
    setResult((prev) => prev && {
      ...prev,
      renewals: prev.renewals.map((r) => r.policy_id === d.policy.policy_id
        ? { ...r, workflow_stage: d.workflow.stage, lost_reason: d.workflow.lost_reason, renewal_status: d.policy.renewal_status }
        : r),
    })
  }

  const filterKey  = JSON.stringify(filters)
  const requestKey = `${month}|${filterKey}`
  const setFilter = (key: keyof RenewalFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }))

  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }))

  function openWaDialog(r: ApiRenewal) {
    setWaTarget(r)
    setWaMessage("")
    setWaError(null)
    setWaSuccess(null)
  }

  async function handleSendWhatsapp() {
    const token = getAccessToken()
    if (!token || !waTarget) return
    setWaSending(true)
    setWaError(null)
    try {
      await sendRenewalWhatsapp(token, waTarget.policy_id, waMessage.trim() || undefined)
      setWaSuccess("Pesan WhatsApp berhasil dikirim.")
      setResult((prev) => prev && {
        ...prev,
        renewals: prev.renewals.map((r) => r.policy_id === waTarget.policy_id
          ? { ...r, last_follow_up_status: "contacted", last_follow_up_date: localISODate() }
          : r),
      })
    } catch (err: unknown) {
      setWaError(errorMessage(err, "Gagal mengirim pesan WhatsApp"))
    } finally {
      setWaSending(false)
    }
  }

  function openRenewDialog(r: ApiRenewal) {
    setRenewTarget(r)
    setRenewForm({ policy_number: "", coverage_start: "", coverage_end: "" })
    setRenewError(null)
  }

  async function handleRenew() {
    const token = getAccessToken()
    if (!token || !renewTarget) return
    if (!renewForm.policy_number.trim()) {
      setRenewError("Nomor polis baru wajib diisi")
      return
    }
    if (renewForm.coverage_start && renewForm.coverage_end && renewForm.coverage_end <= renewForm.coverage_start) {
      setRenewError("Akhir periode harus setelah tanggal mulai")
      return
    }
    setRenewSaving(true)
    setRenewError(null)
    try {
      await renewPolicy(token, renewTarget.policy_id, {
        policy_number: renewForm.policy_number.trim(),
        coverage_start: renewForm.coverage_start || undefined,
        coverage_end: renewForm.coverage_end || undefined,
      })
      setResult((prev) => prev && {
        ...prev,
        renewals: prev.renewals.map((r) => r.policy_id === renewTarget.policy_id
          ? { ...r, renewal_status: "renewed" }
          : r),
      })
      setRenewTarget(null)
    } catch (err: unknown) {
      setRenewError(errorMessage(err, "Gagal memperpanjang polis"))
    } finally {
      setRenewSaving(false)
    }
  }

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getInsurers(token, true).then(setInsurers).catch(() => {})
    getActiveSubAgents(token).then(setSubAgents).catch(() => {})
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    let cancelled = false
    Promise.all([
      getRenewals(token, { month, limit: 200, ...JSON.parse(filterKey) }),
      getRenewalStats(token, month, JSON.parse(filterKey)),
    ])
      .then(([renewalsRes, statsRes]) => {
        if (!cancelled) setResult({ month: requestKey, renewals: renewalsRes.data ?? [], stats: statsRes, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled && errorStatus(err) !== 401) {
          setResult({ month: requestKey, renewals: [], stats: null, error: errorMessage(err, "Data perpanjangan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
        }
      })
    return () => { cancelled = true }
  }, [month, filterKey, requestKey, router])

  const loading  = result?.month !== requestKey
  const renewals = loading ? [] : result?.renewals ?? []
  const stats    = loading ? null : result?.stats ?? null
  const error    = loading ? null : result?.error ?? null

  const q = query.trim().toLowerCase()
  const filtered = (urgency: Urgency) =>
    renewals.filter((r) => getUrgency(r) === urgency &&
      (!q || [r.customer_name, r.policy_number, r.product_type].some(
        (f) => (f ?? "").toLowerCase().includes(q)
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

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Renewals" />
        </Box>

        <Flex flexDir="column" gap="24px" p={{ base: "16px", md: "32px" }}>
          {/* Heading */}
          <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="16px">
            <Flex flexDir="column" gap="4px">
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Manajemen Perpanjangan</Text>
              <Text color="#5D6D7E" fontSize="16px">
                Pantau dan kelola polis yang mendekati masa jatuh tempo untuk memastikan retensi nasabah yang optimal.
              </Text>
            </Flex>
          </Flex>

          {/* Stats cards */}
          {stats && (
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap="16px">
              {[
                { label: "Total Polis", value: stats.total, accent: "#1D4ED8", bg: "#EFF6FF" },
                { label: "Berhasil Diperbarui", value: `${stats.breakdown.renewed.count} (${Math.round(stats.breakdown.renewed.pct)}%)`, accent: "#16A34A", bg: "#DCFCE7" },
                { label: "Sedang Proses", value: `${stats.breakdown.in_progress.count} (${Math.round(stats.breakdown.in_progress.pct)}%)`, accent: "#D97706", bg: "#FEF3C7" },
                { label: "Omzet Tercapai", value: `Rp ${(stats.achieved_omzet / 1_000_000).toFixed(1)}jt`, accent: "#7C3AED", bg: "#F3E8FF" },
              ].map(({ label, value, accent, bg }) => (
                <Box key={label} minW="0" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                  <Box px="8px" py="3px" borderRadius="6px" bg={bg} w="max-content" mb="8px">
                    <Text fontSize="14px" fontWeight="bold" color={accent}>{label.toUpperCase()}</Text>
                  </Box>
                  <Text color="#1C2833" fontSize="20px" fontWeight="bold">{value}</Text>
                </Box>
              ))}
            </Grid>
          )}

          {stats && Object.keys(stats.lost_reasons ?? {}).length > 0 && (
            <Text color="#64748B" fontSize="16px">
              Perpanjangan hilang bulan ini:{" "}
              {(Object.entries(stats.lost_reasons) as [keyof typeof RENEWAL_LOST_REASON_LABELS, number][])
                .map(([reason, n]) => `${RENEWAL_LOST_REASON_LABELS[reason] ?? reason} (${n})`).join(" · ")}
            </Text>
          )}

          {/* Search + month */}
          <Flex gap="12px" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} flexWrap="wrap">
            <Flex flex="1" minW={{ base: "0", md: "200px" }} align="center" gap="10px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={15} color="#64748B" />
              <Input flex="1" outline="none" border="none" fontSize="16px" color="#1C2833"
                placeholder="Cari nama atau nomor polis..."
                aria-label="Cari perpanjangan"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background: "transparent" }}
              />
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
            <Flex bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" overflow="hidden" w={{ base: "100%", md: "auto" }}>
              {([["list", "List", LuList], ["calendar", "Kalender", LuCalendarDays]] as const).map(([key, label, Icon]) => (
                <Button key={key} size="sm" flex={{ base: 1, md: "initial" }} borderRadius="0" fontSize="16px" gap="6px" px="14px" aria-pressed={view === key}
                  bg={view === key ? "#1A3557" : "white"} color={view === key ? "white" : "#475569"} onClick={() => setView(key)}>
                  <Icon size={13} /> {label}
                </Button>
              ))}
            </Flex>
          </Flex>

          {/* Filters */}
          <Flex gap="12px" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} flexWrap="wrap">
            <NativeSelect.Root w={{ base: "100%", md: "180px" }} size="sm">
              <NativeSelect.Field aria-label="Filter perusahaan asuransi" value={filters.insurer_id ?? ""} onChange={(e) => setFilter("insurer_id", e.target.value)}
                bg="white" borderColor="#E2E8F0" fontSize="16px" color="#374151">
                <option value="">Semua insurer</option>
                {insurers.map((i) => <option key={i.insurer_id} value={i.insurer_id}>{i.short_name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <NativeSelect.Root w={{ base: "100%", md: "180px" }} size="sm">
              <NativeSelect.Field aria-label="Filter jenis produk" value={filters.product_type ?? ""} onChange={(e) => setFilter("product_type", e.target.value)}
                bg="white" borderColor="#E2E8F0" fontSize="16px" color="#374151">
                <option value="">Semua produk</option>
                {Object.entries(PRODUCT_LABELS).filter(([k]) => !["kecelakaan", "aep"].includes(k)).map(([k, label]) => <option key={k} value={k}>{label.replace("Asuransi ", "")}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <NativeSelect.Root w={{ base: "100%", md: "180px" }} size="sm">
              <NativeSelect.Field aria-label="Filter sub-agen" value={filters.sub_agent_id ?? ""} onChange={(e) => setFilter("sub_agent_id", e.target.value)}
                bg="white" borderColor="#E2E8F0" fontSize="16px" color="#374151">
                <option value="">Semua agen</option>
                <option value="main">Agen utama</option>
                {subAgents.map((a) => <option key={a.sub_agent_id} value={a.sub_agent_id}>{a.full_name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            {Object.keys(filters).some((k) => filters[k as keyof RenewalFilters]) && (
              <Button size="sm" variant="ghost" fontSize="16px" onClick={() => setFilters({})}>Reset filter</Button>
            )}
            {view === "calendar" && (
              <Button size="sm" variant="outline" borderColor="#E2E8F0" fontSize="16px" aria-pressed={showNext}
                bg={showNext ? "#EFF6FF" : "white"} color="#374151" onClick={() => setShowNext((v) => !v)}>
                Tampilkan bulan berikutnya
              </Button>
            )}
          </Flex>

          {view === "calendar" && (
            <Flex flexDir="column" gap="12px">
              <RenewalCalendarLegend />
              <Flex gap="16px" flexWrap="wrap" align="flex-start">
                <RenewalCalendar month={month} filters={filters} />
                {showNext && <RenewalCalendar month={shiftMonth(month, 1)} filters={filters} />}
              </Flex>
            </Flex>
          )}

          {/* Error */}
          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="16px">{error}</Text>
            </Box>
          )}

          {/* Sections */}
          {view === "calendar" ? null : loading ? (
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
                    <Flex as="button" w="100%" textAlign="left"
                      aria-expanded={isOpen}
                      px="20px" py="14px" align="center" gap="10px" cursor="pointer" onClick={() => toggle(key)}
                      borderBottom={isOpen && rows.length > 0 ? "1px solid" : "none"} borderColor="#E2E8F0">
                      <Icon size={16} color={accent} aria-hidden="true" />
                      <Text fontSize="15px" fontWeight="bold" color={accent} flex="1">{label}</Text>
                      <Badge px="8px" py="2px" borderRadius="full" fontSize="14px" bg={badgeBg} color={badgeColor}>
                        {rows.length} Polis
                      </Badge>
                      {isOpen ? <LuChevronUp size={16} color="#64748B" /> : <LuChevronDown size={16} color="#64748B" />}
                    </Flex>

                    {/* Table */}
                    {isOpen && rows.length > 0 && (
                      <Box overflowX="auto"><Table.Root>
                        <Table.Header>
                          <Table.Row bg="#F8FAFC">
                            {["NASABAH", "JENIS PRODUK", "NO. POLIS", "TGL. JATUH TEMPO", "SISA HARI", "TAHAP RENEWAL", "STATUS FOLLOW-UP", "AKSI"].map((h) => (
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
                                    <Avatar.Fallback color="white" fontSize="14px" fontWeight="bold">
                                      {getInitials(r.customer_name)}
                                    </Avatar.Fallback>
                                  </Avatar.Root>
                                  <Flex flexDir="column" gap="1px">
                                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{r.customer_name}</Text>
                                    <Text color="#64748B" fontSize="14px">{r.insurer_name}</Text>
                                    {r.claim_count > 0 && (
                                      <Text color="#DC2626" fontSize="14px" fontWeight="medium"
                                        title="Jumlah klaim pada polis ini dan rasio klaim terhadap premi">
                                        {r.claim_count} klaim{r.premium_amount > 0 && r.claims_incurred > 0 ? ` · rasio ${Math.round((r.claims_incurred / r.premium_amount) * 100)}%` : ""}
                                      </Text>
                                    )}
                                  </Flex>
                                </Flex>
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="15px">
                                {PRODUCT_LABELS[r.product_type] ?? r.product_type}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="14px" fontFamily="mono">
                                {r.policy_number}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px" color="#64748B" fontSize="15px">
                                {formatDate(r.coverage_end)}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                <DaysLeftBadge days={r.days_until_expiry} />
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                <Flex flexDir="column" gap="2px" align="flex-start">
                                  <RenewalStageBadge stage={r.workflow_stage ?? "not_started"} />
                                  {r.workflow_stage === "declined" && r.lost_reason && (
                                    <Text color="#64748B" fontSize="16px">{RENEWAL_LOST_REASON_LABELS[r.lost_reason]}</Text>
                                  )}
                                </Flex>
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                {r.last_follow_up_status ? (
                                  <Badge px="8px" py="2px" borderRadius="full" fontSize="14px"
                                    bg="#EFF6FF" color="#1D4ED8">
                                    {r.last_follow_up_status}
                                  </Badge>
                                ) : (
                                  <Text color="#64748B" fontSize="14px">—</Text>
                                )}
                              </Table.Cell>
                              <Table.Cell px="20px" py="12px">
                                <Flex gap="6px" flexWrap="wrap">
                                  {key !== "done" && (
                                    <Button size="sm" bg="#1A3557" color="white" fontSize="14px" fontWeight="semibold" borderRadius="8px" px="14px"
                                      onClick={() => router.push(`/agentra/policies/${encodeURIComponent(r.policy_id)}`)}>
                                      Follow Up
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" borderColor="#1A3557" color="#1A3557" fontSize="16px" borderRadius="8px" px="14px"
                                    onClick={() => setWorkflowId(r.policy_id)}>
                                    Alur Renewal
                                  </Button>
                                  {r.renewal_status === "pending" && (
                                    <Button size="sm" variant="outline" borderColor="#16A34A" color="#16A34A" fontSize="14px" borderRadius="8px" px="14px" gap="6px"
                                      onClick={() => openRenewDialog(r)}>
                                      <LuRefreshCw size={12} /> Perpanjang
                                    </Button>
                                  )}
                                  {r.customer_whatsapp && (
                                    <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px" borderRadius="8px" px="14px" gap="6px"
                                      onClick={() => openWaDialog(r)}>
                                      <FaWhatsapp color="#25D366" size={13} /> WhatsApp
                                    </Button>
                                  )}
                                </Flex>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root></Box>
                    )}

                    {isOpen && rows.length === 0 && (
                      <Flex align="center" justify="center" py="24px">
                        <Text color="#64748B" fontSize="15px">Belum ada data untuk ditampilkan</Text>
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

      {workflowId && (
        <RenewalWorkflowDialog policyId={workflowId} onClose={() => setWorkflowId(null)} onChanged={handleWorkflowChanged} />
      )}

      {/* Send WhatsApp dialog (RN-003) */}
      <Dialog.Root
        open={waTarget !== null}
        onOpenChange={(d) => { if (!d.open && !waSending) setWaTarget(null) }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" p="0" maxW="460px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                Kirim WhatsApp Perpanjangan
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Text color="#5D6D7E" fontSize="15px" mb="12px">
                Kepada <Text as="span" fontWeight="semibold" color="#1C2833">{waTarget?.customer_name}</Text> — polis {waTarget?.policy_number}
              </Text>
              <Text fontSize="14px" color="#64748B" fontWeight="medium" mb="6px">
                Pesan (opsional — kosongkan untuk memakai template default)
              </Text>
              <Textarea
                rows={4} fontSize="15px"
                placeholder="Halo {customer_name}, polis Anda {policy_number} akan berakhir {days_until_expiry} hari lagi..."
                value={waMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWaMessage(e.target.value)}
              />
              {waError && (
                <Text mt="10px" fontSize="14px" color="#DC2626">{waError}</Text>
              )}
              {waSuccess && (
                <Text mt="10px" fontSize="14px" color="#16A34A">{waSuccess}</Text>
              )}
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="16px" borderRadius="8px" disabled={waSending}
                onClick={() => setWaTarget(null)}
              >
                Tutup
              </Button>
              <Button
                flex="1" bg="#25D366" color="white" fontSize="16px" borderRadius="8px" gap="6px"
                loading={waSending} loadingText="Mengirim..."
                onClick={handleSendWhatsapp}
              >
                <FaWhatsapp /> Kirim
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Renew policy dialog (6.12) */}
      <Dialog.Root
        open={renewTarget !== null}
        onOpenChange={(d) => { if (!d.open && !renewSaving) setRenewTarget(null) }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" p="0" maxW="460px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                Perpanjang Polis
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Text color="#5D6D7E" fontSize="15px" mb="16px">
                {renewTarget?.customer_name} — polis lama {renewTarget?.policy_number}
              </Text>

              <Flex flexDir="column" gap="12px">
                <Flex flexDir="column" gap="4px">
                  <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">
                    Nomor Polis Baru <Text as="span" color="#DC2626">*</Text>
                  </Text>
                  <Input
                    fontSize="15px" placeholder="01.08.2027.001"
                    value={renewForm.policy_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenewForm((f) => ({ ...f, policy_number: e.target.value }))}
                  />
                </Flex>
                <Flex gap="12px">
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">Mulai Periode</Text>
                    <Input
                      type="date" fontSize="15px"
                      value={renewForm.coverage_start}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenewForm((f) => ({ ...f, coverage_start: e.target.value }))}
                    />
                  </Flex>
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">Akhir Periode</Text>
                    <Input
                      type="date" fontSize="15px"
                      value={renewForm.coverage_end}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenewForm((f) => ({ ...f, coverage_end: e.target.value }))}
                    />
                  </Flex>
                </Flex>
                <Text fontSize="14px" color="#64748B">
                  Kosongkan tanggal untuk otomatis melanjutkan dari polis lama (akhir periode = mulai + 365 hari). Rate komisi, item pertanggungan, dan data lain akan disalin dari polis lama dan bisa diubah lagi di halaman detail polis.
                </Text>
              </Flex>

              {renewError && (
                <Text mt="12px" fontSize="14px" color="#DC2626">{renewError}</Text>
              )}
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="16px" borderRadius="8px" disabled={renewSaving}
                onClick={() => setRenewTarget(null)}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#16A34A" color="white" fontSize="16px" borderRadius="8px"
                loading={renewSaving} loadingText="Memproses..."
                onClick={handleRenew}
              >
                Perpanjang
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
