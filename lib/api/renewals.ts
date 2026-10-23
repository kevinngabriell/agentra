import { apiFetch, apiFetchOr, apiPath, withQuery } from "./client"

export type RenewalStage = 'not_started' | 'terms_requested' | 'terms_received' | 'offered' | 'accepted' | 'declined' | 'issued'
export type RenewalLostReason = 'price' | 'competitor' | 'service' | 'no_longer_needed' | 'asset_sold' | 'no_response' | 'other'

export const RENEWAL_STAGE_LABELS: Record<RenewalStage, string> = {
    not_started:     'Belum dimulai',
    terms_requested: 'Minta ketentuan',
    terms_received:  'Ketentuan diterima',
    offered:         'Ditawarkan',
    accepted:        'Disetujui',
    declined:        'Ditolak',
    issued:          'Terbit',
}

export const RENEWAL_STAGE_COLORS: Record<RenewalStage, { bg: string; color: string }> = {
    not_started:     { bg: '#F1F5F9', color: '#64748B' },
    terms_requested: { bg: '#EFF6FF', color: '#1D4ED8' },
    terms_received:  { bg: '#E0F2FE', color: '#0369A1' },
    offered:         { bg: '#FEF3C7', color: '#B45309' },
    accepted:        { bg: '#DCFCE7', color: '#15803D' },
    declined:        { bg: '#FEE2E2', color: '#DC2626' },
    issued:          { bg: '#16A34A', color: '#FFFFFF' },
}

/** The stages shown as the progress line, in order. 'declined' is a side exit. */
export const RENEWAL_STAGE_FLOW: RenewalStage[] = ['terms_requested', 'terms_received', 'offered', 'accepted', 'issued']

export const RENEWAL_LOST_REASON_LABELS: Record<RenewalLostReason, string> = {
    price:            'Harga terlalu mahal',
    competitor:       'Pindah ke pesaing',
    service:          'Tidak puas dengan layanan',
    no_longer_needed: 'Tidak lagi dibutuhkan',
    asset_sold:       'Objek dijual / tidak dimiliki lagi',
    no_response:      'Tidak ada respons',
    other:            'Lainnya',
}

export interface ApiRenewal {
    policy_id: string
    policy_number: string
    product_type: string
    coverage_end: string
    renewal_status: string
    payment_status: string
    premium_amount: number
    commission_amount: number
    days_until_expiry: number
    customer_name: string
    customer_whatsapp: string
    insurer_name: string
    last_follow_up_status: string | null
    last_follow_up_date: string | null
    /** Claims filed on this policy, and what they cost the insurer (approved or paid). */
    claim_count: number
    claims_incurred: number
    /** Where the renewal quote workflow stands; 'not_started' when nobody has begun. */
    workflow_stage: RenewalStage
    lost_reason: RenewalLostReason | null
}

