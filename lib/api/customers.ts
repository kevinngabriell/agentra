import { apiDownload, apiFetch, apiFetchOr, apiPath, withQuery } from "./client"

export type ApiCustomerType = 'individual' | 'company'
export type ApiCustomerStatus = 'active' | 'inactive' | 'lapsed'

export interface ApiCustomer {
    customer_id: string
    display_name: string
    customer_type: ApiCustomerType
    status: ApiCustomerStatus
    nik?: string
    npwp_company?: string
    npwp_personal?: string
    personal_phone?: string
    personal_whatsapp?: string
    personal_email?: string
    pic_name?: string
    pic_phone?: string
    pic_role?: string
    pic_whatsapp?: string
}

export interface CustomersListResponse {
    data: ApiCustomer[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface CustomerListParams {
    signal?: AbortSignal
    params?: string
    customer_type?: ApiCustomerType
    status?: ApiCustomerStatus
    page?: number
    limit?: number
}

export interface ApiCustomerDetail {
    customer_id: string
    customer_type: ApiCustomerType
    display_name: string
    status: ApiCustomerStatus
    source?: string
    /** sub_agents.sub_agent_id of the referring sub-agent, when source is 'referral'. */
    referred_by_agent_id?: string | null
    /** customer_groups.group_id, when the customer belongs to a group of related customers. */
    group_id?: string | null
    group_name?: string | null
    notes?: string
    // Individual
    nik?: string
    npwp_personal?: string
    date_of_birth?: string
    personal_phone?: string
    personal_whatsapp?: string
    personal_email?: string
    personal_address?: string
    // Company
    company_legal_name?: string
    npwp_company?: string
    nib?: string
    business_type?: string
    company_phone?: string
    company_email?: string
    operational_address?: string
    legal_address?: string
    pic_name?: string
    pic_phone?: string
    pic_whatsapp?: string
    pic_role?: string
    pic_email?: string
}

export async function getCustomerDetail(token: string, customerId: string): Promise<ApiCustomerDetail> {
    return apiFetch<ApiCustomerDetail>(apiPath`/customers/${customerId}`, { token })
}

export async function createCustomer(
    token: string,
    data: Record<string, unknown>,
): Promise<{ customer_id: string }> {
    return apiFetch<{ customer_id: string }>('/customers', { method: 'POST', token, body: data })
}

export async function updateCustomer(
    token: string,
    customerId: string,
    data: Record<string, unknown>,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/customers/${customerId}`, { method: 'PUT', token, body: data })
}

// On failure the API puts the specific reason (e.g. a foreign-key violation) in
// `data.error`; it is exposed as ApiError.detail.
export async function deleteCustomer(token: string, customerId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/customers/${customerId}`, { method: 'DELETE', token })
}

export async function updateCustomerStatus(
    token: string,
    customerId: string,
    status: ApiCustomerStatus,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/customers/${customerId}/status`, { method: 'PUT', token, body: { status } })
}

export interface ApiCustomerFollowUp {
    follow_up_id: string
    follow_up_date: string
    action_type?: string
    notes?: string
    outcome?: string
    created_at?: string
}

export interface CustomerFollowUpsResponse {
    data: ApiCustomerFollowUp[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export async function getCustomerFollowUps(
    token: string,
    customerId: string,
    page = 1,
    limit = 10,
): Promise<CustomerFollowUpsResponse> {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    return apiFetch<CustomerFollowUpsResponse>(withQuery(apiPath`/customers/${customerId}/follow-ups`, qs), { token })
}

// Bulk import lives in ./imports (customers and policies share one flow).

export interface ApiCustomerPolicy {
    policy_id: string
    policy_number: string
    product_type: string
    policy_year?: number
    renewal_status: string
    payment_status: string
    coverage_start: string
    coverage_end: string
    sum_insured: number
    premium_amount: number
    commission_amount: number
    insurer_id: string
    insurer_short_name?: string
    issuing_agent_id: string | null
    created_at?: string
}

export interface CustomerPoliciesResponse {
    data: ApiCustomerPolicy[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface CustomerPoliciesParams {
    page?: number
    limit?: number
    renewal_status?: 'pending' | 'renewed' | 'lapsed' | 'cancelled'
}

export async function getCustomerPolicies(
    token: string,
    customerId: string,
    params: CustomerPoliciesParams = {},
): Promise<CustomerPoliciesResponse> {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (params.renewal_status) qs.set('renewal_status', params.renewal_status)

    // 404 = the customer has no policies.
    return apiFetchOr<CustomerPoliciesResponse>(withQuery(apiPath`/customers/${customerId}/policies`, qs), { token }, {
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

export interface ExportCustomersParams {
    params?: string
    customer_type?: ApiCustomerType
    status?: ApiCustomerStatus
}

export async function exportCustomers(
    token: string,
    filters: ExportCustomersParams = {},
): Promise<{ blob: Blob; filename: string }> {
    const qs = new URLSearchParams()
    if (filters.params) qs.set('params', filters.params)
    if (filters.customer_type) qs.set('customer_type', filters.customer_type)
    if (filters.status) qs.set('status', filters.status)

    return apiDownload(withQuery('/customers/export', qs), { token, errorMessage: 'Export failed' }, 'DAFTAR CUSTOMER.xlsx')
}

export async function getCustomers(
    token: string,
    filters: CustomerListParams = {},
): Promise<CustomersListResponse> {
    const qs = new URLSearchParams()
    if (filters.params) qs.set('params', filters.params)
    if (filters.customer_type) qs.set('customer_type', filters.customer_type)
    if (filters.status) qs.set('status', filters.status)
    const page = filters.page ?? 1
    const limit = filters.limit ?? 10
    qs.set('page', String(page))
    qs.set('limit', String(limit))

    // API returns 404 when no records match the query — treat as empty, not an error
    return apiFetchOr<CustomersListResponse>(withQuery('/customers', qs), { token, signal: filters.signal }, {
        data: [],
        pagination: { total: 0, page, limit, total_pages: 0 },
    })
}

// ── Customer 360, groups and cross-sell ─────────────────────────────────────

export interface CustomerGroup {
    group_id: string
    name: string
    notes: string | null
    member_count: number
    in_force_policies: number
    premium: number
}

export async function getCustomerGroups(token: string): Promise<CustomerGroup[]> {
    const res = await apiFetch<{ data: CustomerGroup[] }>('/customer-groups', { token })
    return res.data
}

/** Puts the customer in an existing group (`group_id`), creates-or-joins one by name (`group_name`), or removes them from any group (neither). */
export async function setCustomerGroup(
    token: string,
    customerId: string,
    data: { group_id?: string | null; group_name?: string },
): Promise<{ customer_id: string; group_id: string | null; group_name: string | null }> {
    return apiFetch(apiPath`/customers/${customerId}/group`, { method: 'PUT', token, body: data })
}

export type PolicyStanding = 'in_force' | 'upcoming' | 'expired' | 'cancelled'

export interface CustomerOverviewPolicy {
    policy_id: string
    policy_number: string
    product_type: string
    product_name: string
    insurer_id: string
    insurer_name: string | null
    customer_id: string
    customer_name: string | null
    coverage_start: string
    coverage_end: string
    renewal_status: 'pending' | 'renewed' | 'lapsed' | 'cancelled'
    payment_status: string
    sum_insured: number
    premium_amount: number
    standing: PolicyStanding
    days_until_expiry: number
}

export interface CustomerOverview {
    customer: { customer_id: string; display_name: string; customer_type: ApiCustomerType; group_id: string | null; group_name: string | null }
    scope: 'customer' | 'group'
    members: { customer_id: string; display_name: string; customer_type: ApiCustomerType; in_force_policies: number; premium: number }[]
    policies: CustomerOverviewPolicy[]
    held: { policies: number; premium: number; sum_insured: number }
    by_product: { product_type: string; product_name: string; policies: number; premium: number; sum_insured: number; insurers: string[] }[]
    by_insurer: { insurer_id: string; insurer_name: string | null; policies: number; premium: number; products: string[] }[]
}

export async function getCustomerOverview(token: string, customerId: string, scope: 'customer' | 'group' = 'customer'): Promise<CustomerOverview> {
    return apiFetch<CustomerOverview>(withQuery(`/customers/${encodeURIComponent(customerId)}/overview`, new URLSearchParams({ scope })), { token })
}

export interface CrossSellSuggestion {
    family: string
    /** The product the customer already holds that triggered the suggestion. */
    because: string
    reason: string
    products: { product_code: string; product_name: string }[]
}

export async function getCustomerCrossSell(token: string, customerId: string, scope: 'customer' | 'group' = 'customer'): Promise<CrossSellSuggestion[]> {
    const res = await apiFetch<{ suggestions: CrossSellSuggestion[] }>(
        withQuery(`/customers/${encodeURIComponent(customerId)}/cross-sell`, new URLSearchParams({ scope })), { token })
    return res.suggestions
}
