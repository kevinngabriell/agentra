"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Dialog, Flex, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuKeyRound, LuPencil, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage, errorStatus } from "@/lib/api/client"
import {
    SUB_AGENT_STATUS_COLORS, SUB_AGENT_STATUS_LABELS, deleteSubAgent, disableSubAgentAccount, getSubAgent, getSubAgentCustomers,
    getSubAgentPerformance, getSubAgentPolicies, getSubAgentSummary, saveSubAgentAccount,
    type ApiSubAgentDetail, type Pagination, type SubAgentCustomer, type SubAgentPerformance, type SubAgentPolicy, type SubAgentSummary,
} from "@/lib/api/sub-agents"
import { fmtIDR, fmtIDRCompact, monthLabel } from "@/lib/format"
import { SubAgentFormDialog } from "./SubAgentFormDialog"
import { CLAIM_INPUT, CLAIM_LABEL } from "@/components/claims/fields"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

type Tab = "customers" | "policies" | "insurers"

const TABS: { id: Tab; label: string }[] = [
    { id: "customers", label: "Nasabah" },
    { id: "policies", label: "Polis" },
    { id: "insurers", label: "Per Asuransi" },
]

const RENEWAL_LABELS: Record<string, string> = { pending: "Berjalan", renewed: "Diperpanjang", lapsed: "Lapse", cancelled: "Batal" }

const CARD = { bg: "white", borderRadius: "12px", border: "1px solid", borderColor: "#E2E8F0" } as const

function fmtDate(iso: string | null) {
    return iso ? new Date(iso.replace(" ", "T")).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Flex justify="space-between" gap="16px" py="8px" borderBottom="1px solid" borderColor="#F1F5F9" fontSize="15px">
            <Text color="#64748B" flexShrink={0}>{label}</Text>
            <Box color="#1C2833" textAlign="right" minW="0" wordBreak="break-word">{children}</Box>
        </Flex>
    )
}

function Metric({ label, value, sub, subColor }: { label: string; value: string | null; sub?: string; subColor?: string }) {
    return (
        <Flex {...CARD} flex="1" minW="170px" p="16px" flexDir="column" gap="2px">
            <Text color="#64748B" fontSize="14px">{label}</Text>
            {value === null ? <Skeleton h="26px" w="80px" /> : <Text color="#1C2833" fontSize="22px" fontWeight="bold" lineHeight="1.2">{value}</Text>}
            {sub && <Text color={subColor ?? "#94A3B8"} fontSize="14px">{sub}</Text>}
        </Flex>
    )
}

