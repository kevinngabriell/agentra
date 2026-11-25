import { apiFetch, apiPath } from "./client"
import type { ChangeInfo } from "./policy-change"
import type { PolicyEndorsement } from "./endorsements"

// Policy schedules for large accounts (v2.1.0): property locations with risk engineering, survey
// recommendations / warranties, stock declarations, fleet vehicles, banks / leasing, multi-year schedules.
// Mirrors policies/locations.php, vehicles.php, parties.php.

type Change = Partial<ChangeInfo>

// ── Locations ────────────────────────────────────────────────────────────────

export type FloodZone = 'low' | 'medium' | 'high'
export type FloodHistory = 'none' | 'once' | 'repeated'
export type Housekeeping = 'good' | 'fair' | 'poor'
export type StockOwnership = 'own' | 'third_party' | 'mixed'
export type OccupancyStatus = 'occupied' | 'unoccupied' | 'renovation' | 'partly_rented'

export const FLOOD_ZONE_LABELS: Record<FloodZone, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
export const FLOOD_HISTORY_LABELS: Record<FloodHistory, string> = { none: 'Tidak pernah', once: 'Pernah sekali', repeated: 'Berulang' }
export const HOUSEKEEPING_LABELS: Record<Housekeeping, string> = { good: 'Baik', fair: 'Cukup', poor: 'Buruk' }
export const STOCK_OWNERSHIP_LABELS: Record<StockOwnership, string> = { own: 'Milik sendiri', third_party: 'Milik pihak lain (titipan)', mixed: 'Campuran' }
export const OCCUPANCY_LABELS: Record<OccupancyStatus, string> = {
    occupied: 'Dihuni / dipakai', unoccupied: 'Kosong', renovation: 'Sedang renovasi', partly_rented: 'Sebagian disewakan',
}

export const PROTECTION_FIELDS = [
    ['has_apar', 'APAR'], ['has_hydrant', 'Hydrant'], ['has_sprinkler', 'Sprinkler'], ['has_detector', 'Detektor asap / panas'],
    ['has_alarm', 'Alarm kebakaran'], ['has_cctv', 'CCTV'], ['has_security_guard', 'Satpam 24 jam'],
] as const

export type ProtectionKey = typeof PROTECTION_FIELDS[number][0]

export interface LocationFields {
    label: string | null
    address: string | null
    village: string | null
    district: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    latitude: number | null
    longitude: number | null
    area_name: string | null
    occupation_code: string | null
    occupation_description: string | null
    construction_class: 'I' | 'II' | 'III' | null
    eq_zone: number | null
    flood_zone: FloodZone | null
    flood_history: FloodHistory | null
    last_flood_date: string | null
    wall_material: string | null
    roof_material: string | null
    floor_material: string | null
    storeys: number | null
    year_built: number | null
    floor_area_m2: number | null
    rebuild_cost_per_m2: number | null
    has_apar: boolean
    has_hydrant: boolean
    has_sprinkler: boolean
    has_detector: boolean
    has_alarm: boolean
    has_cctv: boolean
    has_security_guard: boolean
    fire_station_distance_km: number | null
    hazardous_goods: string | null
    rack_height_m: number | null
    adjacent_exposure: string | null
    housekeeping: Housekeeping | null
    stock_ownership: StockOwnership | null
    third_party_stock_note: string | null
    bailee_liability_covered: boolean
    occupancy_status: OccupancyStatus | null
    unoccupied_since: string | null
    pml_percent: number | null
    notes: string | null
}

export interface LocationItem {
    coverage_id: string
    coverage_type: string
    coverage_label: string | null
    sum_insured: number
    rate_permille: number
    premium_amount: number
    count_in_tsi: boolean
}

export interface PolicyLocation extends LocationFields {
    location_id: string
    policy_id: string
    seq: number
    items: LocationItem[]
    total_sum_insured: number
    total_premium: number
    pml_amount: number | null
    building_sum_insured: number
    rebuild_value: number | null
    underinsured: boolean
    insured_ratio: number | null
}

