"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Table, Tabs, Text } from "@chakra-ui/react"
import {
    LuArchive, LuChevronLeft, LuChevronRight, LuCircleAlert, LuCircleCheck, LuFileText,
    LuFolderOpen, LuSearch, LuUpload, LuUser, LuX,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import {
    DOCUMENT_TYPE_LABELS, archiveExpiredDocuments, getDocumentSummary, getDocuments, getKycList,
    type ApiCustomerKyc, type ApiDocument, type ApiDocumentStatus, type ApiDocumentType, type DocumentSummary,
} from "@/lib/api/documents"
import { SearchSelect } from "@/components/ui/search-select"
import { DocumentsTable, UploadDocumentDialog } from "@/components/documents"

const PAGE_SIZE = 20

const TYPE_OPTIONS = [
    { value: "", label: "Semua Jenis" },
    ...(Object.entries(DOCUMENT_TYPE_LABELS) as [ApiDocumentType, string][]).map(([value, label]) => ({ value, label })),
]
const STATUS_OPTIONS = [
    { value: "active",   label: "Aktif" },
    { value: "archived", label: "Arsip" },
    { value: "all",      label: "Semua Status" },
]
const KYC_FILTERS = [
    { value: "incomplete", label: "Belum Lengkap" },
    { value: "complete",   label: "Lengkap" },
    { value: "all",        label: "Semua" },
] as const

function useDebounced<T>(value: T, ms = 350): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms)
        return () => clearTimeout(t)
    }, [value, ms])
    return debounced
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end   = Math.min(page * PAGE_SIZE, total)
    return (
        <Flex justify="space-between" align="center" px="20px" py="12px" borderTop="1px solid" borderColor="#F1F5F9">
            <Text color="#64748B" fontSize="14px">{start}–{end} dari {total}</Text>
            <Flex gap="6px">
                <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman sebelumnya"
                    disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    <LuChevronLeft size={13} />
                </Button>
                <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman berikutnya"
                    disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
                    <LuChevronRight size={13} />
                </Button>
            </Flex>
        </Flex>
    )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" h="40px" flex="1" minW="200px">
            <LuSearch size={15} color="#64748B" />
            <Input border="none" outline="none" fontSize="15px" color="#1C2833" placeholder={placeholder} aria-label={placeholder}
                value={value} onChange={(e) => onChange(e.target.value)} style={{ background: "transparent" }} />
            {value && (
                <IconButton size="xs" variant="ghost" aria-label="Hapus pencarian" color="#64748B" onClick={() => onChange("")}>
                    <LuX size={14} />
                </IconButton>
            )}
        </Flex>
    )
}

