import { apiFetch, apiPath } from "./client"

/** Fixed insurance lines; mirrors PRODUCT_TYPES in the API (helpers/product_types.php). */
export type ApiProductTypeCode =
    | 'fire' | 'earthquake' | 'motor' | 'cargo' | 'travel' | 'personal_accident'
    | 'liability' | 'engineering' | 'marine_hull' | 'health' | 'bonds' | 'others'

export interface ApiProductTypeInfo {
    product_type: ApiProductTypeCode
    label: string
    risk_group: 'motor' | 'cargo' | 'travel' | 'pa' | 'fire' | null
    has_risk_details: boolean
    /** Form options for this type, e.g. `construction_class: ['I','II','III']`. Absent key = field not offered. */
    options: Record<string, string[]>
    /** Display labels for `options`, e.g. `construction_class: { I: 'Kelas I – …' }`. */
    option_labels?: Record<string, Record<string, string>>
}

export interface ApiMasterProduct {
    product_id: string
    product_code: string
    product_name: string
    /** null until the product is classified (migration_product_types.sql backfill / manual edit). */
    product_type: ApiProductTypeCode | null
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
    product_type: ApiProductTypeCode
    commission_rate: number
    default_tax_rate?: number
    policy_prefixes?: string
}

export async function getMasterProducts(token: string): Promise<ApiMasterProduct[]> {
    const res = await apiFetch<ApiMasterProduct[] | { data?: ApiMasterProduct[] }>('/master-products', { token })
    // The endpoint wraps the list as `data: { data: [...] }`; accept a flat `data: [...]` too.
    return Array.isArray(res) ? res : res?.data ?? []
}

export async function getProductTypes(token: string): Promise<ApiProductTypeInfo[]> {
    const res = await apiFetch<ApiProductTypeInfo[] | { data?: ApiProductTypeInfo[] }>('/master-products/types', { token })
    return Array.isArray(res) ? res : res?.data ?? []
}

export async function createMasterProduct(
    token: string,
    data: CreateMasterProductPayload,
): Promise<{ product_id: string }> {
    return apiFetch<{ product_id: string }>('/master-products', { method: 'POST', token, body: data })
}

export async function updateMasterProduct(
    token: string,
    productId: string,
    data: Partial<CreateMasterProductPayload> & { is_active?: boolean },
): Promise<void> {
    await apiFetch<unknown>(apiPath`/master-products/${productId}`, { method: 'PUT', token, body: data })
}

export async function deleteMasterProduct(token: string, productId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/master-products/${productId}`, { method: 'DELETE', token })
}