export interface LocationsResponse {
    items: PolicyLocation[]
    summary: {
        location_count: number
        total_sum_insured: number
        max_location_sum_insured: number
        total_pml: number
        unassigned_item_count: number
        unassigned_sum_insured: number
    }
}

export async function getLocations(token: string, policyId: string): Promise<LocationsResponse> {
    return apiFetch<LocationsResponse>(apiPath`/policies/${policyId}/locations`, { token })
}

export async function saveLocation(token: string, policyId: string, locationId: string | null, data: Partial<LocationFields>): Promise<PolicyLocation> {
    return locationId
        ? apiFetch<PolicyLocation>(apiPath`/policies/${policyId}/locations/${locationId}`, { method: 'PUT', token, body: data })
        : apiFetch<PolicyLocation>(apiPath`/policies/${policyId}/locations`, { method: 'POST', token, body: data })
}

export async function deleteLocation(token: string, policyId: string, locationId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/locations/${locationId}`, { method: 'DELETE', token })
}

export interface NearbyLocation {
    kind: 'location' | 'policy'
    policy_id: string
    policy_number: string
    customer_name: string
    label: string | null
    area_name: string | null
    distance_km: number | null
    same_area: boolean
    sum_insured: number
}

export async function getNearbyLocations(token: string, policyId: string, locationId: string, radiusKm: number)
    : Promise<{ radius_km: number; has_coordinates: boolean; items: NearbyLocation[]; total_sum_insured: number }> {
    return apiFetch(apiPath`/policies/${policyId}/locations/${locationId}/nearby` + `?radius_km=${radiusKm}`, { token })
}

// ── Recommendations / warranties ─────────────────────────────────────────────

export interface RiskRecommendation {
    recommendation_id: string
    location_id: string | null
    location_label: string | null
    description: string
    priority: 'low' | 'medium' | 'high'
    is_warranty: boolean
    due_date: string | null
    status: 'open' | 'done' | 'waived'
    completed_date: string | null
    source: string | null
    notes: string | null
    is_overdue: boolean
}

export type RecommendationPayload = Partial<Omit<RiskRecommendation, 'recommendation_id' | 'location_label' | 'is_overdue'>>

export async function getRecommendations(token: string, policyId: string): Promise<RiskRecommendation[]> {
    return (await apiFetch<{ items: RiskRecommendation[] }>(apiPath`/policies/${policyId}/recommendations`, { token })).items
}

export async function saveRecommendation(token: string, policyId: string, id: string | null, data: RecommendationPayload): Promise<RiskRecommendation> {
    return id
        ? apiFetch<RiskRecommendation>(apiPath`/policies/${policyId}/recommendations/${id}`, { method: 'PUT', token, body: data })
        : apiFetch<RiskRecommendation>(apiPath`/policies/${policyId}/recommendations`, { method: 'POST', token, body: data })
}

export async function deleteRecommendation(token: string, policyId: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/recommendations/${id}`, { method: 'DELETE', token })
}

// ── Stock declarations ───────────────────────────────────────────────────────

export interface StockDeclaration {
    declaration_id: string
    location_id: string | null
    location_label: string | null
    period_month: string
    declared_value: number
    notes: string | null
}

export interface StockCalculation {
    months_declared: number
    average_declared: number
    peak_declared: number
    max_sum_insured: number
    rate_permille: number
    deposit_premium: number
    earned_premium: number
    refund_cap_percent: number
    /** + bill the customer, − refund (capped). */
    adjustment: number
    months_over_max: number
}

export interface StockDeclarationsResponse {
    items: StockDeclaration[]
    monthly: { period_month: string; declared_value: number }[]
    calculation: StockCalculation
    adjustment_note: { endorsement_id: string; note_number: string | null; premium_delta: number } | null
}

export async function getStockDeclarations(token: string, policyId: string): Promise<StockDeclarationsResponse> {
    return apiFetch<StockDeclarationsResponse>(apiPath`/policies/${policyId}/stock-declarations`, { token })
}

