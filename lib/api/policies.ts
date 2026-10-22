import { apiDownload, apiFetch, apiFetchOr, apiPath, withQuery } from "./client"
import type { PolicyTermPayload } from "./policy-terms"
import type { ChangeInfo } from "./policy-change"
import type { RiskDetailsPayload } from "./risk-details"

export type ApiProductType = 'fire' | 'motorcycle' | 'car' | 'travel' | 'cargo' | 'other' | 'kecelakaan' | 'aep'
export type ApiRenewalStatus = 'pending' | 'renewed' | 'lapsed' | 'cancelled'
export type ApiPaymentStatus = 'unpaid' | 'paid' | 'confirmed'

export interface ApiPolicy {
    policy_id: string
    policy_number: string
    product_type: ApiProductType
    coverage_start: string
    coverage_end: string
    sum_insured: number
    premium_amount: number
    materai_amount: number
    biaya_polis: number
    diskon: number
    commission_rate: number
    commission_amount: number
    commission_tax_rate: number
    commission_tax_amount: number
    net_commission_amount: number
    customer_premium_amount: number
    is_coassurance: 0 | 1
    construction_class: ApiConstructionClass | null
    risk_address?: string | null
    risk_village?: string | null
    risk_district?: string | null
    risk_city?: string | null
    risk_province?: string | null
    risk_postal_code?: string | null
    risk_latitude?: number | null
    risk_longitude?: number | null
    renewal_status: ApiRenewalStatus
    payment_status: ApiPaymentStatus
    payment_due_date?: string | null
    payment_date?: string | null
    payment_reference?: string | null
    customer_id: string
    customer_name: string
    customer_type?: string
    insurer_id: string
    insurer_name: string
    insurer_short_name?: string
    object_insured?: string
    insured_name?: string | null
    notes?: string
    policy_year?: number
    // From policy_risk_details (list only); shown under the policy number and matched by the search box.
    plate_number?: string | null
    chassis_number?: string | null
    bl_awb_number?: string | null
}

export interface ApiFollowUp {
    follow_up_id: string
    follow_up_date: string
    action_type?: string
    notes?: string
    outcome?: string
    created_at?: string
}

export interface ApiPolicyDetail extends ApiPolicy {
    coverage_notes?: string
    issuing_agent_id?: string | null
    previous_policy_id?: string | null
    customer: {
        customer_id: string
        display_name: string
        customer_type: string
        personal_phone?: string
        personal_whatsapp?: string
        personal_email?: string
        personal_address?: string
        pic_name?: string
        pic_phone?: string
        pic_whatsapp?: string
    }
    insurer: {
        insurer_id: string
        name: string
        short_name: string
        agent_code?: string
    }
    follow_ups?: ApiFollowUp[]
    created_at?: string
    updated_at?: string
}

