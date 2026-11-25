import { apiFetch, apiPath, withQuery } from "./client"
import type { EndorsementCalcMethod } from "./policy-change"

// Premium ledger of mid-term changes and cancellation. Mirrors policies/endorsements.php (v2.1.0).
// The policy's original debit note stays as issued; every premium-changing endorsement is billed or
// refunded through its own note, with its own commission.

export type EndorsementType =
    | 'sum_insured_change' | 'add_item' | 'remove_item' | 'extension' | 'insured_change'
    | 'period_change' | 'cancellation' | 'stock_adjustment' | 'other'

export const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
    sum_insured_change: 'Perubahan nilai pertanggungan',
    add_item:           'Tambah item / objek',
    remove_item:        'Hapus item / objek',
    extension:          'Perluasan jaminan',
    insured_change:     'Ganti tertanggung',
    period_change:      'Perubahan periode',
    cancellation:       'Pembatalan polis',
    stock_adjustment:   'Penyesuaian stok deklarasi',
    other:              'Lainnya',
}

export type EndorsementCommissionStatus = 'included' | 'pending' | 'received' | 'clawed_back' | 'waived'

export const ENDORSEMENT_COMMISSION_LABELS: Record<EndorsementCommissionStatus, string> = {
    included:    'Masuk komisi polis',
    pending:     'Menunggu',
    received:    'Diterima',
    clawed_back: 'Ditarik kembali',
    waived:      'Tidak ada',
}

export interface PolicyEndorsement {
    endorsement_id: string
    policy_id: string
    policy_number: string
    endorsement_number: string | null
    endorsement_type: EndorsementType
    effective_date: string
    description: string | null
    calc_method: EndorsementCalcMethod | 'full'
    annual_premium_delta: number
    premium_delta: number
    sum_insured_delta: number
    materai_amount: number
    biaya_polis: number
    commission_rate: number
    commission_tax_rate: number
    commission_delta: number
    commission_tax_delta: number
    net_commission_delta: number
    /** premium_delta + fees; negative for a credit note. */
    gross_amount: number
    note_type: 'debit' | 'credit' | 'none'
    note_number: string | null
    due_date: string | null
    settled_date: string | null
    settled_reference: string | null
    is_settled: boolean
    commission_status: EndorsementCommissionStatus
    commission_settled_date: string | null
    source: string
    is_void: boolean
    created_at: string
    // company-wide list only
    customer_name?: string
    insurer_short_name?: string | null
    product_type?: string
}

export interface PolicyBillingSummary {
    endorsement_count: number
    issued_premium: number
    issued_customer_premium: number
    endorsement_premium: number
    endorsement_fees: number
    /** Original debit note premium + every endorsement note. */
    billed_premium: number
    endorsement_commission: number
    open_debit_amount: number
    open_credit_amount: number
    debit_note_number?: string | null
}

export interface PolicyEndorsementsResponse {
    items: PolicyEndorsement[]
    summary: PolicyBillingSummary
    cancellation: { date: string; reason: CancellationReason; method: CancellationMethod; note: string | null } | null
}

export async function getPolicyEndorsements(token: string, policyId: string): Promise<PolicyEndorsementsResponse> {
    return apiFetch<PolicyEndorsementsResponse>(apiPath`/policies/${policyId}/endorsements`, { token })
}

export interface EndorsementPayload {
    endorsement_type: EndorsementType
    effective_date: string
    endorsement_number?: string
    description?: string
    calc_method: EndorsementCalcMethod
    /** Full-year premium change; signed. */
    annual_premium_delta?: number
    /** Charged amount for calc_method = manual; signed. */
    premium_delta?: number
    sum_insured_delta?: number
    endorsement_materai?: number
    endorsement_biaya_polis?: number
    due_date?: string
    /** Also move the policy's annual premium / sum insured (policies priced without coverage items). */
    apply_to_contract?: boolean
}

