import { apiFetch, apiPath, withQuery } from "@/lib/api/client"

export type SubAgentStatus = 'active' | 'inactive'

export const SUB_AGENT_STATUS_LABELS: Record<SubAgentStatus, string> = {
    active:   'Aktif',
    inactive: 'Nonaktif',
}

export const SUB_AGENT_STATUS_COLORS: Record<SubAgentStatus, { bg: string; color: string }> = {
    active:   { bg: '#DCFCE7', color: '#16A34A' },
    inactive: { bg: '#F1F5F9', color: '#64748B' },
}

export interface SubAgentInsurerRate {
    insurer_id: string
    insurer_name: string | null
    insurer_short_name: string | null
    split_rate: number
}

export interface ApiSubAgent {
    sub_agent_id: string
    agent_code: string
    full_name: string
    phone_number: string | null
    whatsapp_number: string | null
    email: string | null
    joined_date: string | null
    status: SubAgentStatus
    /** % of the gross commission passed on to the sub-agent. */
    default_split_rate: number
    /** Whether the renewal digest for this sub-agent's policies goes to their own WhatsApp. */
    wa_digest_enabled: boolean
    has_account: boolean
    /** Not sent to the sub-agent's own login. */
    notes?: string | null
    created_at: string
    customers_count: number
    policies_count: number
    active_policies_count: number
    total_premium: number
    /** Gross commission; not sent to the sub-agent's own login. */
    total_commission?: number
    /** The part of the gross commission owed to the sub-agent. */
    sub_agent_commission: number
}

export interface SubAgentAccount {
    email: string
    enabled: boolean
    last_login_at: string | null
}

export interface ApiSubAgentDetail extends ApiSubAgent {
    insurer_rates: SubAgentInsurerRate[]
    /** null = no login; absent for the sub-agent's own view. */
    account?: SubAgentAccount | null
}

export interface Pagination {
    total: number
    page: number
    limit: number
    total_pages: number
}

export interface SubAgentListParams {
    params?: string
    status?: SubAgentStatus | ''
    page?: number
    limit?: number
    signal?: AbortSignal
}

export async function getSubAgents(token: string, filters: SubAgentListParams = {}): Promise<{ data: ApiSubAgent[]; pagination: Pagination }> {
    const qs = new URLSearchParams()
    for (const key of ['params', 'status', 'page', 'limit'] as const) {
        const v = filters[key]
        if (v !== undefined && v !== '') qs.set(key, String(v))
    }
    return apiFetch<{ data: ApiSubAgent[]; pagination: Pagination }>(withQuery('/sub-agents', qs), { token, signal: filters.signal })
}

/** Active sub-agents for a selector. The API caps a page at 100. */
export async function getActiveSubAgents(token: string): Promise<ApiSubAgent[]> {
    const res = await getSubAgents(token, { status: 'active', limit: 100 })
    return res.data ?? []
}

export async function getSubAgent(token: string, id: string): Promise<ApiSubAgentDetail> {
    return apiFetch<ApiSubAgentDetail>(apiPath`/sub-agents/${id}`, { token })
}

export interface SaveSubAgentPayload {
    full_name?: string
    agent_code?: string
    phone_number?: string
    whatsapp_number?: string
    email?: string
    joined_date?: string
    status?: SubAgentStatus
    default_split_rate?: number
    wa_digest_enabled?: boolean
    notes?: string
    /** Replaces the per-insurer overrides; [] clears them. */
    insurer_rates?: { insurer_id: string; split_rate: number }[]
}

export async function createSubAgent(token: string, payload: SaveSubAgentPayload): Promise<ApiSubAgentDetail> {
    return apiFetch<ApiSubAgentDetail>('/sub-agents', { method: 'POST', body: payload, token, errorMessage: 'Gagal menyimpan sub-agen' })
}

export async function updateSubAgent(token: string, id: string, payload: SaveSubAgentPayload): Promise<ApiSubAgentDetail> {
    return apiFetch<ApiSubAgentDetail>(apiPath`/sub-agents/${id}`, { method: 'PUT', body: payload, token, errorMessage: 'Gagal menyimpan sub-agen' })
}

/** Creates the sub-agent's login, or resets the password and re-enables an existing one. */
export async function saveSubAgentAccount(token: string, id: string, payload: { email?: string; password: string }): Promise<ApiSubAgentDetail> {
    return apiFetch<ApiSubAgentDetail>(apiPath`/sub-agents/${id}/account`, { method: 'POST', body: payload, token, errorMessage: 'Gagal menyimpan akun' })
}

export async function disableSubAgentAccount(token: string, id: string): Promise<ApiSubAgentDetail> {
    return apiFetch<ApiSubAgentDetail>(apiPath`/sub-agents/${id}/account`, { method: 'DELETE', token })
}

export async function deleteSubAgent(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/sub-agents/${id}`, { method: 'DELETE', token })
}

export interface SubAgentCustomer {
    customer_id: string
    display_name: string
    customer_type: 'individual' | 'company'
    status: string
    created_at: string
    policies_count: number
    total_premium: number
}

export async function getSubAgentCustomers(token: string, id: string, page = 1, signal?: AbortSignal): Promise<{ data: SubAgentCustomer[]; pagination: Pagination }> {
    const qs = new URLSearchParams({ page: String(page), limit: '20' })
    return apiFetch(withQuery(apiPath`/sub-agents/${id}/customers`, qs), { token, signal })
}

export interface SubAgentPolicy {
    policy_id: string
    policy_number: string
    product_type: string
    renewal_status: string
    payment_status: string
    coverage_start: string
    coverage_end: string
    premium_amount: number
    insurer_id: string
    insurer_short_name: string | null
    customer_id: string
    customer_name: string | null
    sub_agent_amount: number
}

export async function getSubAgentPolicies(token: string, id: string, page = 1, signal?: AbortSignal): Promise<{ data: SubAgentPolicy[]; pagination: Pagination }> {
    const qs = new URLSearchParams({ page: String(page), limit: '20' })
    return apiFetch(withQuery(apiPath`/sub-agents/${id}/policies`, qs), { token, signal })
}

export interface SubAgentInsurerSummary {
    insurer_id: string
    insurer_name: string | null
    insurer_short_name: string | null
    policies_count: number
    total_premium: number
    /** total_commission and retained_commission are not sent to the sub-agent's own login. */
    total_commission?: number
    sub_agent_commission: number
    retained_commission?: number
}

export interface SubAgentSummary {
    totals: Omit<SubAgentInsurerSummary, 'insurer_id' | 'insurer_name' | 'insurer_short_name'>
    by_insurer: SubAgentInsurerSummary[]
}

export async function getSubAgentSummary(token: string, id: string, signal?: AbortSignal): Promise<SubAgentSummary> {
    return apiFetch<SubAgentSummary>(apiPath`/sub-agents/${id}/summary`, { token, signal })
}

export interface SubAgentPerformance {
    active_policies: number
    renewed_count: number
    lapsed_count: number
    /** Percent; null until a policy of this sub-agent has reached its end date. */
    renewal_rate: number | null
    premium_this_month: number
    premium_last_month: number
    /** Percent; null when last month had no premium to compare against. */
    mom_growth: number | null
    /** Last 12 months, oldest first. */
    monthly: { month: string; policies_count: number; premium: number }[]
}

export async function getSubAgentPerformance(token: string, id: string, signal?: AbortSignal): Promise<SubAgentPerformance> {
    return apiFetch<SubAgentPerformance>(apiPath`/sub-agents/${id}/performance`, { token, signal })
}