export async function saveStockDeclaration(token: string, policyId: string, id: string | null,
    data: { period_month: string; declared_value: number; location_id?: string | null; notes?: string | null }): Promise<StockDeclarationsResponse> {
    return id
        ? apiFetch<StockDeclarationsResponse>(apiPath`/policies/${policyId}/stock-declarations/${id}`, { method: 'PUT', token, body: data })
        : apiFetch<StockDeclarationsResponse>(apiPath`/policies/${policyId}/stock-declarations`, { method: 'POST', token, body: data })
}

export async function deleteStockDeclaration(token: string, policyId: string, id: string): Promise<StockDeclarationsResponse> {
    return apiFetch<StockDeclarationsResponse>(apiPath`/policies/${policyId}/stock-declarations/${id}`, { method: 'DELETE', token })
}

export async function adjustStockDeclarations(token: string, policyId: string, data: { effective_date?: string; endorsement_number?: string } = {})
    : Promise<{ endorsement: PolicyEndorsement; calculation: StockCalculation }> {
    return apiFetch(apiPath`/policies/${policyId}/stock-declarations/adjust`, { method: 'POST', token, body: data })
}

// ── Fleet vehicles ───────────────────────────────────────────────────────────

export interface VehicleFields {
    plate_number: string | null
    chassis_number: string | null
    engine_number: string | null
    vehicle_make: string | null
    vehicle_model: string | null
    vehicle_year: number | null
    vehicle_color: string | null
    vehicle_usage: 'private' | 'commercial' | null
    motor_coverage_type: 'comprehensive' | 'tlo' | null
    tariff_region: number | null
    ext_flood: boolean
    ext_earthquake: boolean
    ext_rsmdcc: boolean
    ext_terrorism: boolean
    tpl_limit: number | null
    pa_driver_limit: number | null
    pa_passenger_limit: number | null
    inspection_date: string | null
    notes: string | null
}

export interface FleetVehicle extends VehicleFields {
    vehicle_id: string
    coverage_id: string
    sum_insured: number
    rate_permille: number
    rate_percent: number
    premium_amount: number
}

export interface VehiclesResponse {
    items: FleetVehicle[]
    summary: { vehicle_count: number; total_sum_insured: number; total_premium: number; comprehensive_count: number; tlo_count: number }
}

export type VehiclePayload = Partial<VehicleFields> & { sum_insured?: number; rate_percent?: number }

export async function getVehicles(token: string, policyId: string): Promise<VehiclesResponse> {
    return apiFetch<VehiclesResponse>(apiPath`/policies/${policyId}/vehicles`, { token })
}

export async function addVehicle(token: string, policyId: string, data: VehiclePayload, change: Change)
    : Promise<{ vehicle: FleetVehicle; endorsement: PolicyEndorsement | null }> {
    return apiFetch(apiPath`/policies/${policyId}/vehicles`, { method: 'POST', token, body: { ...data, ...change } })
}

export async function updateVehicle(token: string, policyId: string, vehicleId: string, data: VehiclePayload, change: Change)
    : Promise<{ vehicle: FleetVehicle; endorsement: PolicyEndorsement | null }> {
    return apiFetch(apiPath`/policies/${policyId}/vehicles/${vehicleId}`, { method: 'PUT', token, body: { ...data, ...change } })
}

export async function deleteVehicle(token: string, policyId: string, vehicleId: string, change: Change): Promise<{ endorsement: PolicyEndorsement | null }> {
    return apiFetch(apiPath`/policies/${policyId}/vehicles/${vehicleId}`, { method: 'DELETE', token, body: change })
}

export async function importVehicles(token: string, policyId: string, rows: VehiclePayload[], change: Change)
    : Promise<{ imported: number; endorsement: PolicyEndorsement | null }> {
    return apiFetch(apiPath`/policies/${policyId}/vehicles/import`, { method: 'POST', token, body: { rows, ...change } })
}

