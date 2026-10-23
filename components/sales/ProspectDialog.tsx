"use client"

import { useEffect, useState } from "react"
import { Input, Textarea } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    PROSPECT_SOURCE_LABELS, PROSPECT_TYPE_LABELS, createProspect, updateProspect,
    type ApiProspect, type ProspectPayload, type ProspectSource, type ProspectType,
} from "@/lib/api/prospects"
import { getActiveSubAgents, type ApiSubAgent } from "@/lib/api/sub-agents"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { PRODUCT_OPTIONS } from "./constants"

interface Form {
    type: ProspectType; name: string; contact_name: string; phone: string; whatsapp: string; email: string
    source: ProspectSource; agent: string; product: string; expected: string; follow_up: string
    c_insurer: string; c_number: string; c_expiry: string; c_premium: string; notes: string
}

function initial(type: ProspectType, p: ApiProspect | null): Form {
    return {
        type: p?.prospect_type ?? type, name: p?.name ?? "", contact_name: p?.contact_name ?? "", phone: p?.phone ?? "",
        whatsapp: p?.whatsapp ?? "", email: p?.email ?? "", source: p?.source ?? "direct", agent: p?.referred_by_agent_id ?? "",
        product: p?.product_interest ?? "", expected: p ? String(p.expected_premium) : "", follow_up: p?.follow_up_date ?? "",
        c_insurer: p?.competitor_insurer ?? "", c_number: p?.competitor_policy_number ?? "", c_expiry: p?.competitor_expiry ?? "",
        c_premium: p?.competitor_premium != null ? String(p.competitor_premium) : "", notes: p?.notes ?? "",
    }
}

/** Add or edit a lead / competitor-held policy. */
export function ProspectDialog({ type, editing, onClose, onSaved }: {
    type: ProspectType
    editing: ApiProspect | null
    onClose: () => void
    onSaved: (p: ApiProspect) => void
}) {
    const [form, setForm] = useState<Form>(() => initial(type, editing))
    const [agents, setAgents] = useState<ApiSubAgent[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<Form>) => setForm(f => ({ ...f, ...p }))
    const isCompetitor = form.type === "competitor_policy"

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getActiveSubAgents(token).then(setAgents).catch(() => setAgents([]))
    }, [])

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!form.name.trim()) { setError("Nama wajib diisi"); return }
        if (isCompetitor && !form.c_expiry) { setError("Tanggal berakhir polis wajib diisi"); return }
        const text = (v: string) => v.trim() || null
        const body: ProspectPayload = {
            name: form.name.trim(), contact_name: text(form.contact_name), phone: text(form.phone), whatsapp: text(form.whatsapp),
            email: text(form.email), source: form.source, referred_by_agent_id: form.agent || null,
            product_interest: form.product || null, expected_premium: Number(form.expected || 0), follow_up_date: form.follow_up || null,
            competitor_insurer: isCompetitor ? text(form.c_insurer) : null,
            competitor_policy_number: isCompetitor ? text(form.c_number) : null,
            competitor_expiry: isCompetitor ? form.c_expiry : null,
            competitor_premium: isCompetitor && form.c_premium ? Number(form.c_premium) : null,
            notes: text(form.notes),
        }
        setSaving(true); setError(null)
        try {
            const saved = editing
                ? await updateProspect(token, editing.prospect_id, body)
                : await createProspect(token, { ...body, prospect_type: form.type })
            onSaved(saved)
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title={`${editing ? "Ubah" : "Tambah"} ${PROSPECT_TYPE_LABELS[form.type]}`} size="560px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormField label="Nama prospek / perusahaan *"><Input {...CLAIM_INPUT} maxLength={150} value={form.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
            <FormField label="Nama kontak (opsional)"><Input {...CLAIM_INPUT} maxLength={150} value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} /></FormField>
            <FormRow>
                <FormField label="No. WhatsApp"><Input {...CLAIM_INPUT} inputMode="tel" maxLength={30} value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></FormField>
                <FormField label="No. telepon"><Input {...CLAIM_INPUT} inputMode="tel" maxLength={30} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></FormField>
            </FormRow>
            <FormField label="Email"><Input {...CLAIM_INPUT} type="email" maxLength={150} value={form.email} onChange={(e) => set({ email: e.target.value })} /></FormField>
            <FormRow>
                <FormField label="Sumber">
                    <SearchSelect value={form.source} onChange={(v) => set({ source: v as ProspectSource })}
                        options={(Object.entries(PROSPECT_SOURCE_LABELS) as [ProspectSource, string][]).map(([value, label]) => ({ value, label }))} />
                </FormField>
                <FormField label="Dirujuk sub-agen">
                    <SearchSelect value={form.agent} onChange={(v) => set({ agent: v })} placeholder="Tidak ada"
                        options={[{ value: "", label: "Tidak ada" }, ...agents.map(a => ({ value: a.sub_agent_id, label: a.full_name }))]} />
                </FormField>
            </FormRow>
            <FormRow>
                <FormField label="Minat produk">
                    <SearchSelect value={form.product} onChange={(v) => set({ product: v })} placeholder="Pilih produk"
                        options={[{ value: "", label: "Belum ditentukan" }, ...PRODUCT_OPTIONS]} />
                </FormField>
                <FormField label="Perkiraan premi (Rp)"><MoneyInput value={form.expected} onChange={(v) => set({ expected: v })} /></FormField>
            </FormRow>
            {isCompetitor && (
                <>
                    <FormRow>
                        <FormField label="Asuransi saat ini"><Input {...CLAIM_INPUT} maxLength={150} value={form.c_insurer} onChange={(e) => set({ c_insurer: e.target.value })} /></FormField>
                        <FormField label="No. polis saat ini"><Input {...CLAIM_INPUT} maxLength={100} value={form.c_number} onChange={(e) => set({ c_number: e.target.value })} /></FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label="Polis berakhir *"><Input {...CLAIM_INPUT} type="date" value={form.c_expiry} onChange={(e) => set({ c_expiry: e.target.value })} /></FormField>
                        <FormField label="Premi saat ini (Rp)"><MoneyInput value={form.c_premium} onChange={(v) => set({ c_premium: v })} /></FormField>
                    </FormRow>
                </>
            )}
            <FormField label="Tindak lanjut berikutnya"><Input {...CLAIM_INPUT} type="date" value={form.follow_up} onChange={(e) => set({ follow_up: e.target.value })} /></FormField>
            <FormField label="Catatan"><Textarea {...CLAIM_INPUT} rows={2} maxLength={5000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
        </FormDialog>
    )
}
