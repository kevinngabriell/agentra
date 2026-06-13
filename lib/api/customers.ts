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
    params?: string
    customer_type?: ApiCustomerType
    status?: ApiCustomerStatus
    page?: number
    limit?: number
}

const EMPTY: CustomersListResponse = {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 },
}

export interface ApiCustomerDetail {
    customer_id: string
    customer_type: ApiCustomerType
    display_name: string
    status: ApiCustomerStatus
    source?: string
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

async function apiMutate<T>(
    method: 'POST' | 'PUT',
    path: string,
    token: string,
    body: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data as T
}

export async function getCustomerDetail(token: string, customerId: string): Promise<ApiCustomerDetail> {
    return apiGet<ApiCustomerDetail>(`/customers/${customerId}`, token)
}

export async function createCustomer(
    token: string,
    data: Record<string, unknown>,
): Promise<{ customer_id: string }> {
    return apiMutate<{ customer_id: string }>('POST', '/customers', token, data)
}

export async function updateCustomer(
    token: string,
    customerId: string,
    data: Record<string, unknown>,
): Promise<void> {
    await apiMutate<unknown>('PUT', `/customers/${customerId}`, token, data)
}

export async function deleteCustomer(token: string, customerId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/customers/${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (!res.ok) {
        const detail: string = json.data?.error ?? json.status_message ?? 'Request failed'
        const err: any = new Error(detail)
        err.status = res.status
        err.detail = detail
        throw err
    }
}

export async function updateCustomerStatus(
    token: string,
    customerId: string,
    status: ApiCustomerStatus,
): Promise<void> {
    await apiMutate<unknown>('PUT', `/customers/${customerId}/status`, token, { status })
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
    return apiGet<CustomerFollowUpsResponse>(
        `/customers/${customerId}/follow-ups?page=${page}&limit=${limit}`,
        token,
    )
}

export interface ImportCustomersResult {
    inserted: number
    failed: number
    failures: Array<{ row: number; reason: string }>
}

export async function importCustomers(token: string, file: File): Promise<ImportCustomersResult> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${BASE_URL}/api/v1/customers/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    })
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Import failed')
        err.status = res.status
        throw err
    }
    return json.data as ImportCustomersResult
}

export async function getCustomers(
    token: string,
    filters: CustomerListParams = {},
): Promise<CustomersListResponse> {
    const qs = new URLSearchParams()
    if (filters.params) qs.set('params', filters.params)
    if (filters.customer_type) qs.set('customer_type', filters.customer_type)
    if (filters.status) qs.set('status', filters.status)
    qs.set('page', String(filters.page ?? 1))
    qs.set('limit', String(filters.limit ?? 10))

    const res = await fetch(`${BASE_URL}/api/v1/customers?${qs.toString()}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    const json = await res.json()

    // API returns 404 when no records match the query — treat as empty, not an error
    if (res.status === 404) return EMPTY

    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }

    return json.data as CustomersListResponse
}
