"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Box, Button, Flex, IconButton, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuCircleCheck, LuPlus, LuSearch, LuShieldAlert, LuWallet, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import {
    CLAIM_STATUS_LABELS, CLAIM_STATUSES, getClaimSummary, getClaims,
    type ApiClaim, type ClaimSummary,
} from "@/lib/api/claims"
import { fmtIDR, fmtIDRCompact } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { ClaimStatusBadge, RegisterClaimDialog } from "@/components/claims"

const PAGE_SIZE = 20

const PRODUCT_OPTIONS = [
    { value: "", label: "Semua Produk" },
    { value: "car", label: "Kendaraan" },
    { value: "motorcycle", label: "Motor" },
    { value: "fire", label: "Kebakaran" },
    { value: "cargo", label: "Kargo" },
    { value: "travel", label: "Perjalanan" },
    { value: "kecelakaan", label: "Kecelakaan" },
    { value: "aep", label: "AEP" },
    { value: "other", label: "Lainnya" },
]

const STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "open", label: "Sedang Berjalan" },
    ...CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABELS[s] })),
]

function useDebounced<T>(value: T, ms = 350): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms)
        return () => clearTimeout(t)
    }, [value, ms])
    return debounced
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function StatCard({ icon, label, value, sub, tone, onClick }: {
    icon: React.ReactNode; label: string; value: string | null; sub?: string; tone: { bg: string; color: string }; onClick?: () => void
}) {
    return (
        <Flex flex="1" minW="200px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" p="16px" gap="12px" align="center"
            as={onClick ? "button" : undefined} textAlign="left" cursor={onClick ? "pointer" : undefined} _hover={onClick ? { borderColor: "#CBD5E1" } : undefined}
            onClick={onClick}>
            <Box p="10px" borderRadius="10px" bg={tone.bg} color={tone.color}>{icon}</Box>
            <Flex flexDir="column" flex="1" minW="0">
                <Text color="#64748B" fontSize="14px">{label}</Text>
                {value === null ? <Skeleton h="24px" w="60px" mt="2px" /> : <Text color="#1C2833" fontSize="22px" fontWeight="bold" lineHeight="1.2">{value}</Text>}
                {sub && <Text color="#64748B" fontSize="14px">{sub}</Text>}
            </Flex>
        </Flex>
    )
}

function DocsProgress({ claim }: { claim: ApiClaim }) {
    if (claim.docs_required === 0) return <Text color="#CBD5E1" fontSize="14px">—</Text>
    const done = claim.docs_provided >= claim.docs_required
    return (
        <Text fontSize="14px" fontWeight="medium" color={done ? "#16A34A" : "#B45309"}>
            {claim.docs_provided}/{claim.docs_required}
        </Text>
    )
}

