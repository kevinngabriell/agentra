"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge, Box, Button, Flex, Input, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuLightbulb, LuUsers } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    getCustomerCrossSell, getCustomerGroups, getCustomerOverview, setCustomerGroup,
    type CrossSellSuggestion, type CustomerGroup, type CustomerOverview, type PolicyStanding,
} from "@/lib/api/customers"
import { fmtIDR } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"

const STANDING: Record<PolicyStanding, { label: string; bg: string; color: string }> = {
    in_force:  { label: "Berlaku",         bg: "#DCFCE7", color: "#15803D" },
    upcoming:  { label: "Belum mulai",     bg: "#E0F2FE", color: "#0369A1" },
    expired:   { label: "Berakhir",        bg: "#F1F5F9", color: "#64748B" },
    cancelled: { label: "Dibatalkan",      bg: "#FEE2E2", color: "#DC2626" },
}

const TH = { color: "#64748B", fontSize: "16px", fontWeight: "bold", px: "16px", py: "8px" } as const
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

/**
 * Customer 360: every product the customer holds across insurers, the related-company group it belongs to,
 * and cross-sell suggestions from what is missing.
 */
export function Customer360Panel({ customerId }: { customerId: string }) {
    const router = useRouter()
    const [scope, setScope]         = useState<"customer" | "group">("customer")
    const [overview, setOverview]   = useState<CustomerOverview | null>(null)
    const [suggestions, setSuggestions] = useState<CrossSellSuggestion[]>([])
    const [groups, setGroups]       = useState<CustomerGroup[]>([])
    const [error, setError]         = useState<string | null>(null)
    const [editingGroup, setEditingGroup] = useState(false)
    const [pickedGroup, setPickedGroup]   = useState("")
    const [newGroup, setNewGroup]   = useState("")
    const [saving, setSaving]       = useState(false)
    const [reload, setReload]       = useState(0)
    const [showAll, setShowAll]     = useState(false)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        Promise.all([getCustomerOverview(token, customerId, scope), getCustomerCrossSell(token, customerId, scope)])
            .then(([o, s]) => { if (!cancelled) { setOverview(o); setSuggestions(s); setError(null) } })
            .catch((err) => { if (!cancelled) setError(errorMessage(err, "Data ringkasan nasabah belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [customerId, scope, reload])

    const startEditGroup = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        setEditingGroup(true)
        getCustomerGroups(token).then(setGroups).catch(() => setGroups([]))
    }, [])

    async function saveGroup(data: { group_id?: string | null; group_name?: string }) {
        const token = getAccessToken()
        if (!token) return
        setSaving(true); setError(null)
        try {
            await setCustomerGroup(token, customerId, data)
            setEditingGroup(false); setPickedGroup(""); setNewGroup("")
            setScope("customer")
            setReload((k) => k + 1)
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan grup"))
        } finally {
            setSaving(false)
        }
    }

    const group = overview?.customer.group_name
    const policies = overview ? (showAll ? overview.policies : overview.policies.filter((p) => p.standing === "in_force" || p.standing === "upcoming")) : []
    const hasHistory = overview ? overview.policies.length > policies.length || showAll : false

    return (
        <Box bg="white" borderRadius="12px" border="1px solid #E2E8F0" overflow="hidden">
            <Flex px="20px" py="14px" align="center" justify="space-between" gap="12px" flexWrap="wrap" borderBottom="1px solid #E2E8F0">
                <Box>
                    <Text color="#1C2833" fontSize="16px" fontWeight="bold">Ringkasan Nasabah</Text>
                    <Text color="#64748B" fontSize="16px">Semua produk yang dipegang nasabah di seluruh asuransi</Text>
                </Box>
                {group && (
                    <Flex bg="#F1F5F9" borderRadius="8px" p="2px">
                        {(["customer", "group"] as const).map((s) => (
                            <Button key={s} size="xs" fontSize="16px" borderRadius="6px" variant="ghost"
                                bg={scope === s ? "#1A3557" : "transparent"} color={scope === s ? "white" : "#475569"} _hover={{ bg: scope === s ? "#1A3557" : "#E2E8F0" }}
                                onClick={() => setScope(s)}>
                                {s === "customer" ? "Nasabah ini" : "Seluruh grup"}
                            </Button>
                        ))}
                    </Flex>
                )}
            </Flex>

            <Flex flexDir="column" gap="20px" p="20px">
                {error && <Text color="#DC2626" fontSize="16px" role="alert">{error}</Text>}
                {!overview && !error && <Skeleton h="120px" borderRadius="8px" />}

                {/* Group */}
                <Flex align="center" gap="10px" flexWrap="wrap">
                    <LuUsers size={15} color="#64748B" aria-hidden="true" />
                    {!editingGroup ? (
                        <>
                            <Text fontSize="16px" color="#475569">
                                {group ? <>Grup: <b>{group}</b></> : "Belum masuk grup perusahaan terkait"}
                            </Text>
                            <Button size="xs" variant="outline" fontSize="16px" onClick={startEditGroup}>{group ? "Ubah grup" : "Atur grup"}</Button>
                            {group && <Button size="xs" variant="ghost" color="#DC2626" fontSize="16px" disabled={saving} onClick={() => void saveGroup({ group_id: null })}>Keluarkan dari grup</Button>}
                        </>
                    ) : (
                        <Flex gap="8px" align="center" flexWrap="wrap">
                            <Box minW="200px">
                                <SearchSelect value={pickedGroup} onChange={(v) => { setPickedGroup(v); setNewGroup("") }} placeholder="Pilih grup yang ada"
                                    options={groups.map((g) => ({ value: g.group_id, label: `${g.name} (${g.member_count})` }))} />
                            </Box>
                            <Button size="xs" bg="#1A3557" color="white" disabled={!pickedGroup || saving} loading={saving} onClick={() => void saveGroup({ group_id: pickedGroup })}>Pindahkan</Button>
                            <Text fontSize="16px" color="#64748B">atau</Text>
                            <Input size="sm" w="190px" fontSize="16px" placeholder="Nama grup baru" maxLength={150} value={newGroup}
                                onChange={(e) => { setNewGroup(e.target.value); setPickedGroup("") }} />
                            <Button size="xs" bg="#1A3557" color="white" disabled={!newGroup.trim() || saving} loading={saving} onClick={() => void saveGroup({ group_name: newGroup.trim() })}>Buat &amp; masukkan</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingGroup(false)}>Batal</Button>
                        </Flex>
                    )}
                </Flex>

                {overview && (
                    <>
                        {/* Totals */}
                        <Flex gap="12px" flexWrap="wrap">
                            {[
                                { label: "Polis berlaku", value: String(overview.held.policies) },
                                { label: "Total premi", value: fmtIDR(overview.held.premium) },
                                { label: "Total pertanggungan", value: fmtIDR(overview.held.sum_insured) },
                                { label: "Asuransi", value: String(overview.by_insurer.length) },
                            ].map((c) => (
                                <Box key={c.label} flex="1" minW="140px" bg="#F8FAFC" borderRadius="8px" px="14px" py="10px">
                                    <Text fontSize="16px" color="#64748B" fontWeight="bold">{c.label.toUpperCase()}</Text>
                                    <Text fontSize="16px" fontWeight="bold" color="#1C2833">{c.value}</Text>
                                </Box>
                            ))}
                        </Flex>

                        {/* Group members */}
                        {overview.scope === "group" && overview.members.length > 0 && (
                            <Flex gap="8px" flexWrap="wrap">
                                {overview.members.map((m) => (
                                    <Flex key={m.customer_id} as="button" align="center" gap="6px" px="10px" py="5px" borderRadius="full" border="1px solid #E2E8F0" fontSize="16px" color="#334155"
                                        onClick={() => router.push(`/agentra/customer/detail?id=${encodeURIComponent(m.customer_id)}`)}>
                                        {m.display_name}
                                        <Badge bg="#EFF6FF" color="#1D4ED8" fontSize="16px">{m.in_force_policies} polis</Badge>
                                    </Flex>
                                ))}
                            </Flex>
                        )}

                        {/* By product */}
                        <Box border="1px solid #E2E8F0" borderRadius="8px" overflowX="auto">
                            <Table.Root size="sm">
                                <Table.Header>
                                    <Table.Row bg="#F8FAFC">
                                        {["PRODUK", "POLIS", "ASURANSI", "PREMI", "PERTANGGUNGAN"].map((h) => <Table.ColumnHeader key={h} {...TH}>{h}</Table.ColumnHeader>)}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {overview.by_product.length === 0 && (
                                        <Table.Row><Table.Cell colSpan={5} px="16px" py="16px" color="#64748B" fontSize="16px" textAlign="center">Belum ada polis yang berlaku</Table.Cell></Table.Row>
                                    )}
                                    {overview.by_product.map((r) => (
                                        <Table.Row key={r.product_type}>
                                            <Table.Cell px="16px" py="8px" fontSize="16px" fontWeight="semibold" color="#1C2833">{r.product_name}</Table.Cell>
                                            <Table.Cell px="16px" py="8px" fontSize="16px">{r.policies}</Table.Cell>
                                            <Table.Cell px="16px" py="8px" fontSize="16px" color="#64748B">{r.insurers.join(", ") || "—"}</Table.Cell>
                                            <Table.Cell px="16px" py="8px" fontSize="16px">{fmtIDR(r.premium)}</Table.Cell>
                                            <Table.Cell px="16px" py="8px" fontSize="16px">{fmtIDR(r.sum_insured)}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        {/* Policies */}
                        <Box>
                            <Flex justify="space-between" align="center" mb="8px">
                                <Text fontSize="16px" fontWeight="bold" color="#64748B" letterSpacing="0.05em">DAFTAR POLIS</Text>
                                {(hasHistory || overview.policies.some((p) => p.standing === "expired" || p.standing === "cancelled")) && (
                                    <Button size="xs" variant="ghost" fontSize="16px" onClick={() => setShowAll((v) => !v)}>{showAll ? "Hanya yang berlaku" : "Tampilkan riwayat"}</Button>
                                )}
                            </Flex>
                            <Box border="1px solid #E2E8F0" borderRadius="8px" overflowX="auto">
                                <Table.Root size="sm">
                                    <Table.Body>
                                        {policies.length === 0 && (
                                            <Table.Row><Table.Cell px="16px" py="16px" color="#64748B" fontSize="16px" textAlign="center">Tidak ada polis</Table.Cell></Table.Row>
                                        )}
                                        {policies.map((p) => {
                                            const st = STANDING[p.standing]
                                            return (
                                                <Table.Row key={p.policy_id} cursor="pointer" _hover={{ bg: "#F8FAFC" }} onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.policy_id)}`)}>
                                                    <Table.Cell px="16px" py="8px">
                                                        <Text fontSize="16px" fontWeight="semibold" color="#1C2833">{p.product_name}</Text>
                                                        <Text fontSize="16px" color="#64748B" fontFamily="mono">{p.policy_number}</Text>
                                                    </Table.Cell>
                                                    {overview.scope === "group" && <Table.Cell px="16px" py="8px" fontSize="16px" color="#64748B">{p.customer_name}</Table.Cell>}
                                                    <Table.Cell px="16px" py="8px" fontSize="16px" color="#64748B">{p.insurer_name ?? "—"}</Table.Cell>
                                                    <Table.Cell px="16px" py="8px" fontSize="16px" color="#64748B">s/d {fmtDate(p.coverage_end)}</Table.Cell>
                                                    <Table.Cell px="16px" py="8px" fontSize="16px">{fmtIDR(p.premium_amount)}</Table.Cell>
                                                    <Table.Cell px="16px" py="8px"><Badge px="8px" borderRadius="full" bg={st.bg} color={st.color} fontSize="16px">{st.label}</Badge></Table.Cell>
                                                </Table.Row>
                                            )
                                        })}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        </Box>

                        {/* Cross-sell */}
                        <Box>
                            <Flex align="center" gap="6px" mb="8px">
                                <LuLightbulb size={14} color="#D97706" aria-hidden="true" />
                                <Text fontSize="16px" fontWeight="bold" color="#64748B" letterSpacing="0.05em">PELUANG CROSS-SELL</Text>
                            </Flex>
                            {suggestions.length === 0 ? (
                                <Text fontSize="16px" color="#64748B">Tidak ada saran. Perlindungan nasabah sudah sesuai pola umum, atau belum ada polis berlaku.</Text>
                            ) : (
                                <Flex flexDir="column" gap="8px">
                                    {suggestions.map((s) => (
                                        <Flex key={s.family} bg="#FFFBEB" border="1px solid #FDE68A" borderRadius="8px" px="14px" py="10px" justify="space-between" align="center" gap="12px" flexWrap="wrap">
                                            <Box>
                                                <Text fontSize="16px" fontWeight="semibold" color="#92400E">{s.products.map((p) => p.product_name).join(" / ")}</Text>
                                                <Text fontSize="16px" color="#78716C">{s.reason}</Text>
                                            </Box>
                                            <Button size="xs" variant="outline" borderColor="#D97706" color="#B45309" fontSize="16px"
                                                onClick={() => router.push("/agentra/prospects")}>
                                                Buat prospek
                                            </Button>
                                        </Flex>
                                    ))}
                                </Flex>
                            )}
                        </Box>
                    </>
                )}
            </Flex>
        </Box>
    )
}
