import { apiFetch, apiFetchOr, apiPath, withQuery } from "./client"

export type CommissionStatus = 'pending' | 'received' | 'discrepancy' | 'cancelled'
export type CommissionType = 'direct' | 'override'

export interface ApiCommission {
    commission_id: string
    policy_id: string
    insurer_id: string
    commission_type: CommissionType
    premium_amount: number
    commission_rate: number | string
    expected_amount: number
    commission_tax_rate: number | null
    commission_tax_amount: number | null
    net_expected_amount: number | null
    received_amount: number
    status: CommissionStatus
    expected_date: string | null
    received_date: string | null
    reference_number: string | null
    discrepancy_notes: string | null
    marked_by: string | null
    marked_at: string | null
    created_at: string
    updated_at: string
    // context fields from list endpoint
    policy_number?: string
    product_type?: string
    coverage_start?: string
    coverage_end?: string
    customer_name?: string
    insurer_name?: string
    insurer_short_name?: string
}

export interface CommissionsListParams {
    insurer_id?: string
    status?: CommissionStatus
    commission_type?: CommissionType
    product_type?: string
    /** Only commissions not yet matched to an insurer statement. */
    unmatched?: boolean
    month?: string
    page?: number
    limit?: number
}

export interface CommissionsListResponse {
    data: ApiCommission[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface CommissionSummaryResponse {
    total_count: number
    total_expected: number
    pending: { count: number; amount: number }
    received: { count: number; amount: number }
    discrepancy: { count: number; expected: number; received: number }
}

export interface MarkReceivedPayload {
    received_amount: number
    received_date?: string
    reference_number?: string
    discrepancy_notes?: string
}

export interface MarkReceivedResponse {
    commission_id: string
    status: CommissionStatus
    expected_amount: number
    received_amount: number
    difference: number
}

export async function getCommissions(
    token: string,
    params: CommissionsListParams = {},
): Promise<CommissionsListResponse> {
    const qs = new URLSearchParams()
    const page = params.page ?? 1
    const limit = params.limit ?? 100
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.status) qs.set('status', params.status)
    if (params.commission_type) qs.set('commission_type', params.commission_type)
    if (params.product_type) qs.set('product_type', params.product_type)
    if (params.unmatched) qs.set('unmatched', '1')
    if (params.month) qs.set('month', params.month)

    // 404 = no commissions match the filter.
    return apiFetchOr<CommissionsListResponse>(withQuery('/commissions', qs), { token }, {
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

export async function getCommissionSummary(
    token: string,
    params: { insurer_id?: string; product_type?: string; month?: string } = {},
): Promise<CommissionSummaryResponse> {
    const qs = new URLSearchParams()
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.product_type) qs.set('product_type', params.product_type)
    if (params.month) qs.set('month', params.month)
    return apiFetch<CommissionSummaryResponse>(withQuery('/commissions/summary', qs), { token })
}

export async function getCommissionDetail(
    token: string,
    commissionId: string,
): Promise<ApiCommission> {
    return apiFetch<ApiCommission>(apiPath`/commissions/${commissionId}`, { token })
}

export async function markCommissionReceived(
    token: string,
    commissionId: string,
    data: MarkReceivedPayload,
): Promise<MarkReceivedResponse> {
    return apiFetch<MarkReceivedResponse>(apiPath`/commissions/${commissionId}/mark-received`, {
        method: 'PATCH',
        token,
        body: data,
    })
}

export async function getPolicyCommission(
    token: string,
    policyId: string,
): Promise<ApiCommission> {
    return apiFetch<ApiCommission>(apiPath`/policies/${policyId}/commission`, { token })
}

// ── Insurer statement reconciliation ────────────────────────────────────────

export interface ApiCommissionStatement {
    statement_id: string
    insurer_id: string
    insurer_name: string | null
    insurer_short_name: string | null
    statement_date: string
    amount: number
    reference_number: string | null
    notes: string | null
    created_by: string
    created_at: string
    matched_count: number
    matched_amount: number
    /** Sum of expected_amount over the matched commissions. */
    matched_expected: number
    /** amount - matched_amount: money in the statement not yet attributed to a commission. */
    unmatched_amount: number
    /** Matched commissions whose allocated amount differs from what was expected. */
    discrepancy_count: number
}

export interface ApiStatementItem {
    commission_id: string
    policy_id: string
    policy_number: string | null
    product_type: string | null
    customer_name: string | null
    expected_amount: number
    allocated_amount: number
    /** allocated_amount - expected_amount */
    difference: number
    status: CommissionStatus
}

export interface ApiCommissionStatementDetail extends ApiCommissionStatement {
    items: ApiStatementItem[]
}

export interface StatementMatchItem {
    commission_id: string
    /** Defaults to the commission's expected_amount. */
    allocated_amount?: number
}

export interface CreateStatementPayload {
    insurer_id: string
    statement_date: string
    amount: number
    reference_number?: string
    notes?: string
    items?: StatementMatchItem[]
}

export interface StatementsListResponse {
    data: ApiCommissionStatement[]
    pagination: { total: number; page: number; limit: number; total_pages: number }
}

export async function getCommissionStatements(
    token: string,
    params: { insurer_id?: string; month?: string; page?: number; limit?: number } = {},
): Promise<StatementsListResponse> {
    const qs = new URLSearchParams()
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.month) qs.set('month', params.month)
    return apiFetchOr<StatementsListResponse>(withQuery('/commissions/statements', qs), { token }, {
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

export async function getCommissionStatement(token: string, statementId: string): Promise<ApiCommissionStatementDetail> {
    return apiFetch<ApiCommissionStatementDetail>(apiPath`/commissions/statements/${statementId}`, { token })
}

export async function createCommissionStatement(token: string, data: CreateStatementPayload): Promise<ApiCommissionStatement> {
    return apiFetch<ApiCommissionStatement>('/commissions/statements', { method: 'POST', token, body: data })
}

export async function matchStatementCommissions(
    token: string,
    statementId: string,
    items: StatementMatchItem[],
): Promise<ApiCommissionStatementDetail> {
    return apiFetch<ApiCommissionStatementDetail>(apiPath`/commissions/statements/${statementId}/match`, {
        method: 'POST', token, body: { items },
    })
}

export async function unmatchStatementCommission(
    token: string,
    statementId: string,
    commissionId: string,
): Promise<ApiCommissionStatementDetail> {
    return apiFetch<ApiCommissionStatementDetail>(apiPath`/commissions/statements/${statementId}/items/${commissionId}`, {
        method: 'DELETE', token,
    })
}

export async function deleteCommissionStatement(token: string, statementId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/commissions/statements/${statementId}`, { method: 'DELETE', token })
}
