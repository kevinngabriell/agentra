"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Box, Button, Flex, IconButton, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuCalendarClock, LuChevronLeft, LuChevronRight, LuPlus, LuSearch, LuTarget, LuTrendingUp, LuUsers, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    PROSPECT_STAGE_LABELS, PROSPECT_STAGES, getProspectSummary, getProspects,
    type ApiProspect, type ProspectSummary, type ProspectType,
} from "@/lib/api/prospects"
import { fmtIDR, fmtIDRCompact } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { ProspectDialog, StageBadge, PRODUCT_OPTIONS, fmtDate, productLabel } from "@/components/sales"

const PAGE_SIZE = 20

const STAGE_OPTIONS = [
    { value: "open", label: "Masih Berjalan" },
    { value: "", label: "Semua Tahap" },
    ...PROSPECT_STAGES.map(s => ({ value: s, label: PROSPECT_STAGE_LABELS[s] })),
]

const EXPIRY_OPTIONS = [
    { value: "", label: "Semua Tanggal Berakhir" },
    { value: "30", label: "Berakhir ≤ 30 hari" },
    { value: "90", label: "Berakhir ≤ 90 hari" },
    { value: "180", label: "Berakhir ≤ 180 hari" },
]

function useDebounced<T>(value: T, ms = 350): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms)
        return () => clearTimeout(t)
    }, [value, ms])
    return debounced
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

function daysUntil(iso: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.round((new Date(iso + "T00:00:00").getTime() - today.getTime()) / 86_400_000)
}

