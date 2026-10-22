"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Badge, Box, Button, Dialog, Field, Flex, Grid, Input, Skeleton, Table, Text, Textarea,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LuSearch, LuX, LuDownload, LuReceipt, LuCircleCheck, LuClock, LuTriangleAlert, LuBanknote,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import {
  getCommissions, getCommissionSummary, markCommissionReceived,
  type ApiCommission, type CommissionStatus, type CommissionSummaryResponse,
} from "@/lib/api/commissions"
import { errorMessage, errorStatus, saveBlob } from "@/lib/api/client"
import { exportReport } from "@/lib/api/reports"
import { localISODate, localMonth } from "@/lib/format"
import { MonthPickerButton } from "@/components/ui/month-picker"
import { SearchSelect } from "@/components/ui/search-select"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { getMasterProducts, type ApiMasterProduct } from "@/lib/api/master-products"

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatIDR(raw: string): string {
  return raw.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function todayISO(): string {
  return localISODate()
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
  color: "#64748B", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px",
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CommissionStatus }) {
  const { label, bg, color, Icon } = STATUS_META[status] ?? STATUS_META.pending
  return (
    <Badge display="flex" alignItems="center" gap="4px" px="8px" py="3px" borderRadius="full" fontSize="14px" fontWeight="semibold" bg={bg} color={color}>
      <Icon size={11} />
      {label}
    </Badge>
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
  const [month, setMonth]         = useState(() => localMonth())
  const [query, setQuery]         = useState("")
  const [statusFilter, setStatus] = useState<StatusFilter>("all")
  const [insurerId, setInsurerId] = useState("")
  const [productType, setProductType] = useState("")
  const [insurers, setInsurers]   = useState<ApiInsurer[]>([])
  const [products, setProducts]   = useState<ApiMasterProduct[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  // Tagged with the request it answers so `loading` is derived and stale months are ignored.
  const [result, setResult] = useState<{ key: string; commissions: ApiCommission[]; summary: CommissionSummaryResponse | null; error: string | null } | null>(null)

  const [markDialog, setMarkDialog]   = useState(false)
  const [selected, setSelected]       = useState<ApiCommission | null>(null)
  const [markForm, setMarkForm]       = useState<MarkFormState>(emptyMarkForm())
  const [submitting, setSubmitting]   = useState(false)
  const [markError, setMarkError]     = useState<string | null>(null)

  // ── load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getInsurers(token).then(setInsurers).catch(() => {})
    getMasterProducts(token).then(setProducts).catch(() => {})
  }, [])

  const queryKey = `${month}|${insurerId}|${productType}|${reloadKey}`

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    const key = `${month}|${insurerId}|${productType}|${reloadKey}`
    const filters = {
      month,
      ...(insurerId ? { insurer_id: insurerId } : {}),
      ...(productType ? { product_type: productType } : {}),
    }
    let cancelled = false
    Promise.all([
      getCommissions(token, { ...filters, limit: 100 }),
      getCommissionSummary(token, filters),
    ])
      .then(([listRes, sumRes]) => {
        if (!cancelled) setResult({ key, commissions: listRes.data ?? [], summary: sumRes, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled && errorStatus(err) !== 401) {
          setResult({ key, commissions: [], summary: null, error: errorMessage(err, "Komisi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
        }
      })
    return () => { cancelled = true }
  }, [month, insurerId, productType, reloadKey, router])

  const loading     = result?.key !== queryKey
  const commissions = loading ? [] : result?.commissions ?? []
  const summary     = loading ? null : result?.summary ?? null
  const error       = loading ? null : result?.error ?? null

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

  async function handleExport() {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setExporting(true)
    setExportError(null)
    try {
      const { blob, filename } = await exportReport(token, "commission-list", {
        month,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(insurerId ? { insurer_id: insurerId } : {}),
        ...(productType ? { product_type: productType } : {}),
      })
      saveBlob(blob, filename)
    } catch (err: unknown) {
      setExportError(errorMessage(err, "Gagal mengekspor komisi"))
    } finally {
      setExporting(false)
    }
  }

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
      setReloadKey((k) => k + 1)
    } catch (err: unknown) {
      setMarkError(errorMessage(err, "Gagal menyimpan. Coba lagi."))
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

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Commissions" />
        </Box>

        <Flex flexDir="column" gap="24px" p={{ base: "16px", md: "32px" }}>

          {/* Heading */}
          <Flex flexDir="column" gap="4px">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Manajemen Komisi</Text>
            <Text color="#5D6D7E" fontSize="16px">
              Pantau dan catat komisi yang diterima dari penanggung untuk setiap polis.
            </Text>
          </Flex>

          {/* Summary cards */}
          {loading ? (
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap="16px">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="90px" borderRadius="12px" />)}
            </Grid>
          ) : summary && (
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap="16px">
              {summaryCards.map(({ label, value, sub, accent, bg, Icon }) => (
                <Box key={label} minW="0" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="16px">
                  <Flex align="center" gap="8px" mb="8px">
                    <Box p="6px" borderRadius="8px" bg={bg}>
                      <Icon size={14} color={accent} />
                    </Box>
                    <Text fontSize="14px" fontWeight="bold" color={accent} letterSpacing="0.04em">{label.toUpperCase()}</Text>
                  </Flex>
                  <Text color="#1C2833" fontSize="18px" fontWeight="bold">{value}</Text>
                  <Text color="#64748B" fontSize="14px" mt="2px">{sub}</Text>
                </Box>
              ))}
            </Grid>
          )}

          {/* Filters */}
          <Flex gap="12px" align={{ base: "stretch", md: "center" }} flexDir={{ base: "column", md: "row" }} flexWrap="wrap">
            <Flex flex="1" minW={{ base: "0", md: "200px" }} align="center" gap="10px" bg="white" border="1px solid"
              borderColor="#E2E8F0" borderRadius="10px" px="14px" py="10px">
              <LuSearch size={15} color="#64748B" />
              <Input flex="1" outline="none" border="none" fontSize="16px" color="#1C2833"
                placeholder="Cari nasabah atau no. polis..."
                aria-label="Cari komisi"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                style={{ background: "transparent" }} />
            </Flex>
            <MonthPickerButton month={month} onChange={setMonth} />
            <Box minW={{ base: "0", md: "180px" }} w={{ base: "100%", md: "auto" }}>
              <SearchSelect value={insurerId} onChange={setInsurerId} clearable height="40px" fontSize="16px"
                ariaLabel="Filter penanggung" placeholder="Semua penanggung"
                options={insurers.map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))} />
            </Box>
            <Box minW={{ base: "0", md: "180px" }} w={{ base: "100%", md: "auto" }}>
              <SearchSelect value={productType} onChange={setProductType} clearable height="40px" fontSize="16px"
                ariaLabel="Filter produk" placeholder="Semua produk"
                options={products.map((p) => ({ value: p.product_code, label: p.product_name }))} />
            </Box>
            <Button size="sm" w={{ base: "100%", md: "auto" }} variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px" gap="6px"
              onClick={handleExport} loading={exporting}>
              <LuDownload size={13} /> Excel
            </Button>
            <Button size="sm" w={{ base: "100%", md: "auto" }} bg="#1A3557" color="white" fontSize="16px" gap="6px"
              onClick={() => router.push("/agentra/commissions/statements")}>
              <LuReceipt size={13} /> Rekonsiliasi Statement
            </Button>
          </Flex>

          {exportError && <Text color="#DC2626" fontSize="16px" role="alert">{exportError}</Text>}

          {/* Status tabs */}
          <Flex gap="8px" flexWrap="wrap">
            {statusTabs.map(({ key, label }) => {
              const active = statusFilter === key
              return (
                <Button key={key} size="sm" onClick={() => setStatus(key)} aria-pressed={active}
                  bg={active ? "#1A3557" : "white"}
                  color={active ? "white" : "#374151"}
                  border="1px solid" borderColor={active ? "#1A3557" : "#E2E8F0"}
                  borderRadius="8px" fontSize="14px" fontWeight={active ? "semibold" : "normal"}
                  px="14px">
                  {label}
                  {key !== "all" && summary && (
                    <Box as="span" ml="6px" px="5px" py="1px" borderRadius="full" fontSize="14px"
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
              <Text color="#DC2626" fontSize="16px">{error}</Text>
            </Box>
          )}

          {/* Table */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {loading ? (
              <Flex flexDir="column" gap="12px" p="20px">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h="48px" borderRadius="8px" />)}
              </Flex>
            ) : rows.length === 0 ? (
              <Flex align="center" justify="center" py={{ base: "56px", md: "64px" }} px="24px" flexDir="column" gap="12px" textAlign="center">
                <Flex align="center" justify="center" w="72px" h="72px" borderRadius="full" bg="#EFF6FF" border="8px solid" borderColor="#F8FAFC">
                  <LuBanknote size={30} color="#1D4ED8" aria-hidden="true" />
                </Flex>
                <Text color="#1C2833" fontSize="18px" fontWeight="bold">Belum ada komisi</Text>
                <Text color="#64748B" fontSize="15px" maxW="320px">
                  Belum ada komisi pada bulan ini. Komisi muncul otomatis setelah polis dibayar.
                </Text>
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
                          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{c.customer_name ?? "—"}</Text>
                          {c.coverage_start && (
                            <Text color="#64748B" fontSize="14px" mt="1px">
                              {formatDate(c.coverage_start)} – {c.coverage_end ? formatDate(c.coverage_end) : ""}
                            </Text>
                          )}
                        </Table.Cell>

                        {/* No. Polis */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#64748B" fontSize="14px" fontFamily="mono">{c.policy_number ?? "—"}</Text>
                        </Table.Cell>

                        {/* Produk */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#64748B" fontSize="14px">
                            {c.product_type ? (PRODUCT_LABELS[c.product_type] ?? c.product_type) : "—"}
                          </Text>
                        </Table.Cell>

                        {/* Penanggung */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#1C2833" fontSize="15px">{c.insurer_short_name ?? c.insurer_name ?? "—"}</Text>
                        </Table.Cell>

                        {/* Komisi */}
                        <Table.Cell px="16px" py="12px">
                          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{formatRp(c.expected_amount)}</Text>
                          {c.commission_tax_amount != null && c.commission_tax_amount > 0 ? (
                            <>
                              <Text color="#DC2626" fontSize="14px" mt="1px">PPh: −{formatRp(c.commission_tax_amount)}</Text>
                              <Text color="#16A34A" fontSize="14px" fontWeight="semibold">Net: {formatRp(c.net_expected_amount ?? 0)}</Text>
                            </>
                          ) : (
                            <Text color="#64748B" fontSize="14px" mt="1px">Rate: {Number(c.commission_rate).toFixed(1)}%</Text>
                          )}
                        </Table.Cell>

                        {/* Diterima */}
                        <Table.Cell px="16px" py="12px">
                          {c.received_amount > 0 ? (
                            <>
                              <Text color="#16A34A" fontSize="15px" fontWeight="semibold">{formatRp(c.received_amount)}</Text>
                              {c.received_date && (
                                <Text color="#64748B" fontSize="14px" mt="1px">{formatDate(c.received_date)}</Text>
                              )}
                            </>
                          ) : (
                            <Text color="#64748B" fontSize="14px">—</Text>
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
                              <Button size="sm" bg="#1A3557" color="white" fontSize="14px"
                                fontWeight="semibold" borderRadius="8px" px="12px"
                                onClick={() => openMark(c)}>
                                Tandai Diterima
                              </Button>
                            )}
                            <Button size="sm" variant="outline" borderColor="#E2E8F0"
                              color="#374151" fontSize="14px" borderRadius="8px" px="12px"
                              onClick={() => router.push(`/agentra/policies/${encodeURIComponent(c.policy_id)}`)}>
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
                    <Text fontSize="14px" color="#64748B">{selected.customer_name} · {selected.policy_number}</Text>
                  )}
                </Flex>
                <Dialog.CloseTrigger asChild>
                  <Button size="sm" variant="ghost" color="#64748B" borderRadius="8px" px="8px" aria-label="Tutup">
                    <LuX size={16} />
                  </Button>
                </Dialog.CloseTrigger>
              </Flex>
            </Dialog.Header>

            <Dialog.Body px="24px" py="20px">
              <Flex flexDir="column" gap="16px">

                {/* Expected amount breakdown */}
                {selected && (
                  <Box bg="#EFF6FF" borderRadius="10px" p="12px" border="1px solid" borderColor="#BFDBFE">
                    <Text fontSize="14px" color="#1D4ED8" fontWeight="semibold" mb="8px">Rincian Komisi</Text>
                    <Flex justify="space-between" align="center" mb="4px">
                      <Text fontSize="14px" color="#64748B">Gross ({Number(selected.commission_rate).toFixed(1)}%)</Text>
                      <Text fontSize="16px" color="#1D4ED8" fontWeight="semibold">{formatRp(selected.expected_amount)}</Text>
                    </Flex>
                    {selected.commission_tax_amount != null && selected.commission_tax_amount > 0 && (
                      <Flex justify="space-between" align="center" mb="4px">
                        <Text fontSize="14px" color="#64748B">PPh ({((selected.commission_tax_rate ?? 0) * 100).toFixed(1)}%)</Text>
                        <Text fontSize="15px" color="#DC2626">−{formatRp(selected.commission_tax_amount)}</Text>
                      </Flex>
                    )}
                    <Box borderTop="1px solid" borderColor="#BFDBFE" pt="6px" mt="4px">
                      <Flex justify="space-between" align="center">
                        <Text fontSize="14px" color="#1D4ED8" fontWeight="bold">Net (yang diterima)</Text>
                        <Text fontSize="16px" color="#1D4ED8" fontWeight="bold">
                          {formatRp(selected.net_expected_amount ?? selected.expected_amount)}
                        </Text>
                      </Flex>
                    </Box>
                  </Box>
                )}

                {/* received_amount */}
                <Field.Root required>
                  <Field.Label fontSize="15px" color="#374151" fontWeight="semibold">
                    Jumlah Diterima (Rp) <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    type="text" inputMode="numeric"
                    placeholder="5.000.000"
                    fontSize="16px" borderRadius="8px" borderColor="#E2E8F0"
                    value={formatIDR(markForm.received_amount)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      setMarkForm((f) => ({ ...f, received_amount: raw }))
                    }}
                  />
                </Field.Root>

                {/* received_date */}
                <Field.Root>
                  <Field.Label fontSize="15px" color="#374151" fontWeight="semibold">Tanggal Diterima</Field.Label>
                  <Input
                    type="date" fontSize="16px" borderRadius="8px" borderColor="#E2E8F0"
                    value={markForm.received_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMarkForm((f) => ({ ...f, received_date: e.target.value }))
                    }
                  />
                </Field.Root>

                {/* reference_number */}
                <Field.Root>
                  <Field.Label fontSize="15px" color="#374151" fontWeight="semibold">No. Referensi / Bukti Transfer</Field.Label>
                  <Input
                    placeholder="INV/2025/06/001" fontSize="16px" borderRadius="8px" borderColor="#E2E8F0"
                    value={markForm.reference_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMarkForm((f) => ({ ...f, reference_number: e.target.value }))
                    }
                  />
                </Field.Root>

                {/* discrepancy_notes */}
                <Field.Root>
                  <Field.Label fontSize="15px" color="#374151" fontWeight="semibold">Catatan Selisih (opsional)</Field.Label>
                  <Textarea
                    placeholder="Contoh: Penanggung memotong biaya admin Rp 50.000"
                    fontSize="16px" borderRadius="8px" borderColor="#E2E8F0" rows={2}
                    value={markForm.discrepancy_notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMarkForm((f) => ({ ...f, discrepancy_notes: e.target.value }))
                    }
                  />
                </Field.Root>

                {markError && (
                  <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" p="10px">
                    <Text color="#DC2626" fontSize="15px">{markError}</Text>
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