export default function ClaimsPage() {
    const router = useRouter()
    const [checked, setChecked]     = useState(false)
    const [insurers, setInsurers]   = useState<ApiInsurer[]>([])
    const [summary, setSummary]     = useState<ClaimSummary | null>(null)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const reloadKey = 0
    const [registerOpen, setRegisterOpen] = useState(false)

    const [query, setQuery]         = useState("")
    const [status, setStatus]       = useState("open")
    const [insurerId, setInsurer]   = useState("")
    const [product, setProduct]     = useState("")
    const [page, setPage]           = useState(1)
    const search = useDebounced(query.trim())

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
        getClaimSummary(token)
            .then((s) => { if (!cancelled) { setSummary(s); setSummaryError(null) } })
            .catch((err: unknown) => { if (!cancelled) setSummaryError(errorMessage(err, "Data ringkasan klaim belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [reloadKey])

    const queryKey = [search, status, insurerId, product, page, reloadKey].join("|")
    const [result, setResult] = useState<{ key: string; claims: ApiClaim[]; total: number; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = [search, status, insurerId, product, page, reloadKey].join("|")
        const controller = new AbortController()
        getClaims(token, {
            params: search, status: status as ApiClaim["status"] | "open" | "", insurer_id: insurerId || undefined,
            product_type: product || undefined, page, limit: PAGE_SIZE, signal: controller.signal,
        })
            .then((res) => setResult({ key, claims: res.data ?? [], total: res.pagination?.total ?? 0, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setResult({ key, claims: [], total: 0, error: errorMessage(err, "Data klaim belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => controller.abort()
    }, [search, status, insurerId, product, page, reloadKey])

    const loading = result?.key !== queryKey
    const claims  = loading ? [] : result?.claims ?? []
    const total   = result?.total ?? 0
    const error   = loading ? null : result?.error ?? null
    const filtered = !!(search || status !== "open" || insurerId || product)

    // Every filter change goes back to page 1.
    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }
    const insurerOptions = [{ value: "", label: "Semua Asuransi" }, ...insurers.map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))]

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end   = Math.min(page * PAGE_SIZE, total)

    if (!checked) return null

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Claims" />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
                        <Flex gap="4px" flexDir="column">
                            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Klaim</Text>
                            <Text color="#5D6D7E" fontSize="16px">Pantau klaim nasabah dari pelaporan sampai pembayaran</Text>
                        </Flex>
                        <Button bg="#1A3557" color="white" gap="6px" fontSize="15px" h="40px" _hover={{ bg: "#162C47" }} onClick={() => setRegisterOpen(true)}>
                            <LuPlus size={14} /> Daftarkan Klaim
                        </Button>
                    </Flex>

                    <Flex gap="12px" flexWrap="wrap">
                        <StatCard icon={<LuShieldAlert size={18} />} label="Klaim Berjalan" value={summary ? String(summary.open) : null}
                            sub={summary ? `Estimasi ${fmtIDRCompact(summary.open_estimated)}` : undefined}
                            tone={{ bg: "#EFF6FF", color: "#1D4ED8" }} onClick={() => { setStatus("open"); setPage(1) }} />
                        <StatCard icon={<LuCircleAlert size={18} />} label="Menunggu Dokumen" value={summary ? String(summary.pending_documents) : null}
                            tone={{ bg: "#FEF3C7", color: "#B45309" }} />
                        <StatCard icon={<LuCircleCheck size={18} />} label="Disetujui, Belum Dibayar" value={summary ? String(summary.by_status.approved) : null}
                            sub={summary ? fmtIDRCompact(summary.approved_unpaid) : undefined}
                            tone={{ bg: "#DCFCE7", color: "#16A34A" }} onClick={() => { setStatus("approved"); setPage(1) }} />
                        <StatCard icon={<LuWallet size={18} />} label="Total Dibayar" value={summary ? fmtIDRCompact(summary.paid_total) : null}
                            sub={summary ? `${summary.by_status.paid} klaim` : undefined}
                            tone={{ bg: "#E0E7FF", color: "#4338CA" }} onClick={() => { setStatus("paid"); setPage(1) }} />
                    </Flex>
                    {summaryError && <Text fontSize="15px" color="#DC2626">{summaryError}</Text>}

                    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                        <Flex px="20px" py="14px" gap="10px" flexWrap="wrap" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                            <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" h="40px" flex="1" minW="200px">
                                <LuSearch size={15} color="#64748B" />
                                <Input border="none" outline="none" fontSize="15px" color="#1C2833" aria-label="Cari klaim"
                                    placeholder="Cari no. klaim, nasabah, no. polis, atau penyebab..."
                                    value={query} onChange={(e) => set(setQuery)(e.target.value)} style={{ background: "transparent" }} />
                                {query && (
                                    <IconButton size="xs" variant="ghost" aria-label="Hapus pencarian" color="#64748B" onClick={() => set(setQuery)("")}>
                                        <LuX size={14} />
                                    </IconButton>
                                )}
                            </Flex>
                            <Box w={{ base: "100%", sm: "170px" }}>
                                <SearchSelect value={status} onChange={set(setStatus)} options={STATUS_OPTIONS} ariaLabel="Filter status klaim" />
                            </Box>
                            <Box w={{ base: "100%", sm: "170px" }}>
                                <SearchSelect value={insurerId} onChange={set(setInsurer)} options={insurerOptions} ariaLabel="Filter asuransi" />
                            </Box>
                            <Box w={{ base: "100%", sm: "170px" }}>
                                <SearchSelect value={product} onChange={set(setProduct)} options={PRODUCT_OPTIONS} ariaLabel="Filter produk" />
                            </Box>
                        </Flex>

                        {error && <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{error}</Text>}

                        {!error && loading && (
                            <Flex flexDir="column" gap="8px" p="20px">
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                            </Flex>
                        )}

                        {!error && !loading && claims.length === 0 && (
                            <Flex flexDir="column" align="center" gap="8px" py="48px" px="20px" textAlign="center">
                                <LuShieldAlert size={40} color="#CBD5E1" />
                                <Text color="#64748B" fontSize="16px">
                                    {filtered ? "Tidak ada klaim yang cocok dengan filter." : "Belum ada klaim berjalan. Daftarkan klaim saat nasabah melaporkan kerugian."}
                                </Text>
                            </Flex>
                        )}

                        {!error && !loading && claims.length > 0 && (
                            <>
                                <Table.ScrollArea>
                                    <Table.Root size="sm">
                                        <Table.Header>
                                            <Table.Row bg="#F8FAFC">
                                                {["NO. KLAIM", "NASABAH", "POLIS", "KEJADIAN", "NILAI", "DOKUMEN", "STATUS"].map((h) => (
                                                    <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px" whiteSpace="nowrap">
                                                        {h}
                                                    </Table.ColumnHeader>
                                                ))}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {claims.map((c) => (
                                                <Table.Row key={c.claim_id} borderBottom="1px solid" borderColor="#F1F5F9" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                                    onClick={() => router.push(`/agentra/claims/${encodeURIComponent(c.claim_id)}`)}>
                                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                        <Text color="#1D4ED8" fontSize="15px" fontWeight="semibold">{c.claim_number}</Text>
                                                        {c.insurer_claim_number && <Text color="#64748B" fontSize="14px">{c.insurer_claim_number}</Text>}
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{c.customer_name}</Table.Cell>
                                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                        <Text color="#1C2833" fontSize="14px" fontFamily="mono">{c.policy_number}</Text>
                                                        <Text color="#64748B" fontSize="14px">{c.insurer_short_name ?? ""}</Text>
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                        <Text color="#1C2833" fontSize="15px">{c.cause}</Text>
                                                        <Text color="#64748B" fontSize="14px">{fmtDate(c.date_of_loss)}</Text>
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                        <Text color="#1C2833" fontSize="15px" fontWeight="medium">
                                                            {fmtIDR(c.settlement_amount ?? c.approved_amount ?? c.estimated_loss)}
                                                        </Text>
                                                        <Text color="#64748B" fontSize="14px">
                                                            {c.settlement_amount !== null ? "dibayar" : c.approved_amount !== null ? "disetujui" : "estimasi"}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px"><DocsProgress claim={c} /></Table.Cell>
                                                    <Table.Cell px="16px" py="10px"><ClaimStatusBadge status={c.status} /></Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                </Table.ScrollArea>
                                <Flex justify="space-between" align="center" px="20px" py="12px" borderTop="1px solid" borderColor="#F1F5F9">
                                    <Text color="#64748B" fontSize="14px">{start}–{end} dari {total}</Text>
                                    <Flex gap="6px">
                                        <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman sebelumnya"
                                            disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                            <LuChevronLeft size={13} />
                                        </Button>
                                        <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman berikutnya"
                                            disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                            <LuChevronRight size={13} />
                                        </Button>
                                    </Flex>
                                </Flex>
                            </>
                        )}
                    </Box>
                </Flex>
            </Box>

            <RegisterClaimDialog
                open={registerOpen}
                onClose={() => setRegisterOpen(false)}
                onRegistered={(claim) => router.push(`/agentra/claims/${encodeURIComponent(claim.claim_id)}`)}
            />

            <MobileBottomNav />
        </Box>
    )
}
