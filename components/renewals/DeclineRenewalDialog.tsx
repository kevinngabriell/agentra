"use client"

import { useState } from "react"
import { Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { RENEWAL_LOST_REASON_LABELS, changeRenewalStage, type RenewalLostReason, type RenewalWorkflow } from "@/lib/api/renewals"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

/** Records that the customer did not renew, and why. The policy is marked lapsed. */
export function DeclineRenewalDialog({ data, onClose, onSaved }: { data: RenewalWorkflow; onClose: () => void; onSaved: (d: RenewalWorkflow) => void }) {
    const [reason, setReason] = useState<RenewalLostReason | "">("")
    const [note, setNote]     = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!reason) { setError("Pilih alasan"); return }
        setSaving(true); setError(null)
        try {
            onSaved(await changeRenewalStage(token, data.policy.policy_id, { stage: "declined", lost_reason: reason, lost_note: note.trim() || undefined }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title="Perpanjangan Hilang" saving={saving} error={error} submitLabel="Tandai Hilang" onClose={onClose} onSubmit={submit}>
            <Text fontSize="16px" color="#64748B">
                Mengapa {data.policy.customer_name} tidak memperpanjang polis {data.policy.policy_number}? Polis ditandai lapsed; alasan ini muncul di statistik bulan tersebut.
            </Text>
            <FormField label="Alasan *">
                <SearchSelect value={reason} onChange={(v) => setReason(v as RenewalLostReason)} placeholder="Pilih alasan"
                    options={(Object.entries(RENEWAL_LOST_REASON_LABELS) as [RenewalLostReason, string][]).map(([value, label]) => ({ value, label }))} />
            </FormField>
            <FormField label="Catatan (opsional)"><Input {...CLAIM_INPUT} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
        </FormDialog>
    )
}
