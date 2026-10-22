import { apiFetch, apiPath, withQuery } from "./client"

// Leads and competitor-held policies tracked as future leads. Mirrors prospects/index.php.

export type ProspectType = 'lead' | 'competitor_policy'
export type ProspectStage = 'new' | 'contacted' | 'quoted' | 'negotiating' | 'won' | 'lost'
export type ProspectSource = 'direct' | 'referral' | 'website' | 'event' | 'other'
export type LostReason = 'price' | 'competitor' | 'no_longer_needed' | 'no_response' | 'other'

export const PROSPECT_TYPE_LABELS: Record<ProspectType, string> = {
    lead:              'Prospek',
    competitor_policy: 'Polis di Tempat Lain',
}

export const PROSPECT_STAGES: ProspectStage[] = ['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost']

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
    new:         'Baru',
    contacted:   'Sudah Dihubungi',
    quoted:      'Sudah Ditawari',
    negotiating: 'Negosiasi',
    won:         'Menang',
    lost:        'Batal',
}

export const PROSPECT_STAGE_COLORS: Record<ProspectStage, { bg: string; color: string }> = {
    new:         { bg: '#F1F5F9', color: '#475569' },
    contacted:   { bg: '#DBEAFE', color: '#1D4ED8' },
    quoted:      { bg: '#CFFAFE', color: '#0E7490' },
    negotiating: { bg: '#FEF3C7', color: '#B45309' },
    won:         { bg: '#DCFCE7', color: '#16A34A' },
    lost:        { bg: '#FEE2E2', color: '#DC2626' },
}

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
    direct:  'Langsung',
    referral: 'Referral',
    website: 'Website',
    event:   'Event',
    other:   'Lainnya',
}

export const LOST_REASON_LABELS: Record<LostReason, string> = {
    price:            'Harga terlalu mahal',
    competitor:       'Memilih pesaing',
    no_longer_needed: 'Sudah tidak butuh',
    no_response:      'Tidak ada respons',
    other:            'Lainnya',
}

export interface ApiProspect {
    prospect_id: string
    prospect_type: ProspectType
    name: string
    contact_name: string | null
    phone: string | null
    whatsapp: string | null
    email: string | null
    source: ProspectSource
    referred_by_agent_id: string | null
    referred_by_agent_name: string | null
    product_interest: string | null
    expected_premium: number
    stage: ProspectStage
    lost_reason: LostReason | null
    lost_note: string | null
    stage_changed_at: string
    follow_up_date: string | null
    competitor_insurer: string | null
    competitor_policy_number: string | null
    competitor_expiry: string | null
    competitor_premium: number | null
    customer_id: string | null
    customer_name: string | null
    notes: string | null
    quote_count: number
    created_at: string
    updated_at: string
}

export interface ProspectListParams {
    prospect_type?: ProspectType
    /** A stage, or 'open' for everything not yet won or lost. */
    stage?: ProspectStage | 'open' | ''
    product_interest?: string
    source?: ProspectSource | ''
    /** Competitor policies expiring within this many days. */
    expiring_within?: number
    params?: string
    page?: number
    limit?: number
    signal?: AbortSignal
}

export interface ProspectsListResponse {
    data: ApiProspect[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export interface ProspectSummary {
    by_stage: Record<ProspectStage, number>
    open: number
    open_expected_premium: number
    /** Won / (won + lost) in percent, null until one is decided. */
    win_rate: number | null
    competitor_expiring_30: number
    competitor_expiring_90: number
    competitor_past_expiry: number
    lost_by_reason: Record<LostReason, number>
}

export type ProspectPayload = Partial<Pick<ApiProspect,
    'prospect_type' | 'name' | 'contact_name' | 'phone' | 'whatsapp' | 'email' | 'source' | 'referred_by_agent_id'
    | 'product_interest' | 'expected_premium' | 'follow_up_date' | 'competitor_insurer' | 'competitor_policy_number'
    | 'competitor_expiry' | 'competitor_premium' | 'notes'>>

export async function getProspects(token: string, filters: ProspectListParams = {}): Promise<ProspectsListResponse> {
    const qs = new URLSearchParams()
    for (const key of ['prospect_type', 'stage', 'product_interest', 'source', 'expiring_within', 'params', 'page', 'limit'] as const) {
        const v = filters[key]
        if (v !== undefined && v !== '') qs.set(key, String(v))
    }
    return apiFetch<ProspectsListResponse>(withQuery('/prospects', qs), { token, signal: filters.signal })
}

export async function getProspectSummary(token: string): Promise<ProspectSummary> {
    return apiFetch<ProspectSummary>('/prospects/summary', { token })
}

export async function getProspect(token: string, id: string): Promise<ApiProspect> {
    return apiFetch<ApiProspect>(apiPath`/prospects/${id}`, { token })
}

export async function createProspect(token: string, data: ProspectPayload): Promise<ApiProspect> {
    return apiFetch<ApiProspect>('/prospects', { method: 'POST', token, body: data })
}

export async function updateProspect(token: string, id: string, data: ProspectPayload): Promise<ApiProspect> {
    return apiFetch<ApiProspect>(apiPath`/prospects/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteProspect(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/prospects/${id}`, { method: 'DELETE', token })
}

export async function changeProspectStage(
    token: string,
    id: string,
    data: { stage: Exclude<ProspectStage, 'won'>; lost_reason?: LostReason; lost_note?: string | null },
): Promise<ApiProspect> {
    return apiFetch<ApiProspect>(apiPath`/prospects/${id}/stage`, { method: 'PUT', token, body: data })
}

/** Links the prospect to a customer and marks it won. */
export async function convertProspect(token: string, id: string, customerId: string): Promise<ApiProspect> {
    return apiFetch<ApiProspect>(apiPath`/prospects/${id}/convert`, { method: 'POST', token, body: { customer_id: customerId } })
}