export interface PoliciesListResponse {
    data: ApiPolicy[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface PoliciesListParams {
    signal?: AbortSignal
    page?: number
    limit?: number
    search?: string
    customer_id?: string
    product_type?: ApiProductType
    insurer_id?: string
    renewal_status?: ApiRenewalStatus
    expiry_month?: string
    agent_id?: string
}

export type ApiConstructionClass = "I" | "II" | "III"

export interface CreatePolicyPayload {
    insurer_id: string
    customer_id: string
    policy_number: string
    product_type: ApiProductType
    coverage_start: string
    coverage_end: string
    // Required only when `coverages` is not sent — with `coverages`, both are derived
    // server-side from the items (and ignored if sent).
    sum_insured?: number
    premium_amount?: number
    // Item pertanggungan saved together with the policy. Logged only as `policy_created`,
    // never as an endorsement. All-or-nothing: a bad item returns 400 `coverages[<index>]: <reason>`.
    coverages?: AddCoveragePayload[]
    materai_amount?: number
    biaya_polis?: number
    diskon?: number
    // Optional: auto-resolved server-side from product type / policy number prefix.
    commission_rate?: number
    commission_tax_rate?: number
    construction_class?: ApiConstructionClass | null
    risk_address?: string | null
    risk_village?: string | null
    risk_district?: string | null
    risk_city?: string | null
    risk_province?: string | null
    risk_postal_code?: string | null
    risk_latitude?: number | null
    risk_longitude?: number | null
    policy_year?: number
    issuing_agent_id?: string
    previous_policy_id?: string
    object_insured?: string
    insured_name?: string | null
    coverage_notes?: string
    notes?: string
    // Product-specific risk details and travellers / insured people, saved with the policy.
    risk_details?: RiskDetailsPayload['risk_details']
    members?: RiskDetailsPayload['members']
    // Risiko sendiri / klausula / perluasan jaminan saved with the policy (not logged as endorsements).
    // `coverage_index` is the 0-based position in `coverages` the term applies to; omit for the whole policy.
    terms?: (PolicyTermPayload & { coverage_index?: number })[]
}

// ── Co-assurance ──────────────────────────────────────────────────────────────

export interface ApiCoassurance {
    coassurance_id: string
    policy_id: string
    co_insurer_id: string | null
    co_insurer_name: string
    co_insurer_short_name: string | null
    is_leader: 0 | 1
    share_percent: string
    sum_insured_share: number | null
    premium_share: number | null
    commission_rate: string
    commission_amount: number
    notes: string | null
    created_by?: string
    created_at?: string
    updated_at?: string
}

export interface AddCoassurancePayload {
    co_insurer_name: string
    co_insurer_id?: string
    is_leader?: boolean
    share_percent: number
    sum_insured_share?: number
    premium_share?: number
    commission_rate?: number
    notes?: string
}

export interface UpdateCoassurancePayload {
    co_insurer_name?: string
    co_insurer_id?: string | null
    is_leader?: boolean
    share_percent?: number
    sum_insured_share?: number
    premium_share?: number
    commission_rate?: number
    notes?: string
}

export async function getCoassurance(
    token: string,
    policyId: string,
): Promise<{ data: ApiCoassurance[] }> {
    return apiFetch<{ data: ApiCoassurance[] }>(apiPath`/policies/${policyId}/coassurance`, { token })
}

export async function addCoassuranceParticipant(
    token: string,
    policyId: string,
    data: AddCoassurancePayload,
): Promise<{ coassurance_id: string }> {
    return apiFetch<{ coassurance_id: string }>(apiPath`/policies/${policyId}/coassurance`, {
        method: 'POST', token, body: data,
    })
}

export async function updateCoassuranceParticipant(
    token: string,
    policyId: string,
    coassuranceId: string,
    data: UpdateCoassurancePayload,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/coassurance/${coassuranceId}`, {
        method: 'PUT', token, body: data,
    })
}

export async function removeCoassuranceParticipant(
    token: string,
    policyId: string,
    coassuranceId: string,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/coassurance/${coassuranceId}`, { method: 'DELETE', token })
}

export interface AddFollowUpPayload {
    follow_up_date?: string
    action_type?: string
    notes?: string
    outcome?: string
}

export interface PaymentSummaryParams {
    insurer_id: string
    month?: string
    payment_status?: 'all' | ApiPaymentStatus
}

export async function getPolicies(
    token: string,
    params: PoliciesListParams = {},
): Promise<PoliciesListResponse> {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (params.search) qs.set('search', params.search)
    if (params.customer_id) qs.set('customer_id', params.customer_id)
    if (params.product_type) qs.set('product_type', params.product_type)
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)
    if (params.expiry_month) qs.set('expiry_month', params.expiry_month)
    if (params.agent_id) qs.set('agent_id', params.agent_id)

