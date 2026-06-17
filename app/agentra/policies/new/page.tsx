"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Box, Button, Combobox, createListCollection, Dialog, Flex, IconButton,
  Input, NativeSelect, Switch, Table, Text, Textarea,
} from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuArrowLeft, LuFileText, LuZap, LuPlus, LuPencil, LuTrash2, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import {
  createPolicy, addCoverage, addCoassuranceParticipant,
  type CreatePolicyPayload, type ApiCoverageType, COVERAGE_TYPE_LABELS,
} from "@/lib/api/policies"
import { getCustomers, type ApiCustomer } from "@/lib/api/customers"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { getMasterProducts, type ApiMasterProduct } from "@/lib/api/master-products"

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT = {
  bg: "white", border: "1px solid", borderColor: "#E2E8F0",
  borderRadius: "8px", fontSize: "13px", color: "#1C2833", h: "40px",
} as const

const INPUT_LG = { ...INPUT, fontSize: "15px" } as const

const LBL = { color: "#5D6D7E", fontSize: "11px", fontWeight: "semibold", letterSpacing: "0.04em" } as const

// ─── IDR number helpers ───────────────────────────────────────────────────────

// Format raw digit string → "400.000.000" (dots as thousand separator)
function toIDR(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits ? Number(digits).toLocaleString("id-ID") : ""
}

// Parse formatted IDR string → raw number
function rawIDR(formatted: string): number {
  return parseInt(formatted.replace(/\./g, "").replace(/,/g, "") || "0", 10) || 0
}

// For display of computed numbers
function fmt(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID")
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
      <Box borderLeft="3px solid #1A3557" pl="10px" mb="20px">
        <Text color="#1A3557" fontSize="14px" fontWeight="semibold">{title}</Text>
      </Box>
      {children}
    </Box>
  )
}

function FField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <Flex flexDir="column" gap="5px">
      <Text {...LBL}>
        {label.toUpperCase()}
        {required && <Text as="span" color="#DC2626"> *</Text>}
      </Text>
      {children}
      {hint && <Text fontSize="10px" color="#94A3B8">{hint}</Text>}
    </Flex>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalCoverage {
  _id:            string
  coverage_type:  ApiCoverageType
  coverage_label: string
  sum_insured:    number
  rate_permille:  number
  premium_amount: number
}

interface LocalCoassurance {
  _id:               string
  co_insurer_name:   string
  is_leader:         boolean
  share_percent:     string
  sum_insured_share: string
  premium_share:     string
  commission_rate:   string
}

const EMPTY_CA: LocalCoassurance = {
  _id: "", co_insurer_name: "", is_leader: false,
  share_percent: "", sum_insured_share: "", premium_share: "", commission_rate: "",
}

const EMPTY_COV_FORM = {
  coverage_type: "bangunan" as ApiCoverageType,
  coverage_label: "",
  sum_insured: "",   // formatted IDR string e.g. "400.000.000"
  rate_permille: "",
}

// ─── Fallback products ────────────────────────────────────────────────────────

const FALLBACK_PRODUCTS = [
  { product_code: "fire",       product_name: "Kebakaran" },
  { product_code: "motorcycle", product_name: "Kendaraan Motor" },
  { product_code: "car",        product_name: "Kendaraan Mobil" },
  { product_code: "travel",     product_name: "Perjalanan" },
  { product_code: "cargo",      product_name: "Kargo" },
  { product_code: "kecelakaan", product_name: "Kecelakaan Diri" },
  { product_code: "aep",        product_name: "AEP" },
  { product_code: "other",      product_name: "Lainnya" },
]