// ── Interested parties ───────────────────────────────────────────────────────

export type PartyType = 'mortgagee' | 'leasing' | 'loss_payee' | 'other'

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
    mortgagee: 'Bank (KPR / kredit)', leasing: 'Leasing / pembiayaan', loss_payee: 'Loss payee', other: 'Lainnya',
}

export interface PolicyParty {
    party_id: string
    party_type: PartyType
    party_type_label: string
    name: string
    branch: string | null
    reference_number: string | null
    tenor_end: string | null
    on_insurer_panel: boolean | null
    qq_in_name: boolean
    notify_renewal: boolean
    proof_sent_date: string | null
    notes: string | null
}

export type PartyPayload = Partial<Omit<PolicyParty, 'party_id' | 'party_type_label'>>

export async function getParties(token: string, policyId: string): Promise<{ items: PolicyParty[]; qq_name: string }> {
    return apiFetch(apiPath`/policies/${policyId}/parties`, { token })
}

export async function saveParty(token: string, policyId: string, partyId: string | null, data: PartyPayload): Promise<{ party: PolicyParty; qq_name: string }> {
    return partyId
        ? apiFetch(apiPath`/policies/${policyId}/parties/${partyId}`, { method: 'PUT', token, body: data })
        : apiFetch(apiPath`/policies/${policyId}/parties`, { method: 'POST', token, body: data })
}

export async function deleteParty(token: string, policyId: string, partyId: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/parties/${partyId}`, { method: 'DELETE', token })
}

// ── Multi-year schedule ──────────────────────────────────────────────────────

export interface PolicyYear {
    year_id: string
    year_no: number
    period_start: string
    period_end: string
    sum_insured: number
    premium_amount: number
    due_date: string | null
    paid_date: string | null
    payment_reference: string | null
    notes: string | null
    is_paid: boolean
}

export interface YearsResponse { items: PolicyYear[]; total_premium: number; unpaid_premium: number }

export async function getYears(token: string, policyId: string): Promise<YearsResponse> {
    return apiFetch<YearsResponse>(apiPath`/policies/${policyId}/years`, { token })
}

export async function generateYears(token: string, policyId: string, years: number, depreciationPercent: number): Promise<YearsResponse> {
    return apiFetch<YearsResponse>(apiPath`/policies/${policyId}/years/generate`, { method: 'POST', token, body: { years, depreciation_percent: depreciationPercent } })
}

export async function updateYear(token: string, policyId: string, yearId: string, data: Partial<Pick<PolicyYear, 'sum_insured' | 'premium_amount' | 'due_date' | 'paid_date' | 'payment_reference' | 'notes'>>): Promise<YearsResponse> {
    return apiFetch<YearsResponse>(apiPath`/policies/${policyId}/years/${yearId}`, { method: 'PUT', token, body: data })
}

export async function clearYears(token: string, policyId: string): Promise<YearsResponse> {
    return apiFetch<YearsResponse>(apiPath`/policies/${policyId}/years`, { method: 'DELETE', token })
}

// ── Policy admin fields (no premium moves) ───────────────────────────────────

export const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'JPY', 'AUD', 'CNY', 'GBP', 'HKD', 'MYR'] as const
export type Currency = typeof CURRENCIES[number]

export interface PolicyAdminPayload {
    currency?: Currency
    exchange_rate?: number
    sum_insured_fc?: number | null
    premium_fc?: number | null
    covernote_number?: string | null
    covernote_date?: string | null
    covernote_expiry?: string | null
    policy_doc_received_date?: string | null
    renewal_lead_days?: number | null
}

export async function updatePolicyAdmin(token: string, policyId: string, data: PolicyAdminPayload): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/admin`, { method: 'PUT', token, body: data })
}

/** "USD 1.250.000,00" style for a foreign-currency amount. */
export function fmtMoneyFC(amount: number, currency: string): string {
    return `${currency} ${amount.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
