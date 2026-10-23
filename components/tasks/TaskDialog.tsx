"use client"

import { useState } from "react"
import { Input, Textarea } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { createTask, updateTask, type ApiTask, type TaskInput } from "@/lib/api/tasks"
import { errorMessage } from "@/lib/api/client"
import { localISODate } from "@/lib/format"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, Required } from "@/components/claims/fields"

export interface TaskLink {
    customer_id?: string
    policy_id?: string
    claim_id?: string
    /** Shown under the title so the agent can see what the task is attached to. */
    label?: string
}

/** Create (task omitted) or edit a task. `link` fixes the customer / policy / claim for a new one. */
export function TaskDialog({ task, link, onClose, onSaved }: {
    task?: ApiTask
    link?: TaskLink
    onClose: () => void
    onSaved: () => void
}) {
    const [title, setTitle] = useState(task?.title ?? "")
    const [due, setDue]     = useState(task?.due_date ?? localISODate())
    const [notes, setNotes] = useState(task?.notes ?? "")
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!title.trim()) { setError("Judul tugas wajib diisi"); return }
        if (!due) { setError("Tanggal jatuh tempo wajib diisi"); return }
        const data: TaskInput = {
            title: title.trim(), due_date: due, notes: notes.trim(),
            customer_id: task?.customer_id ?? link?.customer_id ?? null,
            policy_id:   task?.policy_id   ?? link?.policy_id   ?? null,
            claim_id:    task?.claim_id    ?? link?.claim_id    ?? null,
        }
        setSaving(true)
        setError(null)
        try {
            if (task) await updateTask(token, task.task_id, data)
            else await createTask(token, data)
            onSaved()
        } catch (err: unknown) {
            setError(errorMessage(err, "Gagal menyimpan tugas"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title={task ? "Ubah Tugas" : "Tugas Baru"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormField label="Judul" hint={link?.label ? `Terkait: ${link.label}` : undefined}>
                <Input {...CLAIM_INPUT} value={title} maxLength={200} placeholder="mis. Telepon nasabah untuk survei" onChange={(e) => setTitle(e.target.value)} aria-required />
            </FormField>
            <FormField label="Jatuh tempo">
                <Input {...CLAIM_INPUT} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </FormField>
            <FormField label="Catatan (opsional)">
                <Textarea {...CLAIM_INPUT} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            {!title.trim() && error && <Required />}
        </FormDialog>
    )
}
