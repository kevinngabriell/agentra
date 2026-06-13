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

export interface ApiInsurer {
    insurer_id: string
    name: string
    short_name: string
    agent_code?: string | null
    is_primary: boolean
    is_active: boolean
    notes?: string | null
}

export type ApiInsurerProductType = 'fire' | 'motorcycle' | 'car' | 'travel' | 'cargo' | 'other'

export interface ApiInsurerProduct {
    insurer_product_id: string
    insurer_id: string
    product_type: ApiInsurerProductType
    commission_rate: number
    is_active: boolean
}

export interface CreateInsurerPayload {
    name: string
    short_name: string
    agent_code?: string
    notes?: string
    is_primary?: boolean
    is_active?: boolean
}

export async function getInsurers(token: string, isActive?: boolean): Promise<ApiInsurer[]> {
    const qs = isActive !== undefined ? `?is_active=${isActive}` : ''
    return req<ApiInsurer[]>('GET', `/insurers${qs}`, token)
}

export async function getInsurerDetail(token: string, insurerId: string): Promise<ApiInsurer> {
    return req<ApiInsurer>('GET', `/insurers/${insurerId}`, token)
}

export async function createInsurer(
    token: string,
    data: CreateInsurerPayload,
): Promise<{ insurer_id: string }> {
    return req<{ insurer_id: string }>('POST', '/insurers', token, data as Record<string, unknown>)
}

export async function updateInsurer(
    token: string,
    insurerId: string,
    data: Partial<CreateInsurerPayload>,
): Promise<void> {
    await req<unknown>('PUT', `/insurers/${insurerId}`, token, data as Record<string, unknown>)
}

export async function deleteInsurer(token: string, insurerId: string): Promise<void> {
    await req<unknown>('DELETE', `/insurers/${insurerId}`, token)
}

export async function getInsurerProducts(token: string, insurerId: string): Promise<ApiInsurerProduct[]> {
    return req<ApiInsurerProduct[]>('GET', `/insurers/${insurerId}/products`, token)
}

export async function upsertInsurerProduct(
    token: string,
    insurerId: string,
    data: { product_type: ApiInsurerProductType; commission_rate: number; is_active: boolean },
): Promise<void> {
    await req<unknown>('POST', `/insurers/${insurerId}/products`, token, data as Record<string, unknown>)
}
