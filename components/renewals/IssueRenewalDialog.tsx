"use client"

import { useState } from "react"
import { Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { renewPolicy, type RenewPolicyResult } from "@/lib/api/policies"
import type { RenewalWorkflow } from "@/lib/api/renewals"
import { fmtIDR } from "@/lib/format"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

/** Issues the renewal: creates the new policy year from the terms the insurer gave. */
export function IssueRenewalDialog({ data, onClose, onIssued }: { data: RenewalWorkflow; onClose: () => void; onIssued: (r: RenewPolicyResult) => void }) {
    const { policy, workflow } = data
    const [number, setNumber] = useState("")
    const [start, setStart]   = useState("")
    const [end, setEnd]       = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState<string | null>(null)

    // With line items the API derives sum insured and premium from the copied items.
    const usesItems = policy.coverage_items > 0
    const applied = [
        !usesItems && workflow.new_sum_insured !== null ? `nilai pertanggungan ${fmtIDR(workflow.new_sum_insured)}` : null,
        !usesItems && workflow.new_premium !== null ? `premi ${fmtIDR(workflow.new_premium)}` : null,
        workflow.new_commission_rate !== null ? `komisi ${workflow.new_commission_rate}%` : null,
    ].filter(Boolean)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!number.trim()) { setError("Nomor polis baru wajib diisi"); return }
        if (start && end && end <= start) { setError("Akhir periode harus setelah tanggal mulai"); return }
        setSaving(true); setError(null)
        try {
            onIssued(await renewPolicy(token, policy.policy_id, {
                policy_number: number.trim(),
                coverage_start: start || undefined,
                coverage_end: end || undefined,
                commission_rate: workflow.new_commission_rate ?? undefined,
                sum_insured: !usesItems ? workflow.new_sum_insured ?? undefined : undefined,
                premium_amount: !usesItems ? workflow.new_premium ?? undefined : undefined,
            }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menerbitkan perpanjangan"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title="Terbitkan Perpanjangan" saving={saving} error={error} submitLabel="Terbitkan" onClose={onClose} onSubmit={submit}>
            <Text fontSize="16px" color="#64748B">
                {policy.customer_name} — polis lama {policy.policy_number}.{" "}
                {applied.length > 0 ? `Dipakai dari ketentuan yang disetujui: ${applied.join(", ")}.` : "Tidak ada ketentuan baru, nilai disalin dari polis lama."}
            </Text>
            {usesItems && (workflow.new_sum_insured !== null || workflow.new_premium !== null) && (
                <Text fontSize="16px" color="#B45309">
                    Polis ini punya item pertanggungan, jadi nilai pertanggungan dan premi dihitung dari item yang disalin. Sesuaikan item di halaman polis baru setelah terbit.
                </Text>
            )}
            <FormField label="Nomor Polis Baru *"><Input {...CLAIM_INPUT} placeholder="01.08.2027.001" value={number} onChange={(e) => setNumber(e.target.value)} /></FormField>
            <FormRow>
                <FormField label="Mulai Periode"><Input {...CLAIM_INPUT} type="date" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
                <FormField label="Akhir Periode"><Input {...CLAIM_INPUT} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
            </FormRow>
            <Text fontSize="16px" color="#64748B">Kosongkan tanggal untuk melanjutkan dari polis lama (akhir periode = mulai + 365 hari).</Text>
        </FormDialog>
    )
}
