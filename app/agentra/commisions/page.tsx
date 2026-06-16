"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Badge, Box, Button, Dialog, Field, Flex, Input, Skeleton, Table, Text, Textarea,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LuSearch, LuCalendar, LuX, LuCircleCheck, LuClock, LuTriangleAlert, LuBanknote,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import {
  getCommissions, getCommissionSummary, markCommissionReceived,
  type ApiCommission, type CommissionStatus, type CommissionSummaryResponse,
} from "@/lib/api/commissions"

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatIDR(raw: string): string {
  return raw.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const PRODUCT_LABELS: Record<string, string> = {
  fire:        "Kebakaran",
  motorcycle:  "Motor",
  car:         "Kendaraan",
  travel:      "Perjalanan",
  cargo:       "Kargo",
  other:       "Lainnya",
  kecelakaan:  "Kecelakaan",
  aep:         "AEP",
  kebakaran:   "Kebakaran",
  kendaraan:   "Kendaraan",
}

const STATUS_META: Record<CommissionStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  pending:     { label: "Menunggu",  bg: "#FEF3C7", color: "#D97706", Icon: LuClock },
  received:    { label: "Diterima",  bg: "#DCFCE7", color: "#16A34A", Icon: LuCircleCheck },
  discrepancy: { label: "Selisih",   bg: "#FEE2E2", color: "#DC2626", Icon: LuTriangleAlert },
  cancelled:   { label: "Batal",     bg: "#F1F5F9", color: "#64748B", Icon: LuX },
}

const colHeader = {
  color: "#64748B", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px",
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CommissionStatus }) {
  const { label, bg, color, Icon } = STATUS_META[status] ?? STATUS_META.pending
  return (
    <Badge display="flex" alignItems="center" gap="4px" px="8px" py="3px" borderRadius="full" fontSize="11px" fontWeight="semibold" bg={bg} color={color}>
      <Icon size={11} />
      {label}
    </Badge>
  )
}