export interface RenewalsListResponse {
    month: string
    data: ApiRenewal[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface RenewalStatsBreakdownItem {
    count: number
    pct: number
}

export interface RenewalStatsResponse {
    month: string
    total: number
    achieved_omzet: number
    total_omzet_potential: number
    /** Why renewals were lost this month, from the workflow: reason -> count. */
    lost_reasons: Partial<Record<RenewalLostReason, number>>
    breakdown: {
        renewed: RenewalStatsBreakdownItem
        in_progress: RenewalStatsBreakdownItem
        lapsed: RenewalStatsBreakdownItem
        cancelled: RenewalStatsBreakdownItem
    }
}

/** Optional narrowing shared by the renewal list, stats and calendar. `sub_agent_id: 'main'` = the main agent. */
export interface RenewalFilters {
    insurer_id?: string
    product_type?: string
    sub_agent_id?: string
}

function applyFilters(qs: URLSearchParams, f: RenewalFilters) {
    if (f.insurer_id) qs.set('insurer_id', f.insurer_id)
    if (f.product_type) qs.set('product_type', f.product_type)
    if (f.sub_agent_id) qs.set('sub_agent_id', f.sub_agent_id)
}

export interface RenewalsListParams extends RenewalFilters {
    month?: string
    renewal_status?: string
    workflow_stage?: RenewalStage
    page?: number
    limit?: number
}

export interface RenewalCalendarItem {
    policy_id: string
    policy_number: string
    product_type: string
    coverage_end: string
    renewal_status: 'pending' | 'renewed' | 'lapsed' | 'cancelled'
    premium_amount: number
    days_until_expiry: number
    customer_name: string | null
    insurer_name: string | null
    workflow_stage: RenewalStage
}

export async function getRenewalCalendar(
    token: string,
    month: string,
    filters: RenewalFilters = {},
    signal?: AbortSignal,
): Promise<RenewalCalendarItem[]> {
    const qs = new URLSearchParams({ month })
    applyFilters(qs, filters)
    const res = await apiFetchOr<{ data: RenewalCalendarItem[] }>(withQuery('/renewals/calendar', qs), { token, signal }, { data: [] })
    return res.data ?? []
}


export async function getRenewals(
    token: string,
    params: RenewalsListParams = {},
): Promise<RenewalsListResponse> {
    const qs = new URLSearchParams()
    if (params.month) qs.set('month', params.month)
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)
    if (params.workflow_stage) qs.set('workflow_stage', params.workflow_stage)
    applyFilters(qs, params)
    const page = params.page ?? 1
    const limit = params.limit ?? 100
    qs.set('page', String(page))
    qs.set('limit', String(limit))

    // 404 = no renewals in that month.
    return apiFetchOr<RenewalsListResponse>(withQuery('/renewals', qs), { token }, {
        month: params.month ?? '',
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

export async function getRenewalStats(
    token: string,
    month?: string,
    filters: RenewalFilters = {},
): Promise<RenewalStatsResponse> {
    const qs = new URLSearchParams()
    if (month) qs.set('month', month)
    applyFilters(qs, filters)
    return apiFetch<RenewalStatsResponse>(withQuery('/renewals/stats', qs), { token })
}

export interface SendRenewalWhatsappResult {
    message: string
    followup_id: string
}

export async function sendRenewalWhatsapp(
    token: string,
    policyId: string,
    message?: string,
): Promise<SendRenewalWhatsappResult> {
    return apiFetch<SendRenewalWhatsappResult>(apiPath`/renewals/${policyId}/send-whatsapp`, {
        method: 'POST',
        token,
        body: message !== undefined ? { message } : {},
        errorMessage: 'Gagal mengirim WhatsApp',
    })
}

export interface RenewalWorkflow {
    policy: {
        policy_id: string
        policy_number: string
        product_type: string
        policy_year: number
        insurer_id: string
        insurer_name: string | null
        customer_id: string
        customer_name: string | null
        coverage_start: string
        coverage_end: string
        days_until_expiry: number
        renewal_status: 'pending' | 'renewed' | 'lapsed' | 'cancelled'
        sum_insured: number
        premium_amount: number
        commission_rate: number
        /** Line items copied to the renewal; when > 0 the renewal premium and sum insured are derived from them. */
        coverage_items: number
        terms: { term_type: 'deductible' | 'clause' | 'extension'; title: string }[]
    }
    workflow: {
        stage: RenewalStage
        stage_changed_at: string | null
        insurer_reference: string | null
        new_sum_insured: number | null
        new_premium: number | null
        new_commission_rate: number | null
        new_terms_notes: string | null
        sum_insured_reviewed: boolean
        review_note: string | null
        lost_reason: RenewalLostReason | null
        lost_note: string | null
        renewed_policy_id: string | null
    }
    allowed_next: RenewalStage[]
    /** Set for products whose sum insured goes stale (vehicle value, property value). */
    review_kind: 'vehicle_depreciation' | 'property_values' | null
    events: { from_stage: RenewalStage; to_stage: RenewalStage; note: string | null; created_by: string; created_at: string }[]
}

export interface RenewalWorkflowTerms {
    insurer_reference?: string | null
    new_sum_insured?: number | null
    new_premium?: number | null
    new_commission_rate?: number | null
    new_terms_notes?: string | null
    sum_insured_reviewed?: boolean
    review_note?: string | null
}

export async function getRenewalWorkflow(token: string, policyId: string): Promise<RenewalWorkflow> {
    return apiFetch<RenewalWorkflow>(apiPath`/renewals/${policyId}/workflow`, { token })
}

export async function updateRenewalWorkflow(token: string, policyId: string, data: RenewalWorkflowTerms): Promise<RenewalWorkflow> {
    return apiFetch<RenewalWorkflow>(apiPath`/renewals/${policyId}/workflow`, { method: 'PUT', token, body: data })
}

export async function changeRenewalStage(
    token: string,
    policyId: string,
    data: { stage: RenewalStage; note?: string; lost_reason?: RenewalLostReason; lost_note?: string },
): Promise<RenewalWorkflow> {
    return apiFetch<RenewalWorkflow>(apiPath`/renewals/${policyId}/workflow/stage`, { method: 'PUT', token, body: data })
}