const TH = { color: "#64748B", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px", whiteSpace: "nowrap" } as const

function Pager({ p, onPage }: { p: Pagination; onPage: (n: number) => void }) {
    if (p.total_pages <= 1) return null
    return (
        <Flex justify="space-between" align="center" px="20px" py="12px" borderTop="1px solid" borderColor="#F1F5F9">
            <Text color="#64748B" fontSize="14px">Halaman {p.page} dari {p.total_pages} · {p.total} data</Text>
            <Flex gap="6px">
                <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman sebelumnya" disabled={p.page <= 1} onClick={() => onPage(p.page - 1)}>
                    <LuChevronLeft size={13} />
                </Button>
                <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" aria-label="Halaman berikutnya" disabled={p.page >= p.total_pages} onClick={() => onPage(p.page + 1)}>
                    <LuChevronRight size={13} />
                </Button>
            </Flex>
        </Flex>
    )
}

function Empty({ text }: { text: string }) {
    return <Text px="20px" py="32px" textAlign="center" color="#64748B" fontSize="15px">{text}</Text>
}

/** Premium per month for the last 12 months. */
function MonthlyChart({ perf }: { perf: SubAgentPerformance }) {
    const max = Math.max(...perf.monthly.map((m) => m.premium), 1)
    return (
        <Box {...CARD} p="16px 20px">
            <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="12px">Premi per Bulan (12 bulan terakhir)</Text>
            <Flex align="flex-end" gap="6px" h="120px" role="img" aria-label="Grafik premi per bulan">
                {perf.monthly.map((m) => (
                    <Flex key={m.month} flex="1" flexDir="column" justify="flex-end" align="center" h="100%" title={`${monthLabel(m.month)}: ${fmtIDR(m.premium)} · ${m.policies_count} polis`}>
                        <Box w="100%" maxW="28px" borderTopRadius="4px" bg={m.premium > 0 ? "#1A3557" : "#E2E8F0"} h={`${Math.max(m.premium > 0 ? 4 : 2, (m.premium / max) * 100)}%`} />
                    </Flex>
                ))}
            </Flex>
            <Flex gap="6px" mt="6px">
                {perf.monthly.map((m) => (
                    <Text key={m.month} flex="1" textAlign="center" color="#64748B" fontSize="14px">
                        {new Date(`${m.month}-01T00:00:00`).toLocaleDateString("id-ID", { month: "short" })}
                    </Text>
                ))}
            </Flex>
        </Box>
    )
}

/**
 * Sub-agent profile. `self` is the sub-agent's own portal (id "me"): read-only, without the
 * main agent's private fields, and without the way back to the sub-agent list.
 */
export function SubAgentProfile({ id, self = false }: { id: string; self?: boolean }) {
    const router = useRouter()
    const [agent, setAgent]     = useState<ApiSubAgentDetail | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [perf, setPerf]       = useState<SubAgentPerformance | null>(null)
    const [summary, setSummary] = useState<SubAgentSummary | null>(null)
    const [tab, setTab]         = useState<Tab>("customers")
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [accountOpen, setAccountOpen] = useState(false)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) { router.replace("/login"); return }
        getSubAgent(token, id)
            .then((a) => { setAgent(a); setLoadError(null) })
            .catch((err: unknown) => { if (errorStatus(err) !== 401) setLoadError(errorMessage(err, "Gagal memuat sub-agen")) })
        getSubAgentPerformance(token, id).then(setPerf).catch(() => setPerf(null))
        getSubAgentSummary(token, id).then(setSummary).catch(() => setSummary(null))
    }, [id, router])

    useEffect(() => { load() }, [load])

    async function handleDelete() {
        const token = getAccessToken()
        if (!token) return
        setDeleting(true); setDeleteError(null)
        try {
            await deleteSubAgent(token, id)
            router.push("/agentra/sub-agents")
        } catch (err) {
            setDeleteError(errorMessage(err, "Gagal menghapus sub-agen"))
            setDeleting(false)
        }
    }

    const growth = perf?.mom_growth ?? null

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title={self ? "Portal Sub-Agen" : "Sub Agents"} />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    {!self && (
                        <Link href="/agentra/sub-agents" style={{ textDecoration: "none", width: "max-content" }}>
                            <Flex align="center" gap="6px" color="#64748B" fontSize="15px"><LuArrowLeft size={14} /> Semua sub-agen</Flex>
                        </Link>
                    )}

                    {loadError && <Text fontSize="15px" color="#DC2626">{loadError}</Text>}
                    {!agent && !loadError && <Skeleton h="80px" borderRadius="12px" />}

                    {agent && (
                        <>
                            <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px">
                                    <Flex align="center" gap="10px" flexWrap="wrap">
                                        <Text color="#1C2833" fontSize="24px" fontWeight="bold">{agent.full_name}</Text>
                                        <Badge bg={SUB_AGENT_STATUS_COLORS[agent.status].bg} color={SUB_AGENT_STATUS_COLORS[agent.status].color} px="10px" py="3px" borderRadius="full" fontSize="14px">
                                            {SUB_AGENT_STATUS_LABELS[agent.status]}
                                        </Badge>
                                    </Flex>
                                    <Text color="#64748B" fontSize="15px" fontFamily="mono">{agent.agent_code}</Text>
                                </Flex>
                                {!self && <Flex gap="8px">
                                    <Button variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="15px" h="40px" onClick={() => setEditOpen(true)}>
                                        <LuPencil size={14} /> Ubah
                                    </Button>
                                    <Button variant="outline" bg="white" borderColor="#FCA5A5" color="#DC2626" gap="6px" fontSize="15px" h="40px" _hover={{ bg: "#FEF2F2" }}
                                        onClick={() => { setDeleteError(null); setDeleteOpen(true) }}>
                                        <LuTrash2 size={14} /> Hapus
                                    </Button>
                                </Flex>}
                            </Flex>

                            <Flex gap="12px" flexWrap="wrap">
                                <Metric label="Polis Aktif" value={perf ? String(perf.active_policies) : null} sub={`${agent.policies_count} polis total`} />
                                <Metric label="Tingkat Perpanjangan" value={perf ? (perf.renewal_rate === null ? "—" : `${perf.renewal_rate}%`) : null}
                                    sub={perf ? (perf.renewal_rate === null ? "Belum ada polis yang berakhir" : `${perf.renewed_count} diperpanjang · ${perf.lapsed_count} lapse`) : undefined} />
                                <Metric label="Premi Bulan Ini" value={perf ? fmtIDRCompact(perf.premium_this_month) : null}
                                    sub={perf ? (growth === null ? "Tidak ada pembanding bulan lalu" : `${growth > 0 ? "+" : ""}${growth}% dari bulan lalu`) : undefined}
                                    subColor={growth === null ? undefined : growth >= 0 ? "#16A34A" : "#DC2626"} />
                                <Metric label="Komisi Sub-Agen" value={fmtIDRCompact(agent.sub_agent_commission)}
                                    sub={agent.total_commission === undefined ? undefined : `dari ${fmtIDRCompact(agent.total_commission)} komisi kotor`} />
                            </Flex>

                            {perf && <MonthlyChart perf={perf} />}

                            <Flex gap="16px" flexWrap="wrap" align="flex-start">
                                <Box {...CARD} flex="1" minW="280px" p="16px 20px">
                                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="4px">Kontak</Text>
                                    <Row label="Telepon">{agent.phone_number || "—"}</Row>
                                    <Row label="WhatsApp">{agent.whatsapp_number || "—"}</Row>
                                    <Row label="Email">{agent.email || "—"}</Row>
                                    <Row label="Bergabung">{fmtDate(agent.joined_date)}</Row>
                                    {agent.notes && <Row label="Catatan">{agent.notes}</Row>}
                                    {!self && <Row label="Digest WhatsApp">{agent.wa_digest_enabled ? "Ke nomor sub-agen" : "Ke nomor perusahaan"}</Row>}
                                </Box>
                                <Box {...CARD} flex="1" minW="280px" p="16px 20px">
                                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="4px">Bagi Hasil Komisi</Text>
                                    <Row label="Default">{agent.default_split_rate}%</Row>
                                    {agent.insurer_rates.map((r) => (
                                        <Row key={r.insurer_id} label={r.insurer_short_name || r.insurer_name || r.insurer_id}>{r.split_rate}%</Row>
                                    ))}
                                    <Text color="#64748B" fontSize="14px" mt="8px">
                                        Persentase dari komisi kotor yang diteruskan ke sub-agen. Berlaku untuk polis baru.
                                    </Text>
                                </Box>
                            </Flex>

                            {!self && (
                                <Flex {...CARD} p="16px 20px" justify="space-between" align="center" gap="12px" flexWrap="wrap">
                                    <Flex flexDir="column" gap="2px">
                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Akun Login</Text>
                                        {agent.account ? (
                                            <Text color="#64748B" fontSize="15px">
                                                {agent.account.email} · {agent.account.enabled ? "Aktif" : "Dinonaktifkan"}
                                                {agent.account.last_login_at ? ` · login terakhir ${fmtDate(agent.account.last_login_at)}` : " · belum pernah login"}
                                            </Text>
                                        ) : (
                                            <Text color="#64748B" fontSize="15px">Belum ada akun. Sub-agen dengan akun dapat melihat nasabah, polis, dan komisinya sendiri.</Text>
                                        )}
                                    </Flex>
                                    <Flex gap="8px">
                                        {agent.account?.enabled && (
                                            <Button variant="outline" bg="white" borderColor="#FCA5A5" color="#DC2626" fontSize="15px" h="36px" _hover={{ bg: "#FEF2F2" }}
                                                onClick={async () => {
                                                    const token = getAccessToken()
                                                    if (!token) return
                                                    try { setAgent(await disableSubAgentAccount(token, id)) } catch (err) { setLoadError(errorMessage(err, "Gagal menonaktifkan akun")) }
                                                }}>
                                                Nonaktifkan
                                            </Button>
                                        )}
                                        <Button variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="15px" h="36px"
                                            disabled={agent.status !== "active"} onClick={() => setAccountOpen(true)}>
                                            <LuKeyRound size={14} /> {agent.account ? (agent.account.enabled ? "Reset Password" : "Aktifkan Kembali") : "Buat Akun"}
                                        </Button>
                                    </Flex>
                                </Flex>
                            )}

                            <Box {...CARD} overflow="hidden">
                                <Flex px="12px" pt="8px" gap="4px" borderBottom="1px solid" borderColor="#E2E8F0" role="tablist">
                                    {TABS.map((t) => (
                                        <Button key={t.id} role="tab" aria-selected={tab === t.id} variant="ghost" fontSize="15px" h="38px" borderRadius="8px 8px 0 0"
                                            color={tab === t.id ? "#1D4ED8" : "#64748B"} fontWeight={tab === t.id ? "semibold" : "normal"}
                                            borderBottom="2px solid" borderColor={tab === t.id ? "#1D4ED8" : "transparent"} onClick={() => setTab(t.id)}>
                                            {t.label}
                                        </Button>
                                    ))}
                                </Flex>
                                {tab === "customers" && <CustomersTab id={id} />}
                                {tab === "policies" && <PoliciesTab id={id} />}
                                {tab === "insurers" && <InsurersTab summary={summary} />}
                            </Box>
                        </>
                    )}
                </Flex>
            </Box>

            {agent && (
                <SubAgentFormDialog open={editOpen} agent={agent} onClose={() => setEditOpen(false)}
                    onSaved={() => { setEditOpen(false); load() }} />
            )}

            {agent && accountOpen && (
                <AccountDialog agent={agent} onClose={() => setAccountOpen(false)} onSaved={(a) => { setAgent(a); setAccountOpen(false) }} />
            )}

            <Dialog.Root open={deleteOpen} onOpenChange={(d) => { if (!d.open && !deleting) setDeleteOpen(false) }}>
                <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                <Dialog.Positioner zIndex={1501}>
                    <Dialog.Content bg="white" borderRadius="12px" maxW="440px" w="92vw" shadow="xl">
                        <Dialog.Header px="24px" pt="24px" pb="0">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Hapus sub-agen?</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body px="24px" py="16px">
                            <Flex flexDir="column" gap="8px">
                                <Text color="#475569" fontSize="15px">
                                    Sub-agen yang masih memiliki nasabah atau polis tidak bisa dihapus. Ubah statusnya menjadi Nonaktif agar tidak muncul lagi di pilihan.
                                </Text>
                                {deleteError && <Text fontSize="14px" color="#DC2626">{deleteError}</Text>}
                            </Flex>
                        </Dialog.Body>
                        <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                            <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                                disabled={deleting} onClick={() => setDeleteOpen(false)}>Batal</Button>
                            <Button flex="1" bg="#DC2626" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#B91C1C" }}
                                loading={deleting} loadingText="Menghapus..." onClick={handleDelete}>Hapus</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            <MobileBottomNav />
        </Box>
    )
}

