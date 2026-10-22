import { apiFetch, withQuery } from "./client"

export interface RenewalBreakdown {
    total: number
    renewed: number
    in_progress: number
    lapsed: number
    cancelled: number
    achieved_omzet: number
    renewed_pct: number
    in_progress_pct: number
    lapsed_pct: number
}

export interface DashboardStats {
    total_active_policies: number
    renewals_this_month: number
    expiring_this_week: number
    open_claims: number
    claims_pending_documents: number
    pending_commissions_amount: number
    renewal_breakdown: RenewalBreakdown
    trends: {
        policies_vs_last_month: string
        renewals_vs_last_month: string
    }
}

export interface ActivityItem {
    id: string
    type: string
    description: string
    link: string
    actor: { name: string }
    created_at: string
}

export interface TodayAction {
    policy_id: string
    policy_number: string
    customer_name: string
    customer_whatsapp: string
    product_type: string
    insurer_name: string
    coverage_end: string
    days_until_expiry: number
    renewal_status: string
    last_follow_up_status: string | null
}

export async function getDashboardStats(token: string): Promise<DashboardStats> {
    return apiFetch<DashboardStats>('/dashboard/stats', { token })
}

export async function getDashboardActivity(
    token: string,
    limit = 10,
): Promise<{ items: ActivityItem[] }> {
    return apiFetch<{ items: ActivityItem[] }>(withQuery('/dashboard/activity', new URLSearchParams({ limit: String(limit) })), { token })
}

export async function getTodayActions(
    token: string,
    limit = 10,
): Promise<{ items: TodayAction[]; total_today: number; total_week: number }> {
    return apiFetch<{ items: TodayAction[]; total_today: number; total_week: number }>(
        withQuery('/dashboard/today-actions', new URLSearchParams({ limit: String(limit) })),
        { token },
    )
}