function MonthPickerButton({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const label = new Date(month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  const shift = (delta: number) => {
    const d = new Date(month + "-01")
    d.setMonth(d.getMonth() + delta)
    onChange(d.toISOString().slice(0, 7))
  }
  return (
    <Flex align="center" gap="8px">
      <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" onClick={() => shift(-1)}>‹</Button>
      <Flex align="center" gap="6px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" py="6px">
        <LuCalendar size={14} color="#64748B" />
        <Text fontSize="13px" color="#374151" fontWeight="medium">{label}</Text>
      </Flex>
      <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" onClick={() => shift(1)}>›</Button>
    </Flex>
  )
}

// ── mark received dialog ──────────────────────────────────────────────────────

interface MarkFormState {
  received_amount: string
  received_date: string
  reference_number: string
  discrepancy_notes: string
}

const emptyMarkForm = (): MarkFormState => ({
  received_amount: "",
  received_date: todayISO(),
  reference_number: "",
  discrepancy_notes: "",
})

// ── main page ─────────────────────────────────────────────────────────────────

type StatusFilter = CommissionStatus | "all"

export default function Commissions() {
  const router = useRouter()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [month, setMonth]         = useState(currentMonth)
  const [query, setQuery]         = useState("")
  const [statusFilter, setStatus] = useState<StatusFilter>("all")
  const [commissions, setCommissions] = useState<ApiCommission[]>([])
  const [summary, setSummary]     = useState<CommissionSummaryResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [markDialog, setMarkDialog]   = useState(false)
  const [selected, setSelected]       = useState<ApiCommission | null>(null)
  const [markForm, setMarkForm]       = useState<MarkFormState>(emptyMarkForm())
  const [submitting, setSubmitting]   = useState(false)
  const [markError, setMarkError]     = useState<string | null>(null)

  // ── load data ──────────────────────────────────────────────────────────────

  function load(token: string) {
    setLoading(true)
    setError(null)
    Promise.all([
      getCommissions(token, { month, limit: 100 }),
      getCommissionSummary(token, { month }),
    ])
      .then(([listRes, sumRes]) => {
        setCommissions(listRes.data ?? [])
        setSummary(sumRes)
      })
      .catch((err) => setError(err.message ?? "Gagal memuat data komisi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    load(token)
  }, [month])

  // ── filtered rows ──────────────────────────────────────────────────────────

  const rows = commissions.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      const fields = [c.customer_name ?? "", c.policy_number ?? "", c.insurer_name ?? ""]
      if (!fields.some((f) => f.toLowerCase().includes(q))) return false
    }
    return true
  })

  // ── mark received ──────────────────────────────────────────────────────────

  function openMark(c: ApiCommission) {
    setSelected(c)
    setMarkForm(emptyMarkForm())
    setMarkError(null)
    setMarkDialog(true)
  }

  async function submitMark() {
    if (!selected) return
    const rawAmt = markForm.received_amount.replace(/\D/g, "")
    if (!rawAmt) { setMarkError("Jumlah yang diterima wajib diisi"); return }

    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    setSubmitting(true)
    setMarkError(null)
    try {
      await markCommissionReceived(token, selected.commission_id, {
        received_amount: Number(rawAmt),
        ...(markForm.received_date ? { received_date: markForm.received_date } : {}),
        ...(markForm.reference_number ? { reference_number: markForm.reference_number } : {}),
        ...(markForm.discrepancy_notes ? { discrepancy_notes: markForm.discrepancy_notes } : {}),
      })
      setMarkDialog(false)
      load(token)
    } catch (err: any) {
      setMarkError(err.message ?? "Gagal menyimpan. Coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── summary card shortcuts ─────────────────────────────────────────────────

  const summaryCards = summary
    ? [
        {
          label: "Total Komisi",
          value: formatRp(summary.total_expected),
          sub: `${summary.total_count} polis`,
          accent: "#1D4ED8", bg: "#EFF6FF", Icon: LuBanknote,
        },
        {
          label: "Menunggu",
          value: formatRp(summary.pending.amount),
          sub: `${summary.pending.count} komisi`,
          accent: "#D97706", bg: "#FEF3C7", Icon: LuClock,
        },
        {
          label: "Diterima",
          value: formatRp(summary.received.amount),
          sub: `${summary.received.count} komisi`,
          accent: "#16A34A", bg: "#DCFCE7", Icon: LuCircleCheck,
        },
        {
          label: "Selisih",
          value: formatRp(summary.discrepancy.expected - summary.discrepancy.received),
          sub: `${summary.discrepancy.count} komisi`,
          accent: "#DC2626", bg: "#FEE2E2", Icon: LuTriangleAlert,
        },
      ]
    : []

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all",         label: "Semua" },
    { key: "pending",     label: "Menunggu" },
    { key: "received",    label: "Diterima" },
    { key: "discrepancy", label: "Selisih" },
    { key: "cancelled",   label: "Batal" },
  ]

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Commissions" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">

          {/* Heading */}
          <Flex flexDir="column" gap="4px">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Manajemen Komisi</Text>
            <Text color="#5D6D7E" fontSize="14px">
              Pantau dan catat komisi yang diterima dari penanggung untuk setiap polis.
            </Text>
          </Flex>

          {/* Summary cards */}
          {loading ? (
            <Flex gap="16px" flexWrap="wrap">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} flex="1" minW="140px" h="90px" borderRadius="12px" />)}
            </Flex>
          ) : summary && (
            <Flex gap="16px" flexWrap="wrap">
              {summaryCards.map(({ label, value, sub, accent, bg, Icon }) => (
                <Box key={label} flex="1" minW="150px" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                  <Flex align="center" gap="8px" mb="8px">
                    <Box p="6px" borderRadius="8px" bg={bg}>
                      <Icon size={14} color={accent} />
                    </Box>
                    <Text fontSize="11px" fontWeight="bold" color={accent} letterSpacing="0.04em">{label.toUpperCase()}</Text>
                  </Flex>
                  <Text color="#1C2833" fontSize="18px" fontWeight="bold">{value}</Text>
                  <Text color="#94A3B8" fontSize="11px" mt="2px">{sub}</Text>
                </Box>
              ))}
            </Flex>
          )}

          {/* Filters */}
          <Flex gap="12px" align="center" flexWrap="wrap">
            <Flex flex="1" minW="200px" align="center" gap="10px" bg="white" border="1px solid"
              borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={15} color="#94A3B8" />
              <Input flex="1" outline="none" border="none" fontSize="14px" color="#1C2833"
                placeholder="Cari nasabah atau no. polis..."
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background: "transparent" }} />
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
          </Flex>

          {/* Status tabs */}
          <Flex gap="8px" flexWrap="wrap">
            {statusTabs.map(({ key, label }) => {
              const active = statusFilter === key
              return (
                <Button key={key} size="sm" onClick={() => setStatus(key)}
                  bg={active ? "#1A3557" : "white"}
                  color={active ? "white" : "#374151"}
                  border="1px solid" borderColor={active ? "#1A3557" : "#E2E8F0"}
                  borderRadius="8px" fontSize="12px" fontWeight={active ? "semibold" : "normal"}
                  px="14px">
                  {label}
                  {key !== "all" && summary && (
                    <Box as="span" ml="6px" px="5px" py="1px" borderRadius="full" fontSize="10px"
                      bg={active ? "rgba(255,255,255,0.25)" : "#F1F5F9"} color={active ? "white" : "#64748B"}>
                      {key === "pending" ? summary.pending.count
                        : key === "received" ? summary.received.count
                        : key === "discrepancy" ? summary.discrepancy.count
                        : commissions.filter((c) => c.status === key).length}
                    </Box>
                  )}
                </Button>
              )
            })}
          </Flex>

          {/* Error */}
          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="14px">{error}</Text>
            </Box>
          )}

          {/* Table */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {loading ? (
              <Flex flexDir="column" gap="12px" p="20px">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h="48px" borderRadius="8px" />)}
              </Flex>
            ) : rows.length === 0 ? (
              <Flex align="center" justify="center" py="48px" flexDir="column" gap="8px">
                <LuBanknote size={32} color="#CBD5E1" />
                <Text color="#94A3B8" fontSize="14px">Tidak ada data komisi</Text>
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="#F8FAFC">
                      {["NASABAH", "NO. POLIS", "PRODUK", "PENANGGUNG", "KOMISI", "DITERIMA", "STATUS", "AKSI"].map((h) => (
                        <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((c) => (
                      <Table.Row key={c.commission_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>

                        {/* Nasabah */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{c.customer_name ?? "—"}</Text>
                          {c.coverage_start && (
                            <Text color="#94A3B8" fontSize="11px" mt="1px">
                              {formatDate(c.coverage_start)} – {c.coverage_end ? formatDate(c.coverage_end) : ""}
                            </Text>
                          )}
                        </Table.Cell>

                        {/* No. Polis */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#64748B" fontSize="12px" fontFamily="mono">{c.policy_number ?? "—"}</Text>
                        </Table.Cell>

                        {/* Produk */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#64748B" fontSize="12px">
                            {c.product_type ? (PRODUCT_LABELS[c.product_type] ?? c.product_type) : "—"}
                          </Text>
                        </Table.Cell>

                        {/* Penanggung */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#1C2833" fontSize="13px">{c.insurer_short_name ?? c.insurer_name ?? "—"}</Text>
                        </Table.Cell>

                        {/* Komisi */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{formatRp(c.expected_amount)}</Text>
                          <Text color="#94A3B8" fontSize="11px" mt="1px">Rate: {Number(c.commission_rate).toFixed(1)}%</Text>
                        </Table.Cell>

                        {/* Diterima */}
                        <Table.Cell px="16px" py="12px">
                          {c.received_amount > 0 ? (
                            <>
                              <Text color="#16A34A" fontSize="13px" fontWeight="semibold">{formatRp(c.received_amount)}</Text>
                              {c.received_date && (
                                <Text color="#94A3B8" fontSize="11px" mt="1px">{formatDate(c.received_date)}</Text>
                              )}
                            </>
                          ) : (
                            <Text color="#94A3B8" fontSize="12px">—</Text>
                          )}
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell px="16px" py="12px">
                          <StatusBadge status={c.status} />
                        </Table.Cell>

                        {/* Aksi */}
                        <Table.Cell px="16px" py="12px">
                          <Flex gap="6px">
                            {(c.status === "pending" || c.status === "discrepancy") && (
                              <Button size="sm" bg="#1A3557" color="white" fontSize="12px"
                                fontWeight="semibold" borderRadius="8px" px="12px"
                                onClick={() => openMark(c)}>
                                Tandai Diterima
                              </Button>
                            )}
                            <Button size="sm" variant="outline" borderColor="#E2E8F0"
                              color="#374151" fontSize="12px" borderRadius="8px" px="12px"
                              onClick={() => router.push(`/agentra/policies/${c.policy_id}`)}>
                              Lihat Polis
                            </Button>
                          </Flex>
                        </Table.Cell>

                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Box>

        </Flex>
      </Box>

      <MobileBottomNav />

      {/* Mark Received Dialog */}
      <Dialog.Root open={markDialog} onOpenChange={(d) => setMarkDialog(d.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="480px" borderRadius="16px" p="0" overflow="hidden">

            <Dialog.Header bg="#F8FAFC" borderBottom="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
              <Flex justify="space-between" align="center">
                <Flex flexDir="column" gap="2px">
                  <Dialog.Title fontSize="16px" color="#1C2833" fontWeight="bold">Tandai Komisi Diterima</Dialog.Title>
                  {selected && (
                    <Text fontSize="12px" color="#64748B">{selected.customer_name} · {selected.policy_number}</Text>
                  )}
                </Flex>
                <Dialog.CloseTrigger asChild>
                  <Button size="sm" variant="ghost" color="#64748B" borderRadius="8px" px="8px">
                    <LuX size={16} />
                  </Button>
                </Dialog.CloseTrigger>
              </Flex>
            </Dialog.Header>

            <Dialog.Body px="24px" py="20px">
              <Flex flexDir="column" gap="16px">

                {/* Expected amount info */}
                {selected && (
                  <Box bg="#EFF6FF" borderRadius="10px" p="12px" border="1px solid" borderColor="#BFDBFE">
                    <Text fontSize="12px" color="#1D4ED8" fontWeight="semibold" mb="4px">Komisi Diharapkan</Text>
                    <Text fontSize="18px" color="#1D4ED8" fontWeight="bold">{formatRp(selected.expected_amount)}</Text>
                    <Text fontSize="11px" color="#64748B" mt="2px">
                      Premi {formatRp(selected.premium_amount)} × Rate {Number(selected.commission_rate).toFixed(1)}%
                    </Text>
                  </Box>
                )}

                {/* received_amount */}
                <Field.Root required>
                  <Field.Label fontSize="13px" color="#374151" fontWeight="semibold">
                    Jumlah Diterima (Rp) <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    type="text" inputMode="numeric"
                    placeholder="5.000.000"
                    fontSize="14px" borderRadius="8px" borderColor="#E2E8F0"
                    value={formatIDR(markForm.received_amount)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      setMarkForm((f) => ({ ...f, received_amount: raw }))
                    }}
                  />
                </Field.Root>

                {/* received_date */}
                <Field.Root>
                  <Field.Label fontSize="13px" color="#374151" fontWeight="semibold">Tanggal Diterima</Field.Label>
                  <Input
                    type="date" fontSize="14px" borderRadius="8px" borderColor="#E2E8F0"
                    value={markForm.received_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMarkForm((f) => ({ ...f, received_date: e.target.value }))
                    }
                  />
                </Field.Root>

                {/* reference_number */}
                <Field.Root>
                  <Field.Label fontSize="13px" color="#374151" fontWeight="semibold">No. Referensi / Bukti Transfer</Field.Label>
                  <Input
                    placeholder="INV/2025/06/001" fontSize="14px" borderRadius="8px" borderColor="#E2E8F0"
                    value={markForm.reference_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMarkForm((f) => ({ ...f, reference_number: e.target.value }))
                    }
                  />
                </Field.Root>

                {/* discrepancy_notes */}
                <Field.Root>
                  <Field.Label fontSize="13px" color="#374151" fontWeight="semibold">Catatan Selisih (opsional)</Field.Label>
                  <Textarea
                    placeholder="Contoh: Penanggung memotong biaya admin Rp 50.000"
                    fontSize="14px" borderRadius="8px" borderColor="#E2E8F0" rows={2}
                    value={markForm.discrepancy_notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMarkForm((f) => ({ ...f, discrepancy_notes: e.target.value }))
                    }
                  />
                </Field.Root>

                {markError && (
                  <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" p="10px">
                    <Text color="#DC2626" fontSize="13px">{markError}</Text>
                  </Box>
                )}

              </Flex>
            </Dialog.Body>

            <Dialog.Footer borderTop="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
              <Flex justify="flex-end" gap="10px">
                <Button variant="outline" borderColor="#E2E8F0" color="#374151" borderRadius="8px"
                  onClick={() => setMarkDialog(false)} disabled={submitting}>
                  Batal
                </Button>
                <Button bg="#1A3557" color="white" borderRadius="8px" px="20px"
                  loading={submitting} loadingText="Menyimpan..." onClick={submitMark}>
                  Simpan
                </Button>
              </Flex>
            </Dialog.Footer>

          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

    </Box>
  )
}
