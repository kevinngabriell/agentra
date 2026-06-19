"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Avatar, Badge, Box, Button, Dialog, Flex, IconButton, Input, NativeSelect, Skeleton, Table, Text } from "@chakra-ui/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  LuArrowLeft, LuPencil, LuCalendar, LuCreditCard, LuMessageSquare,
  LuPhone, LuMail, LuFileText, LuUser, LuCircleCheck, LuTrash2, LuPlus,
  LuHistory, LuRefreshCw, LuClipboard,
} from "react-icons/lu"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import {
  getPolicyDetail, updateRenewalStatus, updatePaymentStatus, addPolicyFollowUp,
  updatePolicy, directUpdatePolicy, deletePolicy, getPolicyLogs,
  getCoverages, addCoverage, updateCoverage, deleteCoverage,
  getCoassurance,
  type ApiPolicyDetail, type ApiFollowUp, type ApiPolicyLog,
  type ApiCoverageItem, type ApiCoverageType, COVERAGE_TYPE_LABELS,
  type ApiCoassurance,
} from "@/lib/api/policies"

const PRODUCT_LABELS: Record<string, string> = {
  fire:        "Asuransi Kebakaran",
  motorcycle:  "Asuransi Motor",
  car:         "Asuransi Kendaraan",
  travel:      "Asuransi Perjalanan",
  cargo:       "Asuransi Kargo",
  other:       "Asuransi Lainnya",
  kecelakaan:  "Asuransi Kecelakaan",
  aep:         "AEP",
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  call:      "Telepon",
  whatsapp:  "WhatsApp",
  email:     "Email",
  visit:     "Kunjungan",
  other:     "Lainnya",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) +
    ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function fmt(n: number) {
  return "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function formatIDR(raw: string): string {
  return raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

const lbl = { color: "#94A3B8", fontSize: "11px", fontWeight: "semibold", letterSpacing: "0.05em" } as const

function ActionIcon({ type }: { type?: string }) {
  if (type === "call") return <LuPhone size={14} />
  if (type === "email") return <LuMail size={14} />
  return <LuMessageSquare size={14} />
}

const LOG_EVENT: Record<string, { label: string; bg: string; color: string }> = {
  policy_created:          { label: "Polis Dibuat",        bg: "#DCFCE7", color: "#16A34A" },
  policy_updated:          { label: "Polis Diperbarui",    bg: "#DBEAFE", color: "#1D4ED8" },
  endorsement:             { label: "Endosemen",           bg: "#FEF3C7", color: "#D97706" },
  payment_status_changed:  { label: "Status Pembayaran",   bg: "#CFFAFE", color: "#0891B2" },
  renewal_status_changed:  { label: "Status Perpanjangan", bg: "#EDE9FE", color: "#7C3AED" },
  followup_logged:         { label: "Follow-up",           bg: "#F1F5F9", color: "#64748B" },
}

function LogIcon({ type }: { type: string }) {
  if (type === "policy_created")         return <LuFileText size={14} />
  if (type === "policy_updated")         return <LuPencil size={14} />
  if (type === "endorsement")            return <LuClipboard size={14} />
  if (type === "payment_status_changed") return <LuCreditCard size={14} />
  if (type === "renewal_status_changed") return <LuRefreshCw size={14} />
  return <LuMessageSquare size={14} />
}

export default function PolicyDetail() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [policy, setPolicy]   = useState<ApiPolicyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Coverage state
  const [coverages, setCoverages]           = useState<ApiCoverageItem[]>([])
  const [coverageTotals, setCoverageTotals] = useState({ total_sum_insured: 0, total_premium: 0 })
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [covDialog, setCovDialog]           = useState<{ open: boolean; editing: ApiCoverageItem | null }>({ open: false, editing: null })
  const [covForm, setCovForm]               = useState({ coverage_type: 'bangunan' as ApiCoverageType, coverage_label: '', sum_insured: '', rate_permille: '', count_in_tsi: true })
  const [covSaving, setCovSaving]           = useState(false)
  const [covError, setCovError]             = useState<string | null>(null)
  const [covToDelete, setCovToDelete]       = useState<ApiCoverageItem | null>(null)
  const [covDeleting, setCovDeleting]       = useState(false)

  // Co-assurance state
  const [coassurances, setCoassurances]     = useState<ApiCoassurance[]>([])
  const [caLoading, setCaLoading]           = useState(false)

  // Logs state
  const [logs, setLogs]               = useState<ApiPolicyLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Koreksi (direct update / PATCH) dialog state
  const [koreksiDialog, setKoreksiDialog] = useState(false)
  const [koreksiKey, setKoreksiKey]       = useState(0)
  const [koreksiFo, setKoreksiFo]         = useState({
    sum_insured: '', premium_amount: '', materai_amount: '',
    biaya_polis: '', diskon: '',
    commission_rate: '', commission_tax_rate: '',
    coverage_end: '', object_insured: '', coverage_notes: '', notes: '',
    construction_class: '',
  })
  const [koreksiSaving, setKoreksiSaving] = useState(false)
  const [koreksiyError, setKoreksiyError] = useState<string | null>(null)

  // Delete dialog state
  const [deleteDialog, setDeleteDialog]   = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  // Endorsement dialog state
  const [endorseDialog, setEndorseDialog] = useState(false)
  const [endorseForm, setEndorseForm]     = useState({
    sum_insured: '', premium_amount: '', materai_amount: '',
    biaya_polis: '', diskon: '',
    commission_rate: '', commission_tax_rate: '',
    coverage_end: '', object_insured: '', coverage_notes: '', notes: '',
    construction_class: '',
  })
  const [endorseSaving, setEndorseSaving] = useState(false)
  const [endorseError, setEndorseError]   = useState<string | null>(null)

  // Must be before early returns — hooks cannot be called conditionally
  const previewPremium = useMemo(() => {
    const s = Number(covForm.sum_insured)
    const r = Number(covForm.rate_permille)
    return (s > 0 && r > 0) ? Math.round(s * r / 1000) : null
  }, [covForm.sum_insured, covForm.rate_permille])

  // Auto-recalculate Nilai & Periode from coverage totals whenever coverages change inside the endorsement dialog
  useEffect(() => {
    if (!endorseDialog || coverages.length === 0) return
    setEndorseForm((f) => ({
      ...f,
      sum_insured: String(coverageTotals.total_sum_insured),
      premium_amount: String(coverageTotals.total_premium),
    }))
  }, [coverageTotals, endorseDialog])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    setLoading(true)
    setError(null)
    getPolicyDetail(token, id)
      .then((p) => {
        setPolicy(p)
        if (p.is_coassurance) loadCoassurance()
      })
      .catch((err) => setError(err.message ?? "Gagal memuat detail polis"))
      .finally(() => setLoading(false))

    loadCoverages()
    loadLogs()
  }, [id])

  async function loadCoassurance() {
    const token = getAccessToken()
    if (!token) return
    setCaLoading(true)
    try {
      const res = await getCoassurance(token, id)
      setCoassurances(Array.isArray(res.data) ? res.data : [])
    } catch {}
    finally { setCaLoading(false) }
  }

  async function markRenewed() {
    const token = getAccessToken()
    if (!token || !policy) return
    setActionLoading("renewed")
    try {
      await updateRenewalStatus(token, policy.policy_id, "renewed")
      setPolicy((p) => p ? { ...p, renewal_status: "renewed" } : p)
      loadLogs()
    } catch {}
    setActionLoading(null)
  }

  async function recordPayment() {
    const token = getAccessToken()
    if (!token || !policy) return
    setActionLoading("payment")
    try {
      await updatePaymentStatus(token, policy.policy_id, "paid")
      setPolicy((p) => p ? { ...p, payment_status: "paid" } : p)
      loadLogs()
    } catch {}
    setActionLoading(null)
  }

  async function logFollowUp() {
    const token = getAccessToken()
    if (!token || !policy) return
    setActionLoading("followup")
    try {
      const result = await addPolicyFollowUp(token, policy.policy_id, {
        action_type: "whatsapp",
        notes: "Follow-up via WhatsApp",
      })
      const newFollowUp: ApiFollowUp = {
        follow_up_id: result.follow_up_id,
        follow_up_date: new Date().toISOString().split("T")[0],
        action_type: "whatsapp",
        notes: "Follow-up via WhatsApp",
        created_at: new Date().toISOString(),
      }
      setPolicy((p) => p ? { ...p, follow_ups: [newFollowUp, ...(p.follow_ups ?? [])] } : p)
      loadLogs()
    } catch {}
    setActionLoading(null)
  }

  // ── Logs ─────────────────────────────────────────────────────────────────

  async function loadLogs() {
    const token = getAccessToken()
    if (!token) return
    setLogsLoading(true)
    try {
      const data = await getPolicyLogs(token, id)
      setLogs(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLogsLoading(false) }
  }

  // ── Endorsement ───────────────────────────────────────────────────────────

  function openEndorseDialog() {
    if (!policy) return
    setEndorseForm({
      sum_insured:         String(policy.sum_insured),
      premium_amount:      String(policy.premium_amount),
      materai_amount:      String(policy.materai_amount ?? 0),
      biaya_polis:         String(policy.biaya_polis ?? 0),
      diskon:              String(policy.diskon ?? 0),
      commission_rate:     String(policy.commission_rate),
      commission_tax_rate: String((policy.commission_tax_rate ?? 0) * 100),
      coverage_end:        policy.coverage_end,
      object_insured:      policy.object_insured ?? '',
      coverage_notes:      policy.coverage_notes ?? '',
      notes:               '',
      construction_class:  policy.construction_class ?? '',
    })
    setEndorseError(null)
    setEndorseDialog(true)
  }

  async function handleEndorse() {
    const token = getAccessToken()
    if (!token || !policy) return
    setEndorseSaving(true)
    setEndorseError(null)
    try {
      const taxRatePct = parseFloat(endorseForm.commission_tax_rate) || 0
      const isFireProduct = new Set(["fire", "kebakaran"]).has(policy.product_type)
      await updatePolicy(token, policy.policy_id, {
        sum_insured:         Number(endorseForm.sum_insured),
        premium_amount:      Number(endorseForm.premium_amount),
        materai_amount:      Number(endorseForm.materai_amount) || undefined,
        biaya_polis:         Number(endorseForm.biaya_polis) || undefined,
        diskon:              Number(endorseForm.diskon) || undefined,
        commission_rate:     Number(endorseForm.commission_rate),
        commission_tax_rate: taxRatePct > 0 ? taxRatePct / 100 : undefined,
        construction_class:  isFireProduct
          ? (endorseForm.construction_class as "I" | "II" | "III" | null) || null
          : null,
        coverage_end:        endorseForm.coverage_end,
        object_insured:      endorseForm.object_insured || undefined,
        coverage_notes:      endorseForm.coverage_notes || undefined,
        notes:               endorseForm.notes || undefined,
      })
      const updated = await getPolicyDetail(token, id)
      setPolicy(updated)
      await loadLogs()
      setEndorseDialog(false)
    } catch (err: any) {
      setEndorseError(err.message ?? 'Gagal menyimpan endosemen')
    } finally {
      setEndorseSaving(false)
    }
  }

  // ── Koreksi (direct update without endorsement) ───────────────────────────

  function openKoreksiDialog() {
    if (!policy) return
    setKoreksiFo({
      sum_insured:         String(policy.sum_insured),
      premium_amount:      String(policy.premium_amount),
      materai_amount:      String(policy.materai_amount ?? 0),
      biaya_polis:         String(policy.biaya_polis ?? 0),
      diskon:              String(policy.diskon ?? 0),
      commission_rate:     String(policy.commission_rate),
      commission_tax_rate: String((policy.commission_tax_rate ?? 0) * 100),
      coverage_end:        policy.coverage_end,
      object_insured:      policy.object_insured ?? '',
      coverage_notes:      policy.coverage_notes ?? '',
      notes:               '',
      construction_class:  policy.construction_class ?? '',
    })
    setKoreksiyError(null)
    setKoreksiKey(k => k + 1)
    setKoreksiDialog(true)
  }

  async function handleKoreksi() {
    const token = getAccessToken()
    if (!token || !policy) return
    setKoreksiSaving(true)
    setKoreksiyError(null)
    try {
      const taxRatePct = parseFloat(koreksiFo.commission_tax_rate) || 0
      const isFireProduct = new Set(["fire", "kebakaran"]).has(policy.product_type)
      await directUpdatePolicy(token, policy.policy_id, {
        sum_insured:         Number(koreksiFo.sum_insured),
        premium_amount:      Number(koreksiFo.premium_amount),
        materai_amount:      Number(koreksiFo.materai_amount) || undefined,
        biaya_polis:         Number(koreksiFo.biaya_polis) || undefined,
        diskon:              Number(koreksiFo.diskon) || undefined,
        commission_rate:     Number(koreksiFo.commission_rate),
        commission_tax_rate: taxRatePct > 0 ? taxRatePct / 100 : undefined,
        construction_class:  isFireProduct
          ? (koreksiFo.construction_class as "I" | "II" | "III" | null) || null
          : null,
        coverage_end:        koreksiFo.coverage_end,
        object_insured:      koreksiFo.object_insured || undefined,
        coverage_notes:      koreksiFo.coverage_notes || undefined,
        notes:               koreksiFo.notes || undefined,
      })
      const updated = await getPolicyDetail(token, id)
      setPolicy(updated)
      await loadLogs()
      setKoreksiDialog(false)
    } catch (err: any) {
      setKoreksiyError(err.message ?? 'Gagal menyimpan koreksi')
    } finally {
      setKoreksiSaving(false)
    }
  }

  // ── Delete policy ─────────────────────────────────────────────────────────

  async function handleDeletePolicy() {
    const token = getAccessToken()
    if (!token || !policy) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePolicy(token, policy.policy_id)
      router.push('/agentra/policies')
    } catch (err: any) {
      setDeleteError(err.message ?? 'Gagal menghapus polis')
      setDeleting(false)
    }
  }

  // ── Coverage helpers ──────────────────────────────────────────────────────

  async function loadCoverages() {
    const token = getAccessToken()
    if (!token) return
    setCoverageLoading(true)
    try {
      const data = await getCoverages(token, id)
      setCoverages(Array.isArray(data.items) ? data.items : [])
      setCoverageTotals({ total_sum_insured: data.total_sum_insured ?? 0, total_premium: data.total_premium ?? 0 })
    } catch {}
    finally { setCoverageLoading(false) }
  }

  async function handleSaveCoverage() {
    const token = getAccessToken()
    if (!token) return
    const sumInsured   = Number(covForm.sum_insured)
    const ratePermille = Number(covForm.rate_permille)
    if (!covForm.coverage_type || !covForm.sum_insured || !covForm.rate_permille || isNaN(sumInsured) || isNaN(ratePermille)) {
      setCovError('Kategori, Uang Pertanggungan, dan Rate wajib diisi')
      return
    }
    setCovSaving(true)
    setCovError(null)
    try {
      if (covDialog.editing) {
        await updateCoverage(token, id, covDialog.editing.coverage_id, {
          coverage_type:  covForm.coverage_type,
          coverage_label: covForm.coverage_label || undefined,
          sum_insured:    sumInsured,
          rate_permille:  ratePermille,
          count_in_tsi:   covForm.count_in_tsi,
        })
      } else {
        await addCoverage(token, id, {
          coverage_type:  covForm.coverage_type,
          coverage_label: covForm.coverage_label || undefined,
          sum_insured:    sumInsured,
          rate_permille:  ratePermille,
          count_in_tsi:   covForm.count_in_tsi,
        })
      }
      await loadCoverages()
      setCovDialog({ open: false, editing: null })
      setCovForm({ coverage_type: 'bangunan', coverage_label: '', sum_insured: '', rate_permille: '', count_in_tsi: true })
    } catch (err: any) {
      setCovError(err.message ?? 'Gagal menyimpan')
    } finally {
      setCovSaving(false)
    }
  }

  async function handleDeleteCoverage() {
    if (!covToDelete) return
    const token = getAccessToken()
    if (!token) return
    setCovDeleting(true)
    try {
      await deleteCoverage(token, id, covToDelete.coverage_id)
      await loadCoverages()
      setCovToDelete(null)
    } catch {}
    finally { setCovDeleting(false) }
  }

  const shell = (children: React.ReactNode) => (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar /><MobileHeader />
      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}><TopBar title="Detail Polis" /></Box>
        {children}
      </Box>
      <MobileBottomNav />

      {/* ── Add / Edit coverage dialog ───────────────────────────────────── */}
      <Dialog.Root
        open={covDialog.open}
        onOpenChange={(d) => { if (!d.open && !covSaving) { setCovDialog({ open: false, editing: null }); setCovError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
        <Dialog.Positioner zIndex={1501}>
          <Dialog.Content bg="white" borderRadius="12px" maxW="440px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                {covDialog.editing ? 'Edit Item Coverage' : 'Tambah Item Coverage'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Flex flexDir="column" gap="14px">

                <Flex flexDir="column" gap="4px">
                  <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">
                    Kategori <Text as="span" color="#DC2626">*</Text>
                  </Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                      fontSize="13px" color="#1C2833"
                      value={covForm.coverage_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setCovForm((f) => ({ ...f, coverage_type: e.target.value as ApiCoverageType }))
                      }
                    >
                      {(Object.entries(COVERAGE_TYPE_LABELS) as [ApiCoverageType, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Flex>

                <Flex flexDir="column" gap="4px">
                  <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Label (opsional)</Text>
                  <Input
                    bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                    fontSize="13px" color="#1C2833"
                    placeholder="Contoh: Stok 1, Bangunan Utama"
                    value={covForm.coverage_label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCovForm((f) => ({ ...f, coverage_label: e.target.value }))
                    }
                  />
                </Flex>

                <Flex flexDir="column" gap="4px">
                  <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">
                    Uang Pertanggungan (IDR) <Text as="span" color="#DC2626">*</Text>
                  </Text>
                  <Input
                    bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                    fontSize="13px" color="#1C2833"
                    type="text" inputMode="numeric" placeholder="500.000.000"
                    value={formatIDR(covForm.sum_insured)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setCovForm((f) => ({ ...f, sum_insured: raw }))
                    }}
                  />
                </Flex>

                <Flex flexDir="column" gap="4px">
                  <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">
                    Rate (‰) <Text as="span" color="#DC2626">*</Text>
                  </Text>
                  <Input
                    bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                    fontSize="13px" color="#1C2833"
                    type="number" min={0} step="0.0001" placeholder="2.28"
                    value={covForm.rate_permille}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCovForm((f) => ({ ...f, rate_permille: e.target.value }))
                    }
                  />
                  {previewPremium !== null && (
                    <Text fontSize="12px" color="#1D4ED8" fontWeight="medium">
                      Preview Premi: {fmt(previewPremium)}
                    </Text>
                  )}
                </Flex>

                <Flex
                  align="center" gap="10px" px="12px" py="10px"
                  borderRadius="8px" border="1px solid" borderColor="#E2E8F0"
                  cursor="pointer"
                  onClick={() => setCovForm(f => ({ ...f, count_in_tsi: !f.count_in_tsi }))}
                >
                  <Box
                    w="16px" h="16px" borderRadius="4px" flexShrink={0}
                    border="2px solid" borderColor={covForm.count_in_tsi ? "#1A3557" : "#CBD5E1"}
                    bg={covForm.count_in_tsi ? "#1A3557" : "white"}
                    display="flex" alignItems="center" justifyContent="center"
                  >
                    {covForm.count_in_tsi && <Box w="8px" h="8px" borderRadius="2px" bg="white" />}
                  </Box>
                  <Flex flexDir="column">
                    <Text fontSize="13px" color="#1C2833" fontWeight="medium">Hitung UP dalam Total TSI</Text>
                    <Text fontSize="11px" color="#64748B">
                      {covForm.count_in_tsi
                        ? "UP item ini menambah total uang pertanggungan polis"
                        : "Premi tetap dihitung, tapi UP tidak dihitung ganda (misal: klausula RSMD, OTHERS)"}
                    </Text>
                  </Flex>
                </Flex>

                {covError && (
                  <Text fontSize="12px" color="#DC2626">{covError}</Text>
                )}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="14px" borderRadius="8px" _hover={{ bg: "#F1F5F9" }}
                disabled={covSaving}
                onClick={() => { setCovDialog({ open: false, editing: null }); setCovError(null) }}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#1A3557" color="white" fontSize="14px" borderRadius="8px"
                loading={covSaving} loadingText="Menyimpan..."
                _hover={{ bg: "#162C47" }}
                onClick={handleSaveCoverage}
              >
                Simpan
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Endorsement dialog ───────────────────────────────────────────── */}
      <Dialog.Root
        open={endorseDialog}
        onOpenChange={(d) => { if (!d.open && !endorseSaving) { setEndorseDialog(false); setEndorseError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" maxW="800px" w="95vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0" borderBottom="1px solid" borderColor="#E2E8F0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold" pb="16px">
                Catat Endosemen
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body px="24px" py="20px" maxH="68vh" overflowY="auto">
              <Flex flexDir="column" gap="20px">

                {/* ── Item Pertanggungan ── */}
                <Box>
                  <Flex justify="space-between" align="center" mb="10px">
                    <Text fontSize="13px" fontWeight="semibold" color="#1C2833">Item Pertanggungan</Text>
                    <Button
                      size="xs" bg="#1A3557" color="white" fontSize="11px" gap="4px" borderRadius="6px"
                      _hover={{ bg: "#162C47" }}
                      onClick={() => {
                        setCovForm({ coverage_type: 'bangunan', coverage_label: '', sum_insured: '', rate_permille: '', count_in_tsi: true })
                        setCovError(null)
                        setCovDialog({ open: true, editing: null })
                      }}
                    >
                      <LuPlus size={10} /> Tambah Item
                    </Button>
                  </Flex>

                  <Box borderRadius="8px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                    {coverageLoading ? (
                      <Flex px="12px" py="16px" align="center" justify="center">
                        <Text color="#94A3B8" fontSize="13px">Memuat...</Text>
                      </Flex>
                    ) : coverages.length === 0 ? (
                      <Flex px="12px" py="20px" align="center" justify="center" flexDir="column" gap="6px">
                        <Text color="#94A3B8" fontSize="13px">Belum ada item pertanggungan.</Text>
                        <Text color="#94A3B8" fontSize="12px">Klik "+ Tambah Item" untuk menambahkan (bangunan, stok, mesin, dll).</Text>
                      </Flex>
                    ) : (
                      <>
                        <Flex px="12px" py="6px" gap="8px" bg="#F8FAFC" borderBottom="1px solid" borderColor="#E2E8F0">
                          <Text flex="1.5" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em">KATEGORI</Text>
                          <Text flex="1" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">UP (IDR)</Text>
                          <Text w="60px" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">RATE ‰</Text>
                          <Text w="90px" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">PREMI</Text>
                          <Box w="74px" />
                        </Flex>
                        {coverages.map((cov) => (
                          <Flex key={cov.coverage_id} px="12px" py="9px" gap="8px" align="center" borderBottom="1px solid" borderColor="#F1F5F9">
                            <Flex flexDir="column" flex="1.5" gap="1px">
                              <Text color="#1C2833" fontSize="12px">{COVERAGE_TYPE_LABELS[cov.coverage_type]}</Text>
                              {cov.coverage_label && <Text color="#94A3B8" fontSize="11px">{cov.coverage_label}</Text>}
                              {cov.count_in_tsi === 0 && (
                                <Text fontSize="10px" fontWeight="semibold" color="#92400E" bg="#FEF3C7" px="5px" py="1px" borderRadius="4px" w="fit-content">
                                  UP tidak dihitung
                                </Text>
                              )}
                            </Flex>
                            <Text flex="1" color="#64748B" fontSize="12px" fontFamily="mono" textAlign="right">
                              {fmt(cov.sum_insured)}
                            </Text>
                            <Text w="60px" color="#64748B" fontSize="12px" textAlign="right">
                              {parseFloat(cov.rate_permille)}‰
                            </Text>
                            <Text w="90px" color="#1C2833" fontSize="12px" fontWeight="medium" textAlign="right">
                              {fmt(cov.premium_amount)}
                            </Text>
                            <Flex w="74px" justify="flex-end" gap="2px">
                              <IconButton
                                size="xs" variant="ghost" aria-label="Edit"
                                color="#64748B" _hover={{ bg: "#EFF6FF", color: "#1D4ED8" }}
                                onClick={() => {
                                  setCovForm({
                                    coverage_type:  cov.coverage_type,
                                    coverage_label: cov.coverage_label ?? '',
                                    sum_insured:    String(cov.sum_insured),
                                    rate_permille:  String(parseFloat(cov.rate_permille)),
                                    count_in_tsi:   cov.count_in_tsi === 1,
                                  })
                                  setCovError(null)
                                  setCovDialog({ open: true, editing: cov })
                                }}
                              >
                                <LuPencil size={11} />
                              </IconButton>
                              <IconButton
                                size="xs" variant="ghost" aria-label="Hapus"
                                color="#94A3B8" _hover={{ bg: "#FEF2F2", color: "#DC2626" }}
                                onClick={() => setCovToDelete(cov)}
                              >
                                <LuTrash2 size={11} />
                              </IconButton>
                            </Flex>
                          </Flex>
                        ))}
                        <Flex px="12px" py="8px" justify="space-between" bg="#F8FAFC">
                          <Text color="#64748B" fontSize="12px" fontWeight="semibold">
                            Total UP: {fmt(coverageTotals.total_sum_insured)}
                          </Text>
                          <Text color="#1C2833" fontSize="12px" fontWeight="semibold">
                            Total Premi: {fmt(coverageTotals.total_premium)}
                          </Text>
                        </Flex>
                      </>
                    )}
                  </Box>
                </Box>

                <Box h="1px" bg="#E2E8F0" />

                {/* ── Nilai & Periode ── */}
                <Box>
                  <Text fontSize="13px" fontWeight="semibold" color="#1C2833" mb="12px">Nilai & Periode</Text>
                  <Flex gap="12px" mb="10px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Uang Pertanggungan (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(endorseForm.sum_insured)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setEndorseForm((f) => ({ ...f, sum_insured: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Premi (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(endorseForm.premium_amount)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setEndorseForm((f) => ({ ...f, premium_amount: raw }))
                        }}
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Materai (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(endorseForm.materai_amount)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setEndorseForm((f) => ({ ...f, materai_amount: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Akhir Perlindungan</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="date"
                        value={endorseForm.coverage_end}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, coverage_end: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Biaya Polis (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(endorseForm.biaya_polis)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setEndorseForm((f) => ({ ...f, biaya_polis: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Diskon (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(endorseForm.diskon)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setEndorseForm((f) => ({ ...f, diskon: raw }))
                        }}
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Komisi (%)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="number" min={0} max={100} step="0.1"
                        value={endorseForm.commission_rate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, commission_rate: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">PPh / Pajak (%)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="number" min={0} max={100} step="0.01"
                        value={endorseForm.commission_tax_rate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, commission_tax_rate: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                </Box>

                <Box h="1px" bg="#E2E8F0" />

                {/* ── Detail Objek & Keterangan ── */}
                <Box>
                  <Text fontSize="13px" fontWeight="semibold" color="#1C2833" mb="12px">Detail Objek & Keterangan</Text>
                  <Flex flexDir="column" gap="10px">
                    {policy != null && new Set(["fire", "kebakaran"]).has(policy.product_type) && (
                      <Flex flexDir="column" gap="4px">
                        <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Kelas Konstruksi Bangunan</Text>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                            fontSize="13px" color="#1C2833"
                            value={endorseForm.construction_class}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setEndorseForm((f) => ({ ...f, construction_class: e.target.value }))
                            }
                          >
                            <option value="">Tidak ditentukan</option>
                            <option value="I">Kelas I – Konstruksi Keras (beton, bata, besi/baja)</option>
                            <option value="II">Kelas II – Semi Keras (campuran beton & kayu)</option>
                            <option value="III">Kelas III – Konstruksi Ringan (kayu, seng/genteng)</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Flex>
                    )}
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Objek Pertanggungan</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        placeholder="Contoh: Stok sparepart motor (ban), Bangunan gudang..."
                        value={endorseForm.object_insured}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, object_insured: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Catatan Coverage</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        value={endorseForm.coverage_notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, coverage_notes: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Keterangan Endosemen</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        placeholder="Contoh: Penambahan jaminan bangunan, perubahan objek stok oli → ban..."
                        value={endorseForm.notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEndorseForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                </Box>

                {endorseError && <Text fontSize="12px" color="#DC2626">{endorseError}</Text>}
              </Flex>
            </Dialog.Body>

            <Dialog.Footer px="24px" pb="24px" pt="12px" gap="8px" borderTop="1px solid" borderColor="#E2E8F0">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="14px" borderRadius="8px" _hover={{ bg: "#F1F5F9" }}
                disabled={endorseSaving}
                onClick={() => { setEndorseDialog(false); setEndorseError(null) }}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#D97706" color="white" fontSize="14px" borderRadius="8px"
                loading={endorseSaving} loadingText="Menyimpan..."
                _hover={{ bg: "#B45309" }}
                onClick={handleEndorse}
              >
                Simpan Endosemen
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Koreksi dialog (PATCH – without endorsement) ─────────────────── */}
      <Dialog.Root
        key={koreksiKey}
        open={koreksiDialog}
        onOpenChange={(d) => { if (!d.open && !koreksiSaving) { setKoreksiDialog(false); setKoreksiyError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" maxW="680px" w="95vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0" borderBottom="1px solid" borderColor="#E2E8F0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold" pb="16px">
                Koreksi Data Polis
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body px="24px" py="20px" maxH="68vh" overflowY="auto">
              <Flex flexDir="column" gap="18px">

                {/* Warning banner */}
                <Box bg="#EFF6FF" border="1px solid" borderColor="#BFDBFE" borderRadius="8px" px="14px" py="10px">
                  <Text fontSize="12px" color="#1D4ED8" fontWeight="semibold" mb="2px">Koreksi tanpa endosemen</Text>
                  <Text fontSize="12px" color="#1D4ED8" lineHeight="1.6">
                    Perubahan ini akan dicatat sebagai <Text as="span" fontWeight="bold">koreksi (policy_updated)</Text>, bukan endosemen resmi.
                    Gunakan hanya untuk memperbaiki kesalahan input data, bukan untuk perubahan polis yang disepakati.
                  </Text>
                </Box>

                {/* Nilai & Periode */}
                <Box>
                  <Text fontSize="13px" fontWeight="semibold" color="#1C2833" mb="12px">Nilai & Periode</Text>
                  <Flex gap="12px" mb="10px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Uang Pertanggungan (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(koreksiFo.sum_insured)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setKoreksiFo((f) => ({ ...f, sum_insured: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Premi (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(koreksiFo.premium_amount)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setKoreksiFo((f) => ({ ...f, premium_amount: raw }))
                        }}
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px" mb="10px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Materai (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(koreksiFo.materai_amount)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setKoreksiFo((f) => ({ ...f, materai_amount: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Akhir Perlindungan</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="date"
                        value={koreksiFo.coverage_end}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, coverage_end: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px" mb="10px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Biaya Polis (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(koreksiFo.biaya_polis)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setKoreksiFo((f) => ({ ...f, biaya_polis: raw }))
                        }}
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Diskon (IDR)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="text" inputMode="numeric"
                        value={formatIDR(koreksiFo.diskon)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setKoreksiFo((f) => ({ ...f, diskon: raw }))
                        }}
                      />
                    </Flex>
                  </Flex>
                  <Flex gap="12px">
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Komisi (%)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="number" min={0} max={100} step="0.1"
                        value={koreksiFo.commission_rate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, commission_rate: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px" flex="1">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">PPh / Pajak (%)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833" type="number" min={0} max={100} step="0.01"
                        value={koreksiFo.commission_tax_rate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, commission_tax_rate: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                </Box>

                <Box h="1px" bg="#E2E8F0" />

                {/* Detail Objek */}
                <Box>
                  <Text fontSize="13px" fontWeight="semibold" color="#1C2833" mb="12px">Detail Objek & Keterangan</Text>
                  <Flex flexDir="column" gap="10px">
                    {policy != null && new Set(["fire", "kebakaran"]).has(policy.product_type) && (
                      <Flex flexDir="column" gap="4px">
                        <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Kelas Konstruksi Bangunan</Text>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                            fontSize="13px" color="#1C2833"
                            value={koreksiFo.construction_class}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setKoreksiFo((f) => ({ ...f, construction_class: e.target.value }))
                            }
                          >
                            <option value="">Tidak ditentukan</option>
                            <option value="I">Kelas I – Konstruksi Keras (beton, bata, besi/baja)</option>
                            <option value="II">Kelas II – Semi Keras (campuran beton & kayu)</option>
                            <option value="III">Kelas III – Konstruksi Ringan (kayu, seng/genteng)</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Flex>
                    )}
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Objek Pertanggungan</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        value={koreksiFo.object_insured}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, object_insured: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Catatan Coverage</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        value={koreksiFo.coverage_notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, coverage_notes: e.target.value }))
                        }
                      />
                    </Flex>
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Alasan Koreksi (opsional)</Text>
                      <Input
                        bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                        fontSize="13px" color="#1C2833"
                        placeholder="Contoh: Salah input premi, typo nomor polis..."
                        value={koreksiFo.notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKoreksiFo((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </Flex>
                  </Flex>
                </Box>

                {koreksiyError && <Text fontSize="12px" color="#DC2626">{koreksiyError}</Text>}
              </Flex>
            </Dialog.Body>

            <Dialog.Footer px="24px" pb="24px" pt="12px" gap="8px" borderTop="1px solid" borderColor="#E2E8F0">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="14px" borderRadius="8px" _hover={{ bg: "#F1F5F9" }}
                disabled={koreksiSaving}
                onClick={() => { setKoreksiDialog(false); setKoreksiyError(null) }}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#1D4ED8" color="white" fontSize="14px" borderRadius="8px"
                loading={koreksiSaving} loadingText="Menyimpan..."
                _hover={{ bg: "#1E40AF" }}
                onClick={handleKoreksi}
              >
                Simpan Koreksi
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Delete policy dialog ──────────────────────────────────────────── */}
      <Dialog.Root
        open={deleteDialog}
        onOpenChange={(d) => { if (!d.open && !deleting) { setDeleteDialog(false); setDeleteError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" maxW="420px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#DC2626" fontSize="16px" fontWeight="bold">Hapus Polis</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Flex flexDir="column" gap="12px">
                <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" px="14px" py="10px">
                  <Text fontSize="12px" color="#DC2626" fontWeight="semibold" mb="2px">Tindakan tidak dapat dibatalkan</Text>
                  <Text fontSize="12px" color="#DC2626" lineHeight="1.6">
                    Semua data terkait (komisi, coverage, ko-asuransi, follow-up, riwayat audit) akan dihapus permanen.
                  </Text>
                </Box>
                <Text color="#5D6D7E" fontSize="13px" lineHeight="1.7">
                  Anda yakin ingin menghapus polis{" "}
                  <Text as="span" fontWeight="bold" color="#1C2833">{policy?.policy_number}</Text>?{" "}
                  Untuk polis yang dibatalkan atau lapse, gunakan{" "}
                  <Text as="span" fontWeight="semibold">Ubah Status Perpanjangan → Dibatalkan</Text> sebagai gantinya.
                </Text>
                {deleteError && <Text fontSize="12px" color="#DC2626">{deleteError}</Text>}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="14px" borderRadius="8px" _hover={{ bg: "#F1F5F9" }}
                disabled={deleting}
                onClick={() => { setDeleteDialog(false); setDeleteError(null) }}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#DC2626" color="white" fontSize="14px" borderRadius="8px"
                loading={deleting} loadingText="Menghapus..."
                _hover={{ bg: "#B91C1C" }}
                onClick={handleDeletePolicy}
              >
                Ya, Hapus Polis
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Delete coverage dialog ────────────────────────────────────────── */}
      <Dialog.Root
        open={covToDelete !== null}
        onOpenChange={(d) => { if (!d.open && !covDeleting) setCovToDelete(null) }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" maxW="400px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Hapus Item Coverage</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Text color="#5D6D7E" fontSize="14px" lineHeight="1.6">
                Hapus{" "}
                <Text as="span" fontWeight="semibold" color="#1C2833">
                  {covToDelete
                    ? COVERAGE_TYPE_LABELS[covToDelete.coverage_type] + (covToDelete.coverage_label ? ` – ${covToDelete.coverage_label}` : '')
                    : ''}
                </Text>
                ? Total premi polis akan disesuaikan otomatis.
              </Text>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="14px" borderRadius="8px" _hover={{ bg: "#F1F5F9" }}
                disabled={covDeleting}
                onClick={() => setCovToDelete(null)}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#DC2626" color="white" fontSize="14px" borderRadius="8px"
                loading={covDeleting} loadingText="Menghapus..."
                _hover={{ bg: "#B91C1C" }}
                onClick={handleDeleteCoverage}
              >
                Ya, Hapus
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )

  if (loading) {
    return shell(
      <Flex flexDir="column" gap="24px" p="32px">
        <Skeleton h="32px" w="280px" borderRadius="8px" />
        <Flex gap="24px">
          <Flex flexDir="column" gap="16px" flex="1">
            <Skeleton h="280px" borderRadius="12px" />
            <Skeleton h="200px" borderRadius="12px" />
            <Skeleton h="180px" borderRadius="12px" />
          </Flex>
          <Flex flexDir="column" gap="16px" w="280px">
            <Skeleton h="300px" borderRadius="12px" />
            <Skeleton h="160px" borderRadius="12px" />
          </Flex>
        </Flex>
      </Flex>
    )
  }

  if (error || !policy) {
    return shell(
      <Flex p="32px" flexDir="column" gap="16px">
        <Text color="#DC2626" fontSize="16px">{error ?? "Data polis tidak ditemukan"}</Text>
        <Button w="max-content" variant="outline" gap="8px" onClick={() => router.push("/agentra/policies")}>
          <LuArrowLeft size={12} /> Kembali ke Daftar Polis
        </Button>
      </Flex>
    )
  }

  const days = daysUntil(policy.coverage_end)
  const renewalStatusCfg = {
    pending:   { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
    renewed:   { bg: "#DCFCE7", color: "#16A34A", label: "Diperbarui" },
    lapsed:    { bg: "#FEE2E2", color: "#DC2626", label: "Lapse" },
    cancelled: { bg: "#F1F5F9", color: "#64748B", label: "Dibatalkan" },
  }[policy.renewal_status] ?? { bg: "#F1F5F9", color: "#64748B", label: policy.renewal_status }

  const paymentStatusCfg = {
    unpaid:    { bg: "#FEE2E2", color: "#DC2626", label: "Belum Dibayar" },
    paid:      { bg: "#FEF3C7", color: "#D97706", label: "Sudah Dibayar" },
    confirmed: { bg: "#DCFCE7", color: "#16A34A", label: "Terkonfirmasi" },
  }[policy.payment_status] ?? { bg: "#F1F5F9", color: "#64748B", label: policy.payment_status }

  const effectivePremium = coverageTotals.total_premium > 0 ? coverageTotals.total_premium : Number(policy.premium_amount)
  const commissionAmount = policy.commission_amount != null ? Number(policy.commission_amount) : Math.round(effectivePremium * Number(policy.commission_rate) / 100)
  const commissionTaxAmount = policy.commission_tax_amount != null ? Number(policy.commission_tax_amount) : 0
  const netCommissionAmount = policy.net_commission_amount != null ? Number(policy.net_commission_amount) : (commissionAmount - commissionTaxAmount)

  return shell(
    <Flex flexDir="column" gap="24px" p="32px">

      {/* Page header */}
      <Flex align="center" justify="space-between">
        <Flex align="center" gap="12px">
          <Button size="sm" variant="ghost" color="#64748B" onClick={() => router.back()} px="0">
            <LuArrowLeft size={16} />
          </Button>
          <Box p="8px" bg="#EFF6FF" borderRadius="10px" color="#1D4ED8"><LuFileText size={20} /></Box>
          <Flex align="center" gap="8px" flexWrap="wrap">
            <Text color="#1C2833" fontSize="18px" fontWeight="bold">{policy.policy_number}</Text>
            <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg="#DBEAFE" color="#1D4ED8">
              {policy.insurer?.short_name ?? policy.insurer_name}
            </Badge>
            <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg={renewalStatusCfg.bg} color={renewalStatusCfg.color}>
              {renewalStatusCfg.label}
            </Badge>
            {Boolean(policy.is_coassurance) && (
              <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" bg="#F3E8FF" color="#7C3AED">
                Ko-Asuransi
              </Badge>
            )}
          </Flex>
        </Flex>
      </Flex>

      <Flex gap="24px" align="flex-start">
        {/* ── Left column ── */}
        <Flex flexDir="column" gap="16px" flex="1">

          {/* Detail Polis */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex justify="space-between" align="center" mb="20px">
              <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Detail Polis</Text>
              {policy.updated_at && (
                <Text color="#94A3B8" fontSize="11px">Terakhir diupdate: {formatDate(policy.updated_at)}</Text>
              )}
            </Flex>

            <Flex gap="32px" mb="20px" flexWrap="wrap">
              <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                <Text {...lbl}>NASABAH</Text>
                <Text color="#1C2833" fontSize="14px" fontWeight="semibold">{policy.customer?.display_name ?? policy.customer_name}</Text>
                {policy.customer?.personal_address && (
                  <Text color="#64748B" fontSize="12px">{policy.customer.personal_address}</Text>
                )}
              </Flex>
              <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                <Text {...lbl}>PERIODE POLIS</Text>
                <Text color="#1C2833" fontSize="14px">{formatDate(policy.coverage_start)} – {formatDate(policy.coverage_end)}</Text>
                {days > 0
                  ? <Text color="#3B82F6" fontSize="12px">Sisa {days} hari</Text>
                  : <Text color="#DC2626" fontSize="12px">Sudah berakhir {Math.abs(days)} hari lalu</Text>
                }
              </Flex>
            </Flex>

            <Flex gap="32px" mb="24px" flexWrap="wrap">
              <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                <Text {...lbl}>JENIS PRODUK</Text>
                <Text color="#1C2833" fontSize="14px">{PRODUCT_LABELS[policy.product_type] ?? policy.product_type}</Text>
              </Flex>
              {policy.construction_class && (
                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                  <Text {...lbl}>KELAS KONSTRUKSI</Text>
                  <Flex align="center" gap="6px">
                    <Box px="7px" py="2px" borderRadius="5px" bg="#FEF3C7" fontSize="12px" fontWeight="bold" color="#D97706">
                      Kelas {policy.construction_class}
                    </Box>
                    <Text color="#64748B" fontSize="12px">
                      {policy.construction_class === "I" ? "Konstruksi Keras"
                        : policy.construction_class === "II" ? "Semi Keras"
                        : "Konstruksi Ringan"}
                    </Text>
                  </Flex>
                </Flex>
              )}
              {policy.object_insured && (
                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                  <Text {...lbl}>OBJEK PERTANGGUNGAN</Text>
                  <Text color="#1C2833" fontSize="14px">{policy.object_insured}</Text>
                </Flex>
              )}
            </Flex>

            {/* Rincian Keuangan + Coverage breakdown */}
            <Box bg="#F8FAFC" borderRadius="10px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">

              {/* Header */}
              <Flex px="16px" py="10px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Uang Pertanggungan & Rate</Text>
                {/* <Button
                  size="xs" bg="#1A3557" color="white" fontSize="11px" gap="4px" borderRadius="6px"
                  _hover={{ bg: "#162C47" }}
                  onClick={() => { setCovForm({ coverage_type: 'bangunan', coverage_label: '', sum_insured: '', rate_permille: '' }); setCovError(null); setCovDialog({ open: true, editing: null }) }}
                >
                  <LuPlus size={10} /> Tambah Item
                </Button> */}
              </Flex>

              {/* Column headers (only when rows exist) */}
              {coverages.length > 0 && (
                <Flex px="16px" py="6px" gap="8px" bg="#F1F5F9" borderBottom="1px solid" borderColor="#E2E8F0">
                  <Text flex="1.5" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em">KATEGORI</Text>
                  <Text flex="1" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">UANG PERTANGGUNGAN</Text>
                  <Text w="64px" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">RATE ‰</Text>
                  <Text w="90px" color="#94A3B8" fontSize="10px" fontWeight="bold" letterSpacing="0.05em" textAlign="right">PREMI</Text>
                  <Box w="44px" />
                </Flex>
              )}

              {/* Skeleton while loading */}
              {coverageLoading && (
                <Flex px="16px" py="14px" align="center" justify="center">
                  <Text color="#94A3B8" fontSize="13px">Memuat...</Text>
                </Flex>
              )}

              {/* Empty state */}
              {!coverageLoading && coverages.length === 0 && (
                <Flex px="16px" py="20px" align="center" justify="center">
                  <Text color="#94A3B8" fontSize="13px">Belum ada item coverage. Klik "+ Tambah Item" untuk mulai.</Text>
                </Flex>
              )}

              {/* Coverage rows */}
              {!coverageLoading && coverages.map((cov) => (
                <Flex key={cov.coverage_id} px="16px" py="10px" gap="8px" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                  <Flex flexDir="column" flex="1.5" gap="1px">
                    <Text color="#1C2833" fontSize="13px">{COVERAGE_TYPE_LABELS[cov.coverage_type]}</Text>
                    {cov.coverage_label && <Text color="#94A3B8" fontSize="11px">{cov.coverage_label}</Text>}
                  </Flex>
                  <Text flex="1" color="#64748B" fontSize="12px" fontFamily="mono" textAlign="right">
                    {fmt(cov.sum_insured)}
                  </Text>
                  <Text w="64px" color="#64748B" fontSize="12px" textAlign="right">
                    {parseFloat(cov.rate_permille)}‰
                  </Text>
                  <Text w="90px" color="#1C2833" fontSize="13px" fontWeight="medium" textAlign="right">
                    {fmt(cov.premium_amount)}
                  </Text>
                </Flex>
              ))}

              {/* Total row */}
              {coverages.length > 0 && (
                <Flex px="16px" py="10px" gap="8px" justify="space-between" align="center" bg="#F1F5F9" borderBottom="1px solid" borderColor="#E2E8F0">
                  <Text color="#64748B" fontSize="12px" fontWeight="semibold">
                    Total UP: {fmt(coverageTotals.total_sum_insured)}
                  </Text>
                  <Text color="#1C2833" fontSize="13px" fontWeight="semibold">
                    Total Premi: {fmt(coverageTotals.total_premium)}
                  </Text>
                </Flex>
              )}

              {/* KOMISI breakdown */}
              <Flex px="16px" py="10px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                <Text color="#64748B" fontSize="12px">Gross Komisi ({policy.commission_rate}%)</Text>
                <Text color="#1C2833" fontSize="13px">{fmt(commissionAmount)}</Text>
              </Flex>
              {commissionTaxAmount > 0 && (
                <Flex px="16px" py="8px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                  <Text color="#64748B" fontSize="12px">PPh / Pajak ({((policy.commission_tax_rate ?? 0) * 100).toFixed(1)}%)</Text>
                  <Text color="#DC2626" fontSize="12px">−{fmt(commissionTaxAmount)}</Text>
                </Flex>
              )}
              <Flex px="16px" py="10px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="#F0FDF4">
                <Text color="#15803D" fontSize="13px" fontWeight="semibold">Net Komisi (Agen)</Text>
                <Text color="#15803D" fontSize="14px" fontWeight="bold">{fmt(netCommissionAmount)}</Text>
              </Flex>
              {policy.materai_amount > 0 && (
                <Flex px="16px" py="8px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                  <Text color="#64748B" fontSize="12px">Materai</Text>
                  <Text color="#1C2833" fontSize="12px">{fmt(policy.materai_amount)}</Text>
                </Flex>
              )}
              {(policy.biaya_polis ?? 0) > 0 && (
                <Flex px="16px" py="8px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                  <Text color="#64748B" fontSize="12px">Biaya Polis</Text>
                  <Text color="#1C2833" fontSize="12px">{fmt(policy.biaya_polis!)}</Text>
                </Flex>
              )}
              {(policy.diskon ?? 0) > 0 && (
                <Flex px="16px" py="8px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#F1F5F9" bg="white">
                  <Text color="#64748B" fontSize="12px">Diskon</Text>
                  <Text color="#DC2626" fontSize="12px">−{fmt(policy.diskon!)}</Text>
                </Flex>
              )}
              <Flex px="16px" py="10px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#BFDBFE" bg="#EFF6FF">
                <Text color="#1D4ED8" fontSize="13px" fontWeight="semibold">Tagihan Nasabah</Text>
                <Text color="#1D4ED8" fontSize="14px" fontWeight="bold">
                  {fmt(Number(policy.customer_premium_amount ?? 0))}
                </Text>
              </Flex>

              {/* STATUS PEMBAYARAN */}
              <Flex px="16px" py="12px" justify="space-between" align="center" bg="#EFF6FF">
                <Text color="#1D4ED8" fontSize="13px" fontWeight="bold">STATUS PEMBAYARAN</Text>
                <Badge px="10px" py="3px" borderRadius="full" fontSize="11px" bg={paymentStatusCfg.bg} color={paymentStatusCfg.color}>
                  {paymentStatusCfg.label}
                </Badge>
              </Flex>
            </Box>

            {policy.coverage_notes && (
              <Box mt="16px" p="12px" bg="#F8FAFC" borderRadius="8px" border="1px solid" borderColor="#E2E8F0">
                <Text color="#64748B" fontSize="11px" fontWeight="semibold" mb="4px">CATATAN COVERAGE</Text>
                <Text color="#1C2833" fontSize="13px">{policy.coverage_notes}</Text>
              </Box>
            )}
          </Box>

          {/* Follow-up Log */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" gap="8px" mb="20px">
              <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Follow-up Log</Text>
            </Flex>
            {(!policy.follow_ups || policy.follow_ups.length === 0) ? (
              <Flex align="center" justify="center" py="24px">
                <Text color="#94A3B8" fontSize="14px">Belum ada follow-up tercatat</Text>
              </Flex>
            ) : (
              <Flex flexDir="column" gap="16px">
                {policy.follow_ups.map((f) => (
                  <Flex key={f.follow_up_id} gap="12px">
                    <Box p="8px" bg="#F1F5F9" borderRadius="full" h="fit-content" color="#64748B" flexShrink={0}>
                      <ActionIcon type={f.action_type} />
                    </Box>
                    <Flex flexDir="column" gap="4px">
                      <Flex align="center" gap="8px">
                        <Text color="#1C2833" fontSize="13px" fontWeight="semibold">
                          {ACTION_TYPE_LABELS[f.action_type ?? ""] ?? "Follow-up"}
                        </Text>
                        <Text color="#94A3B8" fontSize="11px">
                          {f.created_at ? formatDateTime(f.created_at) : formatDate(f.follow_up_date)}
                        </Text>
                      </Flex>
                      {f.notes && <Text color="#64748B" fontSize="12px" lineHeight="1.6">{f.notes}</Text>}
                      {f.outcome && <Text color="#1C2833" fontSize="12px" fontStyle="italic">Hasil: {f.outcome}</Text>}
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            )}
          </Box>

          {/* Riwayat Polis */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" gap="8px" mb="20px">
              <Box color="#64748B"><LuHistory size={16} /></Box>
              <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Riwayat Polis</Text>
            </Flex>
            {logsLoading ? (
              <Flex align="center" justify="center" py="24px">
                <Text color="#94A3B8" fontSize="14px">Memuat riwayat...</Text>
              </Flex>
            ) : logs.length === 0 ? (
              <Flex align="center" justify="center" py="24px">
                <Text color="#94A3B8" fontSize="14px">Belum ada riwayat perubahan</Text>
              </Flex>
            ) : (
              <Flex flexDir="column">
                {logs.map((log, idx) => {
                  const cfg = LOG_EVENT[log.event_type] ?? { label: log.event_type, bg: "#F1F5F9", color: "#64748B" }
                  return (
                    <Flex key={log.log_id} gap="12px" pb={idx < logs.length - 1 ? "16px" : "0"}>
                      <Flex flexDir="column" align="center">
                        <Box p="8px" borderRadius="full" bg={cfg.bg} color={cfg.color} flexShrink={0}>
                          <LogIcon type={log.event_type} />
                        </Box>
                        {idx < logs.length - 1 && (
                          <Box w="1px" flex="1" bg="#E2E8F0" mt="4px" minH="12px" />
                        )}
                      </Flex>
                      <Flex flexDir="column" gap="2px">
                        <Flex align="center" gap="6px" flexWrap="wrap">
                          <Badge px="6px" py="1px" borderRadius="full" fontSize="10px" bg={cfg.bg} color={cfg.color}>
                            {cfg.label}
                          </Badge>
                          <Text color="#94A3B8" fontSize="11px">{formatDateTime(log.created_at)}</Text>
                        </Flex>
                        <Text color="#1C2833" fontSize="13px" lineHeight="1.5">{log.description}</Text>
                        {log.old_value && log.new_value && (
                          <Text color="#64748B" fontSize="11px" fontFamily="mono">
                            {log.old_value} → {log.new_value}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  )
                })}
              </Flex>
            )}
          </Box>
        </Flex>

        {/* ── Right column ── */}
        <Flex flexDir="column" gap="16px" w="280px" flexShrink={0}>

          {/* Days to expiry + actions */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px" textAlign="center">
            <Text color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.08em" mb="12px">
              {days >= 0 ? "HARI MENUJU EXPIRY" : "SUDAH BERAKHIR"}
            </Text>
            <Text color={days < 0 ? "#DC2626" : "#1A3557"} fontSize="52px" fontWeight="bold" lineHeight="1">
              {Math.abs(days)}
            </Text>
            <Text color={days < 0 ? "#DC2626" : "#1A3557"} fontSize="18px" fontWeight="semibold" mb="12px">Hari</Text>
            <Flex align="center" justify="center" gap="6px" color="#94A3B8" fontSize="12px" mb="20px">
              <LuCalendar size={13} /> Berakhir: {formatDate(policy.coverage_end)}
            </Flex>
            <Flex flexDir="column" gap="8px">
              {policy.payment_status === "unpaid" && (
                <Button
                  w="100%" variant="outline" borderColor="#3B82F6" color="#3B82F6" fontSize="13px" gap="6px"
                  _hover={{ bg: "#EFF6FF" }}
                  loading={actionLoading === "payment"}
                  onClick={recordPayment}
                >
                  <LuCreditCard size={13} /> Catat Pembayaran
                </Button>
              )}
              <Button
                w="100%" bg="#16A34A" color="white" fontSize="13px" gap="6px"
                _hover={{ bg: "#15803D" }}
                loading={actionLoading === "renewed"}
                disabled={policy.renewal_status === "renewed"}
                onClick={markRenewed}
              >
                <LuCircleCheck size={13} /> Tandai Sudah Diperbarui
              </Button>
              <Button
                w="100%" variant="outline" borderColor="#D97706" color="#D97706" fontSize="13px" gap="6px"
                _hover={{ bg: "#FFFBEB" }}
                onClick={openEndorseDialog}
              >
                <LuClipboard size={13} /> Catat Endosemen
              </Button>
              <Button
                w="100%" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" gap="6px"
                loading={actionLoading === "followup"}
                onClick={logFollowUp}
              >
                <LuMessageSquare size={13} /> Catat Follow-up
              </Button>

              <Box h="1px" bg="#E2E8F0" my="4px" />

              <Button
                w="100%" variant="outline" borderColor="#93C5FD" color="#1D4ED8" fontSize="13px" gap="6px"
                _hover={{ bg: "#EFF6FF" }}
                onClick={openKoreksiDialog}
              >
                <LuPencil size={13} /> Koreksi Data Polis
              </Button>
              <Button
                w="100%" variant="outline" borderColor="#FECACA" color="#DC2626" fontSize="13px" gap="6px"
                _hover={{ bg: "#FEF2F2" }}
                onClick={() => { setDeleteError(null); setDeleteDialog(true) }}
              >
                <LuTrash2 size={13} /> Hapus Polis
              </Button>
            </Flex>
          </Box>

          {/* Customer contact */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
            <Text color="#1C2833" fontSize="14px" fontWeight="semibold" mb="14px">Kontak Nasabah</Text>
            <Flex align="center" gap="10px" mb="14px">
              <Avatar.Root w="36px" h="36px" bg="#1D4ED8" borderRadius="full">
                <Avatar.Fallback color="white" fontSize="12px" fontWeight="bold">
                  {(policy.customer?.display_name ?? policy.customer_name ?? "").slice(0, 2).toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <Flex flexDir="column">
                <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{policy.customer?.display_name ?? policy.customer_name}</Text>
                <Text color="#94A3B8" fontSize="11px">
                  {(policy.customer?.customer_type ?? policy.customer_type) === "company" ? "Korporat" : "Perorangan"}
                </Text>
              </Flex>
            </Flex>
            <Flex gap="8px">
              <Button
                flex="1" size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="12px" gap="4px"
                onClick={() => router.push(`/agentra/customer/detail?id=${policy.customer?.customer_id ?? ''}`)}
              >
                <LuUser size={12} /> Detail
              </Button>
              {(policy.customer?.personal_whatsapp ?? policy.customer?.pic_whatsapp) && (
                <Button
                  flex="1" size="sm" bg="#25D366" color="white" fontSize="12px" gap="4px"
                  onClick={() => {
                    const wa = policy.customer?.personal_whatsapp ?? policy.customer?.pic_whatsapp
                    if (wa) window.open(`https://wa.me/${wa.replace(/\D/g, "")}`, "_blank")
                  }}
                >
                  <FaWhatsapp size={12} /> WhatsApp
                </Button>
              )}
            </Flex>
          </Box>

          {/* Notes */}
          {policy.notes && (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
              <Text color="#1C2833" fontSize="14px" fontWeight="semibold" mb="8px">Catatan Internal</Text>
              <Text color="#64748B" fontSize="13px" lineHeight="1.6">{policy.notes}</Text>
            </Box>
          )}

          {/* Ko-Asuransi card */}
          {Boolean(policy.is_coassurance) && (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E9D5FF" p="20px">
              <Flex align="center" gap="6px" mb="14px">
                <Box px="6px" py="1px" borderRadius="4px" bg="#F3E8FF" fontSize="10px" fontWeight="bold" color="#7C3AED">KO-ASURANSI</Box>
                <Text color="#1C2833" fontSize="14px" fontWeight="semibold">Peserta Ko-Asuransi</Text>
              </Flex>
              {caLoading ? (
                <Text color="#94A3B8" fontSize="12px">Memuat...</Text>
              ) : coassurances.length === 0 ? (
                <Text color="#94A3B8" fontSize="12px">Tidak ada data ko-insurer.</Text>
              ) : (
                <Flex flexDir="column" gap="8px">
                  {coassurances.map(ca => (
                    <Box key={ca.coassurance_id} p="10px" bg="#FAF5FF" borderRadius="8px" border="1px solid" borderColor="#E9D5FF">
                      <Flex justify="space-between" align="center" mb="4px">
                        <Flex align="center" gap="6px">
                          <Text fontSize="12px" color="#1C2833" fontWeight="semibold">{ca.co_insurer_name}</Text>
                          {Boolean(ca.is_leader) && (
                            <Box px="5px" py="1px" borderRadius="3px" bg="#DBEAFE" fontSize="9px" fontWeight="bold" color="#1D4ED8">LEADER</Box>
                          )}
                        </Flex>
                        <Text fontSize="13px" color="#7C3AED" fontWeight="bold">{parseFloat(ca.share_percent).toFixed(1)}%</Text>
                      </Flex>
                      {ca.premium_share != null && ca.premium_share > 0 && (
                        <Text fontSize="11px" color="#64748B">Premi: {fmt(ca.premium_share)}</Text>
                      )}
                      {ca.commission_amount > 0 && (
                        <Text fontSize="11px" color="#64748B">Komisi: {fmt(ca.commission_amount)}</Text>
                      )}
                    </Box>
                  ))}
                  {coassurances.length > 0 && (
                    <Flex justify="flex-end" mt="4px">
                      <Box
                        px="8px" py="2px" borderRadius="full" fontSize="11px" fontWeight="semibold"
                        bg={Math.abs(coassurances.reduce((s, c) => s + parseFloat(c.share_percent), 0) - 100) < 0.01 ? "#DCFCE7" : "#FEF3C7"}
                        color={Math.abs(coassurances.reduce((s, c) => s + parseFloat(c.share_percent), 0) - 100) < 0.01 ? "#16A34A" : "#D97706"}
                      >
                        Total: {coassurances.reduce((s, c) => s + parseFloat(c.share_percent), 0).toFixed(1)}%
                      </Box>
                    </Flex>
                  )}
                </Flex>
              )}
            </Box>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
