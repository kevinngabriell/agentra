import { apiFetch, apiPath, withQuery } from "./client"

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
    const qs = new URLSearchParams()
    if (isActive !== undefined) qs.set('is_active', String(isActive))
    const res = await apiFetch<ApiInsurer[] | { data?: ApiInsurer[] }>(withQuery('/insurers', qs), { token })
    // Tolerate both `data: [...]` and a nested `data: { data: [...] }` envelope.
    return Array.isArray(res) ? res : res?.data ?? []
}

export async function getInsurerDetail(token: string, insurerId: string): Promise<ApiInsurer> {
    return apiFetch<ApiInsurer>(apiPath`/insurers/${insurerId}`, { token })
}

export async function createInsurer(
    token: string,
    data: CreateInsurerPayload,
): Promise<{ insurer_id: string }> {
    return apiFetch<{ insurer_id: string }>('/insurers', { method: 'POST', token, body: data })
}

export async function updateInsurer(
    token: string,
    insurerId: string,
    data: Partial<CreateInsurerPayload>,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/insurers/${insurerId}`, { method: 'PUT', token, body: data })
}

export async function deleteInsurer(token: string, insurerId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/insurers/${insurerId}`, { method: 'DELETE', token })
}

export async function getInsurerProducts(token: string, insurerId: string): Promise<ApiInsurerProduct[]> {
    const res = await apiFetch<ApiInsurerProduct[] | { data?: ApiInsurerProduct[] }>(apiPath`/insurers/${insurerId}/products`, { token })
    return Array.isArray(res) ? res : res?.data ?? []
}

export async function upsertInsurerProduct(
    token: string,
    insurerId: string,
    data: { product_type: ApiInsurerProductType; commission_rate: number; is_active: boolean },
): Promise<void> {
    await apiFetch<unknown>(apiPath`/insurers/${insurerId}/products`, { method: 'POST', token, body: data })
}
