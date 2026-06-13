"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Box, Button, Combobox, createListCollection, Flex, Input, NativeSelect, Text, Textarea,
} from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuArrowLeft, LuFileText } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { createPolicy, type ApiProductType, type CreatePolicyPayload } from "@/lib/api/policies"
import { getCustomers, type ApiCustomer } from "@/lib/api/customers"
import { getInsurers, getInsurerProducts, type ApiInsurer, type ApiInsurerProduct } from "@/lib/api/insurers"

const PRODUCT_LABELS: Record<ApiProductType, string> = {
  fire:        "Asuransi Kebakaran",
  motorcycle:  "Asuransi Motor",
  car:         "Asuransi Kendaraan",
  travel:      "Asuransi Perjalanan",
  cargo:       "Asuransi Kargo",
  other:       "Asuransi Lainnya",
  kecelakaan:  "Asuransi Kecelakaan",
  aep:         "AEP",
}

const lbl = { color: "#5D6D7E", fontSize: "12px", fontWeight: "medium" } as const
const inputStyle = {
  bg: "white", color: "#1C2833", border: "1px solid", borderColor: "#E2E8F0",
  borderRadius: "8px", fontSize: "13px",
} as const

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Flex flexDir="column" gap="4px">
      <Text {...lbl}>{label}{required && <Text as="span" color="#DC2626"> *</Text>}</Text>
      {children}
    </Flex>
  )
}

const EMPTY: CreatePolicyPayload = {
  insurer_id: "",
  customer_id: "",
  policy_number: "",
  product_type: "car",
  coverage_start: "",
  coverage_end: "",
  sum_insured: 0,
  premium_amount: 0,
  commission_rate: 0,
  policy_year: 1,
  object_insured: "",
  coverage_notes: "",
  notes: "",
}