    // 404 = no policies match the filter.
    return apiFetchOr<PoliciesListResponse>(withQuery('/policies', qs), { token, signal: params.signal }, {
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

export async function getPolicyDetail(token: string, policyId: string): Promise<ApiPolicyDetail> {
    return apiFetch<ApiPolicyDetail>(apiPath`/policies/${policyId}`, { token })
}

export async function createPolicy(
    token: string,
    data: CreatePolicyPayload,
): Promise<{ policy_id: string }> {
    return apiFetch<{ policy_id: string }>('/policies', { method: 'POST', token, body: data })
}

export async function updatePolicy(
    token: string,
    policyId: string,
    data: Partial<CreatePolicyPayload>,
    change?: Partial<ChangeInfo>,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}`, { method: 'PUT', token, body: { ...data, ...change } })
}

/** Corrects the agent's own input mistakes (no endorsement). `change.reason` is required by the API. */
export async function directUpdatePolicy(
    token: string,
    policyId: string,
    data: Partial<CreatePolicyPayload>,
    change?: Partial<ChangeInfo>,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}`, { method: 'PATCH', token, body: { ...data, ...change } })
}

export async function deletePolicy(
    token: string,
    policyId: string,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}`, { method: 'DELETE', token })
}

export interface RenewPolicyPayload {
    policy_number: string
    coverage_start?: string
    coverage_end?: string
    commission_rate?: number
    commission_tax_rate?: number
    insured_name?: string
    sum_insured?: number
    premium_amount?: number
    materai_amount?: number
    biaya_polis?: number
    diskon?: number
    object_insured?: string
    coverage_notes?: string
    construction_class?: ApiConstructionClass | null
    risk_address?: string | null
    risk_village?: string | null
    risk_district?: string | null
    risk_city?: string | null
    risk_province?: string | null
    risk_postal_code?: string | null
    risk_latitude?: number | null
    risk_longitude?: number | null
    notes?: string
}

export interface RenewPolicyResult {
    policy_id: string
    policy_number: string
    previous_policy_id: string
    coverage_start: string
    coverage_end: string
}

export async function renewPolicy(
    token: string,
    policyId: string,
    data: RenewPolicyPayload,
): Promise<RenewPolicyResult> {
    return apiFetch<RenewPolicyResult>(apiPath`/policies/${policyId}/renew`, { method: 'POST', token, body: data })
}

export async function updateRenewalStatus(
    token: string,
    policyId: string,
    status: ApiRenewalStatus,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/renewal-status`, { method: 'PATCH', token, body: { renewal_status: status } })
}