function StatCard({ icon, label, value, tone, action }: {
    icon: React.ReactNode; label: string; value: number | null; tone: { bg: string; color: string }; action?: React.ReactNode
}) {
    return (
        <Flex flex="1" minW="200px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" p="16px" gap="12px" align="center">
            <Box p="10px" borderRadius="10px" bg={tone.bg} color={tone.color}>{icon}</Box>
            <Flex flexDir="column" flex="1" minW="0">
                <Text color="#64748B" fontSize="14px">{label}</Text>
                {value === null ? <Skeleton h="24px" w="40px" mt="2px" /> : <Text color="#1C2833" fontSize="22px" fontWeight="bold" lineHeight="1.2">{value}</Text>}
            </Flex>
            {action}
        </Flex>
    )
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ summary, insurers, reloadKey, onChanged }: {
    summary: DocumentSummary | null; insurers: ApiInsurer[]; reloadKey: number; onChanged: () => void
}) {
    const [query, setQuery]       = useState("")
    const [type, setType]         = useState("")
    const [insurerId, setInsurer] = useState("")
    const [year, setYear]         = useState("")
    const [status, setStatus]     = useState<ApiDocumentStatus | "all">("active")
    const [page, setPage]         = useState(1)
    const [uploadOpen, setUploadOpen] = useState(false)
    const search = useDebounced(query.trim())

    const queryKey = [search, type, insurerId, year, status, page, reloadKey].join("|")
    const [result, setResult] = useState<{ key: string; docs: ApiDocument[]; total: number; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = [search, type, insurerId, year, status, page, reloadKey].join("|")
        const controller = new AbortController()
        getDocuments(token, {
            params: search, document_type: type as ApiDocumentType | "", insurer_id: insurerId || undefined,
            year: year ? Number(year) : "", status, page, limit: PAGE_SIZE, signal: controller.signal,
        })
            .then((res) => setResult({ key, docs: res.data ?? [], total: res.pagination?.total ?? 0, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setResult({ key, docs: [], total: 0, error: errorMessage(err, "Dokumen belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => controller.abort()
    }, [search, type, insurerId, year, status, page, reloadKey])

    const loading = result?.key !== queryKey
    const docs    = loading ? [] : result?.docs ?? []
    const total   = result?.total ?? 0
    const error   = loading ? null : result?.error ?? null
    const filtered = !!(search || type || insurerId || year || status !== "active")

    // Every filter change goes back to page 1.
    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }

    const insurerOptions = [{ value: "", label: "Semua Asuransi" }, ...insurers.map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))]
    const yearOptions    = [{ value: "", label: "Semua Tahun" }, ...(summary?.years ?? []).map((y) => ({ value: String(y), label: String(y) }))]

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            <Flex px="20px" py="14px" gap="10px" flexWrap="wrap" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                <SearchBox value={query} onChange={set(setQuery)} placeholder="Cari judul, file, nasabah, atau no. polis..." />
                <Box w={{ base: "100%", sm: "160px" }}>
                    <SearchSelect value={type} onChange={set(setType)} options={TYPE_OPTIONS} ariaLabel="Filter jenis dokumen" />
                </Box>
                <Box w={{ base: "100%", sm: "160px" }}>
                    <SearchSelect value={insurerId} onChange={set(setInsurer)} options={insurerOptions} ariaLabel="Filter asuransi" />
                </Box>
                <Box w={{ base: "48%", sm: "130px" }}>
                    <SearchSelect value={year} onChange={set(setYear)} options={yearOptions} ariaLabel="Filter tahun" />
                </Box>
                <Box w={{ base: "48%", sm: "140px" }}>
                    <SearchSelect value={status} onChange={set((v: string) => setStatus((v || "active") as ApiDocumentStatus | "all"))}
                        options={STATUS_OPTIONS} ariaLabel="Filter status" />
                </Box>
                <Button bg="#1A3557" color="white" gap="6px" fontSize="15px" h="40px" _hover={{ bg: "#162C47" }}
                    w={{ base: "100%", sm: "auto" }} onClick={() => setUploadOpen(true)}>
                    <LuUpload size={14} /> Unggah Dokumen
                </Button>
            </Flex>

            {error && <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{error}</Text>}

            {!error && loading && (
                <Flex flexDir="column" gap="8px" p="20px">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                </Flex>
            )}

            {!error && !loading && docs.length === 0 && (
                <Flex flexDir="column" align="center" gap="8px" py="48px" px="20px" textAlign="center">
                    <LuFolderOpen size={40} color="#CBD5E1" />
                    <Text color="#64748B" fontSize="16px">
                        {filtered ? "Tidak ada dokumen yang cocok dengan filter." : "Belum ada dokumen. Unggah polis, SPPA, atau dokumen KYC nasabah."}
                    </Text>
                </Flex>
            )}

            {!error && !loading && docs.length > 0 && (
                <>
                    <DocumentsTable documents={docs} onChanged={onChanged} />
                    <Pager page={page} total={total} onPage={setPage} />
                </>
            )}

            <UploadDocumentDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onChanged} />
        </Box>
    )
}

// ─── KYC tab ──────────────────────────────────────────────────────────────────

