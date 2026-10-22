"use client"

import { useState } from "react"
import { Box, Checkbox, Flex, Input, Text, Textarea } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    TEMPLATE_TYPE_LABELS, createMessageTemplate, updateMessageTemplate,
    type MessageTemplate, type MessageTemplateType,
} from "@/lib/api/communications"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

/** Create or edit a message template. Birthday and holiday templates can be sent automatically each day. */
export function TemplateDialog({ template, placeholders, onClose, onSaved }: {
    template: MessageTemplate | null
    placeholders: string[]
    onClose: () => void
    onSaved: (t: MessageTemplate) => void
}) {
    const [type, setType]     = useState<MessageTemplateType>(template?.template_type ?? "custom")
    const [name, setName]     = useState(template?.name ?? "")
    const [body, setBody]     = useState(template?.body ?? "")
    const [date, setDate]     = useState(template?.send_on_date ?? "")
    const [yearly, setYearly] = useState(template?.repeat_yearly ?? true)
    const [auto, setAuto]     = useState(template?.auto_send ?? false)
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!name.trim()) { setError("Nama template wajib diisi"); return }
        if (!body.trim()) { setError("Isi pesan wajib diisi"); return }
        if (type === "holiday" && auto && !date) { setError("Pilih tanggal kirim untuk ucapan otomatis"); return }
        setSaving(true); setError(null)
        const payload = {
            name: name.trim(), body: body.trim(),
            ...(type === "holiday" ? { send_on_date: date || null, repeat_yearly: yearly } : {}),
            ...(type === "birthday" || type === "holiday" ? { auto_send: auto } : {}),
        }
        try {
            onSaved(template ? await updateMessageTemplate(token, template.template_id, payload) : await createMessageTemplate(token, { ...payload, template_type: type }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan template"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title={template ? "Ubah Template" : "Template Baru"} size="560px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            {!template && (
                <FormField label="Jenis">
                    <SearchSelect value={type} onChange={(v) => setType(v as MessageTemplateType)}
                        options={(Object.entries(TEMPLATE_TYPE_LABELS) as [MessageTemplateType, string][]).map(([value, label]) => ({ value, label }))} />
                </FormField>
            )}
            <FormField label="Nama *"><Input {...CLAIM_INPUT} maxLength={150} value={name} onChange={(e) => setName(e.target.value)} /></FormField>
            <FormField label="Isi pesan *">
                <Textarea fontSize="16px" rows={6} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
            </FormField>
            <Flex gap="6px" flexWrap="wrap" align="center">
                <Text fontSize="16px" color="#64748B">Penanda:</Text>
                {placeholders.map((p) => (
                    <Box key={p} as="button" px="6px" py="1px" borderRadius="4px" bg="#F1F5F9" color="#475569" fontSize="16px" fontFamily="mono"
                        onClick={() => setBody((b) => b + p)}>{p}</Box>
                ))}
            </Flex>
            {type === "holiday" && (
                <Flex gap="12px" align="end" flexWrap="wrap">
                    <FormField label="Tanggal kirim"><Input {...CLAIM_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
                    <Checkbox.Root checked={yearly} onCheckedChange={(d) => setYearly(d.checked === true)}>
                        <Checkbox.HiddenInput /><Checkbox.Control /><Checkbox.Label fontSize="16px">Ulangi setiap tahun (tanggal yang sama)</Checkbox.Label>
                    </Checkbox.Root>
                </Flex>
            )}
            {(type === "birthday" || type === "holiday") && (
                <Box>
                    <Checkbox.Root checked={auto} onCheckedChange={(d) => setAuto(d.checked === true)}>
                        <Checkbox.HiddenInput /><Checkbox.Control />
                        <Checkbox.Label fontSize="16px">Kirim otomatis{type === "birthday" ? " pada hari ulang tahun nasabah perorangan" : " ke semua nasabah aktif pada tanggal kirim"}</Checkbox.Label>
                    </Checkbox.Root>
                    <Text mt="4px" fontSize="16px" color="#64748B">Dijalankan oleh tugas harian di server. Satu nasabah menerima satu template maksimal sekali per tahun.</Text>
                </Box>
            )}
        </FormDialog>
    )
}
