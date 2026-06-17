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

const EMPTY_COMMISSIONS: CommissionsListResponse = {
    data: [],
    pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
}

export async function getCommissions(
    token: string,
    params: CommissionsListParams = {},
): Promise<CommissionsListResponse> {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 100))
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.status) qs.set('status', params.status)
    if (params.commission_type) qs.set('commission_type', params.commission_type)
    if (params.month) qs.set('month', params.month)

    const res = await fetch(`${BASE_URL}/api/v1/commissions?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (res.status === 404) return EMPTY_COMMISSIONS
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as CommissionsListResponse
}

export async function getCommissionSummary(
    token: string,
    params: { insurer_id?: string; month?: string } = {},
): Promise<CommissionSummaryResponse> {
    const qs = new URLSearchParams()
    if (params.insurer_id) qs.set('insurer_id', params.insurer_id)
    if (params.month) qs.set('month', params.month)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return req<CommissionSummaryResponse>('GET', `/commissions/summary${suffix}`, token)
}

export async function getCommissionDetail(
    token: string,
    commissionId: string,
): Promise<ApiCommission> {
    return req<ApiCommission>('GET', `/commissions/${commissionId}`, token)
}

export async function markCommissionReceived(
    token: string,
    commissionId: string,
    data: MarkReceivedPayload,
): Promise<MarkReceivedResponse> {
    return req<MarkReceivedResponse>(
        'PATCH',
        `/commissions/${commissionId}/mark-received`,
        token,
        data as unknown as Record<string, unknown>,
    )
}

export async function getPolicyCommission(
    token: string,
    policyId: string,
): Promise<ApiCommission> {
    return req<ApiCommission>('GET', `/policies/${policyId}/commission`, token)
}
