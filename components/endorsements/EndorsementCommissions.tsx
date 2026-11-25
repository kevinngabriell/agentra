"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuReceipt } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR } from "@/lib/format"
import {
    ENDORSEMENT_COMMISSION_LABELS, ENDORSEMENT_TYPE_LABELS, getCompanyEndorsements, updateEndorsement,
    type CompanyEndorsementsResponse, type PolicyEndorsement,
} from "@/lib/api/endorsements"

const signed = (n: number) => (n < 0 ? `− ${fmtIDR(-n)}` : fmtIDR(n))
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")

/**
 * Commissions page: commission on endorsement notes, kept apart from the policy commission records.
 * Additional premium earns more commission (to collect); returned premium claws commission back.
 */
export function EndorsementCommissions({ insurerId }: { insurerId?: string }) {
    const [status, setStatus] = useState<"commission_pending" | "all">("commission_pending")
    const [data, setData] = useState<CompanyEndorsementsResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getCompanyEndorsements(token, { status, insurer_id: insurerId || undefined })
            .then(setData).catch((err) => setError(errorMessage(err, "Komisi endorsemen belum bisa dimuat.")))
    }, [status, insurerId])
    useEffect(() => { load() }, [load])

    async function settle(r: PolicyEndorsement) {
        const token = getAccessToken()
        if (!token) return
        setBusy(r.endorsement_id)
        try { await updateEndorsement(token, r.policy_id, r.endorsement_id, { commission_status: r.commission_delta < 0 ? "clawed_back" : "received" }); load() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")) } finally { setBusy(null) }
    }

    const rows = (data?.items ?? []).filter((r) => r.commission_delta !== 0)
    const toCollect = rows.filter((r) => r.commission_status === "pending" && r.commission_delta > 0).reduce((s, r) => s + r.commission_delta, 0)
    const toReturn = rows.filter((r) => r.commission_status === "pending" && r.commission_delta < 0).reduce((s, r) => s - r.commission_delta, 0)

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
            <Flex justify="space-between" align="center" mb="10px" gap="8px" flexWrap="wrap">
                <Flex align="center" gap="8px"><LuReceipt size={16} color="#0D1B3E" /><Text fontSize="16px" fontWeight="semibold" color="#1C2833">Komisi Endorsemen & Pembatalan</Text></Flex>
                <Flex gap="6px">
                    {(["commission_pending", "all"] as const).map((s) => (
                        <Button key={s} size="xs" fontSize="14px" variant={status === s ? "solid" : "outline"} bg={status === s ? "#0D1B3E" : undefined} color={status === s ? "white" : undefined}
                            onClick={() => setStatus(s)}>{s === "all" ? "Semua" : "Belum selesai"}</Button>
                    ))}
                </Flex>
            </Flex>
            <Text fontSize="14px" color="#64748B" mb="8px">
                Tambahan komisi dari premi endorsemen {fmtIDR(toCollect)} · komisi yang akan ditarik penanggung (pembatalan / pengurangan) {fmtIDR(toReturn)}
            </Text>
            {error && <Text color="#DC2626" fontSize="14px">{error}</Text>}
            {!data ? <Skeleton h="60px" /> : rows.length === 0 ? <Text fontSize="14px" color="#64748B">Tidak ada komisi endorsemen.</Text> : rows.map((r) => (
                <Flex key={r.endorsement_id} justify="space-between" align="center" gap="10px" py="7px" borderTop="1px solid #F1F5F9" fontSize="14px" flexWrap="wrap">
                    <Box minW="0">
                        <Text color="#1C2833">
                            <Link href={`/agentra/policies/${encodeURIComponent(r.policy_id)}#nota`} style={{ color: "#1D4ED8", fontWeight: 600 }}>{r.policy_number}</Link>
                            {" · "}{r.customer_name} · {r.insurer_short_name ?? "-"}
                        </Text>
                        <Text color="#64748B">{r.note_number ?? "—"} · {ENDORSEMENT_TYPE_LABELS[r.endorsement_type]} · {fmtDate(r.effective_date)}</Text>
                    </Box>
                    <Flex align="center" gap="8px">
                        <Text fontWeight="semibold" color={r.commission_delta < 0 ? "#B91C1C" : "#15803D"}>{signed(r.commission_delta)}</Text>
                        {r.commission_status === "pending"
                            ? <Button size="2xs" variant="outline" fontSize="14px" loading={busy === r.endorsement_id} onClick={() => settle(r)}>{r.commission_delta < 0 ? "Sudah ditarik" : "Sudah diterima"}</Button>
                            : <Badge fontSize="14px" bg="#F1F5F9" color="#475569">{ENDORSEMENT_COMMISSION_LABELS[r.commission_status]}</Badge>}
                    </Flex>
                </Flex>
            ))}
        </Box>
    )
}
