"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuPlus, LuShieldAlert } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getClaimStats, getClaims, type ApiClaim, type ClaimStats } from "@/lib/api/claims"
import { fmtIDR } from "@/lib/format"
import { ClaimStatusBadge } from "./ClaimStatusBadge"
import { RegisterClaimDialog } from "./RegisterClaimDialog"

export interface ClaimsPanelProps {
    /** Policy context: only this policy's claims; the register dialog is fixed to it. */
    policy?: { id: string; number: string; coverage_start: string; coverage_end: string; cancelled?: boolean }
    /** Customer context: every claim across the customer's policies. */
    customer?: { id: string; name: string }
    /** Called after a claim was registered (e.g. to refresh a policy timeline). */
    onChanged?: () => void
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

/** Ratio colour: under 40% is healthy, over 70% is a renewal risk. */
function ratioTone(ratio: number) {
    if (ratio >= 70) return { bg: "#FEE2E2", color: "#DC2626" }
    if (ratio >= 40) return { bg: "#FEF3C7", color: "#B45309" }
    return { bg: "#DCFCE7", color: "#16A34A" }
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: { bg: string; color: string } }) {
    return (
        <Flex flexDir="column" flex="1" minW="120px" px="12px" py="10px" borderRadius="10px" bg={tone?.bg ?? "#F8FAFC"}>
            <Text color="#64748B" fontSize="14px">{label}</Text>
            <Text color={tone?.color ?? "#1C2833"} fontSize="16px" fontWeight="bold">{value}</Text>
        </Flex>
    )
}

/** "Klaim" card for the policy and customer detail pages: claim history plus the claim ratio used at renewal. */
export function ClaimsPanel({ policy, customer, onChanged }: ClaimsPanelProps) {
    const router = useRouter()
    const [reloadKey, setReloadKey] = useState(0)
    const [registerOpen, setRegisterOpen] = useState(false)
    const policyId   = policy?.id
    const customerId = customer?.id
    const scopeKey = `${policyId ?? ""}|${customerId ?? ""}|${reloadKey}`
    const [result, setResult] = useState<{ key: string; claims: ApiClaim[]; stats: ClaimStats | null; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = `${policyId ?? ""}|${customerId ?? ""}|${reloadKey}`
        let cancelled = false
        Promise.all([
            getClaims(token, { policy_id: policyId, customer_id: policyId ? undefined : customerId, limit: 50 }),
            getClaimStats(token, policyId ? { policy_id: policyId } : { customer_id: customerId }),
        ])
            .then(([claims, stats]) => { if (!cancelled) setResult({ key, claims: claims.data ?? [], stats, error: null }) })
            .catch((err: unknown) => { if (!cancelled) setResult({ key, claims: [], stats: null, error: errorMessage(err, "Data klaim belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [policyId, customerId, reloadKey])

    const loading = result?.key !== scopeKey
    const claims  = loading ? [] : result?.claims ?? []
    const stats   = loading ? null : result?.stats ?? null
    const error   = loading ? null : result?.error ?? null

    return (
        <Box id="klaim" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" scrollMarginTop="80px">
            <Flex justify="space-between" align="center" px="24px" pt="20px" pb="16px" gap="12px" flexWrap="wrap">
                <Flex gap="10px" align="center">
                    <Box p="8px" bg="#FEF2F2" borderRadius="8px" color="#DC2626"><LuShieldAlert size={18} /></Box>
                    <Flex flexDir="column">
                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{policy ? "Klaim Polis" : "Riwayat Klaim"}</Text>
                        <Text color="#5D6D7E" fontSize="14px">{loading ? "Memuat..." : `${claims.length} klaim`}</Text>
                    </Flex>
                </Flex>
                {!policy?.cancelled && (
                    <Button size="sm" bg="#1A3557" color="white" gap="6px" fontSize="15px" _hover={{ bg: "#162C47" }} onClick={() => setRegisterOpen(true)}>
                        <LuPlus size={14} /> Daftarkan Klaim
                    </Button>
                )}
            </Flex>

            {stats && stats.claim_count > 0 && (
                <Flex px="24px" pb="16px" gap="10px" flexWrap="wrap">
                    <Metric label="Rasio Klaim" value={stats.claim_ratio === null ? "-" : `${stats.claim_ratio.toLocaleString("id-ID")}%`}
                        tone={stats.claim_ratio === null ? undefined : ratioTone(stats.claim_ratio)} />
                    <Metric label="Total Premi" value={fmtIDR(stats.premium_total)} />
                    <Metric label="Klaim Disetujui / Dibayar" value={fmtIDR(stats.incurred_total)} />
                    <Metric label="Klaim Berjalan" value={String(stats.open_count)} />
                </Flex>
            )}

            {error && <Text px="24px" pb="20px" fontSize="15px" color="#DC2626">{error}</Text>}

            {!error && loading && (
                <Flex flexDir="column" gap="8px" px="24px" pb="20px">
                    {[1, 2].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                </Flex>
            )}

            {!error && !loading && claims.length === 0 && (
                <Text px="24px" pb="20px" color="#64748B" fontSize="15px">Belum ada klaim.</Text>
            )}

            {!error && !loading && claims.length > 0 && (
                <Box borderTop="1px solid" borderColor="#F1F5F9">
                    {claims.map((c) => (
                        <Flex key={c.claim_id} asChild
                            px="24px" py="12px" gap="12px" align="center" justify="space-between" flexWrap="wrap"
                            borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>
                            <Link href={`/agentra/claims/${encodeURIComponent(c.claim_id)}`}>
                            <Flex flexDir="column" minW="0" flex="1">
                                <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{c.claim_number} · {c.cause}</Text>
                                <Text color="#64748B" fontSize="14px" truncate>
                                    {fmtDate(c.date_of_loss)}{policy ? "" : ` · ${c.policy_number}`}
                                    {c.insurer_short_name ? ` · ${c.insurer_short_name}` : ""}
                                </Text>
                            </Flex>
                            <Text color="#1C2833" fontSize="15px" fontWeight="medium">
                                {fmtIDR(c.settlement_amount ?? c.approved_amount ?? c.estimated_loss)}
                            </Text>
                            <ClaimStatusBadge status={c.status} />
                            </Link>
                        </Flex>
                    ))}
                </Box>
            )}

            <RegisterClaimDialog
                open={registerOpen}
                onClose={() => setRegisterOpen(false)}
                onRegistered={(claim) => {
                    setReloadKey((k) => k + 1)
                    onChanged?.()
                    router.push(`/agentra/claims/${encodeURIComponent(claim.claim_id)}`)
                }}
                policy={policy}
                customer={customer}
            />
        </Box>
    )
}