type Loaded<T> = { key: string; data: T[]; pagination: Pagination | null; error: string | null }

function CustomersTab({ id }: { id: string }) {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const [res, setRes] = useState<Loaded<SubAgentCustomer> | null>(null)
    const key = `${id}|${page}`

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const controller = new AbortController()
        getSubAgentCustomers(token, id, page, controller.signal)
            .then((r) => setRes({ key, data: r.data ?? [], pagination: r.pagination, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setRes({ key, data: [], pagination: null, error: errorMessage(err, "Data nasabah belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => controller.abort()
    }, [id, page, key])

    if (res?.key !== key) return <Flex p="20px"><Skeleton h="44px" w="100%" borderRadius="8px" /></Flex>
    if (res.error) return <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{res.error}</Text>
    if (res.data.length === 0) return <Empty text="Belum ada nasabah yang dirujuk sub-agen ini." />
    return (
        <>
            <Table.ScrollArea>
                <Table.Root size="sm">
                    <Table.Header>
                        <Table.Row bg="#F8FAFC">{["NASABAH", "TIPE", "POLIS", "PREMI"].map((h) => <Table.ColumnHeader key={h} {...TH}>{h}</Table.ColumnHeader>)}</Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {res.data.map((c) => (
                            <Table.Row key={c.customer_id} borderBottom="1px solid" borderColor="#F1F5F9" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                onClick={() => router.push(`/agentra/customer/detail?id=${encodeURIComponent(c.customer_id)}`)}>
                                <Table.Cell px="16px" py="10px" color="#1D4ED8" fontSize="15px" fontWeight="semibold">{c.display_name}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{c.customer_type === "company" ? "Korporat" : "Individu"}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{c.policies_count}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(c.total_premium)}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
            {res.pagination && <Pager p={res.pagination} onPage={setPage} />}
        </>
    )
}

function PoliciesTab({ id }: { id: string }) {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const [res, setRes] = useState<Loaded<SubAgentPolicy> | null>(null)
    const key = `${id}|${page}`

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const controller = new AbortController()
        getSubAgentPolicies(token, id, page, controller.signal)
            .then((r) => setRes({ key, data: r.data ?? [], pagination: r.pagination, error: null }))
            .catch((err: unknown) => { if (!controller.signal.aborted) setRes({ key, data: [], pagination: null, error: errorMessage(err, "Data polis belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => controller.abort()
    }, [id, page, key])

    if (res?.key !== key) return <Flex p="20px"><Skeleton h="44px" w="100%" borderRadius="8px" /></Flex>
    if (res.error) return <Text px="20px" py="20px" fontSize="15px" color="#DC2626">{res.error}</Text>
    if (res.data.length === 0) return <Empty text="Belum ada polis yang diterbitkan lewat sub-agen ini." />
    return (
        <>
            <Table.ScrollArea>
                <Table.Root size="sm">
                    <Table.Header>
                        <Table.Row bg="#F8FAFC">{["NO. POLIS", "NASABAH", "ASURANSI", "PERIODE", "PREMI", "KOMISI SUB-AGEN", "STATUS"].map((h) => <Table.ColumnHeader key={h} {...TH}>{h}</Table.ColumnHeader>)}</Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {res.data.map((p) => (
                            <Table.Row key={p.policy_id} borderBottom="1px solid" borderColor="#F1F5F9" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.policy_id)}`)}>
                                <Table.Cell px="16px" py="10px" color="#1D4ED8" fontSize="14px" fontFamily="mono" whiteSpace="nowrap">{p.policy_number}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{p.customer_name ?? "—"}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{p.insurer_short_name ?? "—"}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#64748B" fontSize="14px" whiteSpace="nowrap">{fmtDate(p.coverage_start)} – {fmtDate(p.coverage_end)}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(p.premium_amount)}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(p.sub_agent_amount)}</Table.Cell>
                                <Table.Cell px="16px" py="10px" color="#64748B" fontSize="14px">{RENEWAL_LABELS[p.renewal_status] ?? p.renewal_status}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
            {res.pagination && <Pager p={res.pagination} onPage={setPage} />}
        </>
    )
}

function InsurersTab({ summary }: { summary: SubAgentSummary | null }) {
    if (!summary) return <Flex p="20px"><Skeleton h="44px" w="100%" borderRadius="8px" /></Flex>
    if (summary.by_insurer.length === 0) return <Empty text="Belum ada premi atau komisi dari sub-agen ini." />
    const gross = summary.totals.total_commission !== undefined
    return (
        <Table.ScrollArea>
            <Table.Root size="sm">
                <Table.Header>
                    <Table.Row bg="#F8FAFC">{["ASURANSI", "POLIS", "PREMI", ...(gross ? ["KOMISI KOTOR"] : []), "KOMISI SUB-AGEN", ...(gross ? ["DITAHAN AGEN UTAMA"] : [])].map((h) => <Table.ColumnHeader key={h} {...TH}>{h}</Table.ColumnHeader>)}</Table.Row>
                </Table.Header>
                <Table.Body>
                    {summary.by_insurer.map((r) => (
                        <Table.Row key={r.insurer_id} borderBottom="1px solid" borderColor="#F1F5F9">
                            <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="medium">{r.insurer_short_name || r.insurer_name || r.insurer_id}</Table.Cell>
                            <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px">{r.policies_count}</Table.Cell>
                            <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(r.total_premium)}</Table.Cell>
                            {gross && <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(r.total_commission ?? 0)}</Table.Cell>}
                            <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(r.sub_agent_commission)}</Table.Cell>
                            {gross && <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{fmtIDR(r.retained_commission ?? 0)}</Table.Cell>}
                        </Table.Row>
                    ))}
                    <Table.Row bg="#F8FAFC">
                        <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold">Total</Table.Cell>
                        <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold">{summary.totals.policies_count}</Table.Cell>
                        <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold" whiteSpace="nowrap">{fmtIDR(summary.totals.total_premium)}</Table.Cell>
                        {gross && <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold" whiteSpace="nowrap">{fmtIDR(summary.totals.total_commission ?? 0)}</Table.Cell>}
                        <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold" whiteSpace="nowrap">{fmtIDR(summary.totals.sub_agent_commission)}</Table.Cell>
                        {gross && <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" fontWeight="bold" whiteSpace="nowrap">{fmtIDR(summary.totals.retained_commission ?? 0)}</Table.Cell>}
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    )
}

function AccountDialog({ agent, onClose, onSaved }: { agent: ApiSubAgentDetail; onClose: () => void; onSaved: (a: ApiSubAgentDetail) => void }) {
    const existing = !!agent.account
    const [email, setEmail] = useState(agent.email ?? "")
    const [password, setPassword] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!existing && !email.trim()) { setError("Email wajib diisi."); return }
        if (password.length < 8) { setError("Password minimal 8 karakter."); return }
        setSaving(true); setError(null)
        try {
            onSaved(await saveSubAgentAccount(token, agent.sub_agent_id, { ...(existing ? {} : { email: email.trim() }), password }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan akun"))
            setSaving(false)
        }
    }

    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="440px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{existing ? "Reset Password Sub-Agen" : "Buat Akun Sub-Agen"}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="12px">
                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Email (untuk login)</Text>
                                <Input {...CLAIM_INPUT} type="email" value={existing ? agent.account?.email ?? "" : email} disabled={existing} onChange={(e) => setEmail(e.target.value)} />
                            </Flex>
                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Password baru</Text>
                                <Input {...CLAIM_INPUT} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </Flex>
                            <Text color="#64748B" fontSize="14px">
                                Sampaikan password ke sub-agen. Akun ini hanya dapat melihat nasabah, polis, dan komisi milik sub-agen tersebut.
                            </Text>
                            {error && <Text fontSize="14px" color="#DC2626">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px" disabled={saving} onClick={onClose}>Batal</Button>
                        <Button flex="1" bg="#1A3557" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#162C47" }} loading={saving} loadingText="Menyimpan..." onClick={submit}>Simpan</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
