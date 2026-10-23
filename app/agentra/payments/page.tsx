"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Flex, Skeleton, Table, Text } from "@chakra-ui/react"
import { LuClock, LuTriangleAlert, LuWallet } from "react-icons/lu"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    PAYMENT_URGENCY_COLORS, PAYMENT_URGENCY_LABELS, getOverduePremiums,
    type OverdueScope, type OverduePremium, type OverduePremiumSummary,
} from "@/lib/api/payments"
import { paymentReminderText } from "@/components/payments"
import { fmtIDR, whatsappUrl } from "@/lib/format"

const SCOPES: { value: OverdueScope; label: string }[] = [
    { value: "attention", label: "Perlu Perhatian" },
    { value: "overdue", label: "Lewat Jatuh Tempo" },
    { value: "due_soon", label: "Segera Jatuh Tempo" },
    { value: "all", label: "Semua Belum Dibayar" },
]

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function StatCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string | null; sub?: string; tone: { bg: string; color: string } }) {
    return (
        <Flex flex="1" minW="200px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" p="16px" gap="12px" align="center">
            <Box p="10px" borderRadius="10px" bg={tone.bg} color={tone.color}>{icon}</Box>
            <Flex flexDir="column" flex="1" minW="0">
                <Text color="#64748B" fontSize="14px">{label}</Text>
                {value === null ? <Skeleton h="24px" w="80px" mt="2px" /> : <Text color="#1C2833" fontSize="22px" fontWeight="bold" lineHeight="1.2">{value}</Text>}
                {sub && <Text color="#64748B" fontSize="14px">{sub}</Text>}
            </Flex>
        </Flex>
    )
}

export default function PaymentsPage() {
    const [scope, setScope] = useState<OverdueScope>("attention")
    const [result, setResult] = useState<{ scope: OverdueScope; rows: OverduePremium[]; summary: OverduePremiumSummary; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getOverduePremiums(token, scope)
            .then((r) => { if (!cancelled) setResult({ scope, rows: r.data, summary: r.summary, error: null }) })
            .catch((err: unknown) => {
                if (!cancelled) setResult({ scope, rows: [], summary: { overdue_count: 0, overdue_amount: 0, due_soon_count: 0, due_soon_amount: 0, cancellation_risk_count: 0 }, error: errorMessage(err, "Data tagihan premi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
            })
        return () => { cancelled = true }
    }, [scope])

    const loading = result?.scope !== scope
    const rows = loading ? [] : result?.rows ?? []
    const summary = result?.summary
    const error = loading ? null : result?.error ?? null

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Premium Billing" />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column">
                    <Box>
                        <Text color="#1C2833" fontSize="22px" fontWeight="bold">Tagihan Premi</Text>
                        <Text color="#64748B" fontSize="15px">Premi yang belum dibayar customer, diurutkan dari jatuh tempo terdekat.</Text>
                    </Box>

                    <Flex gap="12px" flexWrap="wrap">
                        <StatCard icon={<LuWallet size={20} />} label="Lewat jatuh tempo" tone={{ bg: "#FEE2E2", color: "#DC2626" }}
                            value={summary ? String(summary.overdue_count) : null} sub={summary ? fmtIDR(summary.overdue_amount) : undefined} />
                        <StatCard icon={<LuTriangleAlert size={20} />} label="Berisiko dibatalkan" tone={{ bg: "#FEE2E2", color: "#DC2626" }}
                            value={summary ? String(summary.cancellation_risk_count) : null} sub="Terlambat lebih dari 14 hari" />
                        <StatCard icon={<LuClock size={20} />} label="Jatuh tempo ≤ 7 hari" tone={{ bg: "#FEF3C7", color: "#B45309" }}
                            value={summary ? String(summary.due_soon_count) : null} sub={summary ? fmtIDR(summary.due_soon_amount) : undefined} />
                    </Flex>

                    <Flex gap="8px" flexWrap="wrap">
                        {SCOPES.map((s) => (
                            <Button key={s.value} size="sm" fontSize="15px" variant={scope === s.value ? "solid" : "outline"}
                                bg={scope === s.value ? "#1A3557" : undefined} color={scope === s.value ? "white" : "#374151"} onClick={() => setScope(s.value)}>
                                {s.label}
                            </Button>
                        ))}
                    </Flex>

                    <Box bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" overflowX="auto">
                        {error && <Text p="20px" fontSize="15px" color="#DC2626">{error}</Text>}
                        {!error && loading && <Flex flexDir="column" gap="8px" p="20px">{[1, 2, 3].map((i) => <Skeleton key={i} h="40px" />)}</Flex>}
                        {!error && !loading && rows.length === 0 && <Text p="20px" fontSize="15px" color="#64748B">Tidak ada premi yang perlu ditagih.</Text>}
                        {!error && !loading && rows.length > 0 && (
                            <Table.Root size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        {["Polis", "Nasabah", "Jatuh Tempo", "Jumlah", "Status", ""].map((h) => (
                                            <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" px="16px" py="10px">{h}</Table.ColumnHeader>
                                        ))}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {rows.map((r) => {
                                        const wa = r.whatsapp ? whatsappUrl(r.whatsapp) : null
                                        const tone = PAYMENT_URGENCY_COLORS[r.urgency]
                                        return (
                                            <Table.Row key={r.policy_id}>
                                                <Table.Cell px="16px" py="10px">
                                                    <Link href={`/agentra/policies/${encodeURIComponent(r.policy_id)}#pembayaran`}>
                                                        <Text color="#1D4ED8" fontSize="15px" fontWeight="semibold">{r.policy_number}</Text>
                                                    </Link>
                                                    <Text color="#64748B" fontSize="14px">{r.insurer_short_name ?? "-"}</Text>
                                                </Table.Cell>
                                                <Table.Cell px="16px" fontSize="15px">{r.customer_name}</Table.Cell>
                                                <Table.Cell px="16px" fontSize="15px">
                                                    {fmtDate(r.due_date)}
                                                    <Text color="#64748B" fontSize="14px">{r.days_until_due >= 0 ? `${r.days_until_due} hari lagi` : `Terlambat ${Math.abs(r.days_until_due)} hari`}</Text>
                                                </Table.Cell>
                                                <Table.Cell px="16px" fontSize="15px" fontWeight="medium">
                                                    {fmtIDR(r.amount_due)}
                                                    {r.is_installment && <Text color="#64748B" fontSize="14px" fontWeight="normal">cicilan</Text>}
                                                </Table.Cell>
                                                <Table.Cell px="16px">
                                                    <Badge bg={tone.bg} color={tone.color} px="10px" py="2px" borderRadius="full" fontSize="14px">{PAYMENT_URGENCY_LABELS[r.urgency]}</Badge>
                                                </Table.Cell>
                                                <Table.Cell px="16px">
                                                    {wa && (
                                                        <Button asChild size="xs" variant="outline" fontSize="14px" gap="4px">
                                                            <a target="_blank" rel="noopener noreferrer"
                                                                href={`${wa}?text=${encodeURIComponent(paymentReminderText({ customerName: r.customer_name, policyNumber: r.policy_number, amount: r.amount_due, dueDate: r.due_date }))}`}>
                                                                <FaWhatsapp color="#25D366" size={13} /> Ingatkan
                                                            </a>
                                                        </Button>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        )
                                    })}
                                </Table.Body>
                            </Table.Root>
                        )}
                    </Box>
                </Flex>
            </Box>

            <MobileBottomNav />
        </Box>
    )
}
