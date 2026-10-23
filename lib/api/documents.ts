import { apiFetch, apiPath, withQuery } from "@/lib/api/client"

export type ApiDocumentType =
    | 'policy' | 'endorsement' | 'sppa'
    | 'ktp' | 'npwp' | 'nib' | 'akta_pendirian'
    | 'survey_photo' | 'claim' | 'payment_proof' | 'other'

export const DOCUMENT_TYPE_LABELS: Record<ApiDocumentType, string> = {
    policy:         'Polis',
    endorsement:    'Endorsemen',
    sppa:           'SPPA',
    ktp:            'KTP',
    npwp:           'NPWP',
    nib:            'NIB',
    akta_pendirian: 'Akta Pendirian',
    survey_photo:   'Foto Survei',
    claim:          'Dokumen Klaim',
    payment_proof:  'Bukti Bayar',
    other:          'Lainnya',
}

/** KYC (APU-PPT) document types — mirrors DOC_KYC_REQUIRED in the API. */
export const KYC_DOCUMENT_TYPES: ApiDocumentType[] = ['ktp', 'npwp', 'nib', 'akta_pendirian']

export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png'
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export type ApiDocumentStatus = 'active' | 'archived'

export interface ApiDocument {
    document_id: string
    customer_id: string
    customer_name: string
    customer_type: 'individual' | 'company'
    policy_id: string | null
    policy_number: string | null
    product_type: string | null
    coverage_end: string | null
    insurer_id: string | null
    insurer_short_name: string | null
    claim_id: string | null
    /** Claim checklist item this file satisfies (see ApiClaimChecklistItem.key); null = additional document. */
    claim_requirement: string | null
    document_type: ApiDocumentType
    title: string | null
    notes: string | null
    document_year: number
    file_name: string
    mime_type: string
    file_size: number
    status: ApiDocumentStatus
    archived_at: string | null
    archive_reason: string | null
    uploaded_by: string
    uploaded_by_name: string | null
    uploaded_at: string
    /** The linked policy has ended — the document can be archived but not deleted. */
    policy_expired: boolean
}

export interface DocumentsListResponse {
    data: ApiDocument[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export interface DocumentListParams {
    customer_id?: string
    policy_id?: string
    claim_id?: string
    insurer_id?: string
    document_type?: ApiDocumentType | ''
    year?: number | ''
    /** Defaults to 'active' on the API. */
    status?: ApiDocumentStatus | 'all'
    params?: string
    page?: number
    limit?: number
    signal?: AbortSignal
}

export async function getDocuments(token: string, filters: DocumentListParams = {}): Promise<DocumentsListResponse> {
    const qs = new URLSearchParams()
    for (const key of ['customer_id', 'policy_id', 'claim_id', 'insurer_id', 'document_type', 'year', 'status', 'params', 'page', 'limit'] as const) {
        const v = filters[key]
        if (v !== undefined && v !== '') qs.set(key, String(v))
    }
    return apiFetch<DocumentsListResponse>(withQuery('/documents', qs), { token, signal: filters.signal })
}

export interface DocumentSummary {
    total: number
    active: number
    archived: number
    by_type: Partial<Record<ApiDocumentType, number>>
    years: number[]
    /** Active documents whose policy has ended — candidates for archiving. */
    expired_policy_active: number
    kyc_incomplete: number
}

export async function getDocumentSummary(token: string): Promise<DocumentSummary> {
    return apiFetch<DocumentSummary>('/documents/summary', { token })
}

export interface UploadDocumentPayload {
    file: File
    document_type: ApiDocumentType
    /** At least one of customer_id / policy_id / claim_id. With a policy or claim, the customer is taken from it. */
    customer_id?: string
    policy_id?: string
    claim_id?: string
    /** Claim checklist key; only with claim_id. */
    claim_requirement?: string
    title?: string
    notes?: string
    document_year?: number
}

export async function uploadDocument(token: string, payload: UploadDocumentPayload): Promise<ApiDocument> {
    const form = new FormData()
    form.append('file', payload.file)
    form.append('document_type', payload.document_type)
    if (payload.customer_id) form.append('customer_id', payload.customer_id)
    if (payload.policy_id) form.append('policy_id', payload.policy_id)
    if (payload.claim_id) form.append('claim_id', payload.claim_id)
    if (payload.claim_requirement) form.append('claim_requirement', payload.claim_requirement)
    if (payload.title) form.append('title', payload.title)
    if (payload.notes) form.append('notes', payload.notes)
    if (payload.document_year) form.append('document_year', String(payload.document_year))
    return apiFetch<ApiDocument>('/documents', { method: 'POST', body: form, token, errorMessage: 'Gagal mengunggah dokumen' })
}

export interface UpdateDocumentPayload {
    document_type?: ApiDocumentType
    title?: string
    notes?: string
    document_year?: number
}

export async function updateDocument(token: string, documentId: string, payload: UpdateDocumentPayload): Promise<ApiDocument> {
    return apiFetch<ApiDocument>(apiPath`/documents/${documentId}`, { method: 'PUT', body: payload, token })
}

export interface DocumentUrl {
    url: string
    expires_in: number
    mime_type: string
    file_name: string
}

/** Short-lived (5 min) signed link. 'inline' previews in the browser; 'attachment' downloads. */
export async function getDocumentUrl(token: string, documentId: string, disposition: 'inline' | 'attachment' = 'inline'): Promise<DocumentUrl> {
    const qs = new URLSearchParams({ disposition })
    return apiFetch<DocumentUrl>(withQuery(apiPath`/documents/${documentId}/url`, qs), { token })
}

export async function archiveDocument(token: string, documentId: string, reason?: string): Promise<ApiDocument> {
    return apiFetch<ApiDocument>(apiPath`/documents/${documentId}/archive`, { method: 'PUT', body: { reason: reason ?? '' }, token })
}

export async function unarchiveDocument(token: string, documentId: string): Promise<ApiDocument> {
    return apiFetch<ApiDocument>(apiPath`/documents/${documentId}/unarchive`, { method: 'PUT', token })
}

export async function archiveExpiredDocuments(token: string): Promise<{ archived: number }> {
    return apiFetch<{ archived: number }>('/documents/archive-expired', { method: 'POST', token })
}

/** Soft delete. Refused (409) for archived documents and documents of expired policies. */
export async function deleteDocument(token: string, documentId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/documents/${documentId}`, { method: 'DELETE', token })
}

// ── KYC (APU-PPT) ────────────────────────────────────────────────────────────

export interface ApiCustomerKyc {
    customer_id: string
    display_name: string
    customer_type: 'individual' | 'company'
    status: string
    required: ApiDocumentType[]
    present: ApiDocumentType[]
    missing: ApiDocumentType[]
    complete: boolean
}

export interface KycListResponse {
    data: ApiCustomerKyc[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export async function getKycList(
    token: string,
    filters: { kyc?: 'incomplete' | 'complete' | 'all'; params?: string; page?: number; limit?: number; signal?: AbortSignal } = {},
): Promise<KycListResponse> {
    const qs = new URLSearchParams()
    if (filters.kyc) qs.set('kyc', filters.kyc)
    if (filters.params) qs.set('params', filters.params)
    qs.set('page', String(filters.page ?? 1))
    qs.set('limit', String(filters.limit ?? 20))
    return apiFetch<KycListResponse>(withQuery('/documents/kyc', qs), { token, signal: filters.signal })
}

export async function getCustomerKyc(token: string, customerId: string): Promise<ApiCustomerKyc> {
    return apiFetch<ApiCustomerKyc>(apiPath`/documents/kyc/${customerId}`, { token })
}
