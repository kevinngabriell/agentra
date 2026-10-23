import { apiFetch, apiPath, withQuery } from "@/lib/api/client"

export type ApiClaimStatus = 'reported' | 'survey' | 'documents_complete' | 'approved' | 'rejected' | 'paid'

export const CLAIM_STATUSES: ApiClaimStatus[] = ['reported', 'survey', 'documents_complete', 'approved', 'rejected', 'paid']

export const CLAIM_STATUS_LABELS: Record<ApiClaimStatus, string> = {
    reported:           'Dilaporkan',
    survey:             'Survei',
    documents_complete: 'Dokumen Lengkap',
    approved:           'Disetujui',
    rejected:           'Ditolak',
    paid:               'Dibayar',
}

export const CLAIM_STATUS_COLORS: Record<ApiClaimStatus, { bg: string; color: string }> = {
    reported:           { bg: '#FEF3C7', color: '#B45309' },
    survey:             { bg: '#CFFAFE', color: '#0E7490' },
    documents_complete: { bg: '#DBEAFE', color: '#1D4ED8' },
    approved:           { bg: '#DCFCE7', color: '#16A34A' },
    rejected:           { bg: '#FEE2E2', color: '#DC2626' },
    paid:               { bg: '#E0E7FF', color: '#4338CA' },
}

/** Mirrors CLAIM_TRANSITIONS in the API (helpers/claims.php). */
export const CLAIM_TRANSITIONS: Record<ApiClaimStatus, ApiClaimStatus[]> = {
    reported:           ['survey', 'documents_complete', 'rejected'],
    survey:             ['documents_complete', 'rejected'],
    documents_complete: ['approved', 'rejected'],
    approved:           ['paid'],
    rejected:           ['documents_complete'],
    paid:               [],
}

export type ApiClaimFollowUpChannel = 'whatsapp' | 'phone' | 'email' | 'in_person' | 'insurer'

export const CLAIM_CHANNEL_LABELS: Record<ApiClaimFollowUpChannel, string> = {
    whatsapp:  'WhatsApp',
    phone:     'Telepon',
    email:     'Email',
    in_person: 'Tatap muka',
    insurer:   'Pihak asuransi',
}

export interface ApiClaim {
    claim_id: string
    claim_number: string
    insurer_claim_number: string | null
    policy_id: string
    policy_number: string
    product_type: string
    object_insured: string | null
    coverage_start: string
    coverage_end: string
    premium_amount: number
    sum_insured: number
    insurer_id: string
    insurer_name: string | null
    insurer_short_name: string | null
    customer_id: string
    customer_name: string
    customer_type: 'individual' | 'company'
    date_of_loss: string
    reported_date: string
    cause: string
    loss_location: string | null
    description: string | null
    estimated_loss: number
    deductible: number
    approved_amount: number | null
    settlement_amount: number | null
    payment_date: string | null
    status: ApiClaimStatus
    status_label: string
    status_changed_at: string
    surveyor_name: string | null
    survey_date: string | null
    rejection_reason: string | null
    created_by: string
    created_by_name: string | null
    created_at: string
    updated_at: string
    /** Required checklist items for the product, and how many of them have a document. */
    docs_required: number
    docs_provided: number
}

export interface ApiClaimChecklistItem {
    key: string
    label: string
    required: boolean
    provided: boolean
}

export type ApiClaimEventType = 'registered' | 'status_changed' | 'followup' | 'note' | 'updated' | 'document_uploaded' | 'document_deleted'

export interface ApiClaimEvent {
    event_id: string
    event_type: ApiClaimEventType
    from_status: ApiClaimStatus | null
    to_status: ApiClaimStatus | null
    channel: ApiClaimFollowUpChannel | null
    description: string | null
    event_date: string
    created_by: string
    created_by_name: string | null
    created_at: string
}

export interface ApiClaimDetail extends ApiClaim {
    checklist: ApiClaimChecklistItem[]
    events: ApiClaimEvent[]
}

