const BASE_URL = process.env.NEXT_PUBLIC_API_URL

async function req<T>(method: string, path: string, token: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as T
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
    breakdown: {
        renewed: RenewalStatsBreakdownItem
        in_progress: RenewalStatsBreakdownItem
        lapsed: RenewalStatsBreakdownItem
        cancelled: RenewalStatsBreakdownItem
    }
}

export interface RenewalsListParams {
    month?: string
    renewal_status?: string
    page?: number
    limit?: number
}

const EMPTY_RENEWALS: RenewalsListResponse = {
    month: '',
    data: [],
    pagination: { total: 0, page: 1, limit: 50, total_pages: 0 },
}

export async function getRenewals(
    token: string,
    params: RenewalsListParams = {},
): Promise<RenewalsListResponse> {
    const qs = new URLSearchParams()
    if (params.month) qs.set('month', params.month)
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 100))

    const res = await fetch(`${BASE_URL}/api/v1/renewals?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json()

    if (res.status === 404) return EMPTY_RENEWALS
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }

    return json.data as RenewalsListResponse
}

export async function getRenewalStats(
    token: string,
    month?: string,
): Promise<RenewalStatsResponse> {
    const qs = month ? `?month=${month}` : ''
    return req<RenewalStatsResponse>('GET', `/renewals/stats${qs}`, token)
}
