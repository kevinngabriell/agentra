"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Flex, Input, Skeleton, Tabs, Text, Textarea } from "@chakra-ui/react"
import { LuPencil, LuPlus, LuSend, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    MESSAGE_TYPE_LABELS, TEMPLATE_TYPE_LABELS, deleteMessageTemplate, getBroadcasts, getMessageTemplates, previewBroadcast, sendBroadcast,
    type BroadcastFilters, type BroadcastPreview, type BroadcastRecord, type MessageTemplate, type MessageType,
} from "@/lib/api/communications"
import { getMasterProducts, type ApiMasterProduct } from "@/lib/api/master-products"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { SearchSelect } from "@/components/ui/search-select"
import { MessageLog } from "@/components/communications"
import { TemplateDialog } from "@/components/communications/TemplateDialog"
import { useConfirm } from "@/components/ui/confirm-dialog"

const LABEL = { fontSize: "16px", color: "#5D6D7E", fontWeight: "medium" } as const
const TAB = { px: "18px", py: "8px", borderRadius: "8px", fontSize: "16px", fontWeight: "medium", color: "#64748B", _selected: { bg: "white", color: "#0F172A", fontWeight: "bold", shadow: "sm" } } as const

function fmtDate(iso: string) {
    return new Date(iso.replace(" ", "T")).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function TemplatesTab() {
    const { confirm, dialog } = useConfirm()
    const [templates, setTemplates] = useState<MessageTemplate[] | null>(null)
    const [placeholders, setPlaceholders] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getMessageTemplates(token)
            .then((r) => { setTemplates(r.data); setPlaceholders(r.placeholders) })
            .catch((err) => setError(errorMessage(err, "Template belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [])

    async function remove(t: MessageTemplate) {
        const token = getAccessToken()
        if (!token) return
        if (!(await confirm({ title: `Hapus template "${t.name}"?`, confirmLabel: "Hapus", danger: true }))) return
        try {
            await deleteMessageTemplate(token, t.template_id)
            setTemplates((list) => list?.filter((x) => x.template_id !== t.template_id) ?? null)
        } catch (err) {
            setError(errorMessage(err, "Gagal menghapus template"))
        }
    }

    function saved(t: MessageTemplate) {
        setTemplates((list) => {
            const rest = (list ?? []).filter((x) => x.template_id !== t.template_id)
            return [...rest, t].sort((a, b) => a.template_type.localeCompare(b.template_type) || a.name.localeCompare(b.name))
        })
        setEditing(null)
    }

    return (
        <Flex flexDir="column" gap="12px">
      {dialog}
            <Flex justify="space-between" align="center" gap="12px" flexWrap="wrap">
                <Text color="#64748B" fontSize="16px">Template untuk invoice, pengingat premi, ucapan dan broadcast. Template perpanjangan diatur di Pengaturan.</Text>
                <Button size="sm" bg="#1A3557" color="white" fontSize="16px" gap="6px" onClick={() => setEditing("new")}><LuPlus size={14} /> Template Baru</Button>
            </Flex>
            {error && <Text color="#DC2626" fontSize="16px">{error}</Text>}
            {!templates && !error && <Skeleton h="160px" borderRadius="12px" />}
            {templates?.map((t) => (
                <Box key={t.template_id} bg="white" border="1px solid #E2E8F0" borderRadius="12px" p="16px">
                    <Flex justify="space-between" align="start" gap="12px" flexWrap="wrap">
                        <Flex gap="8px" align="center" flexWrap="wrap">
                            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{t.name}</Text>
                            <Badge px="8px" borderRadius="full" bg="#EFF6FF" color="#1D4ED8" fontSize="16px">{TEMPLATE_TYPE_LABELS[t.template_type]}</Badge>
                            {t.auto_send && <Badge px="8px" borderRadius="full" bg="#DCFCE7" color="#15803D" fontSize="16px">Otomatis</Badge>}
                            {t.template_type === "holiday" && t.send_on_date && (
                                <Text fontSize="16px" color="#64748B">{t.repeat_yearly ? `Setiap ${new Date(t.send_on_date).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}` : fmtDate(t.send_on_date)}</Text>
                            )}
                        </Flex>
                        <Flex gap="4px">
                            <Button size="xs" variant="ghost" aria-label={`Ubah ${t.name}`} onClick={() => setEditing(t)}><LuPencil size={13} /></Button>
                            <Button size="xs" variant="ghost" color="#DC2626" aria-label={`Hapus ${t.name}`} onClick={() => void remove(t)}><LuTrash2 size={13} /></Button>
                        </Flex>
                    </Flex>
                    <Text mt="6px" fontSize="16px" color="#64748B" whiteSpace="pre-wrap">{t.body}</Text>
                </Box>
            ))}
            {editing && (
                <TemplateDialog template={editing === "new" ? null : editing} placeholders={placeholders} onClose={() => setEditing(null)} onSaved={saved} />
            )}
        </Flex>
    )
}

function BroadcastTab() {
    const { confirm, dialog } = useConfirm()
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [products, setProducts]   = useState<ApiMasterProduct[]>([])
    const [insurers, setInsurers]   = useState<ApiInsurer[]>([])
    const [history, setHistory]     = useState<BroadcastRecord[]>([])
    const [name, setName]           = useState("")
    const [templateId, setTemplateId] = useState("")
    const [body, setBody]           = useState("")
    const [filters, setFilters]     = useState<BroadcastFilters>({})
    const [preview, setPreview]     = useState<{ key: string; data: BroadcastPreview } | null>(null)
    const [busy, setBusy]           = useState(false)
    const [error, setError]         = useState<string | null>(null)
    const [result, setResult]       = useState<string | null>(null)
    const filterKey = JSON.stringify(filters)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getMessageTemplates(token).then((r) => setTemplates(r.data.filter((t) => t.template_type === "broadcast" || t.template_type === "custom"))).catch(() => {})
        getMasterProducts(token).then(setProducts).catch(() => {})
        getInsurers(token, true).then(setInsurers).catch(() => {})
        getBroadcasts(token).then(setHistory).catch(() => {})
    }, [])

    const setFilter = (k: keyof BroadcastFilters, v: string) => setFilters((f) => {
        const next = { ...f }
        if (v) (next as Record<string, string>)[k] = v; else delete next[k]
        return next
    })

    const current = preview?.key === filterKey ? preview.data : null

    async function doPreview() {
        const token = getAccessToken()
        if (!token) return
        setBusy(true); setError(null); setResult(null)
        try { setPreview({ key: filterKey, data: await previewBroadcast(token, filters) }) }
        catch (err) { setError(errorMessage(err, "Gagal menghitung penerima")) }
        finally { setBusy(false) }
    }

    async function send() {
        const token = getAccessToken()
        if (!token || !current) return
        if (!name.trim()) { setError("Nama broadcast wajib diisi"); return }
        if (!body.trim()) { setError("Isi pesan wajib diisi"); return }
        if (!(await confirm({ title: `Kirim pesan ini ke ${current.reachable} nasabah?`, message: "Pesan dikirim lewat WhatsApp.", confirmLabel: "Kirim" }))) return
        setBusy(true); setError(null); setResult(null)
        try {
            const r = await sendBroadcast(token, { name: name.trim(), filters, template_id: templateId || undefined, body: body.trim() })
            setResult(`Terkirim ${r.sent} dari ${r.recipients} penerima${r.failed ? `, ${r.failed} gagal (lihat Riwayat)` : ""}.`)
            getBroadcasts(token).then(setHistory).catch(() => {})
        } catch (err) {
            setError(errorMessage(err, "Gagal mengirim broadcast"))
        } finally {
            setBusy(false)
        }
    }

    const productOptions = useMemo(() => [{ value: "", label: "Semua produk" }, ...products.filter((p) => p.is_active).map((p) => ({ value: p.product_code, label: p.product_name }))], [products])
    const insurerOptions = useMemo(() => [{ value: "", label: "Semua asuransi" }, ...insurers.map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))], [insurers])

    return (
        <Flex flexDir="column" gap="16px">
      {dialog}
            <Box bg="white" border="1px solid #E2E8F0" borderRadius="12px" p="20px">
                <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="4px">Segmen penerima</Text>
                <Text color="#64748B" fontSize="16px" mb="12px">Nasabah aktif yang punya polis berlaku sesuai filter. Kosongkan semua filter untuk semua nasabah aktif.</Text>
                <Flex gap="12px" flexWrap="wrap">
                    <Flex flexDir="column" gap="4px" flex="1" minW="200px"><Text {...LABEL}>Produk</Text>
                        <SearchSelect value={filters.product_type ?? ""} onChange={(v) => setFilter("product_type", v)} options={productOptions} placeholder="Semua produk" /></Flex>
                    <Flex flexDir="column" gap="4px" flex="1" minW="200px"><Text {...LABEL}>Asuransi</Text>
                        <SearchSelect value={filters.insurer_id ?? ""} onChange={(v) => setFilter("insurer_id", v)} options={insurerOptions} placeholder="Semua asuransi" /></Flex>
                    <Flex flexDir="column" gap="4px" flex="1" minW="160px"><Text {...LABEL}>Kota lokasi risiko</Text>
                        <Input fontSize="16px" maxLength={100} placeholder="mis. Jakarta" value={filters.city ?? ""} onChange={(e) => setFilter("city", e.target.value)} /></Flex>
                    <Flex flexDir="column" gap="4px" flex="1" minW="160px"><Text {...LABEL}>Jenis nasabah</Text>
                        <SearchSelect value={filters.customer_type ?? ""} onChange={(v) => setFilter("customer_type", v)} placeholder="Semua"
                            options={[{ value: "", label: "Semua" }, { value: "individual", label: "Perorangan" }, { value: "company", label: "Perusahaan" }]} /></Flex>
                </Flex>
                <Flex mt="12px" gap="12px" align="center" flexWrap="wrap">
                    <Button size="sm" variant="outline" fontSize="16px" loading={busy && !current} onClick={() => void doPreview()}>Hitung penerima</Button>
                    {current && (
                        <Text fontSize="16px" color="#334155">
                            <b>{current.reachable}</b> nasabah bisa dihubungi
                            {current.no_whatsapp > 0 ? `, ${current.no_whatsapp} tanpa WhatsApp valid dilewati` : ""}
                            {current.sample.length > 0 ? ` · mis. ${current.sample.slice(0, 3).join(", ")}` : ""}
                        </Text>
                    )}
                </Flex>
                {current && current.reachable > current.max_recipients && (
                    <Text mt="6px" fontSize="16px" color="#B45309">Maksimal {current.max_recipients} penerima per broadcast. Persempit segmen.</Text>
                )}
            </Box>

            <Box bg="white" border="1px solid #E2E8F0" borderRadius="12px" p="20px">
                <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="12px">Pesan</Text>
                <Flex flexDir="column" gap="12px">
                    <Flex flexDir="column" gap="4px"><Text {...LABEL}>Nama broadcast *</Text>
                        <Input fontSize="16px" maxLength={150} placeholder="mis. Promo asuransi kendaraan Oktober" value={name} onChange={(e) => setName(e.target.value)} /></Flex>
                    <Flex flexDir="column" gap="4px"><Text {...LABEL}>Template Pesan</Text>
                        <SearchSelect value={templateId} clearable placeholder="Pilih template (opsional)"
                            onChange={(id) => { setTemplateId(id); const t = templates.find((x) => x.template_id === id); if (t) setBody(t.body) }}
                            options={templates.map((t) => ({ value: t.template_id, label: t.name }))} /></Flex>
                    <Flex flexDir="column" gap="4px"><Text {...LABEL}>Isi pesan *</Text>
                        <Textarea fontSize="16px" rows={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
                        <Text fontSize="16px" color="#64748B">{"{customer_name}"} diisi dengan nama masing-masing nasabah. Penanda polis tidak tersedia di broadcast.</Text></Flex>
                    {error && <Text color="#DC2626" fontSize="16px" role="alert">{error}</Text>}
                    {result && <Text color="#16A34A" fontSize="16px" role="status">{result}</Text>}
                    <Box><Button bg="#25D366" color="white" fontSize="16px" gap="6px" loading={busy && !!current} disabled={!current || current.reachable === 0 || current.reachable > current.max_recipients} onClick={() => void send()}>
                        <LuSend size={14} /> Kirim Broadcast
                    </Button>
                    {!current && <Text mt="4px" fontSize="16px" color="#64748B">Hitung penerima dulu setelah mengubah filter.</Text>}</Box>
                </Flex>
            </Box>

            {history.length > 0 && (
                <Box bg="white" border="1px solid #E2E8F0" borderRadius="12px" p="20px">
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="10px">Broadcast sebelumnya</Text>
                    <Flex flexDir="column" gap="8px">
                        {history.map((b) => (
                            <Flex key={b.broadcast_id} justify="space-between" gap="12px" flexWrap="wrap" fontSize="16px">
                                <Text color="#334155" fontWeight="medium">{b.name}</Text>
                                <Text color="#64748B">{fmtDate(b.created_at)} · {b.sent_count}/{b.recipient_count} terkirim{b.failed_count ? ` · ${b.failed_count} gagal` : ""}</Text>
                            </Flex>
                        ))}
                    </Flex>
                </Box>
            )}
        </Flex>
    )
}

function LogTab() {
    const [type, setType]     = useState<MessageType | "">("")
    const [status, setStatus] = useState<"" | "sent" | "failed">("")
    const filter = useMemo(() => ({ ...(type ? { message_type: type } : {}), ...(status ? { status } : {}) }), [type, status])
    return (
        <Flex flexDir="column" gap="12px">
            <Flex gap="12px" flexWrap="wrap">
                <Box minW="220px"><SearchSelect value={type} onChange={(v) => setType(v as MessageType | "")} placeholder="Semua jenis"
                    options={[{ value: "", label: "Semua jenis" }, ...(Object.entries(MESSAGE_TYPE_LABELS) as [MessageType, string][]).map(([value, label]) => ({ value, label }))]} /></Box>
                <Box minW="180px"><SearchSelect value={status} onChange={(v) => setStatus(v as "" | "sent" | "failed")} placeholder="Semua status"
                    options={[{ value: "", label: "Semua status" }, { value: "sent", label: "Terkirim" }, { value: "failed", label: "Gagal" }]} /></Box>
            </Flex>
            <Box bg="white" border="1px solid #E2E8F0" borderRadius="12px" p="16px">
                <MessageLog filter={filter} showCustomer />
            </Box>
        </Flex>
    )
}

export default function CommunicationsPage() {
    const router = useRouter()
    useEffect(() => { if (!getAccessToken()) router.push("/login") }, [router])

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />
            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}><TopBar title="Communications" /></Box>
                <Flex flexDir="column" gap="20px" p={{ base: "16px", md: "32px" }}>
                    <Flex flexDir="column" gap="4px">
                        <Text color="#1C2833" fontSize="24px" fontWeight="bold">Komunikasi Nasabah</Text>
                        <Text color="#5D6D7E" fontSize="16px">Template pesan, ucapan otomatis, broadcast ke segmen nasabah, dan riwayat semua pesan WhatsApp.</Text>
                    </Flex>
                    <Tabs.Root defaultValue="templates" variant="plain">
                        <Tabs.List bg="#EDEDF0" borderRadius="10px" p="4px" gap="2px" w="max-content" maxW="100%" overflowX="auto" mb="16px">
                            <Tabs.Trigger value="templates" {...TAB}>Template Pesan</Tabs.Trigger>
                            <Tabs.Trigger value="broadcast" {...TAB}>Broadcast</Tabs.Trigger>
                            <Tabs.Trigger value="log" {...TAB}>Riwayat</Tabs.Trigger>
                        </Tabs.List>
                        <Tabs.Content value="templates"><TemplatesTab /></Tabs.Content>
                        <Tabs.Content value="broadcast"><BroadcastTab /></Tabs.Content>
                        <Tabs.Content value="log"><LogTab /></Tabs.Content>
                    </Tabs.Root>
                </Flex>
            </Box>
            <MobileBottomNav />
        </Box>
    )
}
