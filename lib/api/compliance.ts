import { apiFetch, apiPath } from "./client"

// APU-PPT compliance for large / corporate premiums (customers/compliance.php, v2.1.0).
// The app records a screening the agent ran against the DTTOT / PEP lists; it does not query them.

export type RiskRating = 'low' | 'medium' | 'high'
export type ScreeningStatus = 'not_screened' | 'clear' | 'potential_match' | 'confirmed_match'

export const RISK_RATING_LABELS: Record<RiskRating, string> = { low: 'Rendah', medium: 'Menengah', high: 'Tinggi' }
export const SCREENING_STATUS_LABELS: Record<ScreeningStatus, string> = {
    not_screened: 'Belum di-screening', clear: 'Bersih', potential_match: 'Kemungkinan cocok', confirmed_match: 'Cocok (terkonfirmasi)',
}

export interface BeneficialOwner {
    owner_id: string
    full_name: string
    id_number: string | null
    nationality: string | null
    ownership_percent: number | null
    role: string | null
    is_pep: boolean
    notes: string | null
}

export interface CustomerCompliance {
    customer_id: string
    risk_rating: RiskRating | null
    is_pep: boolean
    screening_status: ScreeningStatus
    screened_at: string | null
    screening_lists: string | null
    screening_note: string | null
    beneficial_owners: BeneficialOwner[]
    in_force_premium: number
    edd_required: boolean
    edd_reasons: string[]
    /** Last screening is more than 12 months old. */
    screening_stale: boolean
}

export async function getCompliance(token: string, customerId: string): Promise<CustomerCompliance> {
    return apiFetch<CustomerCompliance>(apiPath`/customers/${customerId}/compliance`, { token })
}

export async function updateCompliance(token: string, customerId: string, data: Partial<Pick<CustomerCompliance,
    'risk_rating' | 'is_pep' | 'screening_status' | 'screened_at' | 'screening_lists' | 'screening_note'>>): Promise<CustomerCompliance> {
    return apiFetch<CustomerCompliance>(apiPath`/customers/${customerId}/compliance`, { method: 'PUT', token, body: data })
}

export type BeneficialOwnerPayload = Partial<Omit<BeneficialOwner, 'owner_id'>>

export async function saveBeneficialOwner(token: string, customerId: string, ownerId: string | null, data: BeneficialOwnerPayload): Promise<CustomerCompliance> {
    return ownerId
        ? apiFetch<CustomerCompliance>(apiPath`/customers/${customerId}/beneficial-owners/${ownerId}`, { method: 'PUT', token, body: data })
        : apiFetch<CustomerCompliance>(apiPath`/customers/${customerId}/beneficial-owners`, { method: 'POST', token, body: data })
}

export async function deleteBeneficialOwner(token: string, customerId: string, ownerId: string): Promise<CustomerCompliance> {
    return apiFetch<CustomerCompliance>(apiPath`/customers/${customerId}/beneficial-owners/${ownerId}`, { method: 'DELETE', token })
}
