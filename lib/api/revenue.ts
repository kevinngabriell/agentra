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

export interface RevenueTotals {
    policies_count: number
    total_premium: number
    total_commission_amount: number
    total_net_commission_amount: number
    total_customer_premium_amount: number
}

export interface RevenueWeekly {
    week_start: string
    week_end: string
    policies_count: number
    total_premium: number
    total_commission_amount: number
    total_net_commission_amount: number
}

export interface RevenueByAgent {
    agent_id: string | null
    agent_name: string
    policies_count: number
    total_premium: number
    total_commission_amount: number
    total_net_commission_amount: number
}

export interface RevenueSummaryResponse {
    month: string
    totals: RevenueTotals
    weekly: RevenueWeekly[]
    by_agent: RevenueByAgent[]
}

export async function getRevenueSummary(token: string, month?: string): Promise<RevenueSummaryResponse> {
    const qs = month ? `?month=${month}` : ''
    return req<RevenueSummaryResponse>('GET', `/revenue/summary${qs}`, token)
}
