import { apiFetch, apiPath, withQuery } from "@/lib/api/client"

export type ApiClaimStatus = 'reported' | 'survey' | 'documents_complete' | 'approved' | 'partially_paid' | 'paid' | 'rejected' | 'appeal' | 'withdrawn'

export const CLAIM_STATUSES: ApiClaimStatus[] = ['reported', 'survey', 'documents_complete', 'approved', 'partially_paid', 'paid', 'rejected', 'appeal', 'withdrawn']

export const CLAIM_STATUS_LABELS: Record<ApiClaimStatus, string> = {
    reported:           'Dilaporkan',
    survey:             'Survei',
    documents_complete: 'Dokumen Lengkap',
    approved:           'Disetujui',
    partially_paid:     'Dibayar Sebagian',
    paid:               'Dibayar',
    rejected:           'Ditolak',
    appeal:             'Banding',
    withdrawn:          'Dicabut',
}

export const CLAIM_STATUS_COLORS: Record<ApiClaimStatus, { bg: string; color: string }> = {
    reported:           { bg: '#FEF3C7', color: '#B45309' },
    survey:             { bg: '#CFFAFE', color: '#0E7490' },
    documents_complete: { bg: '#DBEAFE', color: '#1D4ED8' },
    approved:           { bg: '#DCFCE7', color: '#16A34A' },
    partially_paid:     { bg: '#EDE9FE', color: '#6D28D9' },
    paid:               { bg: '#E0E7FF', color: '#4338CA' },
    rejected:           { bg: '#FEE2E2', color: '#DC2626' },
    appeal:             { bg: '#FFEDD5', color: '#C2410C' },
    withdrawn:          { bg: '#F1F5F9', color: '#64748B' },
}

/** Mirrors CLAIM_TRANSITIONS in the API (helpers/claims.php). */
export const CLAIM_TRANSITIONS: Record<ApiClaimStatus, ApiClaimStatus[]> = {
    reported:           ['survey', 'documents_complete', 'rejected', 'withdrawn'],
    survey:             ['documents_complete', 'rejected', 'withdrawn'],
    documents_complete: ['approved', 'rejected', 'withdrawn'],
    // partially_paid / paid after approval are reached by recording payments (claim payments panel).
    approved:           ['paid'],
    partially_paid:     [],
    paid:               ['survey', 'documents_complete'],
    rejected:           ['documents_complete', 'appeal'],
    appeal:             ['approved', 'rejected'],
    withdrawn:          ['reported'],
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
    // [v2.1.0] Large-loss fields
    currency: string
    exchange_rate: number
    estimated_loss_fc: number | null
    coverage_id: string | null
    coverage_type: string | null
    coverage_label: string | null
    coverage_sum_insured: number | null
    claim_type: 'partial' | 'total_loss'
    value_at_risk: number | null
    salvage_amount: number
    adjuster_firm: string | null
    adjuster_name: string | null
    adjuster_appointed_date: string | null
    prelim_report_date: string | null
    final_report_date: string | null
    workshop_name: string | null
    spk_date: string | null
    own_risk_paid_date: string | null
    repair_status: RepairStatus | null
    vehicle_handover_date: string | null
    bpkb_handover_date: string | null
    notice_deadline: string | null
    docs_deadline: string | null
    decision_due: string | null
    payment_due: string | null
}

export type RepairStatus = 'not_started' | 'in_repair' | 'ready' | 'handed_over'
export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
    not_started: 'Belum masuk bengkel', in_repair: 'Dalam perbaikan', ready: 'Selesai, siap diambil', handed_over: 'Sudah diserahkan',
}

export type ReserveSource = 'initial' | 'insured' | 'adjuster_prelim' | 'adjuster_final' | 'insurer' | 'agent'
export const RESERVE_SOURCE_LABELS: Record<ReserveSource, string> = {
    initial: 'Estimasi awal', insured: 'Tertanggung', adjuster_prelim: 'Laporan awal adjuster',
    adjuster_final: 'Laporan akhir adjuster', insurer: 'Asuransi', agent: 'Agen',
}

export interface ClaimReserve { reserve_id: string; reserve_date: string; amount: number; source: ReserveSource; source_label: string; note: string | null }
export interface ClaimPayment { payment_id: string; payment_date: string; amount: number; payment_type: 'interim' | 'final'; payer_name: string | null; reference: string | null; note: string | null }
export interface ClaimRecovery { recovery_id: string; recovery_type: 'salvage' | 'subrogation' | 'other'; party: string | null; amount: number; recovery_date: string | null; returned_to_insured: number; note: string | null }

export interface ClaimSettlement {
    gross_loss: number
    sum_insured: number
    value_at_risk: number | null
    average_applies: boolean
    average_factor: number
    underinsurance_cut: number
    after_average: number
    deductible_suggested: number
    deductible_term: string | null
    deductible_used: number
    deductible_source: 'claim' | 'policy_terms' | 'none'
    deductible_on_claim: number
    deductible_differs: boolean
    salvage: number
    net_payable: number
    approved_amount: number | null
    difference_vs_approved: number | null
    paid_to_date: number
    outstanding: number
}

export interface CoinsuranceSplitRow { co_insurer_name: string; share_percent: number; is_leader: boolean; share_amount: number; paid_amount: number; outstanding: number }
export interface ClaimDeadline { key: string; label: string; date: string | null; days_left: number | null; state: 'met' | 'overdue' | 'due' | 'not_set' | 'closed' }

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
    reserves: ClaimReserve[]
    payments: ClaimPayment[]
    recoveries: ClaimRecovery[]
    recovered_total: number
    settlement: ClaimSettlement
    coinsurance_split: CoinsuranceSplitRow[]
    deadlines: ClaimDeadline[]
    /** Line of business resolved from the product (motor, fire, travel, cargo, pa, default). */
    product_group: string
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

