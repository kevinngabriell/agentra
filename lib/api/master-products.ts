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

export interface ApiMasterProduct {
    product_id: string
    product_code: string
    product_name: string
    commission_rate: string
    default_tax_rate: number | null
    policy_prefixes: string | null
    is_active: number
    created_at?: string
    updated_at?: string
}

export interface CreateMasterProductPayload {
    product_code: string
    product_name: string
    commission_rate: number
    default_tax_rate?: number
    policy_prefixes?: string
}

export async function getMasterProducts(token: string): Promise<ApiMasterProduct[]> {
    const res = await req<{ data: ApiMasterProduct[] }>('GET', '/master-products', token)
    return res?.data ?? []
}

export async function createMasterProduct(
    token: string,
    data: CreateMasterProductPayload,
): Promise<{ product_id: string }> {
    return req<{ product_id: string }>('POST', '/master-products', token, data as unknown as Record<string, unknown>)
}

export async function updateMasterProduct(
    token: string,
    productId: string,
    data: Partial<CreateMasterProductPayload> & { is_active?: boolean },
): Promise<void> {
    await req<unknown>('PUT', `/master-products/${productId}`, token, data as unknown as Record<string, unknown>)
}

export async function deleteMasterProduct(token: string, productId: string): Promise<void> {
    await req<unknown>('DELETE', `/master-products/${productId}`, token)
}
