"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav, PlanLocked } from "@/components/layout"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuChevronLeft, LuChevronRight, LuHandshake, LuPlus, LuSearch, LuShieldCheck, LuUserCheck, LuUsers, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage, isPlanLockedError } from "@/lib/api/client"
import {
    SUB_AGENT_STATUS_COLORS, SUB_AGENT_STATUS_LABELS, getSubAgents,
    type ApiSubAgent, type SubAgentStatus,
} from "@/lib/api/sub-agents"
import { fmtIDR, fmtIDRCompact } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { SubAgentFormDialog } from "@/components/sub-agents"

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "active", label: SUB_AGENT_STATUS_LABELS.active },
    { value: "inactive", label: SUB_AGENT_STATUS_LABELS.inactive },
]

function useDebounced<T>(value: T, ms = 350): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms)
        return () => clearTimeout(t)
    }, [value, ms])
    return debounced
}

function StatCard({ icon, label, value, sub, tone }: {
    icon: React.ReactNode; label: string; value: string | null; sub?: string; tone: { bg: string; color: string }
}) {
    return (
        <Flex flex="1" minW="200px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" p="16px" gap="12px" align="center">
            <Box p="10px" borderRadius="10px" bg={tone.bg} color={tone.color}>{icon}</Box>
            <Flex flexDir="column" flex="1" minW="0">
                <Text color="#64748B" fontSize="14px">{label}</Text>
                {value === null ? <Skeleton h="24px" w="60px" mt="2px" /> : <Text color="#1C2833" fontSize="22px" fontWeight="bold" lineHeight="1.2">{value}</Text>}
                {sub && <Text color="#64748B" fontSize="14px">{sub}</Text>}
            </Flex>
        </Flex>
    )
}

