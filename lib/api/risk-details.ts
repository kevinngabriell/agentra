import { apiFetch, apiPath } from "./client"

// Product-specific risk details (motor, cargo, travel, personal accident, fire).
// The risk group comes from the product's type (GET /master-products/types).

export type RiskGroup = 'motor' | 'cargo' | 'travel' | 'pa' | 'fire'

export const RISK_GROUP_LABELS: Record<RiskGroup, string> = {
    motor:  'Detail Kendaraan',
    cargo:  'Detail Pengiriman Kargo',
    travel: 'Detail Perjalanan',
    pa:     'Tertanggung & Manfaat',
    fire:   'Detail Properti',
}

export type MotorUsage = 'private' | 'commercial'
export type MotorCoverageType = 'comprehensive' | 'tlo'
export type IccClause = 'A' | 'B' | 'C'
export type SurveyStatus = 'not_required' | 'pending' | 'scheduled' | 'done'
export type MemberRole = 'traveller' | 'insured' | 'beneficiary'

/** Every column is nullable; only the ones of the policy's group are returned. */
export interface RiskDetails {
    plate_number?: string | null
    chassis_number?: string | null
    engine_number?: string | null
    vehicle_make?: string | null
    vehicle_model?: string | null
    vehicle_year?: number | null
    vehicle_color?: string | null
    vehicle_usage?: MotorUsage | null
    motor_coverage_type?: MotorCoverageType | null
    vehicle_value?: number | null
    tariff_region?: number | null
    ext_flood?: boolean
    ext_earthquake?: boolean
    ext_rsmdcc?: boolean
    ext_terrorism?: boolean
    tpl_limit?: number | null
    pa_driver_limit?: number | null
    pa_passenger_limit?: number | null
    pa_passenger_seats?: number | null
    conveyance_name?: string | null
    voyage_from?: string | null
    voyage_to?: string | null
    bl_awb_number?: string | null
    departure_date?: string | null
    icc_clause?: IccClause | null
    goods_description?: string | null
    is_open_cover?: boolean
    destinations?: string | null
    schengen_certificate_no?: string | null
    occupation_code?: string | null
    occupation_description?: string | null
    survey_status?: SurveyStatus | null
    survey_date?: string | null
}

export interface RiskMember {
    member_id?: string
    member_role: MemberRole
    full_name: string
    id_number: string | null
    birth_date: string | null
    relationship: string | null
    benefit_death: number | null
    benefit_disability: number | null
    benefit_medical: number | null
    share_percent: number | null
}

export interface PolicyRiskDetails {
    policy_id: string
    product_type: string
    risk_group: RiskGroup | null
    details: RiskDetails | null
    members: RiskMember[]
}

/** Body of PUT /policies/{id}/risk-details, and the `risk_details` / `members` fields of POST /policies. */
export interface RiskDetailsPayload {
    risk_details?: Record<string, string | number | boolean | null>
    members?: RiskMember[]
}

export async function getRiskDetails(token: string, policyId: string): Promise<PolicyRiskDetails> {
    return apiFetch<PolicyRiskDetails>(apiPath`/policies/${policyId}/risk-details`, { token })
}

export async function saveRiskDetails(
    token: string,
    policyId: string,
    data: RiskDetailsPayload,
): Promise<PolicyRiskDetails> {
    return apiFetch<PolicyRiskDetails>(apiPath`/policies/${policyId}/risk-details`, { method: 'PUT', token, body: data })
}

// ── Cargo open cover declarations ────────────────────────────────────────────

export interface CargoDeclaration {
    declaration_id: string
    declaration_date: string
    conveyance_name: string | null
    voyage_from: string | null
    voyage_to: string | null
    bl_awb_number: string | null
    departure_date: string | null
    goods_description: string | null
    sum_insured: number
    premium_amount: number
    notes: string | null
    created_at: string
}

export interface CargoDeclarations {
    items: CargoDeclaration[]
    total_sum_insured: number
    total_premium: number
}

export type CargoDeclarationPayload = Partial<Omit<CargoDeclaration, 'declaration_id' | 'created_at'>>

export async function getDeclarations(token: string, policyId: string): Promise<CargoDeclarations> {
    return apiFetch<CargoDeclarations>(apiPath`/policies/${policyId}/declarations`, { token })
}

export async function addDeclaration(
    token: string,
    policyId: string,
    data: CargoDeclarationPayload,
): Promise<{ declaration_id: string }> {
    return apiFetch<{ declaration_id: string }>(apiPath`/policies/${policyId}/declarations`, { method: 'POST', token, body: data })
}

export async function updateDeclaration(
    token: string,
    policyId: string,
    declarationId: string,
    data: CargoDeclarationPayload,
): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/declarations/${declarationId}`, { method: 'PUT', token, body: data })
}

export async function deleteDeclaration(token: string, policyId: string, declarationId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/declarations/${declarationId}`, { method: 'DELETE', token })
}
