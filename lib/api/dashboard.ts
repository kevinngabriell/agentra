const BASE_URL = process.env.NEXT_PUBLIC_API_URL

async function apiGet<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as T
}

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
    return apiGet<DashboardStats>('/dashboard/stats', token)
}

export async function getDashboardActivity(
    token: string,
    limit = 10,
): Promise<{ items: ActivityItem[] }> {
    return apiGet<{ items: ActivityItem[] }>(`/dashboard/activity?limit=${limit}`, token)
}

export async function getTodayActions(
    token: string,
    limit = 10,
): Promise<{ items: TodayAction[]; total_today: number; total_week: number }> {
    return apiGet<{ items: TodayAction[]; total_today: number; total_week: number }>(
        `/dashboard/today-actions?limit=${limit}`,
        token,
    )
}
