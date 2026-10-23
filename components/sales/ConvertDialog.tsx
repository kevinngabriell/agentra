"use client"

import { useRef, useState } from "react"
import { Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { createCustomer } from "@/lib/api/customers"
import { convertProspect, type ApiProspect } from "@/lib/api/prospects"
import { CustomerPicker } from "@/components/policy-change/CustomerPicker"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

type Mode = "existing" | "individual" | "company"

// A prospect named like a business starts on the company tab; the agent can still switch.
const COMPANY_NAME = /^\s*(PT|CV|UD|PD|PO|Yayasan|Koperasi|Firma)\b/i

/** Turns a prospect into a customer: pick an existing one or create it from the prospect's data. */
export function ConvertDialog({ prospect, onClose, onConverted }: {
    prospect: ApiProspect
    onClose: () => void
    onConverted: (prospect: ApiProspect) => void
}) {
    const [mode, setMode] = useState<Mode>(COMPANY_NAME.test(prospect.name) ? "company" : "individual")
    const [existing, setExisting] = useState<{ customer_id: string; display_name: string } | null>(null)
    // Set once the new customer exists, so pressing the button again after a failed link does not create a second one.
    const createdId = useRef<string | null>(null)
    const [nik, setNik] = useState("")
    const [npwp, setNpwp] = useState("")
    const [picName, setPicName] = useState(prospect.contact_name ?? "")
    // A company needs the PIC's phone and WhatsApp. Start from the prospect's numbers; either one may be missing there.
    const [picPhone, setPicPhone] = useState(prospect.phone ?? prospect.whatsapp ?? "")
    const [picWhatsapp, setPicWhatsapp] = useState(prospect.whatsapp ?? prospect.phone ?? "")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        const phone = prospect.phone ?? prospect.whatsapp ?? ""
        const whatsapp = prospect.whatsapp ?? prospect.phone ?? ""
        let customerId = existing?.customer_id ?? ""

        if (mode === "existing") {
            if (!customerId) { setError("Pilih nasabah"); return }
        } else if (mode === "individual") {
            if (!/^\d{16}$/.test(nik)) { setError("NIK harus 16 digit"); return }
        } else {
            if (!npwp.trim()) { setError("NPWP perusahaan wajib diisi"); return }
            if (!picName.trim()) { setError("Nama PIC wajib diisi"); return }
            if (!picPhone.trim()) { setError("Telepon PIC wajib diisi"); return }
            if (!picWhatsapp.trim()) { setError("WhatsApp PIC wajib diisi"); return }
        }

        setSaving(true); setError(null)
        try {
            if (mode !== "existing" && createdId.current) {
                customerId = createdId.current
            } else if (mode !== "existing") {
                const base = {
                    customer_type: mode, display_name: prospect.name, source: prospect.source === "referral" ? "referral" : "direct",
                    referred_by_agent_id: prospect.referred_by_agent_id ?? undefined, notes: prospect.notes ?? undefined,
                }
                const created = await createCustomer(token, mode === "individual"
                    ? { ...base, nik, personal_phone: phone || undefined, personal_whatsapp: whatsapp || undefined, personal_email: prospect.email ?? undefined }
                    : { ...base, company_legal_name: prospect.name, npwp_company: npwp.trim(), pic_name: picName.trim(), pic_phone: picPhone.trim(), pic_whatsapp: picWhatsapp.trim(),
                        company_email: prospect.email ?? undefined })
                customerId = created.customer_id
                createdId.current = customerId
            }
            onConverted(await convertProspect(token, prospect.prospect_id, customerId))
        } catch (err) {
            setError(errorMessage(err, "Gagal mengonversi prospek"))
            setSaving(false)
        }
    }

    const tab = (m: Mode, label: string) => (
        <button type="button" key={m} onClick={() => { setMode(m); setError(null); createdId.current = null }}
            style={{ flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #E2E8F0",
                background: mode === m ? "#1A3557" : "white", color: mode === m ? "white" : "#475569", cursor: "pointer" }}>
            {label}
        </button>
    )

    return (
        <FormDialog title="Jadikan Nasabah" saving={saving} error={error} submitLabel="Jadikan Nasabah" onClose={onClose} onSubmit={submit}>
            <Text fontSize="15px" color="#64748B">Hubungkan {prospect.name} dengan data nasabah agar polis bisa diterbitkan.</Text>
            <div style={{ display: "flex", gap: 6 }}>
                {tab("individual", "Nasabah baru (perorangan)")}
                {tab("company", "Nasabah baru (perusahaan)")}
                {tab("existing", "Nasabah yang sudah ada")}
            </div>
            {mode === "existing" && (
                <FormField label="Cari nasabah *" hint="Ketik minimal 2 huruf dari nama, NIK, atau NPWP, lalu pilih dari hasil.">
                    <CustomerPicker value={existing?.customer_id ?? ""} selectedName={existing?.display_name ?? ""} onChange={setExisting} />
                </FormField>
            )}
            {mode === "individual" && (
                <FormField label="NIK (16 digit) *" hint="Nama, telepon, dan email diambil dari data prospek.">
                    <Input {...CLAIM_INPUT} inputMode="numeric" maxLength={16} value={nik} onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))} />
                </FormField>
            )}
            {mode === "company" && (
                <>
                    <FormRow>
                        <FormField label="NPWP perusahaan *"><Input {...CLAIM_INPUT} maxLength={30} value={npwp} onChange={(e) => setNpwp(e.target.value)} /></FormField>
                        <FormField label="Nama PIC *"><Input {...CLAIM_INPUT} maxLength={150} value={picName} onChange={(e) => setPicName(e.target.value)} /></FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label="Telepon PIC *"><Input {...CLAIM_INPUT} inputMode="tel" maxLength={30} value={picPhone} onChange={(e) => setPicPhone(e.target.value)} /></FormField>
                        <FormField label="WhatsApp PIC *"><Input {...CLAIM_INPUT} inputMode="tel" maxLength={30} value={picWhatsapp} onChange={(e) => setPicWhatsapp(e.target.value)} /></FormField>
                    </FormRow>
                </>
            )}
        </FormDialog>
    )
}