export interface ClaimsListResponse {
    data: ApiClaim[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export interface ClaimListParams {
    /** A status, or 'open' for everything still in progress. */
    status?: ApiClaimStatus | 'open' | ''
    insurer_id?: string
    product_type?: string
    customer_id?: string
    policy_id?: string
    params?: string
    page?: number
    limit?: number
    signal?: AbortSignal
}

export async function getClaims(token: string, filters: ClaimListParams = {}): Promise<ClaimsListResponse> {
    const qs = new URLSearchParams()
    for (const key of ['status', 'insurer_id', 'product_type', 'customer_id', 'policy_id', 'params', 'page', 'limit'] as const) {
        const v = filters[key]
        if (v !== undefined && v !== '') qs.set(key, String(v))
    }
    return apiFetch<ClaimsListResponse>(withQuery('/claims', qs), { token, signal: filters.signal })
}

export interface ClaimSummary {
    total: number
    open: number
    by_status: Record<ApiClaimStatus, number>
    pending_documents: number
    open_estimated: number
    approved_unpaid: number
    paid_total: number
}

export async function getClaimSummary(token: string): Promise<ClaimSummary> {
    return apiFetch<ClaimSummary>('/claims/summary', { token })
}

export interface ClaimStats {
    claim_count: number
    open_count: number
    rejected_count: number
    paid_count: number
    estimated_total: number
    /** Settlement for paid claims, approved amount for approved ones. */
    incurred_total: number
    settled_total: number
    premium_total: number
    /** incurred ÷ premium × 100; null when there is no premium. */
    claim_ratio: number | null
    last_claim_date: string | null
}

export async function getClaimStats(token: string, scope: { customer_id?: string; policy_id?: string }): Promise<ClaimStats> {
    const qs = new URLSearchParams()
    if (scope.customer_id) qs.set('customer_id', scope.customer_id)
    if (scope.policy_id) qs.set('policy_id', scope.policy_id)
    return apiFetch<ClaimStats>(withQuery('/claims/stats', qs), { token })
}

export async function getClaimDetail(token: string, claimId: string): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}`, { token })
}

export interface CreateClaimPayload {
    policy_id: string
    date_of_loss: string
    cause: string
    loss_location?: string
    description?: string
    estimated_loss?: number
    deductible?: number
    reported_date?: string
    insurer_claim_number?: string
}

export async function createClaim(token: string, payload: CreateClaimPayload): Promise<ApiClaim> {
    return apiFetch<ApiClaim>('/claims', { method: 'POST', body: payload, token, errorMessage: 'Gagal mendaftarkan klaim' })
}

export interface UpdateClaimPayload {
    cause?: string
    loss_location?: string
    description?: string
    insurer_claim_number?: string
    surveyor_name?: string
    survey_date?: string | null
    estimated_loss?: number
    deductible?: number
    date_of_loss?: string
    reported_date?: string
    approved_amount?: number
}

export async function updateClaim(token: string, claimId: string, payload: UpdateClaimPayload): Promise<ApiClaim> {
    return apiFetch<ApiClaim>(apiPath`/claims/${claimId}`, { method: 'PUT', body: payload, token })
}

export interface ChangeClaimStatusPayload {
    status: ApiClaimStatus
    note?: string
    insurer_claim_number?: string
    surveyor_name?: string
    survey_date?: string
    approved_amount?: number
    deductible?: number
    rejection_reason?: string
    settlement_amount?: number
    payment_date?: string
}

export async function changeClaimStatus(token: string, claimId: string, payload: ChangeClaimStatusPayload): Promise<ApiClaim> {
    return apiFetch<ApiClaim>(apiPath`/claims/${claimId}/status`, { method: 'PUT', body: payload, token })
}

export interface AddClaimEventPayload {
    description: string
    event_type?: 'followup' | 'note'
    channel?: ApiClaimFollowUpChannel
    event_date?: string
}

/** Adds a follow-up or note; resolves to the refreshed claim. */
export async function addClaimEvent(token: string, claimId: string, payload: AddClaimEventPayload): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/events`, { method: 'POST', body: payload, token })
}

export async function deleteClaim(token: string, claimId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/claims/${claimId}`, { method: 'DELETE', token })
}