export default function ProspectsPage() {
    const router = useRouter()
    const [checked, setChecked] = useState(false)
    const [summary, setSummary] = useState<ProspectSummary | null>(null)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [tab, setTab] = useState<ProspectType>("lead")
    const [dialogOpen, setDialogOpen] = useState(false)

    const [query, setQuery] = useState("")
    const [stage, setStage] = useState("open")
    const [product, setProduct] = useState("")
    const [expiry, setExpiry] = useState("")
    const [page, setPage] = useState(1)
    const search = useDebounced(query.trim())

    useEffect(() => {
        let active = true
        async function check() {
            if (!getAccessToken()) { router.replace("/login"); return }
            if (active) setChecked(true)
        }
        check()
        return () => { active = false }
    }, [router])

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getProspectSummary(token)
            .then((s) => { if (!cancelled) { setSummary(s); setSummaryError(null) } })
            .catch((err: unknown) => { if (!cancelled) setSummaryError(errorMessage(err, "Data ringkasan prospek belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [reloadKey])

    const queryKey = [tab, search, stage, product, expiry, page, reloadKey].join("|")
    const [result, setResult] = useState<{ key: string; rows: ApiProspect[]; total: number; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const controller = new AbortController()
        getProspects(token, {
            prospect_type: tab, params: search, stage: stage as "open" | "", product_interest: product || undefined,
            expiring_within: expiry ? Number(expiry) : undefined, page, limit: PAGE_SIZE, signal: controller.signal,
        })
            .then((res) => setResult({ key: queryKey, rows: res.data ?? [], total: res.pagination?.total ?? 0, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setResult({ key: queryKey, rows: [], total: 0, error: errorMessage(err, "Data prospek belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => controller.abort()
    }, [tab, search, stage, product, expiry, page, reloadKey, queryKey])

    const loading = result?.key !== queryKey
    const rows = loading ? [] : result?.rows ?? []
    const total = result?.total ?? 0
    const error = loading ? null : result?.error ?? null
    const isCompetitor = tab === "competitor_policy"
    const filtered = !!(search || stage !== "open" || product || expiry)

    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, total)

    if (!checked) return null

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}><TopBar title="Prospects" /></Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
                        <Flex gap="4px" flexDir="column">
                            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Prospek & Penawaran</Text>
                            <Text color="#5D6D7E" fontSize="16px">Catat calon nasabah dan polis di tempat lain, buat penawaran, lalu jadikan nasabah</Text>
                        </Flex>
                        <Button bg="#1A3557" color="white" gap="6px" fontSize="15px" h="40px" _hover={{ bg: "#162C47" }} onClick={() => setDialogOpen(true)}>
                            <LuPlus size={14} /> {isCompetitor ? "Tambah Polis Pesaing" : "Tambah Prospek"}
                        </Button>
                    </Flex>

                    <Flex gap="12px" flexWrap="wrap">
                        <StatCard icon={<LuUsers size={18} />} label="Prospek Berjalan" value={summary ? String(summary.open) : null}
                            sub={summary ? `Potensi premi ${fmtIDRCompact(summary.open_expected_premium)}` : undefined}
                            tone={{ bg: "#EFF6FF", color: "#1D4ED8" }} onClick={() => { setTab("lead"); setStage("open"); setPage(1) }} />
                        <StatCard icon={<LuTrendingUp size={18} />} label="Tingkat Keberhasilan" value={summary ? (summary.win_rate === null ? "—" : `${summary.win_rate}%`) : null}
                            sub={summary ? `${summary.by_stage.won} menang · ${summary.by_stage.lost} batal` : undefined}
                            tone={{ bg: "#DCFCE7", color: "#16A34A" }} />
                        <StatCard icon={<LuCalendarClock size={18} />} label="Polis Pesaing Berakhir ≤ 90 Hari" value={summary ? String(summary.competitor_expiring_90) : null}
                            sub={summary ? `${summary.competitor_expiring_30} dalam 30 hari` : undefined}
                            tone={{ bg: "#FEF3C7", color: "#B45309" }} onClick={() => { setTab("competitor_policy"); setStage("open"); setExpiry("90"); setPage(1) }} />
                        <StatCard icon={<LuTarget size={18} />} label="Polis Pesaing Sudah Lewat" value={summary ? String(summary.competitor_past_expiry) : null}
                            tone={{ bg: "#FEE2E2", color: "#DC2626" }} />
                    </Flex>
                    {summaryError && <Text fontSize="15px" color="#DC2626">{summaryError}</Text>}

                    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                        <Flex px="20px" pt="12px" gap="6px" borderBottom="1px solid" borderColor="#E2E8F0" role="tablist">
                            {([["lead", "Prospek"], ["competitor_policy", "Polis di Tempat Lain"]] as const).map(([value, label]) => (
                                <Button key={value} role="tab" aria-selected={tab === value} size="sm" variant="ghost" fontSize="15px" borderRadius="8px 8px 0 0"
                                    color={tab === value ? "#1A3557" : "#64748B"} fontWeight={tab === value ? "bold" : "medium"}
                                    borderBottom="2px solid" borderColor={tab === value ? "#1A3557" : "transparent"}
                                    onClick={() => { setTab(value); setExpiry(""); setPage(1) }}>
                                    {label}
                                </Button>
                            ))}
                        </Flex>
                        <Flex px="20px" py="14px" gap="10px" flexWrap="wrap" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                            <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" h="40px" flex="1" minW="200px">
                                <LuSearch size={15} color="#64748B" />
                                <Input border="none" outline="none" fontSize="15px" color="#1C2833" aria-label="Cari prospek"
                                    placeholder="Cari nama, telepon, atau asuransi..." value={query}
                                    onChange={(e) => set(setQuery)(e.target.value)} style={{ background: "transparent" }} />
                                {query && <IconButton size="xs" variant="ghost" aria-label="Hapus pencarian" color="#64748B" onClick={() => set(setQuery)("")}><LuX size={14} /></IconButton>}
                            </Flex>
                            <Box w={{ base: "100%", sm: "170px" }}><SearchSelect value={stage} onChange={set(setStage)} options={STAGE_OPTIONS} ariaLabel="Filter tahap" /></Box>
                            <Box w={{ base: "100%", sm: "170px" }}><SearchSelect value={product} onChange={set(setProduct)} options={[{ value: "", label: "Semua Produk" }, ...PRODUCT_OPTIONS]} ariaLabel="Filter produk" /></Box>
                            {isCompetitor && <Box w={{ base: "100%", sm: "200px" }}><SearchSelect value={expiry} onChange={set(setExpiry)} options={EXPIRY_OPTIONS} ariaLabel="Filter tanggal berakhir" /></Box>}
                        </Flex>

                        {error && <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{error}</Text>}
                        {!error && loading && <Flex flexDir="column" gap="8px" p="20px">{[1, 2, 3, 4].map(i => <Skeleton key={i} h="44px" borderRadius="8px" />)}</Flex>}

                        {!error && !loading && rows.length === 0 && (
                            <Flex flexDir="column" align="center" gap="8px" py="48px" px="20px" textAlign="center">
                                <LuUsers size={40} color="#CBD5E1" />
                                <Text color="#64748B" fontSize="16px">
                                    {filtered ? "Tidak ada data yang cocok dengan filter."
                                        : isCompetitor ? "Belum ada polis di tempat lain. Catat tanggal berakhirnya agar Anda bisa menawarkan sebelum jatuh tempo."
                                            : "Belum ada prospek. Tambahkan calon nasabah untuk mulai membuat penawaran."}
                                </Text>
                            </Flex>
                        )}

                        {!error && !loading && rows.length > 0 && (
                            <>
                                <Table.ScrollArea>
                                    <Table.Root size="sm">
                                        <Table.Header>
                                            <Table.Row bg="#F8FAFC">
                                                {(isCompetitor
                                                    ? ["NAMA", "POLIS SAAT INI", "BERAKHIR", "PRODUK", "TAHAP"]
                                                    : ["NAMA", "KONTAK", "PRODUK", "POTENSI PREMI", "TINDAK LANJUT", "TAHAP"]
                                                ).map(h => (
                                                    <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px" whiteSpace="nowrap">{h}</Table.ColumnHeader>
                                                ))}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {rows.map(p => {
                                                const days = p.competitor_expiry ? daysUntil(p.competitor_expiry) : null
                                                return (
                                                    <Table.Row key={p.prospect_id} borderBottom="1px solid" borderColor="#F1F5F9" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                                        onClick={() => router.push(`/agentra/prospects/${encodeURIComponent(p.prospect_id)}`)}>
                                                        <Table.Cell px="16px" py="10px">
                                                            <Text color="#1D4ED8" fontSize="15px" fontWeight="semibold">{p.name}</Text>
                                                            {p.quote_count > 0 && <Text color="#64748B" fontSize="14px">{p.quote_count} penawaran</Text>}
                                                        </Table.Cell>
                                                        {isCompetitor ? (
                                                            <>
                                                                <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                                    <Text color="#1C2833" fontSize="15px">{p.competitor_insurer ?? "—"}</Text>
                                                                    <Text color="#64748B" fontSize="14px">{p.competitor_policy_number ?? ""}{p.competitor_premium ? ` · ${fmtIDR(p.competitor_premium)}` : ""}</Text>
                                                                </Table.Cell>
                                                                <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                                    <Text color="#1C2833" fontSize="15px">{fmtDate(p.competitor_expiry)}</Text>
                                                                    {days !== null && (
                                                                        <Text fontSize="14px" fontWeight="medium" color={days < 0 ? "#DC2626" : days <= 30 ? "#B45309" : "#94A3B8"}>
                                                                            {days < 0 ? `lewat ${-days} hari` : days === 0 ? "hari ini" : `${days} hari lagi`}
                                                                        </Text>
                                                                    )}
                                                                </Table.Cell>
                                                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{productLabel(p.product_interest)}</Table.Cell>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{p.whatsapp ?? p.phone ?? p.email ?? "—"}</Table.Cell>
                                                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{productLabel(p.product_interest)}</Table.Cell>
                                                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{p.expected_premium ? fmtIDR(p.expected_premium) : "—"}</Table.Cell>
                                                                <Table.Cell px="16px" py="10px" fontSize="15px" whiteSpace="nowrap"
                                                                    color={p.follow_up_date && daysUntil(p.follow_up_date) < 0 && p.stage !== "won" && p.stage !== "lost" ? "#DC2626" : "#1C2833"}>
                                                                    {fmtDate(p.follow_up_date)}
                                                                </Table.Cell>
                                                            </>
                                                        )}
                                                        <Table.Cell px="16px" py="10px"><StageBadge stage={p.stage} /></Table.Cell>
                                                    </Table.Row>
                                                )
                                            })}
                                        </Table.Body>
                                    </Table.Root>
                                </Table.ScrollArea>
                                <Flex justify="space-between" align="center" px="20px" py="12px" borderTop="1px solid" borderColor="#F1F5F9">
                                    <Text color="#64748B" fontSize="14px">{start}–{end} dari {total}</Text>
                                    <Flex gap="6px">
                                        <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage(page - 1)}><LuChevronLeft size={13} /></Button>
                                        <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><LuChevronRight size={13} /></Button>
                                    </Flex>
                                </Flex>
                            </>
                        )}
                    </Box>
                </Flex>
            </Box>

            {dialogOpen && (
                <ProspectDialog type={tab} editing={null} onClose={() => setDialogOpen(false)}
                    onSaved={(p) => { setDialogOpen(false); setReloadKey(k => k + 1); router.push(`/agentra/prospects/${encodeURIComponent(p.prospect_id)}`) }} />
            )}

            <MobileBottomNav />
        </Box>
    )
}
