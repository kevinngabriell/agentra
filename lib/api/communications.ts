import { apiFetch, apiPath, withQuery } from "./client"

export type MessageTemplateType = 'invoice' | 'payment_reminder' | 'birthday' | 'holiday' | 'broadcast' | 'custom'
export type MessageType = MessageTemplateType | 'renewal'
export type MessageStatus = 'sent' | 'failed'

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
    renewal:          'Perpanjangan',
    invoice:          'Invoice / nota debet',
    payment_reminder: 'Pengingat premi',
    birthday:         'Ulang tahun',
    holiday:          'Ucapan hari raya',
    broadcast:        'Broadcast',
    custom:           'Pesan bebas',
}

export const TEMPLATE_TYPE_LABELS: Record<MessageTemplateType, string> = {
    invoice:          MESSAGE_TYPE_LABELS.invoice,
    payment_reminder: MESSAGE_TYPE_LABELS.payment_reminder,
    birthday:         MESSAGE_TYPE_LABELS.birthday,
    holiday:          MESSAGE_TYPE_LABELS.holiday,
    broadcast:        MESSAGE_TYPE_LABELS.broadcast,
    custom:           MESSAGE_TYPE_LABELS.custom,
}

export interface MessageTemplate {
    template_id: string
    template_type: MessageTemplateType
    name: string
    body: string
    /** holiday only: the day it goes out. */
    send_on_date: string | null
    repeat_yearly: boolean
    /** birthday / holiday: sent by the daily greetings job. */
    auto_send: boolean
}

export interface MessageTemplateInput {
    template_type?: MessageTemplateType
    name: string
    body: string
    send_on_date?: string | null
    repeat_yearly?: boolean
    auto_send?: boolean
}

export interface MessageLogEntry {
    log_id: string
    customer_id: string | null
    customer_name: string | null
    policy_id: string | null
    policy_number: string | null
    template_id: string | null
    template_name: string | null
    broadcast_id: string | null
    message_type: MessageType
    trigger_source: 'manual' | 'broadcast' | 'auto'
    body: string
    status: MessageStatus
    error: string | null
    sent_by: string | null
    created_at: string
}

export interface MessageLogParams {
    customer_id?: string
    policy_id?: string
    message_type?: MessageType
    status?: MessageStatus
    page?: number
    limit?: number
}

export interface MessageLogResponse {
    data: MessageLogEntry[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export interface BroadcastFilters {
    product_type?: string
    insurer_id?: string
    city?: string
    customer_type?: 'individual' | 'company'
    group_id?: string
}

export interface BroadcastPreview {
    matched: number
    reachable: number
    no_whatsapp: number
    max_recipients: number
    sample: string[]
}

export interface BroadcastRecord {
    broadcast_id: string
    name: string
    filters: BroadcastFilters
    body: string
    recipient_count: number
    sent_count: number
    failed_count: number
    created_at: string
}

export async function getMessageTemplates(token: string, type?: MessageTemplateType): Promise<{ data: MessageTemplate[]; placeholders: string[] }> {
    const qs = new URLSearchParams()
    if (type) qs.set('type', type)
    return apiFetch(withQuery('/communications/templates', qs), { token })
}

export async function createMessageTemplate(token: string, data: MessageTemplateInput): Promise<MessageTemplate> {
    return apiFetch<MessageTemplate>('/communications/templates', { method: 'POST', token, body: data })
}

export async function updateMessageTemplate(token: string, id: string, data: MessageTemplateInput): Promise<MessageTemplate> {
    return apiFetch<MessageTemplate>(apiPath`/communications/templates/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteMessageTemplate(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/communications/templates/${id}`, { method: 'DELETE', token })
}

export interface MessageDraft {
    customer_id: string
    policy_id?: string
    template_id?: string
    /** Text with {placeholders}; overrides the template body for this send. */
    body?: string
    message_type?: MessageType
}

export async function previewMessage(token: string, data: MessageDraft): Promise<{ message: string; message_type: MessageType; has_whatsapp: boolean }> {
    return apiFetch('/communications/preview', { method: 'POST', token, body: data })
}

export async function sendMessage(token: string, data: MessageDraft): Promise<{ message: string; log_id: string }> {
    return apiFetch('/communications/send', { method: 'POST', token, body: data, errorMessage: 'Gagal mengirim WhatsApp' })
}

export async function getMessageLog(token: string, params: MessageLogParams = {}): Promise<MessageLogResponse> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v))
    return apiFetch<MessageLogResponse>(withQuery('/communications/log', qs), { token })
}

export async function previewBroadcast(token: string, filters: BroadcastFilters): Promise<BroadcastPreview> {
    return apiFetch<BroadcastPreview>('/communications/broadcast/preview', { method: 'POST', token, body: { filters } })
}

export async function sendBroadcast(
    token: string,
    data: { name: string; filters: BroadcastFilters; template_id?: string; body?: string },
): Promise<{ broadcast_id: string; recipients: number; sent: number; failed: number }> {
    return apiFetch('/communications/broadcast', { method: 'POST', token, body: data })
}

export async function getBroadcasts(token: string): Promise<BroadcastRecord[]> {
    const res = await apiFetch<{ data: BroadcastRecord[] }>('/communications/broadcasts', { token })
    return res.data
}