export interface EndorsementPreview {
    premium_delta: number
    commission_delta: number
    commission_tax_delta: number
    gross_amount: number
    pro_rata_factor: number
    remaining_days: number
    period_days: number
    short_period_percent: number
}

export async function previewEndorsement(token: string, policyId: string, data: Partial<EndorsementPayload>): Promise<EndorsementPreview> {
    return apiFetch<EndorsementPreview>(apiPath`/policies/${policyId}/endorsements/preview`, { method: 'POST', token, body: data })
}

export async function addEndorsement(token: string, policyId: string, data: EndorsementPayload): Promise<PolicyEndorsement> {
    return apiFetch<PolicyEndorsement>(apiPath`/policies/${policyId}/endorsements`, { method: 'POST', token, body: data })
}

export interface EndorsementUpdate {
    endorsement_number?: string | null
    description?: string | null
    due_date?: string | null
    settled_date?: string | null
    settled_reference?: string | null
    commission_status?: EndorsementCommissionStatus
    commission_settled_date?: string | null
    is_void?: boolean
}

export async function updateEndorsement(token: string, policyId: string, endorsementId: string, data: EndorsementUpdate): Promise<PolicyEndorsement> {
    return apiFetch<PolicyEndorsement>(apiPath`/policies/${policyId}/endorsements/${endorsementId}`, { method: 'PUT', token, body: data })
}

export interface CompanyEndorsementsResponse {
    items: PolicyEndorsement[]
    summary: { count: number; debit_open: number; credit_open: number; commission_pending: number }
}

export async function getCompanyEndorsements(
    token: string,
    params: { status?: 'all' | 'open_debit' | 'open_credit' | 'commission_pending'; insurer_id?: string; month?: string; policy_id?: string } = {},
): Promise<CompanyEndorsementsResponse> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
    return apiFetch<CompanyEndorsementsResponse>(withQuery('/policies/endorsements', qs), { token })
}

// ── Cancellation ─────────────────────────────────────────────────────────────

export type CancellationReason = 'insured_request' | 'non_payment' | 'sold' | 'moved_insurer' | 'insurer_request' | 'other'
export type CancellationMethod = 'short_period' | 'pro_rata' | 'full' | 'none' | 'manual'

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
    insured_request: 'Permintaan tertanggung',
    non_payment:     'Premi tidak dibayar',
    sold:            'Objek dijual',
    moved_insurer:   'Pindah ke asuransi lain',
    insurer_request: 'Permintaan penanggung',
    other:           'Lainnya',
}

export const CANCELLATION_METHOD_LABELS: Record<CancellationMethod, string> = {
    short_period: 'Skala jangka pendek (tertanggung membatalkan)',
    pro_rata:     'Pro-rata (penanggung membatalkan)',
    full:         'Batal sejak awal (premi kembali penuh)',
    none:         'Tanpa pengembalian premi',
    manual:       'Nominal dari penanggung',
}

export interface CancellationPayload {
    cancellation_date: string
    reason: CancellationReason
    method: CancellationMethod
    refund_amount?: number
    note?: string
    endorsement_number?: string
}

export interface CancellationPreview {
    billed_premium: number
    refund_amount: number
    retained_premium: number
    commission_clawback: number
    commission_tax_clawback: number
    months_on_risk: number
    short_period_percent: number
    pro_rata_factor: number
    payment_status: string
}

export async function previewCancellation(token: string, policyId: string, data: CancellationPayload): Promise<CancellationPreview> {
    return apiFetch<CancellationPreview>(apiPath`/policies/${policyId}/cancel/preview`, { method: 'POST', token, body: data })
}

export async function cancelPolicy(token: string, policyId: string, data: CancellationPayload): Promise<{ endorsement: PolicyEndorsement; refund_amount: number }> {
    return apiFetch<{ endorsement: PolicyEndorsement; refund_amount: number }>(apiPath`/policies/${policyId}/cancel`, { method: 'POST', token, body: data })
}