export default function NewPolicy() {
  const router = useRouter()

  const [form, setForm]           = useState<CreatePolicyPayload>(EMPTY)
  const [customers, setCustomers]           = useState<ApiCustomer[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [insurers, setInsurers]             = useState<ApiInsurer[]>([])

  const customerCollection = useMemo(() => {
    const q = customerSearch.toLowerCase()
    const filtered = q
      ? customers.filter((c) => c.display_name.toLowerCase().includes(q))
      : customers
    return createListCollection({
      items: filtered.map((c) => ({
        label: c.display_name,
        value: c.customer_id,
        type: c.customer_type,
      })),
    })
  }, [customers, customerSearch])
  const [insurerProducts, setInsurerProducts] = useState<ApiInsurerProduct[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    Promise.all([
      getCustomers(token, { limit: 200 }),
      getInsurers(token, true),
    ]).then(([c, i]) => {
      setCustomers(c.data)
      setInsurers(Array.isArray(i) ? i : (i as any)?.data ?? [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.insurer_id) { setInsurerProducts([]); return }
    const token = getAccessToken()
    if (!token) return
    getInsurerProducts(token, form.insurer_id)
      .then((data) => setInsurerProducts(Array.isArray(data) ? data : []))
      .catch(() => setInsurerProducts([]))
  }, [form.insurer_id])

  function set(field: keyof CreatePolicyPayload, value: string | number) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === "product_type" || field === "insurer_id") {
        const insurerId = field === "insurer_id" ? String(value) : f.insurer_id
        const productType = field === "product_type" ? String(value) : f.product_type
        const match = Array.isArray(insurerProducts) ? insurerProducts.find(
          (p) => p.insurer_id === insurerId && p.product_type === productType && p.is_active
        ) : undefined
        if (match) next.commission_rate = match.commission_rate
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    if (!form.customer_id || !form.insurer_id || !form.product_type) {
      setError("Nasabah, insurer, dan jenis produk wajib diisi")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload: CreatePolicyPayload = {
        ...form,
        sum_insured:     Number(form.sum_insured),
        premium_amount:  Number(form.premium_amount),
        commission_rate: Number(form.commission_rate),
        policy_year:     Number(form.policy_year) || 1,
        object_insured:   form.object_insured   || undefined,
        coverage_notes:   form.coverage_notes   || undefined,
        notes:            form.notes            || undefined,
      }
      const { policy_id } = await createPolicy(token, payload)
      router.push(`/agentra/policies/${policy_id}`)
    } catch (err: any) {
      setError(err.message ?? "Gagal membuat polis")
      setLoading(false)
    }
  }

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar /><MobileHeader />
      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}><TopBar title="Tambah Polis Baru" /></Box>

        <Flex flexDir="column" gap="24px" p="32px">

          {/* Header */}
          <Flex align="center" gap="12px">
            <Button size="sm" variant="ghost" color="#64748B" onClick={() => router.back()} px="0">
              <LuArrowLeft size={16} />
            </Button>
            <Box p="8px" bg="#EFF6FF" borderRadius="10px" color="#1D4ED8"><LuFileText size={20} /></Box>
            <Text color="#1C2833" fontSize="18px" fontWeight="bold">Tambah Polis Baru</Text>
          </Flex>

          <form onSubmit={submit}>
            <Flex flexDir="column" gap="16px">

              {/* Main form card */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                <Text color="#1C2833" fontSize="15px" fontWeight="semibold" mb="20px">Informasi Polis</Text>

                <Flex gap="20px" flexWrap="wrap">

                  <Field label="Nasabah" required>
                    <Combobox.Root
                      collection={customerCollection}
                      value={form.customer_id ? [form.customer_id] : []}
                      onValueChange={({ value }) => set("customer_id", value[0] ?? "")}
                      onInputValueChange={({ inputValue }) => setCustomerSearch(inputValue)}
                      openOnClick
                      minW="220px" flex="1"
                    >
                      <Combobox.Control
                        bg="white" border="1px solid" borderColor="#E2E8F0"
                        borderRadius="8px" px="10px" h="40px"
                        display="flex" alignItems="center"
                      >
                        <Combobox.Input
                          placeholder="Cari nasabah..."
                          fontSize="13px" color="#1C2833" border="none"
                          outline="none" bg="transparent" flex="1" h="100%"
                        />
                        <Combobox.IndicatorGroup>
                          <Combobox.Trigger color="#94A3B8" />
                        </Combobox.IndicatorGroup>
                      </Combobox.Control>
                      <Combobox.Positioner>
                        <Combobox.Content
                          bg="white" border="1px solid" borderColor="#E2E8F0"
                          borderRadius="8px" shadow="lg" maxH="220px" overflowY="auto" zIndex={10}
                        >
                          <Combobox.Empty px="12px" py="10px" fontSize="13px" color="#94A3B8">
                            Nasabah tidak ditemukan
                          </Combobox.Empty>
                          {customerCollection.items.map((item) => (
                            <Combobox.Item
                              key={item.value} item={item}
                              px="12px" py="9px" cursor="pointer"
                              _hover={{ bg: "#F8FAFC" }} _highlighted={{ bg: "#EFF6FF" }}
                            >
                              <Flex align="center" justify="space-between" gap="8px">
                                <Combobox.ItemText fontSize="13px" color="#1C2833">
                                  {item.label}
                                </Combobox.ItemText>
                                <Text
                                  fontSize="10px" fontWeight="medium" px="6px" py="1px"
                                  borderRadius="4px"
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
                  </Field>

                  <Field label="Perusahaan Asuransi" required>
                    <NativeSelect.Root minW="220px" flex="1">
                      <NativeSelect.Field
                        {...inputStyle}
                        value={form.insurer_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("insurer_id", e.target.value)}
                      >
                        <option value="">Pilih Insurer</option>
                        {insurers.map((i) => (
                          <option key={i.insurer_id} value={i.insurer_id}>{i.name}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>

                  <Field label="Nomor Polis" required>
                    <Input
                      {...inputStyle} flex="1" minW="200px"
                      placeholder="Contoh: POL-2024-001"
                      value={form.policy_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policy_number", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Jenis Produk" required>
                    <NativeSelect.Root minW="180px" flex="1">
                      <NativeSelect.Field
                        {...inputStyle}
                        value={form.product_type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("product_type", e.target.value as ApiProductType)}
                      >
                        {(Object.keys(PRODUCT_LABELS) as ApiProductType[]).map((k) => (
                          <option key={k} value={k}>{PRODUCT_LABELS[k]}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>

                  <Field label="Objek Pertanggungan">
                    <Input
                      {...inputStyle} flex="1" minW="200px"
                      placeholder="Contoh: Honda Civic 2020 B 1234 ABC"
                      value={form.object_insured ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("object_insured", e.target.value)}
                    />
                  </Field>

                  <Field label="Tahun Polis">
                    <Input
                      {...inputStyle} w="120px" type="number" min={1}
                      value={form.policy_year ?? 1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policy_year", e.target.value)}
                    />
                  </Field>

                </Flex>
              </Box>

              {/* Period + financial card */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                <Text color="#1C2833" fontSize="15px" fontWeight="semibold" mb="20px">Periode & Keuangan</Text>

                <Flex gap="20px" flexWrap="wrap">

                  <Field label="Mulai Coverage" required>
                    <Input
                      {...inputStyle} w="180px" type="date"
                      value={form.coverage_start}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("coverage_start", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Akhir Coverage" required>
                    <Input
                      {...inputStyle} w="180px" type="date"
                      value={form.coverage_end}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("coverage_end", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Nilai Pertanggungan (TSI)" required>
                    <Input
                      {...inputStyle} w="200px" type="number" min={0}
                      placeholder="0"
                      value={form.sum_insured || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sum_insured", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Premi Nett (IDR)" required>
                    <Input
                      {...inputStyle} w="200px" type="number" min={0}
                      placeholder="0"
                      value={form.premium_amount || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("premium_amount", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Komisi (%)" required>
                    <Input
                      {...inputStyle} w="120px" type="number" min={0} max={100} step="0.01"
                      placeholder="0"
                      value={form.commission_rate || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("commission_rate", e.target.value)}
                      required
                    />
                  </Field>

                </Flex>
              </Box>

              {/* Notes card */}
              <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                <Text color="#1C2833" fontSize="15px" fontWeight="semibold" mb="20px">Catatan</Text>
                <Flex gap="20px" flexWrap="wrap">
                  <Field label="Catatan Coverage">
                    <Textarea
                      {...inputStyle} minW="280px" flex="1" rows={3}
                      placeholder="Klausul khusus, pengecualian, dll."
                      value={form.coverage_notes ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("coverage_notes", e.target.value)}
                    />
                  </Field>
                  <Field label="Catatan Internal">
                    <Textarea
                      {...inputStyle} minW="280px" flex="1" rows={3}
                      placeholder="Catatan internal agen"
                      value={form.notes ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("notes", e.target.value)}
                    />
                  </Field>
                </Flex>
              </Box>

              {error && (
                <Text color="#DC2626" fontSize="13px">{error}</Text>
              )}

              <Flex gap="12px" justify="flex-end">
                <Button
                  variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px"
                  onClick={() => router.back()}
                  type="button"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  bg="#1A3557" color="white" fontSize="13px" fontWeight="semibold"
                  loading={loading}
                  _hover={{ bg: "#162C47" }}
                >
                  Simpan Polis
                </Button>
              </Flex>

            </Flex>
          </form>

        </Flex>
      </Box>
      <MobileBottomNav />
    </Box>
  )
}
