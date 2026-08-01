"use client"

import { Sidebar, MobileHeader, MobileBottomNav, TopBar } from "@/components/layout";
import { getAccessToken } from "@/lib/auth/session";
import { getCustomerDetail, createCustomer, updateCustomer, getCustomerPolicies, type ApiCustomerPolicy } from "@/lib/api/customers";
import {
    Badge, Box, Button, Card, Checkbox, Field, FileUpload, Flex, Icon, Image,
    Input, List, NativeSelect, SimpleGrid, Skeleton, Table, Tabs, Text, Textarea,
} from "@chakra-ui/react";
import { FaInfoCircle, FaArrowRight, FaRegFileImage, FaArrowLeft, FaEye } from "react-icons/fa";
import { LuUpload, LuUser, LuFileText, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import verifiedImg from "@/assets/verified.png";
import companyImg from "@/assets/company.png";

// ─── Style constants ────────────────────────────────────────────────────────

const lbl  = { color: "#5D6D7E", fontSize: "12px", fontWeight: "semibold" } as const;
const clbl = { color: "#1C2833", fontSize: "14px", fontWeight: "medium"   } as const;

// ─── Phone helpers ───────────────────────────────────────────────────────────

function toDisplay(raw?: string | null) {
    return raw ? (raw.startsWith("0") ? raw.slice(1) : raw) : ""
}
function toApi(v: string) { return v ? "0" + v : "" }

// ─── Friendly API error parser ───────────────────────────────────────────────

const FIELD_ID: Record<string, string> = {
    display_name:       "Nama Lengkap",
    nik:                "NIK",
    npwp_personal:      "NPWP",
    date_of_birth:      "Tanggal Lahir",
    personal_phone:     "No. Telepon",
    personal_whatsapp:  "No. WhatsApp",
    personal_email:     "Email",
    personal_address:   "Alamat",
    company_legal_name: "Nama Legal",
    npwp_company:       "NPWP Perusahaan",
    pic_name:           "Nama PIC",
    pic_phone:          "No. HP PIC",
    pic_whatsapp:       "No. WA PIC",
}

const MSG_ID: Record<string, string> = {
    "cannot be empty": "tidak boleh kosong",
    "is required":     "wajib diisi",
    "already exists":  "sudah terdaftar",
    "invalid":         "tidak valid",
    "must be":         "harus berupa",
}

function friendlyError(raw: string): string {
    let msg = raw
    Object.entries(FIELD_ID).forEach(([en, id]) => { msg = msg.replaceAll(en, id) })
    Object.entries(MSG_ID).forEach(([en, id])  => { msg = msg.replaceAll(en, id) })
    return msg.charAt(0).toUpperCase() + msg.slice(1)
}

// ─── PhoneInput component ─────────────────────────────────────────────────────

interface PhoneProps {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
}
function PhoneInput({ value, onChange, placeholder = "81234567890", disabled, invalid }: PhoneProps) {
    return (
        <Flex
            border="1px solid"
            borderColor={invalid ? "#E53E3E" : "#E2E8F0"}
            borderRadius="md" overflow="hidden"
        >
            <Box
                px="3" display="flex" alignItems="center"
                bg="#F8FAFC" color="#94A3B8" fontSize="14px"
                borderRight="1px solid" borderRightColor={invalid ? "#E53E3E" : "#E2E8F0"}
                whiteSpace="nowrap"
            >
                +62
            </Box>
            <Input
                border="0" borderRadius="0"
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            />
        </Flex>
    )
}

// ─── Form initial states ─────────────────────────────────────────────────────

const initInd = () => ({
    nik: "", npwp_personal: "", display_name: "", date_of_birth: "",
    personal_email: "", personal_phone: "", personal_whatsapp: "",
    personal_address: "", status: "active", source: "direct", notes: "",
})

const initCorp = () => ({
    display_name: "", company_legal_name: "", npwp_company: "", nib: "",
    business_type: "", company_email: "", company_phone: "",
    operational_address: "", legal_address: "",
    pic_name: "", pic_role: "", pic_phone: "", pic_whatsapp: "",
    status: "active", source: "direct",
})

// ─── Error text helper ────────────────────────────────────────────────────────

function ErrText({ msg }: { msg?: string }) {
    if (!msg) return null
    return <Field.ErrorText fontSize="11px">{msg}</Field.ErrorText>
}

// ─── Customer policies section (list 5.10) ───────────────────────────────────

const POLICY_PRODUCT_LABELS: Record<string, string> = {
    fire:       "Kebakaran",
    motorcycle: "Motor",
    car:        "Kendaraan",
    travel:     "Perjalanan",
    cargo:      "Kargo",
    other:      "Lainnya",
    kecelakaan: "Kecelakaan",
    aep:        "AEP",
}

const RENEWAL_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: "Pending",     bg: "#FEF3C7", color: "#D97706" },
    renewed:   { label: "Diperbarui",  bg: "#DCFCE7", color: "#16A34A" },
    lapsed:    { label: "Lapse",       bg: "#FEE2E2", color: "#DC2626" },
    cancelled: { label: "Dibatalkan",  bg: "#F1F5F9", color: "#64748B" },
}