function KycTab({ reloadKey, onChanged }: { reloadKey: number; onChanged: () => void }) {
    const router = useRouter()
    const [filter, setFilter] = useState<"incomplete" | "complete" | "all">("incomplete")
    const [query, setQuery]   = useState("")
    const [page, setPage]     = useState(1)
    const [upload, setUpload] = useState<{ customer: ApiCustomerKyc; type: ApiDocumentType } | null>(null)
    const search = useDebounced(query.trim())

    const queryKey = [filter, search, page, reloadKey].join("|")
    const [result, setResult] = useState<{ key: string; rows: ApiCustomerKyc[]; total: number; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = [filter, search, page, reloadKey].join("|")
        const controller = new AbortController()
        getKycList(token, { kyc: filter, params: search, page, limit: PAGE_SIZE, signal: controller.signal })
            .then((res) => setResult({ key, rows: res.data ?? [], total: res.pagination?.total ?? 0, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setResult({ key, rows: [], total: 0, error: errorMessage(err, "Gagal memuat status KYC") }) })
        return () => controller.abort()
    }, [filter, search, page, reloadKey])

    const loading = result?.key !== queryKey
    const rows    = loading ? [] : result?.rows ?? []
    const total   = result?.total ?? 0
    const error   = loading ? null : result?.error ?? null

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            <Flex px="20px" py="14px" gap="10px" flexWrap="wrap" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                <Flex bg="#EDEDF0" borderRadius="8px" p="3px" gap="2px">
                    {KYC_FILTERS.map((f) => (
                        <Button key={f.value} size="sm" h="32px" px="12px" fontSize="15px" borderRadius="6px"
                            bg={filter === f.value ? "white" : "transparent"} color={filter === f.value ? "#0F172A" : "#64748B"}
                            fontWeight={filter === f.value ? "bold" : "medium"} shadow={filter === f.value ? "sm" : "none"}
                            onClick={() => { setFilter(f.value); setPage(1) }}>
                            {f.label}
                        </Button>
                    ))}
                </Flex>
                <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Cari nama nasabah..." />
            </Flex>

            <Box px="20px" py="10px" bg="#F8FAFC" borderBottom="1px solid" borderColor="#F1F5F9">
                <Text color="#64748B" fontSize="14px">
                    Dokumen wajib APU-PPT — Perorangan: KTP. Perusahaan: Akta Pendirian, NIB, NPWP, dan KTP direktur/pengurus. Nasabah tidak aktif tidak ditampilkan.
                </Text>
            </Box>

            {error && <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{error}</Text>}

            {!error && loading && (
                <Flex flexDir="column" gap="8px" p="20px">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                </Flex>
            )}

            {!error && !loading && rows.length === 0 && (
                <Flex flexDir="column" align="center" gap="8px" py="48px">
                    <LuCircleCheck size={40} color="#86EFAC" />
                    <Text color="#64748B" fontSize="16px">
                        {filter === "incomplete" ? "Semua nasabah sudah melengkapi dokumen KYC." : "Tidak ada nasabah."}
                    </Text>
                </Flex>
            )}

            {!error && !loading && rows.length > 0 && (
                <>
                    <Table.ScrollArea>
                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row bg="#F8FAFC">
                                    {["NASABAH", "DOKUMEN KYC", "STATUS", ""].map((h) => (
                                        <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px">{h}</Table.ColumnHeader>
                                    ))}
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {rows.map((r) => (
                                    <Table.Row key={r.customer_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>
                                        <Table.Cell px="16px" py="10px" minW="180px">
                                            <Text color="#1C2833" fontSize="15px" fontWeight="medium">{r.display_name}</Text>
                                            <Text color="#64748B" fontSize="14px">{r.customer_type === "company" ? "Perusahaan" : "Perorangan"}</Text>
                                        </Table.Cell>
                                        <Table.Cell px="16px" py="10px">
                                            <Flex gap="6px" flexWrap="wrap">
                                                {r.required.map((t) => {
                                                    const ok = r.present.includes(t)
                                                    return (
                                                        <Badge key={t} px="8px" py="1px" borderRadius="full" fontSize="14px" gap="4px"
                                                            bg={ok ? "#DCFCE7" : "#FEF3C7"} color={ok ? "#16A34A" : "#B45309"}>
                                                            {ok ? <LuCircleCheck size={11} /> : <LuCircleAlert size={11} />} {DOCUMENT_TYPE_LABELS[t]}
                                                        </Badge>
                                                    )
                                                })}
                                            </Flex>
                                        </Table.Cell>
                                        <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                            <Text fontSize="14px" fontWeight="semibold" color={r.complete ? "#16A34A" : "#B45309"}>
                                                {r.complete ? "Lengkap" : `Kurang ${r.missing.length}`}
                                            </Text>
                                        </Table.Cell>
                                        <Table.Cell px="12px" py="10px" textAlign="end" whiteSpace="nowrap">
                                            {!r.complete && (
                                                <Button size="xs" variant="ghost" color="#1A3557" gap="4px" fontSize="14px"
                                                    onClick={() => setUpload({ customer: r, type: r.missing[0] })}>
                                                    <LuUpload size={12} /> Unggah
                                                </Button>
                                            )}
                                            <Button size="xs" variant="ghost" color="#3B82F6" gap="4px" fontSize="14px"
                                                onClick={() => router.push(`/agentra/customer/detail?id=${encodeURIComponent(r.customer_id)}#dokumen`)}>
                                                <LuUser size={12} /> Nasabah
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>
                    <Pager page={page} total={total} onPage={setPage} />
                </>
            )}

            <UploadDocumentDialog
                open={!!upload}
                onClose={() => setUpload(null)}
                onUploaded={onChanged}
                customer={upload ? { id: upload.customer.customer_id, name: upload.customer.display_name } : undefined}
                defaultType={upload?.type}
            />
        </Box>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Documents() {
    const router = useRouter()
    const [checked, setChecked]   = useState(false)
    const [tab, setTab]           = useState<"documents" | "kyc">("documents")
    const [reloadKey, setReload]  = useState(0)
    const [summary, setSummary]   = useState<DocumentSummary | null>(null)
    const [insurers, setInsurers] = useState<ApiInsurer[]>([])
    const [archiving, setArchiving] = useState(false)
    const [notice, setNotice]     = useState<{ ok: boolean; text: string } | null>(null)

    useEffect(() => {
        let active = true
        async function check() {
            const token = getAccessToken()
            if (!token) { router.replace("/login"); return }
            if (active) setChecked(true)
            const list = await getInsurers(token).catch(() => [])
            if (active) setInsurers(list)
        }
        check()
        return () => { active = false }
    }, [router])

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getDocumentSummary(token)
            .then((s) => { if (!cancelled) setSummary(s) })
            .catch((err: unknown) => { if (!cancelled) setNotice({ ok: false, text: errorMessage(err, "Data ringkasan dokumen belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [reloadKey])

    const refresh = () => setReload((k) => k + 1)

    async function handleArchiveExpired() {
        const token = getAccessToken()
        if (!token) return
        setArchiving(true)
        setNotice(null)
        try {
            const { archived } = await archiveExpiredDocuments(token)
            setNotice({ ok: true, text: `${archived} dokumen dari polis yang sudah berakhir dipindahkan ke arsip.` })
            refresh()
        } catch (err) {
            setNotice({ ok: false, text: errorMessage(err, "Gagal mengarsipkan dokumen") })
        } finally {
            setArchiving(false)
        }
    }

    if (!checked) return null

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Documents" />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    <Flex gap="4px" flexDir="column">
                        <Text color="#1C2833" fontSize="24px" fontWeight="bold">Dokumen</Text>
                        <Text color="#5D6D7E" fontSize="16px">Polis, endorsemen, SPPA, dokumen KYC, foto survei, dan dokumen klaim nasabah</Text>
                    </Flex>

                    <Flex gap="12px" flexWrap="wrap">
                        <StatCard icon={<LuFileText size={18} />} label="Dokumen Aktif" value={summary?.active ?? null} tone={{ bg: "#EFF6FF", color: "#1D4ED8" }} />
                        <StatCard icon={<LuArchive size={18} />} label="Diarsipkan" value={summary?.archived ?? null} tone={{ bg: "#F1F5F9", color: "#64748B" }} />
                        <StatCard icon={<LuCircleAlert size={18} />} label="KYC Belum Lengkap" value={summary?.kyc_incomplete ?? null}
                            tone={{ bg: "#FEF3C7", color: "#B45309" }}
                            action={tab !== "kyc" && !!summary?.kyc_incomplete && (
                                <Button size="xs" variant="ghost" color="#B45309" fontSize="14px" onClick={() => setTab("kyc")}>Lihat</Button>
                            )} />
                        <StatCard icon={<LuArchive size={18} />} label="Polis Berakhir, Belum Diarsip" value={summary?.expired_policy_active ?? null}
                            tone={{ bg: "#FEE2E2", color: "#DC2626" }}
                            action={!!summary?.expired_policy_active && (
                                <Button size="xs" variant="outline" borderColor="#FCA5A5" color="#DC2626" fontSize="14px"
                                    loading={archiving} onClick={handleArchiveExpired}>
                                    Arsipkan
                                </Button>
                            )} />
                    </Flex>

                    {notice && (
                        <Flex px="14px" py="10px" borderRadius="8px" border="1px solid" justify="space-between" align="center"
                            bg={notice.ok ? "#F0FDF4" : "#FEF2F2"} borderColor={notice.ok ? "#BBF7D0" : "#FECACA"}>
                            <Text fontSize="15px" color={notice.ok ? "#16A34A" : "#DC2626"}>{notice.text}</Text>
                            <IconButton size="xs" variant="ghost" aria-label="Tutup" color="#64748B" onClick={() => setNotice(null)}><LuX size={14} /></IconButton>
                        </Flex>
                    )}

                    <Tabs.Root value={tab} onValueChange={(d) => setTab(d.value as "documents" | "kyc")} variant="plain">
                        <Tabs.List bg="#EDEDF0" borderRadius="10px" p="4px" gap="2px" w="max-content" mb="16px">
                            {([["documents", "Semua Dokumen"], ["kyc", "KYC Nasabah"]] as const).map(([v, label]) => (
                                <Tabs.Trigger key={v} value={v} px="18px" py="8px" borderRadius="8px" fontSize="16px" fontWeight="medium" color="#64748B"
                                    _selected={{ bg: "white", color: "#0F172A", fontWeight: "bold", shadow: "sm" }}>
                                    {label}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                        <Tabs.Content value="documents" p="0">
                            <DocumentsTab summary={summary} insurers={insurers} reloadKey={reloadKey} onChanged={refresh} />
                        </Tabs.Content>
                        <Tabs.Content value="kyc" p="0">
                            <KycTab reloadKey={reloadKey} onChanged={refresh} />
                        </Tabs.Content>
                    </Tabs.Root>
                </Flex>
            </Box>

            <MobileBottomNav />
        </Box>
    )
}
