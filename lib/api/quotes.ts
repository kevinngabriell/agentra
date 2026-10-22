import { apiFetch, apiPath, withQuery } from "./client"
import type { ApiProspect } from "./prospects"

// Quotes with insurer options to compare. Mirrors quotes/index.php.

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
    draft:    'Draf',
    sent:     'Terkirim',
    accepted: 'Diterima',
    declined: 'Ditolak',
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, { bg: string; color: string }> = {
    draft:    { bg: '#F1F5F9', color: '#475569' },
    sent:     { bg: '#DBEAFE', color: '#1D4ED8' },
    accepted: { bg: '#DCFCE7', color: '#16A34A' },
    declined: { bg: '#FEE2E2', color: '#DC2626' },
}

/** Mirrors QUOTE_TRANSITIONS in the API (helpers/sales.php). Accepting goes through acceptQuote. */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
    draft:    ['sent'],
    sent:     ['draft', 'declined'],
    accepted: [],
    declined: ['draft'],
}

export interface QuoteOption {
    option_id: string
    insurer_id: string
    insurer_name: string | null
    insurer_short_name: string | null
    rate_permille: number | null
    premium_amount: number
    biaya_polis: number
    materai_amount: number
    /** premium + biaya polis + materai */
    total_amount: number
    deductible_note: string | null
    terms_note: string | null
    sort_order: number
}

export interface ApiQuote {
    quote_id: string
    quote_number: string
    prospect_id: string
    prospect_name: string
    prospect_whatsapp: string | null
    prospect_type: ApiProspect['prospect_type']
    /** Set once the prospect was converted. */
    customer_id: string | null
    product_type: string
    object_description: string | null
    sum_insured: number
    coverage_start: string | null
    coverage_end: string | null
    valid_until: string | null
    status: QuoteStatus
    /** A sent quote past valid_until. */
    is_expired: boolean
    sent_at: string | null
    accepted_option_id: string | null
    policy_id: string | null
    policy_number: string | null
    notes: string | null
    created_by_name: string | null
    option_count: number
    lowest_premium: number | null
    created_at: string
    updated_at: string
}

export interface ApiQuoteDetail extends ApiQuote {
    options: QuoteOption[]
}

export interface QuoteOptionPayload {
    insurer_id: string
    rate_permille?: number | null
    /** Omit to compute sum insured × rate ÷ 1000. */
    premium_amount?: number | null
    biaya_polis?: number
    materai_amount?: number
    deductible_note?: string | null
    terms_note?: string | null
}

export interface QuotePayload {
    prospect_id?: string
    product_type: string
    object_description?: string | null
    sum_insured: number
    coverage_start?: string | null
    coverage_end?: string | null
    valid_until?: string | null
    notes?: string | null
    options?: QuoteOptionPayload[]
}

export interface QuoteListParams {
    status?: QuoteStatus | ''
    prospect_id?: string
    product_type?: string
    params?: string
    page?: number
    limit?: number
}

export interface QuotesListResponse {
    data: ApiQuote[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export async function getQuotes(token: string, filters: QuoteListParams = {}): Promise<QuotesListResponse> {
    const qs = new URLSearchParams()
    for (const key of ['status', 'prospect_id', 'product_type', 'params', 'page', 'limit'] as const) {
        const v = filters[key]
        if (v !== undefined && v !== '') qs.set(key, String(v))
    }
    return apiFetch<QuotesListResponse>(withQuery('/quotes', qs), { token })
}

export async function getQuote(token: string, id: string): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(apiPath`/quotes/${id}`, { token })
}

export async function createQuote(token: string, data: QuotePayload & { prospect_id: string }): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>('/quotes', { method: 'POST', token, body: data })
}

export async function updateQuote(token: string, id: string, data: QuotePayload): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(apiPath`/quotes/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteQuote(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/quotes/${id}`, { method: 'DELETE', token })
}

export async function changeQuoteStatus(token: string, id: string, status: Exclude<QuoteStatus, 'accepted'>): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(apiPath`/quotes/${id}/status`, { method: 'PUT', token, body: { status } })
}

export async function acceptQuote(token: string, id: string, optionId: string): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(apiPath`/quotes/${id}/accept`, { method: 'POST', token, body: { option_id: optionId } })
}

/** Records the policy issued from an accepted quote. */
export async function linkQuotePolicy(token: string, id: string, policyId: string): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(apiPath`/quotes/${id}/policy`, { method: 'POST', token, body: { policy_id: policyId } })
}