export async function updatePaymentStatus(
    token: string,
    policyId: string,
    status: ApiPaymentStatus,
    details?: { payment_date?: string; payment_reference?: string },
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/payment-status`, { method: 'PATCH', token, body: { payment_status: status, ...details } })
}

export async function addPolicyFollowUp(
    token: string,
    policyId: string,
    data: AddFollowUpPayload,
): Promise<{ follow_up_id: string }> {
    return apiFetch<{ follow_up_id: string }>(apiPath`/policies/${policyId}/follow-ups`, {
        method: 'POST', token, body: data,
    })
}

// The response shape is not documented yet and nothing in the UI consumes it, so it is
// typed as `unknown`: callers must narrow it before use instead of trusting an `any`.
export async function getPaymentSummary(
    token: string,
    params: PaymentSummaryParams,
): Promise<unknown> {
    const qs = new URLSearchParams({ insurer_id: params.insurer_id })
    if (params.month) qs.set('month', params.month)
    if (params.payment_status) qs.set('payment_status', params.payment_status)
    return apiFetch<unknown>(withQuery('/policies/payment-summary', qs), { token })
}

// ── Coverages ──────────────────────────────────────────────────────────────

export type ApiCoverageType = 'bangunan' | 'stok' | 'invenisi' | 'mesin' | 'dll'

export const COVERAGE_TYPE_LABELS: Record<ApiCoverageType, string> = {
    bangunan: 'Bangunan',
    stok:     'Stok / Persediaan',
    invenisi: 'Inventaris / Isi',
    mesin:    'Mesin',
    dll:      'Lain-lain (DLL)',
}

export interface ApiCoverageItem {
    coverage_id:    string
    coverage_type:  ApiCoverageType
    coverage_label: string | null
    sum_insured:    number
    rate_permille:  string   // decimal string from API e.g. "0.3280"
    premium_amount: number
    count_in_tsi:   0 | 1   // 1 = UP counted toward policy TSI; 0 = premium-only row
    created_at:     string
    updated_at:     string
}

export interface ApiCoveragesResponse {
    items:              ApiCoverageItem[]
    total_sum_insured:  number
    total_premium:      number
}

export interface AddCoveragePayload {
    coverage_type:   ApiCoverageType
    coverage_label?: string
    sum_insured:     number
    rate_permille:   number
    count_in_tsi?:   boolean  // default true; set false for secondary clauses (RSMD, OTHERS) to avoid double-counting TSI
}

export interface UpdateCoveragePayload {
    coverage_type?:  ApiCoverageType
    coverage_label?: string
    sum_insured?:    number
    rate_permille?:  number
    count_in_tsi?:   boolean
}

export async function getCoverages(
    token: string,
    policyId: string,
): Promise<ApiCoveragesResponse> {
    return apiFetch<ApiCoveragesResponse>(apiPath`/policies/${policyId}/coverages`, { token })
}

export async function addCoverage(
    token: string,
    policyId: string,
    data: AddCoveragePayload,
    change?: Partial<ChangeInfo>,
): Promise<{ coverage_id: string; premium_amount: number }> {
    return apiFetch<{ coverage_id: string; premium_amount: number }>(apiPath`/policies/${policyId}/coverages`, {
        method: 'POST', token, body: { ...data, ...change },
    })
}

export async function updateCoverage(
    token: string,
    policyId: string,
    coverageId: string,
    data: UpdateCoveragePayload,
    change?: Partial<ChangeInfo>,
): Promise<{ premium_amount: number }> {
    return apiFetch<{ premium_amount: number }>(apiPath`/policies/${policyId}/coverages/${coverageId}`, {
        method: 'PUT', token, body: { ...data, ...change },
    })
}

export async function deleteCoverage(
    token: string,
    policyId: string,
    coverageId: string,
    change?: Partial<ChangeInfo>,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/coverages/${coverageId}`, { method: 'DELETE', token, body: change })
}

// ── Export ────────────────────────────────────────────────────────────────

export interface ExportPoliciesParams {
    month?: string
    expiry_month?: string
    search?: string
    customer_id?: string
    product_type?: ApiProductType
    insurer_id?: string
    renewal_status?: ApiRenewalStatus
    agent_id?: string
}

export async function exportPolicies(
    token: string,
    params: ExportPoliciesParams = {},
): Promise<{ blob: Blob; filename: string }> {
    const qs = new URLSearchParams()
    if (params.month) qs.set('month', params.month)
    if (params.expiry_month) qs.set('expiry_month', params.expiry_month)
    if (params.search) qs.set('search', params.search)
    if (params.customer_id) qs.set('customer_id', params.customer_id)
    if (params.product_type) qs.set('product_type', params.product_type)
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)
    if (params.agent_id) qs.set('agent_id', params.agent_id)

    return apiDownload(
        withQuery('/policies/export', qs),
        { token, errorMessage: 'Export failed' },
        params.month ? `${params.month}.xlsx` : 'DAFTAR POLIS.xlsx',
    )
}

// ── Policy Logs ───────────────────────────────────────────────────────────

export interface ApiPolicyLog {
    log_id: string
    event_type: string
    reference_type: string | null
    reference_id: string | null
    old_value: string | null
    new_value: string | null
    description: string
    metadata: Record<string, unknown> | null
    created_by: string
    created_at: string
}

export interface PolicyLogsResponse {
    data: ApiPolicyLog[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export async function getPolicyLogs(
    token: string,
    policyId: string,
    page = 1,
    limit = 20,
): Promise<PolicyLogsResponse> {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    return apiFetch<PolicyLogsResponse>(withQuery(apiPath`/policies/${policyId}/logs`, qs), { token })
}
