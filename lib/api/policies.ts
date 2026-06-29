const BASE_URL = process.env.NEXT_PUBLIC_API_URL

async function req<T>(
    method: string,
    path: string,
    token: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as T
}

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
    renewal_status: ApiRenewalStatus
    payment_status: ApiPaymentStatus
    customer_id: string
    customer_name: string
    customer_type?: string
    insurer_id: string
    insurer_name: string
    insurer_short_name?: string
    object_insured?: string
    notes?: string
    policy_year?: number
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
    sum_insured: number
    premium_amount: number
    materai_amount?: number
    biaya_polis?: number
    diskon?: number
    commission_rate: number
    commission_tax_rate?: number
    construction_class?: ApiConstructionClass | null
    policy_year?: number
    issuing_agent_id?: string
    previous_policy_id?: string
    object_insured?: string
    coverage_notes?: string
    notes?: string
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
    return req<{ data: ApiCoassurance[] }>('GET', `/policies/${policyId}/coassurance`, token)
}

export async function addCoassuranceParticipant(
    token: string,
    policyId: string,
    data: AddCoassurancePayload,
): Promise<{ coassurance_id: string }> {
    return req<{ coassurance_id: string }>(
        'POST', `/policies/${policyId}/coassurance`, token, data as unknown as Record<string, unknown>,
    )
}

export async function updateCoassuranceParticipant(
    token: string,
    policyId: string,
    coassuranceId: string,
    data: UpdateCoassurancePayload,
): Promise<void> {
    await req<unknown>(
        'PUT', `/policies/${policyId}/coassurance/${coassuranceId}`, token, data as unknown as Record<string, unknown>,
    )
}

export async function removeCoassuranceParticipant(
    token: string,
    policyId: string,
    coassuranceId: string,
): Promise<void> {
    await req<unknown>('DELETE', `/policies/${policyId}/coassurance/${coassuranceId}`, token)
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

const EMPTY_POLICIES: PoliciesListResponse = {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 },
}

export async function getPolicies(
    token: string,
    params: PoliciesListParams = {},
): Promise<PoliciesListResponse> {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 10))
    if (params.search) qs.set('search', params.search)
    if (params.customer_id) qs.set('customer_id', params.customer_id)
    if (params.product_type) qs.set('product_type', params.product_type)
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)
    if (params.expiry_month) qs.set('expiry_month', params.expiry_month)
    if (params.agent_id) qs.set('agent_id', params.agent_id)

    const res = await fetch(`${BASE_URL}/api/v1/policies?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json()

    if (res.status === 404) return EMPTY_POLICIES
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }

    return json.data as PoliciesListResponse
}

export async function getPolicyDetail(token: string, policyId: string): Promise<ApiPolicyDetail> {
    return req<ApiPolicyDetail>('GET', `/policies/${policyId}`, token)
}

export async function createPolicy(
    token: string,
    data: CreatePolicyPayload,
): Promise<{ policy_id: string }> {
    return req<{ policy_id: string }>('POST', '/policies', token, data as unknown as Record<string, unknown>)
}

export async function updatePolicy(
    token: string,
    policyId: string,
    data: Partial<CreatePolicyPayload>,
): Promise<void> {
    await req<unknown>('PUT', `/policies/${policyId}`, token, data as unknown as Record<string, unknown>)
}

export async function directUpdatePolicy(
    token: string,
    policyId: string,
    data: Partial<CreatePolicyPayload>,
): Promise<void> {
    await req<unknown>('PATCH', `/policies/${policyId}`, token, data as unknown as Record<string, unknown>)
}

export async function deletePolicy(
    token: string,
    policyId: string,
): Promise<void> {
    await req<unknown>('DELETE', `/policies/${policyId}`, token)
}

export async function updateRenewalStatus(
    token: string,
    policyId: string,
    status: ApiRenewalStatus,
): Promise<void> {
    await req<unknown>('PATCH', `/policies/${policyId}/renewal-status`, token, { renewal_status: status })
}

export async function updatePaymentStatus(
    token: string,
    policyId: string,
    status: ApiPaymentStatus,
): Promise<void> {
    await req<unknown>('PATCH', `/policies/${policyId}/payment-status`, token, { payment_status: status })
}

export async function addPolicyFollowUp(
    token: string,
    policyId: string,
    data: AddFollowUpPayload,
): Promise<{ follow_up_id: string }> {
    return req<{ follow_up_id: string }>(
        'POST',
        `/policies/${policyId}/follow-ups`,
        token,
        data as unknown as Record<string, unknown>,
    )
}

export async function getPaymentSummary(
    token: string,
    params: PaymentSummaryParams,
): Promise<any> {
    const qs = new URLSearchParams({ insurer_id: params.insurer_id })
    if (params.month) qs.set('month', params.month)
    if (params.payment_status) qs.set('payment_status', params.payment_status)
    return req<any>('GET', `/policies/payment-summary?${qs.toString()}`, token)
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
    return req<ApiCoveragesResponse>('GET', `/policies/${policyId}/coverages`, token)
}

export async function addCoverage(
    token: string,
    policyId: string,
    data: AddCoveragePayload,
): Promise<{ coverage_id: string; premium_amount: number }> {
    return req<{ coverage_id: string; premium_amount: number }>(
        'POST', `/policies/${policyId}/coverages`, token, data as unknown as Record<string, unknown>,
    )
}

export async function updateCoverage(
    token: string,
    policyId: string,
    coverageId: string,
    data: UpdateCoveragePayload,
): Promise<{ premium_amount: number }> {
    return req<{ premium_amount: number }>(
        'PUT', `/policies/${policyId}/coverages/${coverageId}`, token, data as unknown as Record<string, unknown>,
    )
}

export async function deleteCoverage(
    token: string,
    policyId: string,
    coverageId: string,
): Promise<void> {
    await req<unknown>('DELETE', `/policies/${policyId}/coverages/${coverageId}`, token)
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

    const res = await fetch(`${BASE_URL}/api/v1/policies/export?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const err: any = new Error((json as any).status_message || 'Export failed')
        err.status = res.status
        throw err
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const match = disposition.match(/filename="?([^";\r\n]+)"?/)
    const filename = match?.[1] ?? (params.month ? `${params.month}.xlsx` : 'DAFTAR POLIS.xlsx')

    return { blob, filename }
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
    return req<PolicyLogsResponse>('GET', `/policies/${policyId}/logs?page=${page}&limit=${limit}`, token)
}