function fmtIDR(n: number) {
    return "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const POL_PAGE_SIZE = 5

function CustomerPoliciesSection({ customerId }: { customerId: string }) {
    const router = useRouter()
    const [policies, setPolicies] = useState<ApiCustomerPolicy[]>([])
    const [page, setPage]         = useState(1)
    const [total, setTotal]       = useState(0)
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        setLoading(true)
        setError(null)
        getCustomerPolicies(token, customerId, { page, limit: POL_PAGE_SIZE })
            .then((res) => {
                setPolicies(res.data ?? [])
                setTotal(res.pagination?.total ?? 0)
            })
            .catch((err) => setError(err.message ?? "Gagal memuat polis nasabah"))
            .finally(() => setLoading(false))
    }, [customerId, page])

    const totalPages = Math.max(1, Math.ceil(total / POL_PAGE_SIZE))

    return (
        <Card.Root borderRadius="12px" border="1px solid" borderColor="#F1F5F9">
            <Card.Body p="0">
                <Flex justify="space-between" align="center" px="32px" pt="24px" pb={loading || policies.length > 0 ? "16px" : "24px"}>
                    <Flex gap="10px" align="center">
                        <Box p="8px" bg="#EFF6FF" borderRadius="8px" color="#1A3557"><LuFileText size={18} /></Box>
                        <Flex flexDir="column">
                            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Polis Dimiliki</Text>
                            <Text color="#5D6D7E" fontSize="12px">{total} polis terdaftar atas nama nasabah ini</Text>
                        </Flex>
                    </Flex>
                </Flex>

                {error && (
                    <Box px="32px" pb="20px">
                        <Text fontSize="13px" color="#DC2626">{error}</Text>
                    </Box>
                )}

                {!error && loading && (
                    <Flex flexDir="column" gap="8px" px="32px" pb="24px">
                        {[1, 2, 3].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                    </Flex>
                )}

                {!error && !loading && policies.length === 0 && (
                    <Box px="32px" pb="24px">
                        <Text color="#94A3B8" fontSize="13px">Nasabah ini belum memiliki polis.</Text>
                    </Box>
                )}

                {!error && !loading && policies.length > 0 && (
                    <>
                        <Table.Root>
                            <Table.Header>
                                <Table.Row bg="#F8FAFC">
                                    {["NO. POLIS", "PRODUK", "PERIODE", "PREMI", "STATUS", ""].map((h) => (
                                        <Table.ColumnHeader key={h} color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="10px">
                                            {h}
                                        </Table.ColumnHeader>
                                    ))}
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {policies.map((p) => (
                                    <Table.Row key={p.policy_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>
                                        <Table.Cell px="20px" py="12px" color="#1C2833" fontSize="12px" fontFamily="mono">{p.policy_number}</Table.Cell>
                                        <Table.Cell px="20px" py="12px" color="#64748B" fontSize="13px">
                                            {POLICY_PRODUCT_LABELS[p.product_type] ?? p.product_type}
                                            {p.insurer_short_name ? ` · ${p.insurer_short_name}` : ""}
                                        </Table.Cell>
                                        <Table.Cell px="20px" py="12px" color="#64748B" fontSize="12px">
                                            {fmtDate(p.coverage_start)} – {fmtDate(p.coverage_end)}
                                        </Table.Cell>
                                        <Table.Cell px="20px" py="12px" color="#1C2833" fontSize="13px" fontWeight="medium">
                                            {fmtIDR(p.premium_amount)}
                                        </Table.Cell>
                                        <Table.Cell px="20px" py="12px">
                                            <Badge px="8px" py="2px" borderRadius="full" fontSize="11px" fontWeight="medium"
                                                bg={RENEWAL_STATUS_CONFIG[p.renewal_status]?.bg ?? "#F1F5F9"}
                                                color={RENEWAL_STATUS_CONFIG[p.renewal_status]?.color ?? "#64748B"}>
                                                {RENEWAL_STATUS_CONFIG[p.renewal_status]?.label ?? p.renewal_status}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell px="20px" py="12px" textAlign="end">
                                            <Button size="xs" variant="ghost" color="#3B82F6" gap="4px" fontSize="12px"
                                                onClick={() => router.push(`/agentra/policies/${p.policy_id}`)}>
                                                <FaEye size={12} /> Lihat
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>

                        {totalPages > 1 && (
                            <Flex justify="space-between" align="center" px="32px" py="14px" borderTop="1px solid" borderColor="#F1F5F9">
                                <Text color="#64748B" fontSize="12px">Halaman {page} dari {totalPages}</Text>
                                <Flex gap="6px">
                                    <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151"
                                        disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                        <LuChevronLeft size={13} />
                                    </Button>
                                    <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151"
                                        disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                        <LuChevronRight size={13} />
                                    </Button>
                                </Flex>
                            </Flex>
                        )}
                    </>
                )}
            </Card.Body>
        </Card.Root>
    )
}

// ─── Main form ────────────────────────────────────────────────────────────────

function CustomerDetailForm() {
    const router      = useRouter()
    const searchParams = useSearchParams()
    const customerId  = searchParams.get("id")
    const isEdit      = !!customerId

    const [fetchLoading, setFetchLoading] = useState(isEdit)
    const [fetchError, setFetchError]     = useState<string | null>(null)
    const [saving, setSaving]             = useState(false)
    const [saveError, setSaveError]       = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess]   = useState(false)

    const [activeTab, setActiveTab] = useState<"individual" | "corporate">("individual")
    const [ind, setInd]             = useState(initInd())
    const [corp, setCorp]           = useState(initCorp())
    const [sameWaInd, setSameWaInd]   = useState(false)
    const [sameWaCorp, setSameWaCorp] = useState(false)

    const [indErr,  setIndErr]  = useState<Record<string, string>>({})
    const [corpErr, setCorpErr] = useState<Record<string, string>>({})

    // ── Fetch on edit ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isEdit || !customerId) return
        const token = getAccessToken()
        if (!token) { router.push("/auth/login"); return }

        getCustomerDetail(token, customerId)
            .then((d) => {
                if (d.customer_type === "individual") {
                    setActiveTab("individual")
                    setInd({
                        nik:               d.nik ?? "",
                        npwp_personal:     d.npwp_personal ?? "",
                        display_name:      d.display_name,
                        date_of_birth:     d.date_of_birth ?? "",
                        personal_email:    d.personal_email ?? "",
                        personal_phone:    toDisplay(d.personal_phone),
                        personal_whatsapp: toDisplay(d.personal_whatsapp),
                        personal_address:  d.personal_address ?? "",
                        status:            d.status,
                        source:            d.source ?? "direct",
                        notes:             d.notes ?? "",
                    })
                } else {
                    setActiveTab("corporate")
                    setCorp({
                        display_name:       d.display_name,
                        company_legal_name: d.company_legal_name ?? "",
                        npwp_company:       d.npwp_company ?? "",
                        nib:                d.nib ?? "",
                        business_type:      d.business_type ?? "",
                        company_email:      d.company_email ?? "",
                        company_phone:      d.company_phone ?? "",
                        operational_address: d.operational_address ?? "",
                        legal_address:      d.legal_address ?? "",
                        pic_name:           d.pic_name ?? "",
                        pic_role:           d.pic_role ?? "",
                        pic_phone:          toDisplay(d.pic_phone),
                        pic_whatsapp:       toDisplay(d.pic_whatsapp),
                        status:             d.status,
                        source:             d.source ?? "direct",
                    })
                }
            })
            .catch((err) => setFetchError(err.message ?? "Gagal memuat data nasabah"))
            .finally(() => setFetchLoading(false))
    }, [customerId])

    // ── WA mirror ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (sameWaInd) setInd(f => ({ ...f, personal_whatsapp: f.personal_phone }))
    }, [sameWaInd, ind.personal_phone])

    useEffect(() => {
        if (sameWaCorp) setCorp(f => ({ ...f, pic_whatsapp: f.pic_phone }))
    }, [sameWaCorp, corp.pic_phone])

    // ── Field update helpers (clears error on change) ─────────────────────────

    const updInd = (k: keyof typeof ind) => (v: string) => {
        setInd(f => ({ ...f, [k]: v }))
        setIndErr(e => { const n = { ...e }; delete n[k]; return n })
    }
    const updCorp = (k: keyof typeof corp) => (v: string) => {
        setCorp(f => ({ ...f, [k]: v }))
        setCorpErr(e => { const n = { ...e }; delete n[k]; return n })
    }

    // ── Validation ────────────────────────────────────────────────────────────

    function validateInd(): Record<string, string> {
        const e: Record<string, string> = {}
        if (!ind.display_name.trim())
            e.display_name = "Nama lengkap wajib diisi"
        if (!ind.nik.trim())
            e.nik = "NIK wajib diisi"
        else if (!/^\d{16}$/.test(ind.nik.trim()))
            e.nik = "NIK harus terdiri dari 16 digit angka"
        if (ind.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ind.personal_email))
            e.personal_email = "Format email tidak valid"
        if (ind.personal_phone && ind.personal_phone.length < 7)
            e.personal_phone = "Nomor telepon terlalu pendek"
        if (ind.personal_whatsapp && ind.personal_whatsapp.length < 7)
            e.personal_whatsapp = "Nomor WhatsApp terlalu pendek"
        return e
    }

    function validateCorp(): Record<string, string> {
        const e: Record<string, string> = {}
        if (!corp.display_name.trim())
            e.display_name = "Nama perusahaan wajib diisi"
        if (!corp.company_legal_name.trim())
            e.company_legal_name = "Nama legal perusahaan wajib diisi"
        if (!corp.npwp_company.trim())
            e.npwp_company = "NPWP perusahaan wajib diisi"
        if (!corp.pic_name.trim())
            e.pic_name = "Nama PIC wajib diisi"
        if (!corp.pic_phone.trim())
            e.pic_phone = "No. HP PIC wajib diisi"
        if (!corp.pic_whatsapp.trim())
            e.pic_whatsapp = "No. WA PIC wajib diisi"
        if (corp.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corp.company_email))
            e.company_email = "Format email tidak valid"
        return e
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    async function handleSave() {
        // FE validation first
        const errors = activeTab === "individual" ? validateInd() : validateCorp()
        if (activeTab === "individual") setIndErr(errors)
        else setCorpErr(errors)

        if (Object.keys(errors).length > 0) {
            setSaveError("Harap perbaiki isian yang ditandai di bawah ini.")
            return
        }

        const token = getAccessToken()
        if (!token) { router.push("/auth/login"); return }

        setSaving(true); setSaveError(null)

        try {
            if (activeTab === "individual") {
                const payload = {
                    customer_type:     "individual",
                    display_name:      ind.display_name,
                    nik:               ind.nik,
                    npwp_personal:     ind.npwp_personal  || undefined,
                    date_of_birth:     ind.date_of_birth  || undefined,
                    personal_email:    ind.personal_email || undefined,
                    personal_phone:    ind.personal_phone    ? toApi(ind.personal_phone)    : undefined,
                    personal_whatsapp: ind.personal_whatsapp ? toApi(ind.personal_whatsapp) : undefined,
                    personal_address:  ind.personal_address || undefined,
                    status:            ind.status,
                    source:            ind.source,
                    notes:             ind.notes || undefined,
                }
                isEdit && customerId
                    ? await updateCustomer(token, customerId, payload)
                    : await createCustomer(token, payload)
            } else {
                const payload = {
                    customer_type:      "company",
                    display_name:       corp.display_name,
                    company_legal_name: corp.company_legal_name,
                    npwp_company:       corp.npwp_company,
                    nib:                corp.nib             || undefined,
                    business_type:      corp.business_type   || undefined,
                    company_email:      corp.company_email   || undefined,
                    company_phone:      corp.company_phone   || undefined,
                    operational_address: corp.operational_address || undefined,
                    legal_address:      corp.legal_address   || undefined,
                    pic_name:           corp.pic_name,
                    pic_role:           corp.pic_role         || undefined,
                    pic_phone:          corp.pic_phone    ? toApi(corp.pic_phone)    : "",
                    pic_whatsapp:       corp.pic_whatsapp ? toApi(corp.pic_whatsapp) : undefined,
                    status:             corp.status,
                    source:             corp.source,
                }
                isEdit && customerId
                    ? await updateCustomer(token, customerId, payload)
                    : await createCustomer(token, payload)
            }

            setSaveSuccess(true)
            setTimeout(() => router.push("/agentra/customer"), 1200)
        } catch (err: any) {
            setSaveError(friendlyError(err.message ?? "Gagal menyimpan data"))
        } finally {
            setSaving(false)
        }
    }

    const pageTitle = isEdit
        ? ((activeTab === "individual" ? ind.display_name : corp.display_name) || "Detail Nasabah")
        : "Tambah Nasabah Baru"

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (fetchLoading) {
        return (
            <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
                <Box display={{ base: "none", md: "block" }}><TopBar title="Detail Nasabah" /></Box>
                <Flex p="32px" gap="24px" flexDir="column">
                    <Skeleton h="32px" w="220px" borderRadius="8px" />
                    <Flex gap="32px">
                        <Flex w="70%" flexDir="column" gap="16px">
                            <Skeleton h="56px" borderRadius="8px" />
                            <Skeleton h="56px" borderRadius="8px" />
                            <Skeleton h="56px" borderRadius="8px" />
                            <Skeleton h="100px" borderRadius="8px" />
                        </Flex>
                        <Flex w="30%" flexDir="column" gap="12px">
                            <Skeleton h="180px" borderRadius="12px" />
                            <Skeleton h="140px" borderRadius="12px" />
                        </Flex>
                    </Flex>
                </Flex>
            </Box>
        )
    }

    // ── Fetch error ───────────────────────────────────────────────────────────

    if (fetchError) {
        return (
            <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
                <Box display={{ base: "none", md: "block" }}><TopBar title="Detail Nasabah" /></Box>
                <Flex p="32px" flexDir="column" gap="16px">
                    <Text color="#DC2626" fontSize="16px">{fetchError}</Text>
                    <Button w="max-content" variant="outline" gap="8px" onClick={() => router.push("/agentra/customer")}>
                        <FaArrowLeft size={12} /> Kembali ke Daftar Nasabah
                    </Button>
                </Flex>
            </Box>
        )
    }

    // ── Save/Cancel action block ──────────────────────────────────────────────

    const ActionRow = ({ dark = false }: { dark?: boolean }) => (
        <Flex flexDir="column" gap="10px">
            {saveError && (
                <Flex
                    bg={dark ? "rgba(254,202,202,0.15)" : "#FEF2F2"}
                    border="1px solid"
                    borderColor={dark ? "rgba(254,202,202,0.4)" : "#FECACA"}
                    borderRadius="8px" px="12px" py="10px" gap="8px"
                >
                    <Text fontSize="12px" color={dark ? "#FCA5A5" : "#DC2626"} lineHeight="1.5">
                        {saveError}
                    </Text>
                </Flex>
            )}
            {saveSuccess && (
                <Flex bg={dark ? "rgba(134,239,172,0.15)" : "#F0FDF4"} border="1px solid"
                    borderColor={dark ? "rgba(134,239,172,0.4)" : "#BBF7D0"}
                    borderRadius="8px" px="12px" py="10px">
                    <Text fontSize="12px" color={dark ? "#86EFAC" : "#16A34A"}>
                        Data berhasil {isEdit ? "diperbarui" : "disimpan"}! Mengalihkan...
                    </Text>
                </Flex>
            )}
            <Button
                bg={dark ? "white" : "#1A3557"}
                color={dark ? "#1A3557" : "white"}
                fontSize="14px" fontWeight="bold" py="16px" borderRadius="10px" gap="8px"
                onClick={handleSave} loading={saving} disabled={saving || saveSuccess}
            >
                {isEdit ? "Perbarui Data" : "Simpan Data Nasabah"} <FaArrowRight />
            </Button>
            <Button
                bg={dark ? "transparent" : "white"}
                color={dark ? "#DBEAFE" : "#5D6D7E"}
                fontSize="14px" border="1px solid"
                borderColor={dark ? "#2F5788" : "#DDE1E7"}
                py="16px" borderRadius="10px"
                onClick={() => router.push("/agentra/customer")} disabled={saving}
            >
                Batalkan
            </Button>
        </Flex>
    )

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
            <Box display={{ base: "none", md: "block" }}>
                <TopBar title={isEdit ? "Detail Nasabah" : "Tambah Nasabah"} />
            </Box>

            <Flex gap="24px" p="32px" flexDir="column">
                {/* Header */}
                <Flex align="center" gap="12px">
                    <Button size="sm" variant="ghost" color="#64748B" gap="6px"
                        onClick={() => router.push("/agentra/customer")}>
                        <FaArrowLeft size={12} /> Kembali
                    </Button>
                    <Text color="#1C2833" fontSize="20px" fontWeight="bold">{pageTitle}</Text>
                </Flex>

                <Tabs.Root
                    value={activeTab}
                    onValueChange={(d) => { if (!isEdit) setActiveTab(d.value as "individual" | "corporate") }}
                    variant="plain"
                >
                    {/* Tab switcher — only when creating */}
                    {!isEdit ? (
                        <Tabs.List bg="#EDEDF0" borderRadius="10px" p="4px" gap="2px" w="max-content">
                            {(["individual", "corporate"] as const).map((v, i) => (
                                <Tabs.Trigger key={v} value={v}
                                    px="20px" py="8px" borderRadius="8px" fontSize="14px"
                                    fontWeight="medium" color="#64748B"
                                    _selected={{ bg: "white", color: "#0F172A", fontWeight: "bold", shadow: "sm" }}>
                                    {["Perorangan", "Perusahaan"][i]}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    ) : (
                        <Box px="12px" py="5px" borderRadius="8px" w="max-content"
                            fontSize="13px" fontWeight="semibold"
                            bg={activeTab === "individual" ? "#E5EFF5" : "#F3E8FF"}
                            color={activeTab === "individual" ? "#006397" : "#7E22CE"}>
                            {activeTab === "individual" ? "Nasabah Perorangan" : "Nasabah Perusahaan"}
                        </Box>
                    )}

                    {/* ── Individual ─────────────────────────────────────────── */}
                    <Tabs.Content value="individual">
                        <Flex w="100%" gap="32px">
                            {/* Left form */}
                            <Flex w="70%">
                                <Card.Root w="100%" border="1px solid" borderColor="#F1F5F9" borderRadius="12px">
                                    <Card.Body gap="24px" p="32px">
                                        <Flex borderLeft="4px solid" borderColor="#1A3557" pl="12px">
                                            <Text color="#1A3557" fontSize="18px" fontWeight="semibold">Data Identitas</Text>
                                        </Flex>

                                        <SimpleGrid columns={{ md: 2 }} gap="24px">
                                            <Field.Root invalid={!!indErr.nik}>
                                                <Field.Label {...lbl}>NOMOR INDUK KEPENDUDUKAN (NIK) <Text as="span" color="#DC2626">*</Text></Field.Label>
                                                <Input placeholder="Contoh: 3273012345678901" maxLength={16}
                                                    value={ind.nik} onChange={(e) => updInd("nik")(e.target.value)} />
                                                <ErrText msg={indErr.nik} />
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label {...lbl}>NPWP (OPSIONAL)</Field.Label>
                                                <Input placeholder="00.000.000.0-000.000"
                                                    value={ind.npwp_personal} onChange={(e) => updInd("npwp_personal")(e.target.value)} />
                                            </Field.Root>
                                        </SimpleGrid>

                                        <Field.Root invalid={!!indErr.display_name}>
                                            <Field.Label {...lbl}>NAMA LENGKAP (SESUAI KTP) <Text as="span" color="#DC2626">*</Text></Field.Label>
                                            <Input placeholder="Masukkan nama lengkap"
                                                value={ind.display_name} onChange={(e) => updInd("display_name")(e.target.value)} />
                                            <ErrText msg={indErr.display_name} />
                                        </Field.Root>

                                        <SimpleGrid columns={{ md: 2 }} gap="24px">
                                            <Field.Root>
                                                <Field.Label {...lbl}>TANGGAL LAHIR</Field.Label>
                                                <Input type="date"
                                                    value={ind.date_of_birth} onChange={(e) => updInd("date_of_birth")(e.target.value)} />
                                            </Field.Root>
                                            <Field.Root invalid={!!indErr.personal_email}>
                                                <Field.Label {...lbl}>EMAIL</Field.Label>
                                                <Input placeholder="nama@email.com"
                                                    value={ind.personal_email} onChange={(e) => updInd("personal_email")(e.target.value)} />
                                                <ErrText msg={indErr.personal_email} />
                                            </Field.Root>
                                        </SimpleGrid>

                                        <SimpleGrid columns={{ md: 2 }} gap="24px">
                                            <Field.Root invalid={!!indErr.personal_phone}>
                                                <Field.Label {...lbl}>NO. TELEPON (HP)</Field.Label>
                                                <PhoneInput value={ind.personal_phone}
                                                    onChange={updInd("personal_phone")}
                                                    invalid={!!indErr.personal_phone} />
                                                <ErrText msg={indErr.personal_phone} />
                                            </Field.Root>
                                            <Field.Root invalid={!!indErr.personal_whatsapp}>
                                                <Field.Label {...lbl}>NO. WHATSAPP</Field.Label>
                                                <Flex gap="8px" align="center">
                                                    <PhoneInput value={ind.personal_whatsapp}
                                                        onChange={updInd("personal_whatsapp")}
                                                        disabled={sameWaInd}
                                                        invalid={!!indErr.personal_whatsapp} />
                                                    <Checkbox.Root size="sm" checked={sameWaInd}
                                                        onCheckedChange={(e) => setSameWaInd(!!e.checked)} colorPalette="green">
                                                        <Checkbox.HiddenInput />
                                                        <Checkbox.Control />
                                                        <Checkbox.Label fontSize="12px" color="#5D6D7E" whiteSpace="nowrap">Sama</Checkbox.Label>
                                                    </Checkbox.Root>
                                                </Flex>
                                                <ErrText msg={indErr.personal_whatsapp} />
                                            </Field.Root>
                                        </SimpleGrid>

                                        <Field.Root>
                                            <Field.Label {...lbl}>ALAMAT LENGKAP</Field.Label>
                                            <Textarea placeholder="Contoh: Jl. Sudirman No. 123, Kebayoran Baru, Jakarta Selatan"
                                                value={ind.personal_address} onChange={(e) => updInd("personal_address")(e.target.value)} />
                                        </Field.Root>

                                        <SimpleGrid columns={{ md: 2 }} gap="24px">
                                            <Field.Root>
                                                <Field.Label {...lbl}>STATUS</Field.Label>
                                                <NativeSelect.Root>
                                                    <NativeSelect.Field value={ind.status} onChange={(e) => updInd("status")(e.target.value)}>
                                                        <option value="active">Aktif</option>
                                                        <option value="inactive">Tidak Aktif</option>
                                                        <option value="lapsed">Lapse</option>
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label {...lbl}>SUMBER</Field.Label>
                                                <NativeSelect.Root>
                                                    <NativeSelect.Field value={ind.source} onChange={(e) => updInd("source")(e.target.value)}>
                                                        <option value="direct">Direct</option>
                                                        <option value="referral">Referral</option>
                                                    </NativeSelect.Field>
                                                    <NativeSelect.Indicator />
                                                </NativeSelect.Root>
                                            </Field.Root>
                                        </SimpleGrid>
                                    </Card.Body>
                                </Card.Root>
                            </Flex>

                            {/* Right sidebar */}
                            <Flex w="30%" gap="24px" flexDir="column">
                                <Card.Root bgColor="#1A3557" color="white" borderRadius="12px">
                                    <Card.Body gap="16px">
                                        <Flex gap="8px" align="center" fontWeight="semibold" fontSize="16px">
                                            <FaInfoCircle color="#7DD3FC" /> Petunjuk Pengisian
                                        </Flex>
                                        <List.Root gap="12px" ps="4" listStyleType="disc">
                                            {[
                                                "Kolom bertanda * wajib diisi sebelum menyimpan.",
                                                "NIK harus 16 digit sesuai E-KTP.",
                                                "Nomor WhatsApp aktif diperlukan untuk pengiriman e-Polis otomatis.",
                                            ].map((t, i) => <List.Item key={i} fontSize="12px" color="white">{t}</List.Item>)}
                                        </List.Root>
                                    </Card.Body>
                                </Card.Root>

                                <Card.Root borderRadius="12px">
                                    <Card.Body p="16px">
                                        <Flex flexDir="column" align="center" gap="12px"
                                            border="2px dashed" borderColor="#CBD5E1" borderRadius="10px" p="16px">
                                            <Image src={verifiedImg.src} w="72px" />
                                            <Text color="#1A3557" fontSize="15px" fontWeight="semibold" textAlign="center">Verifikasi Dokumen</Text>
                                            <Text color="#64748B" fontSize="12px" textAlign="center">
                                                Unggah foto KTP untuk mempercepat verifikasi via OCR
                                            </Text>
                                            <Flex w="100%" align="center" justify="center" gap="8px"
                                                border="1px solid" borderColor="#CBD5E1" borderRadius="8px"
                                                py="10px" color="#94A3B8" fontSize="13px" cursor="pointer"
                                                _hover={{ borderColor: "#93C5FD", color: "#60A5FA" }}>
                                                <FaRegFileImage size={15} /> Unggah Foto KTP
                                            </Flex>
                                        </Flex>
                                    </Card.Body>
                                </Card.Root>

                                <ActionRow />
                            </Flex>
                        </Flex>
                    </Tabs.Content>

                    {/* ── Corporate ──────────────────────────────────────────── */}
                    <Tabs.Content value="corporate">
                        <Flex gap="32px" flexDir="column">
                            {/* Company info */}
                            <Card.Root borderRadius="12px" border="1px solid" borderColor="#F1F5F9">
                                <Card.Body gap="24px" p="32px">
                                    <Flex gap="12px" align="center">
                                        <Image src={companyImg.src} w="40px" h="40px" />
                                        <Flex flexDir="column">
                                            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Informasi Perusahaan</Text>
                                            <Text color="#5D6D7E" fontSize="12px">Lengkapi detail legalitas dan operasional perusahaan nasabah</Text>
                                        </Flex>
                                    </Flex>

                                    <SimpleGrid columns={{ lg: 3 }} gap="24px">
                                        <Field.Root invalid={!!corpErr.display_name}>
                                            <Field.Label {...clbl}>Nama Perusahaan <Text as="span" color="#DC2626">*</Text></Field.Label>
                                            <Input placeholder="Contoh: PT Teknologi Maju Jaya"
                                                value={corp.display_name} onChange={(e) => updCorp("display_name")(e.target.value)} />
                                            <ErrText msg={corpErr.display_name} />
                                        </Field.Root>
                                        <Field.Root invalid={!!corpErr.company_legal_name}>
                                            <Field.Label {...clbl}>Nama Legal <Text as="span" color="#DC2626">*</Text></Field.Label>
                                            <Input placeholder="Sesuai Akta Notaris"
                                                value={corp.company_legal_name} onChange={(e) => updCorp("company_legal_name")(e.target.value)} />
                                            <ErrText msg={corpErr.company_legal_name} />
                                        </Field.Root>
                                        <Field.Root invalid={!!corpErr.npwp_company}>
                                            <Field.Label {...clbl}>NPWP <Text as="span" color="#DC2626">*</Text></Field.Label>
                                            <Input placeholder="00.000.000.0-000.000"
                                                value={corp.npwp_company} onChange={(e) => updCorp("npwp_company")(e.target.value)} />
                                            <ErrText msg={corpErr.npwp_company} />
                                        </Field.Root>
                                    </SimpleGrid>

                                    <SimpleGrid columns={{ lg: 3 }} gap="24px">
                                        <Field.Root>
                                            <Field.Label {...clbl}>NIB</Field.Label>
                                            <Input placeholder="Nomor Induk Berusaha"
                                                value={corp.nib} onChange={(e) => updCorp("nib")(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label {...clbl}>Tipe Bisnis</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field placeholder="Pilih Tipe Bisnis"
                                                    value={corp.business_type} onChange={(e) => updCorp("business_type")(e.target.value)}>
                                                    <option value="PT">PT</option>
                                                    <option value="CV">CV</option>
                                                    <option value="Firma">Firma</option>
                                                    <option value="Koperasi">Koperasi</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root invalid={!!corpErr.company_email}>
                                            <Field.Label {...clbl}>Email Kantor</Field.Label>
                                            <Input placeholder="corporate@company.com"
                                                value={corp.company_email} onChange={(e) => updCorp("company_email")(e.target.value)} />
                                            <ErrText msg={corpErr.company_email} />
                                        </Field.Root>
                                    </SimpleGrid>

                                    <SimpleGrid columns={{ md: 2 }} gap="24px">
                                        <Field.Root>
                                            <Field.Label {...clbl}>No. Telp Kantor</Field.Label>
                                            <Input placeholder="(021) 1234567"
                                                value={corp.company_phone} onChange={(e) => updCorp("company_phone")(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label {...clbl}>Alamat Operasional</Field.Label>
                                            <Input placeholder="Alamat lengkap operasional saat ini..."
                                                value={corp.operational_address} onChange={(e) => updCorp("operational_address")(e.target.value)} />
                                        </Field.Root>
                                    </SimpleGrid>

                                    <Field.Root>
                                        <Flex justify="space-between" align="center">
                                            <Field.Label {...clbl} mb="0">Alamat Legal (Sesuai Domisili/NPWP)</Field.Label>
                                            <Text color="#3B82F6" fontSize="12px" cursor="pointer"
                                                onClick={() => updCorp("legal_address")(corp.operational_address)}>
                                                ⟳ Samakan dengan Operasional
                                            </Text>
                                        </Flex>
                                        <Input placeholder="Alamat sesuai dokumen hukum..." mt="2"
                                            value={corp.legal_address} onChange={(e) => updCorp("legal_address")(e.target.value)} />
                                    </Field.Root>

                                    <SimpleGrid columns={{ md: 2 }} gap="24px">
                                        <Field.Root>
                                            <Field.Label {...clbl}>STATUS</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field value={corp.status} onChange={(e) => updCorp("status")(e.target.value)}>
                                                    <option value="active">Aktif</option>
                                                    <option value="inactive">Tidak Aktif</option>
                                                    <option value="lapsed">Lapse</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label {...clbl}>SUMBER</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field value={corp.source} onChange={(e) => updCorp("source")(e.target.value)}>
                                                    <option value="direct">Direct</option>
                                                    <option value="referral">Referral</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>

                            {/* PIC + right sidebar */}
                            <Flex w="100%" gap="32px">
                                <Flex w="70%">
                                    <Card.Root w="100%" borderRadius="12px" border="1px solid" borderColor="#F1F5F9">
                                        <Card.Body gap="24px" p="32px">
                                            <Flex gap="12px" align="center">
                                                <Box p="8px" bg="#EFF6FF" borderRadius="8px" color="#1A3557"><LuUser size={20} /></Box>
                                                <Flex flexDir="column">
                                                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Informasi PIC</Text>
                                                    <Text color="#5D6D7E" fontSize="12px">Detail orang yang bertanggung jawab (Person In Charge).</Text>
                                                </Flex>
                                            </Flex>

                                            <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                <Field.Root invalid={!!corpErr.pic_name}>
                                                    <Field.Label {...clbl}>Nama PIC <Text as="span" color="#DC2626">*</Text></Field.Label>
                                                    <Input placeholder="Nama Lengkap PIC"
                                                        value={corp.pic_name} onChange={(e) => updCorp("pic_name")(e.target.value)} />
                                                    <ErrText msg={corpErr.pic_name} />
                                                </Field.Root>
                                                <Field.Root>
                                                    <Field.Label {...clbl}>Jabatan PIC</Field.Label>
                                                    <Input placeholder="Contoh: Direktur Keuangan"
                                                        value={corp.pic_role} onChange={(e) => updCorp("pic_role")(e.target.value)} />
                                                </Field.Root>
                                            </SimpleGrid>

                                            <SimpleGrid columns={{ md: 2 }} gap="24px">
                                                <Field.Root invalid={!!corpErr.pic_phone}>
                                                    <Field.Label {...clbl}>No. HP PIC <Text as="span" color="#DC2626">*</Text></Field.Label>
                                                    <PhoneInput value={corp.pic_phone}
                                                        onChange={(v) => { updCorp("pic_phone")(v); if (sameWaCorp) updCorp("pic_whatsapp")(v) }}
                                                        invalid={!!corpErr.pic_phone} />
                                                    <ErrText msg={corpErr.pic_phone} />
                                                </Field.Root>
                                                <Field.Root invalid={!!corpErr.pic_whatsapp}>
                                                    <Field.Label {...clbl}>No. WA PIC <Text as="span" color="#DC2626">*</Text></Field.Label>
                                                    <Flex gap="8px" align="center">
                                                        <PhoneInput value={corp.pic_whatsapp}
                                                            onChange={updCorp("pic_whatsapp")}
                                                            disabled={sameWaCorp}
                                                            invalid={!!corpErr.pic_whatsapp} />
                                                        <Checkbox.Root size="sm" checked={sameWaCorp}
                                                            onCheckedChange={(e) => setSameWaCorp(!!e.checked)} colorPalette="green">
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                            <Checkbox.Label fontSize="12px" color="#5D6D7E" whiteSpace="nowrap">Sama</Checkbox.Label>
                                                        </Checkbox.Root>
                                                    </Flex>
                                                    <ErrText msg={corpErr.pic_whatsapp} />
                                                </Field.Root>
                                            </SimpleGrid>
                                        </Card.Body>
                                    </Card.Root>
                                </Flex>

                                {/* Right sidebar */}
                                <Flex w="30%" gap="24px" flexDir="column">
                                    <Card.Root bgColor="#1A3557" color="white" borderRadius="12px">
                                        <Card.Body gap="12px">
                                            <Text fontSize="16px" fontWeight="semibold">Verifikasi Data</Text>
                                            <Text fontSize="12px" color="#BFDBFE">
                                                Pastikan seluruh informasi perusahaan dan PIC sesuai dengan dokumen legal asli.
                                            </Text>
                                            <Flex flexDir="column" gap="8px" my="4px">
                                                {[
                                                    { label: "NPWP terisi", done: !!corp.npwp_company },
                                                    { label: "NIB telah diisi", done: !!corp.nib },
                                                    { label: "Alamat legal telah diisi", done: !!corp.legal_address },
                                                    { label: "PIC dan kontak lengkap", done: !!corp.pic_name && !!corp.pic_phone },
                                                ].map((item, i) => (
                                                    <Flex key={i} gap="8px" align="center">
                                                        <Box w="10px" h="10px" borderRadius="full" flexShrink={0}
                                                            bg={item.done ? "#4ADE80" : "transparent"}
                                                            border={item.done ? "none" : "2px solid #94A3B8"} />
                                                        <Text fontSize="12px" color={item.done ? "white" : "#94A3B8"}>{item.label}</Text>
                                                    </Flex>
                                                ))}
                                            </Flex>
                                            <ActionRow dark />
                                        </Card.Body>
                                    </Card.Root>

                                    <FileUpload.Root maxFiles={5}>
                                        <FileUpload.HiddenInput />
                                        <FileUpload.Dropzone borderRadius="12px">
                                            <Icon size="md" color="fg.muted"><LuUpload /></Icon>
                                            <FileUpload.DropzoneContent>
                                                <Box fontWeight="bold" fontSize="14px" color="#1C2833">Unggah Dokumen Legal</Box>
                                                <Box color="#94A3B8" fontSize="12px">PDF, JPG (Maks. 5MB)</Box>
                                            </FileUpload.DropzoneContent>
                                        </FileUpload.Dropzone>
                                        <FileUpload.List />
                                    </FileUpload.Root>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Tabs.Content>
                </Tabs.Root>

                {isEdit && customerId && (
                    <CustomerPoliciesSection customerId={customerId} />
                )}
            </Flex>
        </Box>
    )
}

export default function CustomerDetailPage() {
    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />
            <Suspense fallback={
                <Box ml={{ base: 0, md: "200px" }} p="32px">
                    <Skeleton h="32px" w="200px" borderRadius="8px" mb="24px" />
                    <Skeleton h="400px" borderRadius="12px" />
                </Box>
            }>
                <CustomerDetailForm />
            </Suspense>
            <MobileBottomNav />
        </Box>
    )
}
