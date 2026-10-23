"use client"

import { useState } from "react"
import { Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { LOST_REASON_LABELS, changeProspectStage, type ApiProspect, type LostReason } from "@/lib/api/prospects"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

/** Marks a prospect as lost and records why (price, competitor, no longer needed...). */
export function LostDialog({ prospect, onClose, onSaved }: { prospect: ApiProspect; onClose: () => void; onSaved: (p: ApiProspect) => void }) {
    const [reason, setReason] = useState<LostReason | "">("")
    const [note, setNote] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!reason) { setError("Pilih alasan"); return }
        setSaving(true); setError(null)
        try {
            onSaved(await changeProspectStage(token, prospect.prospect_id, { stage: "lost", lost_reason: reason, lost_note: note.trim() || null }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title="Tandai Batal" saving={saving} error={error} submitLabel="Tandai Batal" onClose={onClose} onSubmit={submit}>
            <Text fontSize="15px" color="#64748B">Mengapa {prospect.name} tidak jadi? Alasan ini dipakai untuk melihat pola kehilangan prospek.</Text>
            <FormField label="Alasan *">
                <SearchSelect value={reason} onChange={(v) => setReason(v as LostReason)} placeholder="Pilih alasan"
                    options={(Object.entries(LOST_REASON_LABELS) as [LostReason, string][]).map(([value, label]) => ({ value, label }))} />
            </FormField>
            <FormField label="Catatan (opsional)"><Input {...CLAIM_INPUT} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
        </FormDialog>
    )
}