const EMPTY = {
  insurer_id: "", customer_id: "", policy_number: "", product_type: "",
  coverage_start: "", coverage_end: "",
  sum_insured: "",        // formatted IDR string
  premium_amount: "",     // formatted IDR string
  materai_amount: "",     // formatted IDR string
  commission_rate: "",
  commission_tax_rate: "2.5",  // displayed as %, stored as decimal on submit
  policy_year: "1", object_insured: "", coverage_notes: "", notes: "",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPolicy() {
  const router = useRouter()

  const [form, setForm]                     = useState(EMPTY)
  const [customers, setCustomers]           = useState<ApiCustomer[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [comboKey, setComboKey]             = useState(0)  // increment to remount combobox
  const [insurers, setInsurers]             = useState<ApiInsurer[]>([])
  const [masterProducts, setMasterProducts] = useState<ApiMasterProduct[]>([])

  const [commissionSource, setCommissionSource] = useState<
    { kind: "product"; name: string } | { kind: "manual" } | null
  >(null)
  const [prefixHint, setPrefixHint]   = useState<ApiMasterProduct | null>(null)
  const [endDateAuto, setEndDateAuto] = useState(true)

  const [isEndorsement, setIsEndorsement] = useState(false)

  // Co-assurance state
  const [isCoassurance, setIsCoassurance]   = useState(false)
  const [coassurances, setCoassurances]     = useState<LocalCoassurance[]>([])
  const [caDialog, setCaDialog]             = useState(false)
  const [editingCa, setEditingCa]           = useState<LocalCoassurance | null>(null)
  const [caForm, setCaForm]                 = useState<LocalCoassurance>({ ...EMPTY_CA, _id: "" })
  const [caError, setCaError]               = useState<string | null>(null)

  const [localCoverages, setLocalCoverages] = useState<LocalCoverage[]>([])
  const [covDialogOpen, setCovDialogOpen]   = useState(false)
  const [editingCov, setEditingCov]         = useState<LocalCoverage | null>(null)
  const [covForm, setCovForm]               = useState(EMPTY_COV_FORM)
  const [covError, setCovError]             = useState<string | null>(null)
  const [deletingCov, setDeletingCov]       = useState<LocalCoverage | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── Data load ────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    Promise.all([
      getCustomers(token, { limit: 200 }),
      getInsurers(token, true),
      getMasterProducts(token),
    ]).then(([c, i, mp]) => {
      setCustomers(c.data ?? [])
      setInsurers(Array.isArray(i) ? i : (i as any)?.data ?? [])
      setMasterProducts(Array.isArray(mp) ? mp.filter(p => Boolean(p.is_active)) : [])
    }).catch(() => {})
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────

  const productOptions = masterProducts.length > 0 ? masterProducts : FALLBACK_PRODUCTS

  const customerCollection = useMemo(() => {
    const q = customerSearch.toLowerCase()
    const filtered = q ? customers.filter(c => c.display_name.toLowerCase().includes(q)) : customers
    return createListCollection({
      items: filtered.map(c => ({ label: c.display_name, value: c.customer_id, type: c.customer_type })),
    })
  }, [customers, customerSearch])

  const selectedCustomer = customers.find(c => c.customer_id === form.customer_id)

  // Coverage totals
  const covTotalSI      = localCoverages.reduce((s, c) => s + c.sum_insured, 0)
  const covTotalPremium = localCoverages.reduce((s, c) => s + c.premium_amount, 0)

  const hasAutoFill = localCoverages.length > 0

  // Effective display values (formatted IDR strings)
  const displaySI      = hasAutoFill ? covTotalSI.toLocaleString("id-ID") : form.sum_insured
  const displayPremium = hasAutoFill ? covTotalPremium.toLocaleString("id-ID") : form.premium_amount

  const commissionAmount = useMemo(() => {
    const p = hasAutoFill ? covTotalPremium : rawIDR(form.premium_amount)
    const r = parseFloat(form.commission_rate) || 0
    return Math.round(p * r / 100)
  }, [hasAutoFill, covTotalPremium, form.premium_amount, form.commission_rate])

  const commissionTaxAmount = useMemo(() => {
    const taxRate = parseFloat(form.commission_tax_rate) || 0
    return Math.round(commissionAmount * taxRate / 100)
  }, [commissionAmount, form.commission_tax_rate])

  const netCommissionAmount = commissionAmount - commissionTaxAmount

  const duration = useMemo(() => {
    if (!form.coverage_start || !form.coverage_end) return null
    const days = Math.round(
      (new Date(form.coverage_end).getTime() - new Date(form.coverage_start).getTime()) / 86_400_000
    )
    if (days <= 0) return null
    return days >= 360 ? `${Math.round(days / 365 * 10) / 10} tahun` : `${days} hari`
  }, [form.coverage_start, form.coverage_end])

  const covPreviewPremium = useMemo(() => {
    const s = rawIDR(covForm.sum_insured)
    const r = Number(covForm.rate_permille)
    return s > 0 && r > 0 ? Math.round(s * r / 1000) : null
  }, [covForm.sum_insured, covForm.rate_permille])

  // ── Field handlers ────────────────────────────────────────────────────────

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function clearCustomer() {
    set("customer_id", "")
    setCustomerSearch("")
    setComboKey(k => k + 1)
  }

  function handleProductChange(code: string) {
    set("product_type", code)
    const match = masterProducts.find(p => p.product_code === code)
    if (match) {
      set("commission_rate", parseFloat(match.commission_rate).toString())
      if (match.default_tax_rate != null) {
        set("commission_tax_rate", String(match.default_tax_rate * 100))
      }
      setCommissionSource({ kind: "product", name: match.product_name })
    } else {
      setCommissionSource(null)
    }
  }

  function handleStartDate(value: string) {
    set("coverage_start", value)
    if (endDateAuto && value) {
      const d = new Date(value)
      d.setFullYear(d.getFullYear() + 1)
      d.setDate(d.getDate() - 1)
      set("coverage_end", d.toISOString().split("T")[0])
    }
  }

  function handleEndDate(value: string) {
    set("coverage_end", value)
    setEndDateAuto(false)
  }

  function handlePolicyNumber(value: string) {
    set("policy_number", value)
    if (value.length >= 2) {
      const prefix = value.slice(0, 2)
      const match = masterProducts.find(p =>
        p.policy_prefixes?.split(",").map(s => s.trim()).includes(prefix)
      )
      setPrefixHint(match && match.product_code !== form.product_type ? match : null)
    } else {
      setPrefixHint(null)
    }
  }

  function applyPrefixHint() {
    if (!prefixHint) return
    set("product_type", prefixHint.product_code)
    set("commission_rate", parseFloat(prefixHint.commission_rate).toString())
    if (prefixHint.default_tax_rate != null) {
      set("commission_tax_rate", String(prefixHint.default_tax_rate * 100))
    }
    setCommissionSource({ kind: "product", name: prefixHint.product_name })
    setPrefixHint(null)
  }

  // ── Co-assurance handlers ─────────────────────────────────────────────────

  function openAddCa() {
    setEditingCa(null)
    setCaForm({ ...EMPTY_CA, _id: "" })
    setCaError(null)
    setCaDialog(true)
  }

  function openEditCa(ca: LocalCoassurance) {
    setEditingCa(ca)
    setCaForm({ ...ca })
    setCaError(null)
    setCaDialog(true)
  }

  function saveCa() {
    if (!caForm.co_insurer_name.trim() || !caForm.share_percent) {
      setCaError("Nama ko-insurer dan share % wajib diisi")
      return
    }
    if (editingCa) {
      setCoassurances(prev => prev.map(c => c._id === editingCa._id ? { ...caForm } : c))
    } else {
      setCoassurances(prev => [...prev, { ...caForm, _id: crypto.randomUUID() }])
    }
    setCaDialog(false)
  }

  function deleteCa(id: string) {
    setCoassurances(prev => prev.filter(c => c._id !== id))
  }

  const caTotalPct = coassurances.reduce((s, c) => s + (parseFloat(c.share_percent) || 0), 0)

  // ── Coverage item handlers ────────────────────────────────────────────────

  function openAddCov() {
    setEditingCov(null)
    setCovForm(EMPTY_COV_FORM)
    setCovError(null)
    setCovDialogOpen(true)
  }

  function openEditCov(cov: LocalCoverage) {
    setEditingCov(cov)
    setCovForm({
      coverage_type:  cov.coverage_type,
      coverage_label: cov.coverage_label,
      sum_insured:    cov.sum_insured.toLocaleString("id-ID"),  // format for display
      rate_permille:  String(cov.rate_permille),
    })
    setCovError(null)
    setCovDialogOpen(true)
  }

  function saveCov() {
    const si = rawIDR(covForm.sum_insured)
    const rp = Number(covForm.rate_permille)
    if (!covForm.coverage_type || !si || !rp) {
      setCovError("Kategori, UP, dan Rate wajib diisi")
      return
    }
    const premium = Math.round(si * rp / 1000)
    if (editingCov) {
      setLocalCoverages(prev => prev.map(c =>
        c._id === editingCov._id
          ? { ...c, coverage_type: covForm.coverage_type, coverage_label: covForm.coverage_label, sum_insured: si, rate_permille: rp, premium_amount: premium }
          : c
      ))
    } else {
      setLocalCoverages(prev => [...prev, {
        _id: crypto.randomUUID(),
        coverage_type: covForm.coverage_type,
        coverage_label: covForm.coverage_label,
        sum_insured: si,
        rate_permille: rp,
        premium_amount: premium,
      }])
    }
    setCovDialogOpen(false)
  }

  function deleteCov(cov: LocalCoverage) {
    setLocalCoverages(prev => prev.filter(c => c._id !== cov._id))
    setDeletingCov(null)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    if (!form.customer_id || !form.insurer_id || !form.product_type) {
      setError("Nasabah, insurer, dan jenis produk wajib diisi"); return
    }
    if (!form.coverage_start || !form.coverage_end) {
      setError("Tanggal coverage wajib diisi"); return
    }

    setSubmitting(true)
    setError(null)

    const finalSI      = hasAutoFill ? covTotalSI      : rawIDR(form.sum_insured)
    const finalPremium = hasAutoFill ? covTotalPremium  : rawIDR(form.premium_amount)

    try {
      const taxRatePct = parseFloat(form.commission_tax_rate) || 0

      const payload: CreatePolicyPayload = {
        insurer_id:          form.insurer_id,
        customer_id:         form.customer_id,
        policy_number:       form.policy_number,
        product_type:        form.product_type as any,
        coverage_start:      form.coverage_start,
        coverage_end:        form.coverage_end,
        sum_insured:         finalSI,
        premium_amount:      finalPremium,
        materai_amount:      rawIDR(form.materai_amount) || undefined,
        commission_rate:     form.commission_rate ? Number(form.commission_rate) : (undefined as any),
        commission_tax_rate: taxRatePct > 0 ? taxRatePct / 100 : undefined,
        policy_year:         Number(form.policy_year) || 1,
        object_insured:      form.object_insured  || undefined,
        coverage_notes:      form.coverage_notes  || undefined,
        notes:               form.notes           || undefined,
      }

      const { policy_id } = await createPolicy(token, payload)

      if (!isEndorsement && localCoverages.length > 0) {
        for (const cov of localCoverages) {
          await addCoverage(token, policy_id, {
            coverage_type:  cov.coverage_type,
            coverage_label: cov.coverage_label || undefined,
            sum_insured:    cov.sum_insured,
            rate_permille:  cov.rate_permille,
          })
        }
      }

      if (isCoassurance && coassurances.length > 0) {
        for (const ca of coassurances) {
          await addCoassuranceParticipant(token, policy_id, {
            co_insurer_name:   ca.co_insurer_name,
            is_leader:         ca.is_leader,
            share_percent:     parseFloat(ca.share_percent) || 0,
            sum_insured_share: rawIDR(ca.sum_insured_share) || undefined,
            premium_share:     rawIDR(ca.premium_share) || undefined,
            commission_rate:   parseFloat(ca.commission_rate) || undefined,
          })
        }
      }

      router.push(`/agentra/policies/${policy_id}`)
    } catch (err: any) {
      setError(err.message ?? "Gagal membuat polis")
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar /><MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Tambah Polis Baru" />
        </Box>

        <Flex flexDir="column" gap="20px" p={{ base: "16px", md: "32px" }}>

          {/* Header */}
          <Flex align="center" gap="12px">
            <Button size="sm" variant="ghost" color="#64748B" onClick={() => router.back()} px="0">
              <LuArrowLeft size={16} />
            </Button>
            <Box p="8px" bg="#EFF6FF" borderRadius="10px" color="#1D4ED8">
              <LuFileText size={20} />
            </Box>
            <Flex flexDir="column">
              <Text color="#1C2833" fontSize="18px" fontWeight="bold">Tambah Polis Baru</Text>
              <Text color="#94A3B8" fontSize="12px">Lengkapi semua informasi polis</Text>
            </Flex>
          </Flex>

          <form onSubmit={submit}>
            <Flex flexDir="column" gap="16px">

              <Flex gap="16px" align="flex-start" flexWrap="wrap">

                {/* ── LEFT: Identitas ─────────────────────────────────── */}
                <Box flex="1" minW="340px">
                  <Section title="Identitas Polis">
                    <Flex flexDir="column" gap="16px">

                      {/* Endorsement toggle */}
                      {/* <Flex
                        align="center" justify="space-between" px="14px" py="10px"
                        bg={isEndorsement ? "#FEF3C7" : "#F8FAFC"}
                        borderRadius="8px" border="1px solid"
                        borderColor={isEndorsement ? "#FDE68A" : "#E2E8F0"}
                      >
                        <Flex flexDir="column" gap="1px">
                          <Text fontSize="13px" fontWeight="semibold" color={isEndorsement ? "#92400E" : "#1C2833"}>
                            Endorsement
                          </Text>
                          <Text fontSize="11px" color={isEndorsement ? "#B45309" : "#94A3B8"}>
                            {isEndorsement
                              ? "Item coverage tidak tersedia untuk endorsement"
                              : "Aktifkan jika ini adalah endorsement polis"}
                          </Text>
                        </Flex>
                        <Switch.Root
                          checked={isEndorsement}
                          onCheckedChange={(e) => setIsEndorsement(e.checked)}
                          colorPalette="yellow" size="sm"
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex> */}

                      {/* Customer — show combobox OR selected card */}
                      <FField label="Nasabah" required>
                        {form.customer_id ? (
                          <Flex
                            align="center" justify="space-between" px="12px" py="10px"
                            bg="#F0FDF4" border="1px solid" borderColor="#BBF7D0" borderRadius="8px"
                          >
                            <Flex flexDir="column" gap="1px">
                              <Text fontSize="13px" fontWeight="medium" color="#15803D">
                                {selectedCustomer?.display_name}
                              </Text>
                              <Text fontSize="11px" color="#86EFAC">
                                {selectedCustomer?.customer_type === "company" ? "Korporat" : "Individu"}
                              </Text>
                            </Flex>
                            <Button
                              size="xs" variant="ghost" color="#64748B" gap="4px"
                              _hover={{ bg: "#FEF2F2", color: "#DC2626" }}
                              onClick={clearCustomer}
                            >
                              <LuX size={11} /> Ganti
                            </Button>
                          </Flex>
                        ) : (
                          <Combobox.Root
                            key={comboKey}
                            collection={customerCollection}
                            value={[]}
                            onValueChange={({ value }) => {
                              if (value[0]) set("customer_id", value[0])
                            }}
                            onInputValueChange={({ inputValue }) => setCustomerSearch(inputValue)}
                            openOnClick
                          >
                            <Combobox.Control
                              bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                              px="10px" h="40px" display="flex" alignItems="center"
                            >
                              <Combobox.Input
                                placeholder="Ketik nama nasabah untuk mencari..."
                                fontSize="13px" color="#1C2833"
                                border="none" outline="none" bg="transparent" flex="1" h="100%"
                              />
                              <Combobox.IndicatorGroup>
                                <Combobox.Trigger color="#94A3B8" />
                              </Combobox.IndicatorGroup>
                            </Combobox.Control>
                            <Combobox.Positioner>
                              <Combobox.Content
                                bg="white" border="1px solid" borderColor="#E2E8F0"
                                borderRadius="8px" shadow="lg" maxH="220px" overflowY="auto" zIndex={20}
                              >
                                <Combobox.Empty px="12px" py="10px" fontSize="13px" color="#94A3B8">
                                  Nasabah tidak ditemukan
                                </Combobox.Empty>
                                {customerCollection.items.map(item => (
                                  <Combobox.Item
                                    key={item.value} item={item}
                                    px="12px" py="9px" cursor="pointer"
                                    _hover={{ bg: "#F8FAFC" }} _highlighted={{ bg: "#EFF6FF" }}
                                  >
                                    <Flex align="center" justify="space-between" gap="8px">
                                      <Combobox.ItemText fontSize="13px" color="#1C2833">{item.label}</Combobox.ItemText>
                                      <Text
                                        fontSize="10px" fontWeight="medium" px="6px" py="1px" borderRadius="4px"
                                        bg={item.type === "company" ? "#F3E8FF" : "#E5EFF5"}
                                        color={item.type === "company" ? "#7E22CE" : "#006397"}
                                      >
                                        {item.type === "company" ? "Korporat" : "Individu"}
                                      </Text>
                                    </Flex>
                                    <Combobox.ItemIndicator color="#1D4ED8" />
                                  </Combobox.Item>
                                ))}
                              </Combobox.Content>
                            </Combobox.Positioner>
                          </Combobox.Root>
                        )}
                      </FField>

                      <FField label="Perusahaan Asuransi" required>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            {...INPUT}
                            value={form.insurer_id}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("insurer_id", e.target.value)}
                          >
                            <option value="">Pilih insurer</option>
                            {insurers.map(i => (
                              <option key={i.insurer_id} value={i.insurer_id}>{i.name}</option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </FField>

                      <FField label="Nomor Polis" required>
                        <Input
                          {...INPUT}
                          placeholder="Contoh: 01/001/2024/00001"
                          value={form.policy_number}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePolicyNumber(e.target.value)}
                          required
                        />
                        {prefixHint && (
                          <Flex
                            align="center" gap="6px" mt="2px" px="10px" py="7px"
                            bg="#FFFBEB" border="1px solid" borderColor="#FDE68A" borderRadius="6px"
                            cursor="pointer" onClick={applyPrefixHint} _hover={{ bg: "#FEF3C7" }}
                          >
                            <LuZap size={11} color="#D97706" />
                            <Text fontSize="11px" color="#92400E">
                              Prefiks &ldquo;{form.policy_number.slice(0, 2)}&rdquo; → <Text as="strong">{prefixHint.product_name}</Text>{" "}
                              ({parseFloat(prefixHint.commission_rate).toFixed(0)}%) — Klik terapkan
                            </Text>
                          </Flex>
                        )}
                      </FField>

                      <Flex gap="12px" w="100%">
                        <FField label="Jenis Produk" required>
                          <NativeSelect.Root flex="1">
                            <NativeSelect.Field
                              {...INPUT}
                              value={form.product_type}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleProductChange(e.target.value)}
                            >
                              <option value="">Pilih produk</option>
                              {productOptions.map(p => (
                                <option key={p.product_code} value={p.product_code}>{p.product_name}</option>
                              ))}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </FField>
                        <FField label="Tahun">
                          <Input
                            {...INPUT} w="72px" type="number" min={1} max={10}
                            value={form.policy_year}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policy_year", e.target.value)}
                          />
                        </FField>
                      </Flex>

                      <FField label="Objek Pertanggungan">
                        <Input
                          {...INPUT}
                          placeholder="Mis: Honda Civic 2020 B 1234 ABC"
                          value={form.object_insured}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("object_insured", e.target.value)}
                        />
                      </FField>

                    </Flex>
                  </Section>
                </Box>

                {/* ── RIGHT: Periode + Finansial + Coverage + Notes ─── */}
                <Flex flexDir="column" gap="16px" flex="1" minW="320px">

                  {/* Periode */}
                  <Section title="Periode Pertanggungan">
                    <Flex gap="12px" align="center" flexWrap="wrap">
                      <FField label="Mulai" required>
                        <Input
                          {...INPUT} w="160px" type="date"
                          value={form.coverage_start}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartDate(e.target.value)}
                          required
                        />
                      </FField>
                      <Text color="#94A3B8" fontSize="16px">→</Text>
                      <FField
                        label="Selesai" required
                        
                      >
                        <Input
                          {...INPUT} w="160px" type="date"
                          value={form.coverage_end}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEndDate(e.target.value)}
                          required
                        />
                      </FField>
                      {duration && (
                        <Box px="12px" py="5px" borderRadius="20px" bg="#DBEAFE">
                          <Text fontSize="12px" fontWeight="semibold" color="#1D4ED8">{duration}</Text>
                        </Box>
                      )}
                    </Flex>
                  </Section>

                  {/* Premi & Komisi */}
                  <Section title="Premi & Komisi">
                    <Flex flexDir="column" gap="16px">

                      <Flex gap="16px" flexWrap="wrap">
                        <FField
                          label="Nilai Pertanggungan / TSI (IDR)" required
                          hint={hasAutoFill ? "Auto dari item coverage" : undefined}
                        >
                          <Input
                            {...INPUT_LG} minW="140px"
                            inputMode="numeric" placeholder="0"
                            value={displaySI}
                            readOnly={hasAutoFill}
                            bg={hasAutoFill ? "#F8FAFC" : "white"}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("sum_insured", toIDR(e.target.value))
                            }
                          />
                        </FField>
                        <FField
                          label="Premi Nett (IDR)" required
                          hint={hasAutoFill ? "Auto dari item coverage" : undefined}
                        >
                          <Input
                            {...INPUT_LG} flex="1" minW="140px"
                            inputMode="numeric" placeholder="0"
                            value={displayPremium}
                            readOnly={hasAutoFill}
                            bg={hasAutoFill ? "#F8FAFC" : "white"}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("premium_amount", toIDR(e.target.value))
                            }
                          />
                        </FField>
                        <FField label="Materai (IDR)">
                          <Input
                            {...INPUT_LG} w="140px"
                            inputMode="numeric" placeholder="0"
                            value={form.materai_amount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("materai_amount", toIDR(e.target.value))
                            }
                          />
                        </FField>
                      </Flex>

                      {/* Commission */}
                      <Box bg="#F8FAFC" borderRadius="10px" border="1px solid" borderColor="#E2E8F0" p="14px">
                        <Flex align="center" gap="8px" mb="10px">
                          <Text fontSize="13px" fontWeight="semibold" color="#1C2833">Komisi</Text>
                          {commissionSource?.kind === "product" && (
                            <Flex align="center" gap="4px" px="8px" py="2px" borderRadius="20px" bg="#DBEAFE">
                              <LuZap size={10} color="#1D4ED8" />
                              <Text fontSize="10px" color="#1D4ED8" fontWeight="semibold">Auto: {commissionSource.name}</Text>
                            </Flex>
                          )}
                          {commissionSource?.kind === "manual" && (
                            <Box px="8px" py="2px" borderRadius="20px" bg="#F1F5F9">
                              <Text fontSize="10px" color="#64748B">Custom</Text>
                            </Box>
                          )}
                          {!commissionSource && masterProducts.length > 0 && (
                            <Text fontSize="10px" color="#94A3B8">Pilih produk untuk auto-isi</Text>
                          )}
                        </Flex>
                        <Flex gap="16px" align="flex-start" flexWrap="wrap">
                          {/* Rate inputs */}
                          <Flex align="center" gap="16px" flexWrap="wrap">
                            <Flex flexDir="column" gap="4px">
                              <Text fontSize="10px" color="#64748B">Rate Komisi</Text>
                              <Flex align="center" gap="6px">
                                <Input
                                  bg="white" border="1px solid" borderColor="#E2E8F0"
                                  borderRadius="8px" fontSize="15px" fontWeight="semibold" color="#1C2833"
                                  h="40px" w="90px" type="number" min={0} max={100} step="0.01"
                                  placeholder="0"
                                  value={form.commission_rate}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    set("commission_rate", e.target.value)
                                    setCommissionSource({ kind: "manual" })
                                  }}
                                />
                                <Text fontSize="14px" color="#64748B">%</Text>
                              </Flex>
                            </Flex>
                            <Flex flexDir="column" gap="4px">
                              <Text fontSize="10px" color="#64748B">PPh / Pajak</Text>
                              <Flex align="center" gap="6px">
                                <Input
                                  bg="white" border="1px solid" borderColor="#E2E8F0"
                                  borderRadius="8px" fontSize="15px" fontWeight="semibold" color="#1C2833"
                                  h="40px" w="90px" type="number" min={0} max={100} step="0.01"
                                  placeholder="2.5"
                                  value={form.commission_tax_rate}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    set("commission_tax_rate", e.target.value)
                                  }
                                />
                                <Text fontSize="14px" color="#64748B">%</Text>
                              </Flex>
                            </Flex>
                          </Flex>

                          {/* Breakdown preview */}
                          {commissionAmount > 0 && (
                            <Box px="14px" py="10px" borderRadius="10px" bg="#F0FDF4" border="1px solid" borderColor="#BBF7D0" minW="180px">
                              <Text fontSize="10px" color="#64748B" mb="6px" fontWeight="semibold">ESTIMASI KOMISI</Text>
                              <Flex justify="space-between" align="center" mb="2px">
                                <Text fontSize="11px" color="#64748B">Gross</Text>
                                <Text fontSize="13px" fontWeight="semibold" color="#16A34A">{fmt(commissionAmount)}</Text>
                              </Flex>
                              {commissionTaxAmount > 0 && (
                                <Flex justify="space-between" align="center" mb="2px">
                                  <Text fontSize="11px" color="#64748B">PPh ({form.commission_tax_rate}%)</Text>
                                  <Text fontSize="12px" color="#DC2626">−{fmt(commissionTaxAmount)}</Text>
                                </Flex>
                              )}
                              <Box borderTop="1px solid" borderColor="#BBF7D0" pt="4px" mt="4px">
                                <Flex justify="space-between" align="center">
                                  <Text fontSize="11px" color="#15803D" fontWeight="semibold">Net</Text>
                                  <Text fontSize="14px" fontWeight="bold" color="#15803D">{fmt(netCommissionAmount)}</Text>
                                </Flex>
                              </Box>
                            </Box>
                          )}
                        </Flex>
                      </Box>

                    </Flex>
                  </Section>

                  {/* Coverage items (hidden when endorsement) */}
                  {!isEndorsement && (
                    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                      <Flex
                        px="20px" py="14px" justify="space-between" align="center"
                        borderBottom="1px solid" borderColor="#E2E8F0"
                      >
                        <Box borderLeft="3px solid #1A3557" pl="10px">
                          <Text color="#1A3557" fontSize="14px" fontWeight="semibold">Item Coverage</Text>
                        </Box>
                        <Button
                          size="sm" bg="#1A3557" color="white" fontSize="12px" gap="4px"
                          borderRadius="6px" _hover={{ bg: "#162C47" }} onClick={openAddCov}
                        >
                          <LuPlus size={12} /> Tambah Item
                        </Button>
                      </Flex>

                      {localCoverages.length === 0 ? (
                        <Flex px="16px" py="24px" align="center" justify="center">
                          <Text color="#94A3B8" fontSize="13px">
                            Belum ada item. Klik &quot;+ Tambah Item&quot; untuk mulai.
                          </Text>
                        </Flex>
                      ) : (
                        <>
                          {localCoverages.map((cov, idx) => (
                            <Flex
                              key={cov._id} flexDir="column" gap="6px"
                              px="16px" py="12px"
                              borderBottom="1px solid" borderColor="#F1F5F9"
                              bg={idx % 2 === 0 ? "white" : "#FAFBFC"}
                            >
                              {/* Top row: name + action buttons */}
                              <Flex align="center" justify="space-between" gap="8px">
                                <Flex align="center" gap="6px" minW="0">
                                  <Text color="#1C2833" fontSize="13px" fontWeight="medium">
                                    {COVERAGE_TYPE_LABELS[cov.coverage_type]}
                                  </Text>
                                  {cov.coverage_label && (
                                    <Text color="#94A3B8" fontSize="11px" truncate>— {cov.coverage_label}</Text>
                                  )}
                                </Flex>
                                <Flex gap="4px" flexShrink={0}>
                                  <IconButton
                                    size="xs" variant="ghost" aria-label="Edit"
                                    color="#64748B" _hover={{ bg: "#EFF6FF", color: "#1D4ED8" }}
                                    onClick={() => openEditCov(cov)}
                                  >
                                    <LuPencil size={12} />
                                  </IconButton>
                                  <IconButton
                                    size="xs" variant="ghost" aria-label="Hapus"
                                    color="#94A3B8" _hover={{ bg: "#FEF2F2", color: "#DC2626" }}
                                    onClick={() => setDeletingCov(cov)}
                                  >
                                    <LuTrash2 size={12} />
                                  </IconButton>
                                </Flex>
                              </Flex>
                              {/* Bottom row: financial details */}
                              <Flex gap="16px" flexWrap="wrap">
                                <Text color="#64748B" fontSize="12px">
                                  UP: <Text as="span" color="#1C2833" fontWeight="medium">
                                    Rp {cov.sum_insured.toLocaleString("id-ID")}
                                  </Text>
                                </Text>
                                <Text color="#64748B" fontSize="12px">
                                  Rate: <Text as="span" color="#1C2833" fontWeight="medium">{cov.rate_permille}‰</Text>
                                </Text>
                                <Text color="#64748B" fontSize="12px">
                                  Premi: <Text as="span" color="#1A3557" fontWeight="semibold">
                                    Rp {cov.premium_amount.toLocaleString("id-ID")}
                                  </Text>
                                </Text>
                              </Flex>
                            </Flex>
                          ))}

                          {/* Total row */}
                          <Flex px="16px" py="10px" justify="space-between" align="center" bg="#F1F5F9">
                            <Text color="#64748B" fontSize="12px" fontWeight="semibold">
                              Total UP: Rp {covTotalSI.toLocaleString("id-ID")}
                            </Text>
                            <Text color="#1A3557" fontSize="13px" fontWeight="bold">
                              Total Premi: Rp {covTotalPremium.toLocaleString("id-ID")}
                            </Text>
                          </Flex>
                        </>
                      )}
                    </Box>
                  )}

                  {/* Co-assurance */}
                  <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                    <Flex
                      px="20px" py="14px" justify="space-between" align="center"
                      borderBottom={isCoassurance ? "1px solid" : undefined}
                      borderColor="#E2E8F0"
                    >
                      <Flex flexDir="column" gap="2px">
                        <Box borderLeft="3px solid #1A3557" pl="10px">
                          <Text color="#1A3557" fontSize="14px" fontWeight="semibold">Ko-Asuransi</Text>
                        </Box>
                        <Text fontSize="11px" color="#94A3B8" pl="13px">Aktifkan jika ada ko-penanggung pada polis ini</Text>
                      </Flex>
                      <Switch.Root
                        checked={isCoassurance}
                        onCheckedChange={(e) => { setIsCoassurance(e.checked); if (!e.checked) setCoassurances([]) }}
                        colorPalette="blue" size="sm"
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    </Flex>

                    {isCoassurance && (
                      <Box px="20px" pb="16px">
                        <Flex justify="space-between" align="center" py="12px">
                          <Flex gap="8px" align="center">
                            {coassurances.length > 0 && (
                              <Box
                                px="8px" py="2px" borderRadius="full" fontSize="11px" fontWeight="semibold"
                                bg={Math.abs(caTotalPct - 100) < 0.01 ? "#DCFCE7" : "#FEF3C7"}
                                color={Math.abs(caTotalPct - 100) < 0.01 ? "#16A34A" : "#D97706"}
                              >
                                Total: {caTotalPct.toFixed(1)}%
                                {Math.abs(caTotalPct - 100) < 0.01 ? " ✓" : " (harus 100%)"}
                              </Box>
                            )}
                          </Flex>
                          <Button
                            size="sm" bg="#1A3557" color="white" fontSize="12px" gap="4px"
                            borderRadius="6px" _hover={{ bg: "#162C47" }} onClick={openAddCa}
                          >
                            <LuPlus size={12} /> Tambah Ko-Insurer
                          </Button>
                        </Flex>

                        {coassurances.length > 0 && (
                          <Box borderRadius="8px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                            <Table.Root size="sm">
                              <Table.Header>
                                <Table.Row bg="#F8FAFC">
                                  {["NAMA", "LEADER", "SHARE %", "AKSI"].map(h => (
                                    <Table.ColumnHeader key={h} px="10px" py="8px" fontSize="10px" color="#64748B" fontWeight="bold" letterSpacing="0.05em">{h}</Table.ColumnHeader>
                                  ))}
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {coassurances.map(ca => (
                                  <Table.Row key={ca._id} borderBottom="1px solid" borderColor="#F1F5F9">
                                    <Table.Cell px="10px" py="8px">
                                      <Text fontSize="12px" color="#1C2833" fontWeight="medium">{ca.co_insurer_name}</Text>
                                    </Table.Cell>
                                    <Table.Cell px="10px" py="8px">
                                      {ca.is_leader && (
                                        <Box px="6px" py="1px" borderRadius="4px" bg="#DBEAFE" fontSize="10px" fontWeight="bold" color="#1D4ED8" display="inline-block">
                                          Leader
                                        </Box>
                                      )}
                                    </Table.Cell>
                                    <Table.Cell px="10px" py="8px">
                                      <Text fontSize="12px" color="#1C2833">{ca.share_percent}%</Text>
                                    </Table.Cell>
                                    <Table.Cell px="10px" py="8px">
                                      <Flex gap="4px">
                                        <IconButton size="xs" variant="ghost" color="#64748B" _hover={{ bg: "#EFF6FF", color: "#1D4ED8" }} aria-label="Edit" onClick={() => openEditCa(ca)}>
                                          <LuPencil size={11} />
                                        </IconButton>
                                        <IconButton size="xs" variant="ghost" color="#94A3B8" _hover={{ bg: "#FEF2F2", color: "#DC2626" }} aria-label="Hapus" onClick={() => deleteCa(ca._id)}>
                                          <LuTrash2 size={11} />
                                        </IconButton>
                                      </Flex>
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Box>
                        )}

                        {coassurances.length === 0 && (
                          <Flex py="16px" align="center" justify="center">
                            <Text color="#94A3B8" fontSize="12px">Belum ada ko-insurer. Klik &quot;Tambah Ko-Insurer&quot;.</Text>
                          </Flex>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Notes */}
                  <Section title="Catatan (Opsional)">
                    <Flex flexDir="column" gap="12px">
                      <FField label="Catatan Coverage">
                        <Textarea
                          bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                          fontSize="13px" color="#1C2833" rows={3}
                          placeholder="Klausul khusus, pengecualian, ekstensi coverage..."
                          value={form.coverage_notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("coverage_notes", e.target.value)}
                        />
                      </FField>
                      <FField label="Catatan Internal">
                        <Textarea
                          bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px"
                          fontSize="13px" color="#1C2833" rows={3}
                          placeholder="Catatan untuk agen, tidak terlihat oleh nasabah..."
                          value={form.notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("notes", e.target.value)}
                        />
                      </FField>
                    </Flex>
                  </Section>

                </Flex>

              </Flex>

              {error && (
                <Box px="14px" py="10px" borderRadius="8px" bg="#FEF2F2" border="1px solid" borderColor="#FECACA">
                  <Text fontSize="13px" color="#DC2626">{error}</Text>
                </Box>
              )}

              <Flex gap="12px" justify="flex-end" pb="16px">
                <Button
                  variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px"
                  onClick={() => router.back()} type="button"
                >
                  Batal
                </Button>
                <Button
                  type="submit" bg="#1A3557" color="white" fontSize="13px" fontWeight="semibold"
                  loading={submitting} _hover={{ bg: "#162C47" }}
                >
                  Simpan Polis
                </Button>
              </Flex>

            </Flex>
          </form>

        </Flex>
      </Box>

      {/* ── Add/Edit coverage dialog ────────────────────────────────────────── */}
      <Dialog.Root
        open={covDialogOpen}
        onOpenChange={({ open }) => { if (!open) { setCovDialogOpen(false); setCovError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.45)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="16px" maxW="420px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                {editingCov ? "Edit Item Coverage" : "Tambah Item Coverage"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Flex flexDir="column" gap="14px">

                <FField label="Kategori" required>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      {...INPUT}
                      value={covForm.coverage_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setCovForm(f => ({ ...f, coverage_type: e.target.value as ApiCoverageType }))
                      }
                    >
                      {(Object.entries(COVERAGE_TYPE_LABELS) as [ApiCoverageType, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </FField>

                <FField label="Label (Opsional)">
                  <Input
                    {...INPUT}
                    placeholder="Contoh: Stok 1, Bangunan Utama"
                    value={covForm.coverage_label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCovForm(f => ({ ...f, coverage_label: e.target.value }))
                    }
                  />
                </FField>

                <FField label="Uang Pertanggungan (IDR)" required>
                  <Input
                    {...INPUT} h="44px" fontSize="15px"
                    inputMode="numeric"
                    placeholder="0"
                    value={covForm.sum_insured}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCovForm(f => ({ ...f, sum_insured: toIDR(e.target.value) }))
                    }
                  />
                </FField>

                <FField label="Rate (‰)" required>
                  <Input
                    {...INPUT}
                    type="number" min={0} step="0.0001" placeholder="2.28"
                    value={covForm.rate_permille}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCovForm(f => ({ ...f, rate_permille: e.target.value }))
                    }
                  />
                  {covPreviewPremium !== null && (
                    <Flex
                      mt="4px" px="12px" py="6px" borderRadius="8px"
                      bg="#EFF6FF" align="center" justify="space-between"
                    >
                      <Text fontSize="11px" color="#64748B">Preview Premi</Text>
                      <Text fontSize="13px" fontWeight="bold" color="#1D4ED8">
                        Rp {covPreviewPremium.toLocaleString("id-ID")}
                      </Text>
                    </Flex>
                  )}
                </FField>

                {covError && <Text fontSize="12px" color="#DC2626">{covError}</Text>}

              </Flex>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Dialog.ActionTrigger asChild>
                <Button flex="1" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px">Batal</Button>
              </Dialog.ActionTrigger>
              <Button flex="1" bg="#1A3557" color="white" fontSize="14px" onClick={saveCov}>
                Simpan
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Delete coverage confirm ─────────────────────────────────────────── */}
      <Dialog.Root
        open={deletingCov !== null}
        onOpenChange={({ open }) => { if (!open) setDeletingCov(null) }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.45)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="16px" maxW="380px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Hapus Item Coverage</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Text color="#64748B" fontSize="14px" lineHeight="1.6">
                Hapus{" "}
                <Text as="strong" color="#1C2833">
                  {deletingCov
                    ? COVERAGE_TYPE_LABELS[deletingCov.coverage_type] +
                      (deletingCov.coverage_label ? ` – ${deletingCov.coverage_label}` : "")
                    : ""}
                </Text>?
              </Text>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Dialog.ActionTrigger asChild>
                <Button flex="1" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px">Batal</Button>
              </Dialog.ActionTrigger>
              <Button flex="1" bg="#DC2626" color="white" fontSize="14px"
                onClick={() => deletingCov && deleteCov(deletingCov)}>
                Ya, Hapus
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ── Co-assurance add/edit dialog ───────────────────────────────────── */}
      <Dialog.Root
        open={caDialog}
        onOpenChange={({ open }) => { if (!open) { setCaDialog(false); setCaError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.45)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="16px" maxW="440px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                {editingCa ? "Edit Ko-Insurer" : "Tambah Ko-Insurer"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="16px">
              <Flex flexDir="column" gap="14px">

                <FField label="Nama Perusahaan Asuransi" required>
                  <Input
                    {...INPUT}
                    placeholder="PT Asuransi Wahana Tata"
                    value={caForm.co_insurer_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCaForm(f => ({ ...f, co_insurer_name: e.target.value }))
                    }
                  />
                </FField>

                <Flex gap="12px">
                  <FField label="Share (%)" required>
                    <Input
                      {...INPUT}
                      type="number" min={0} max={100} step="0.01" placeholder="60"
                      value={caForm.share_percent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCaForm(f => ({ ...f, share_percent: e.target.value }))
                      }
                    />
                  </FField>
                  <FField label="Rate Komisi (%)">
                    <Input
                      {...INPUT}
                      type="number" min={0} max={100} step="0.01" placeholder="15"
                      value={caForm.commission_rate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCaForm(f => ({ ...f, commission_rate: e.target.value }))
                      }
                    />
                  </FField>
                </Flex>

                <Flex gap="12px">
                  <FField label="UP Share (IDR)">
                    <Input
                      {...INPUT}
                      inputMode="numeric" placeholder="300.000.000"
                      value={caForm.sum_insured_share}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCaForm(f => ({ ...f, sum_insured_share: toIDR(e.target.value) }))
                      }
                    />
                  </FField>
                  <FField label="Premi Share (IDR)">
                    <Input
                      {...INPUT}
                      inputMode="numeric" placeholder="3.000.000"
                      value={caForm.premium_share}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCaForm(f => ({ ...f, premium_share: toIDR(e.target.value) }))
                      }
                    />
                  </FField>
                </Flex>

                <Flex align="center" gap="10px" px="14px" py="10px" bg="#F8FAFC" borderRadius="8px" border="1px solid" borderColor="#E2E8F0">
                  <Switch.Root
                    checked={caForm.is_leader}
                    onCheckedChange={(e) => setCaForm(f => ({ ...f, is_leader: e.checked }))}
                    colorPalette="blue" size="sm"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                  </Switch.Root>
                  <Flex flexDir="column" gap="1px">
                    <Text fontSize="13px" color="#1C2833" fontWeight="medium">Leader</Text>
                    <Text fontSize="11px" color="#94A3B8">Tandai sebagai insurer leader</Text>
                  </Flex>
                </Flex>

                {caError && <Text fontSize="12px" color="#DC2626">{caError}</Text>}

              </Flex>
            </Dialog.Body>
            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Dialog.ActionTrigger asChild>
                <Button flex="1" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px">Batal</Button>
              </Dialog.ActionTrigger>
              <Button flex="1" bg="#1A3557" color="white" fontSize="14px" onClick={saveCa}>
                Simpan
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <MobileBottomNav />
    </Box>
  )
}
