import { apiFetch, withQuery } from "./client"

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
    const qs = new URLSearchParams()
    if (month) qs.set('month', month)
    return apiFetch<RevenueSummaryResponse>(withQuery('/revenue/summary', qs), { token })
}
