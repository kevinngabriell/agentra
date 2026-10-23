"use client"

import { useEffect, useRef, useState } from "react"
import { Box, Text, Textarea } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    TEMPLATE_TYPE_LABELS, getMessageTemplates, previewMessage, sendMessage,
    type MessageTemplate, type MessageTemplateType,
} from "@/lib/api/communications"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField } from "@/components/ui/form-dialog"

/**
 * Writes and sends one WhatsApp message to a customer, optionally about a policy. Pick a template, edit the text,
 * preview it with the real names and amounts, then send. The message is logged against the customer and policy.
 */
export function SendMessageDialog({ customer, policy, templateType, onClose, onSent }: {
    customer: { id: string; name: string }
    policy?: { id: string; number: string }
    /** Template type offered first (e.g. payment_reminder from a policy). */
    templateType?: MessageTemplateType
    onClose: () => void
    onSent: () => void
}) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [templateId, setTemplateId] = useState("")
    const [body, setBody]       = useState("")
    const [preview, setPreview] = useState<string | null>(null)
    const [saving, setSaving]   = useState(false)
    const [busy, setBusy]       = useState(false)
    const [error, setError]     = useState<string | null>(null)
    const picked = useRef(false)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getMessageTemplates(token)
            .then((r) => {
                const usable = r.data.filter((t) => t.template_type !== "birthday" && t.template_type !== "holiday")
                setTemplates(usable)
                const first = usable.find((t) => t.template_type === templateType)
                if (first && !picked.current) { picked.current = true; setTemplateId(first.template_id); setBody(first.body) }
            })
            .catch((err) => setError(errorMessage(err, "Template belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [templateType])

    function pickTemplate(id: string) {
        setTemplateId(id)
        setPreview(null)
        const t = templates.find((x) => x.template_id === id)
        if (t) setBody(t.body)
    }

    const draft = () => ({
        customer_id: customer.id,
        policy_id: policy?.id,
        template_id: templateId || undefined,
        body: body.trim(),
        message_type: templateId ? undefined : (templateType ?? "custom"),
    })

    async function doPreview() {
        const token = getAccessToken()
        if (!token) return
        if (!body.trim()) { setError("Isi pesan wajib diisi"); return }
        setBusy(true); setError(null)
        try {
            const r = await previewMessage(token, draft())
            setPreview(r.message)
            if (!r.has_whatsapp) setError("Nasabah belum punya nomor WhatsApp yang valid.")
        } catch (err) {
            setError(errorMessage(err, "Gagal membuat pratinjau"))
        } finally {
            setBusy(false)
        }
    }

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!body.trim()) { setError("Isi pesan wajib diisi"); return }
        setSaving(true); setError(null)
        try {
            await sendMessage(token, draft())
            onSent()
        } catch (err) {
            setError(errorMessage(err, "Gagal mengirim WhatsApp"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title="Kirim WhatsApp" saving={saving} error={error} submitLabel="Kirim" onClose={onClose} onSubmit={submit}>
            <Text fontSize="16px" color="#64748B">
                Kepada <b>{customer.name}</b>{policy ? <> · polis {policy.number}</> : null}
            </Text>
            <FormField label="Template Pesan">
                <SearchSelect value={templateId} onChange={pickTemplate} placeholder="Pilih template (opsional)" clearable
                    options={templates.map((t) => ({ value: t.template_id, label: `${t.name} · ${TEMPLATE_TYPE_LABELS[t.template_type]}` }))} />
            </FormField>
            <FormField label="Pesan" hint="Gunakan {customer_name}, {policy_number}, {amount_due}, {due_date} dan penanda lain; diisi otomatis saat dikirim.">
                <Textarea fontSize="16px" rows={6} maxLength={2000} value={body}
                    onChange={(e) => { setBody(e.target.value); setPreview(null) }} />
            </FormField>
            <Box>
                <Text as="button" fontSize="16px" color="#1D4ED8" fontWeight="semibold" onClick={() => void doPreview()} aria-busy={busy}>
                    {busy ? "Memuat pratinjau..." : "Lihat pratinjau"}
                </Text>
                {preview !== null && (
                    <Box mt="6px" bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="8px" p="10px">
                        <Text fontSize="16px" color="#166534" whiteSpace="pre-wrap">{preview}</Text>
                    </Box>
                )}
            </Box>
        </FormDialog>
    )
}