/** Fields added in v2.1.0, accepted on create and update. */
export interface ClaimExtraFields {
    coverage_id?: string | null
    claim_type?: 'partial' | 'total_loss'
    value_at_risk?: number | null
    salvage_amount?: number
    currency?: string
    exchange_rate?: number
    estimated_loss_fc?: number | null
    adjuster_firm?: string | null
    adjuster_name?: string | null
    adjuster_appointed_date?: string | null
    prelim_report_date?: string | null
    final_report_date?: string | null
    workshop_name?: string | null
    spk_date?: string | null
    own_risk_paid_date?: string | null
    repair_status?: RepairStatus | null
    vehicle_handover_date?: string | null
    bpkb_handover_date?: string | null
    notice_deadline?: string | null
    docs_deadline?: string | null
    decision_due?: string | null
    payment_due?: string | null
}

export interface CreateClaimPayload extends ClaimExtraFields {
    policy_id: string
    date_of_loss: string
    cause: string
    loss_location?: string
    description?: string
    estimated_loss?: number
    /** Leave out to take it from the policy's deductible terms. */
    deductible?: number
    reported_date?: string
    insurer_claim_number?: string
}

export async function createClaim(token: string, payload: CreateClaimPayload): Promise<ApiClaim> {
    return apiFetch<ApiClaim>('/claims', { method: 'POST', body: payload, token, errorMessage: 'Gagal mendaftarkan klaim' })
}

export interface UpdateClaimPayload extends ClaimExtraFields {
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

// ── [v2.1.0] Large-loss handling ─────────────────────────────────────────────

export interface DeductiblePreview {
    deductible: number
    term_title: string | null
    sum_insured: number
    average_applies: boolean
}

export async function getDeductiblePreview(token: string, policyId: string, coverageId: string | null, estimatedLoss: number): Promise<DeductiblePreview> {
    const qs = new URLSearchParams({ policy_id: policyId, estimated_loss: String(estimatedLoss) })
    if (coverageId) qs.set('coverage_id', coverageId)
    return apiFetch<DeductiblePreview>(withQuery('/claims/deductible-preview', qs), { token })
}

export async function addClaimReserve(token: string, claimId: string, data: { reserve_date?: string; amount: number; source: ReserveSource; note?: string }): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/reserves`, { method: 'POST', token, body: data })
}

export async function addClaimPayment(token: string, claimId: string, data: { payment_date: string; amount: number; payment_type: 'interim' | 'final'; payer_name?: string; reference?: string; note?: string }): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/payments`, { method: 'POST', token, body: data })
}

export async function deleteClaimPayment(token: string, claimId: string, paymentId: string): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/payments/${paymentId}`, { method: 'DELETE', token })
}

export async function addClaimRecovery(token: string, claimId: string, data: { recovery_type: ClaimRecovery['recovery_type']; party?: string; amount: number; recovery_date?: string; returned_to_insured?: number; note?: string }): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/recoveries`, { method: 'POST', token, body: data })
}

export async function deleteClaimRecovery(token: string, claimId: string, recoveryId: string): Promise<ApiClaimDetail> {
    return apiFetch<ApiClaimDetail>(apiPath`/claims/${claimId}/recoveries/${recoveryId}`, { method: 'DELETE', token })
}

/** Cause suggestions per line of business, so the right checklist comes up. */
export const CAUSE_SUGGESTIONS_BY_GROUP: Record<'motor' | 'fire' | 'travel' | 'cargo' | 'pa' | 'default', string[]> = {
    motor:   ['Tabrakan / kerusakan sebagian', 'Rusak total (total loss)', 'Kehilangan / pencurian', 'Tuntutan pihak ketiga', 'Banjir', 'Huru-hara'],
    fire:    ['Kebakaran', 'Petir', 'Ledakan', 'Banjir', 'Gempa bumi', 'Pencurian dengan kekerasan', 'Huru-hara'],
    travel:  ['Biaya medis di luar negeri', 'Bagasi hilang / rusak', 'Bagasi tertunda', 'Penerbangan tertunda (delay)', 'Pembatalan perjalanan'],
    cargo:   ['Barang rusak dalam pengiriman', 'Barang hilang / tidak sampai', 'Kapal / alat angkut kecelakaan'],
    pa:      ['Kecelakaan diri — rawat inap', 'Kecelakaan diri — cacat tetap', 'Kecelakaan diri — meninggal'],
    default: ['Kerusakan', 'Kehilangan / pencurian', 'Kebakaran', 'Banjir'],
}

/** Line of business of a product code, same keyword rules as the API (helpers/claims.php). */
export function claimProductGroup(productType: string): keyof typeof CAUSE_SUGGESTIONS_BY_GROUP {
    const p = productType.toLowerCase().trim()
    if (p === 'car') return 'motor'
    const map: [keyof typeof CAUSE_SUGGESTIONS_BY_GROUP, string[]][] = [
        ['cargo', ['cargo', 'marine', 'angkut']], ['motor', ['motor', 'mobil', 'kendaraan', 'otomotif']],
        ['fire', ['fire', 'kebakaran', 'property', 'properti']], ['travel', ['travel', 'perjalanan']],
        ['pa', ['kecelakaan', 'aep', 'accident', 'jiwa']],
    ]
    for (const [g, words] of map) if (words.some(w => p.includes(w))) return g
    return 'default'
}