export default function SubAgents() {
    const router = useRouter()
    const [formOpen, setFormOpen] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    const [query, setQuery]   = useState("")
    const [status, setStatus] = useState("")
    const [page, setPage]     = useState(1)
    const search = useDebounced(query.trim())

    // proxy.ts already bounces visitors without the session cookie; this covers a cookie
    // that outlived its tokens.
    useEffect(() => {
        if (!getAccessToken()) router.replace("/login")
    }, [router])

    const queryKey = [search, status, page, reloadKey].join("|")
    const [result, setResult] = useState<{ key: string; agents: ApiSubAgent[]; total: number; error: string | null; lock: { message: string; requiredPlan?: string } | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = [search, status, page, reloadKey].join("|")
        const controller = new AbortController()
        getSubAgents(token, { params: search, status: status as SubAgentStatus | "", page, limit: PAGE_SIZE, signal: controller.signal })
            .then((res) => setResult({ key, agents: res.data ?? [], total: res.pagination?.total ?? 0, error: null, lock: null }))
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
                const lock = isPlanLockedError(err) ? { message: err.message, requiredPlan: err.requiredPlan } : null
                setResult({ key, agents: [], total: 0, error: lock ? null : errorMessage(err, "Gagal memuat sub-agen"), lock })
            })
        return () => controller.abort()
    }, [search, status, page, reloadKey])

    // Network-wide figures: a separate unfiltered, single-page request so the cards ignore the table filters.
    const [overall, setOverall] = useState<ApiSubAgent[] | null>(null)
    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getSubAgents(token, { limit: 100 })
            .then((res) => { if (!cancelled) setOverall(res.data ?? []) })
            .catch(() => { if (!cancelled) setOverall([]) })
        return () => { cancelled = true }
    }, [reloadKey])

    const loading = result?.key !== queryKey
    const agents  = loading ? [] : result?.agents ?? []
    const total   = result?.total ?? 0
    const error   = loading ? null : result?.error ?? null
    const lock    = loading ? null : result?.lock ?? null
    const filtered = !!(search || status)

    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end   = Math.min(page * PAGE_SIZE, total)

    const sum = (pick: (a: ApiSubAgent) => number) => (overall ?? []).reduce((n, a) => n + pick(a), 0)

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Sub Agents" />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
                        <Flex gap="4px" flexDir="column">
                            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Sub-Agen</Text>
                            <Text color="#5D6D7E" fontSize="16px">Jaringan agen referral: nasabah, polis, dan bagi hasil komisi</Text>
                        </Flex>
                        {!lock && (
                            <Button bg="#1A3557" color="white" gap="6px" fontSize="16px" h="40px" _hover={{ bg: "#162C47" }} onClick={() => setFormOpen(true)}>
                                <LuPlus size={14} /> Tambah Sub-Agen
                            </Button>
                        )}
                    </Flex>

                    {lock ? (
                        <PlanLocked
                            title="Sub-Agen tersedia di Paket Tim"
                            message={lock.message}
                            requiredPlan={lock.requiredPlan}
                            benefits={[
                                "Kelola jaringan sub-agen referral dalam satu tempat",
                                "Catat nasabah dan polis yang dibawa tiap sub-agen",
                                "Hitung bagi hasil komisi otomatis per perusahaan asuransi",
                                "Beri sub-agen akses portal sendiri dan kirim digest perpanjangan ke WhatsApp mereka",
                            ]}
                        />
                    ) : (<>

                    <Flex gap="12px" flexWrap="wrap">
                        <StatCard icon={<LuUserCheck size={18} />} label="Sub-Agen Aktif"
                            value={overall ? String(overall.filter((a) => a.status === "active").length) : null}
                            sub={overall ? `${overall.length} terdaftar` : undefined} tone={{ bg: "#DCFCE7", color: "#16A34A" }} />
                        <StatCard icon={<LuUsers size={18} />} label="Nasabah Referral"
                            value={overall ? String(sum((a) => a.customers_count)) : null} tone={{ bg: "#EFF6FF", color: "#1D4ED8" }} />
                        <StatCard icon={<LuShieldCheck size={18} />} label="Polis Aktif"
                            value={overall ? String(sum((a) => a.active_policies_count)) : null}
                            sub={overall ? `Premi ${fmtIDRCompact(sum((a) => a.total_premium))}` : undefined} tone={{ bg: "#E0E7FF", color: "#4338CA" }} />
                        <StatCard icon={<LuHandshake size={18} />} label="Komisi untuk Sub-Agen"
                            value={overall ? fmtIDRCompact(sum((a) => a.sub_agent_commission)) : null}
                            sub={overall ? `dari ${fmtIDRCompact(sum((a) => a.total_commission ?? 0))} komisi kotor` : undefined} tone={{ bg: "#FEF3C7", color: "#B45309" }} />
                    </Flex>
                    {overall && overall.length >= 100 && (
                        <Text color="#64748B" fontSize="14px" mt="-12px">Ringkasan menghitung 100 sub-agen pertama.</Text>
                    )}

                    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                        <Flex px="20px" py="14px" gap="10px" flexWrap="wrap" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
                            <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" h="40px" flex="1" minW="200px">
                                <LuSearch size={15} color="#64748B" />
                                <Input border="none" outline="none" fontSize="15px" color="#1C2833" aria-label="Cari sub-agen"
                                    placeholder="Cari nama, kode agen, atau nomor telepon..."
                                    value={query} onChange={(e) => set(setQuery)(e.target.value)} style={{ background: "transparent" }} />
                                {query && (
                                    <IconButton size="xs" variant="ghost" aria-label="Hapus pencarian" color="#64748B" onClick={() => set(setQuery)("")}>
                                        <LuX size={14} />
                                    </IconButton>
                                )}
                            </Flex>
                            <Box w={{ base: "100%", sm: "170px" }}>
                                <SearchSelect value={status} onChange={set(setStatus)} options={STATUS_OPTIONS} ariaLabel="Filter status sub-agen" />
                            </Box>
                        </Flex>

                        {error && <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{error}</Text>}

                        {!error && loading && (
                            <Flex flexDir="column" gap="8px" p="20px">
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                            </Flex>
                        )}

                        {!error && !loading && agents.length === 0 && (
                            <Flex flexDir="column" align="center" gap="8px" py="48px" px="20px" textAlign="center">
                                <LuUsers size={40} color="#CBD5E1" />
                                <Text color="#64748B" fontSize="16px">
                                    {filtered ? "Tidak ada sub-agen yang cocok dengan filter." : "Belum ada sub-agen. Tambahkan sub-agen untuk mencatat nasabah dan polis yang mereka bawa."}
                                </Text>
                            </Flex>
                        )}

                        {!error && !loading && agents.length > 0 && (
                            <>
                                <Table.ScrollArea>
                                    <Table.Root size="sm">
                                        <Table.Header>
                                            <Table.Row bg="#F8FAFC">
                                                {["SUB-AGEN", "KONTAK", "NASABAH", "POLIS AKTIF", "PREMI", "KOMISI SUB-AGEN", "BAGI HASIL", "STATUS"].map((h) => (
                                                    <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px" whiteSpace="nowrap">
                                                        {h}
                                                    </Table.ColumnHeader>
                                                ))}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {agents.map((a) => (
                                                <Table.Row key={a.sub_agent_id} borderBottom="1px solid" borderColor="#F1F5F9" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                                    onClick={() => router.push(`/agentra/sub-agents/${encodeURIComponent(a.sub_agent_id)}`)}>
                                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                                        <Text color="#1D4ED8" fontSize="15px" fontWeight="semibold">{a.full_name}</Text>
                                                        <Text color="#64748B" fontSize="14px" fontFamily="mono">{a.agent_code}</Text>
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">
                                                        {a.whatsapp_number || a.phone_number || <Text as="span" color="#CBD5E1">—</Text>}
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{a.customers_count}</Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">
                                                        {a.active_policies_count}
                                                        <Text as="span" color="#64748B" fontSize="14px"> / {a.policies_count}</Text>
                                                    </Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(a.total_premium)}</Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="medium" whiteSpace="nowrap">{fmtIDR(a.sub_agent_commission)}</Table.Cell>
                                                    <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{a.default_split_rate}%</Table.Cell>
                                                    <Table.Cell px="16px" py="10px">
                                                        <Badge bg={SUB_AGENT_STATUS_COLORS[a.status].bg} color={SUB_AGENT_STATUS_COLORS[a.status].color} fontSize="14px" px="10px" py="3px" borderRadius="full">
                                                            {SUB_AGENT_STATUS_LABELS[a.status]}
                                                        </Badge>
                                                    </Table.Cell>
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
                    </>)}
                </Flex>
            </Box>

            <SubAgentFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSaved={(agent) => { setFormOpen(false); setReloadKey((k) => k + 1); router.push(`/agentra/sub-agents/${encodeURIComponent(agent.sub_agent_id)}`) }}
            />

            <MobileBottomNav />
        </Box>
    )
}
