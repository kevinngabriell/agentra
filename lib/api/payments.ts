import { apiFetch, apiPath, withQuery } from "@/lib/api/client"

export type PaymentUrgency = 'upcoming' | 'due_soon' | 'overdue' | 'cancellation_risk'

export const PAYMENT_URGENCY_LABELS: Record<PaymentUrgency, string> = {
    upcoming:          'Belum jatuh tempo',
    due_soon:          'Segera jatuh tempo',
    overdue:           'Lewat jatuh tempo',
    cancellation_risk: 'Berisiko dibatalkan',
}

export const PAYMENT_URGENCY_COLORS: Record<PaymentUrgency, { bg: string; color: string }> = {
    upcoming:          { bg: '#F1F5F9', color: '#64748B' },
    due_soon:          { bg: '#FEF3C7', color: '#B45309' },
    overdue:           { bg: '#FEE2E2', color: '#DC2626' },
    cancellation_risk: { bg: '#DC2626', color: '#FFFFFF' },
}

export interface ApiInstallment {
    installment_id: string
    seq: number
    due_date: string
    amount: number
    paid_date: string | null
    payment_reference: string | null
    is_paid: boolean
    days_until_due: number | null
    urgency: PaymentUrgency | null
}

export interface PolicyPayments {
    policy_id: string
    payment_status: 'unpaid' | 'paid' | 'confirmed'
    expected_amount: number
    payment_due_date: string | null
    effective_due_date: string
    is_default_due_date: boolean
    payment_date: string | null
    payment_reference: string | null
    days_until_due: number | null
    urgency: PaymentUrgency | null
    installments: ApiInstallment[]
}

export interface OverduePremium {
    policy_id: string
    policy_number: string
    product_type: string
    customer_id: string
    customer_name: string
    customer_type: 'individual' | 'company'
    whatsapp: string | null
    insurer_short_name: string | null
    coverage_start: string
    coverage_end: string
    due_date: string
    amount_due: number
    billed_amount: number
    is_installment: boolean
    days_until_due: number
    urgency: PaymentUrgency
}

export interface OverduePremiumSummary {
    overdue_count: number
    overdue_amount: number
    due_soon_count: number
    due_soon_amount: number
    cancellation_risk_count: number
}

export type OverdueScope = 'attention' | 'overdue' | 'due_soon' | 'all'

export async function getPolicyPayments(token: string, policyId: string): Promise<PolicyPayments> {
    return apiFetch<PolicyPayments>(apiPath`/policies/${policyId}/payments`, { token })
}

export interface SavePaymentsPayload {
    /** null / "" resets to the default (coverage start + 30 days). */
    payment_due_date?: string | null
    /** [] clears the schedule; otherwise 2-12 rows whose amounts sum to the billed premium. */
    installments?: { due_date: string; amount: number }[]
}

export async function savePolicyPayments(token: string, policyId: string, data: SavePaymentsPayload): Promise<PolicyPayments> {
    return apiFetch<PolicyPayments>(apiPath`/policies/${policyId}/payments`, { method: 'PUT', token, body: data })
}

export interface PayPayload {
    payment_date?: string
    payment_reference?: string
}

export async function payInstallment(token: string, policyId: string, installmentId: string, data: PayPayload): Promise<PolicyPayments> {
    return apiFetch<PolicyPayments>(apiPath`/policies/${policyId}/payments/${installmentId}/pay`, { method: 'POST', token, body: data })
}

export async function getOverduePremiums(
    token: string,
    scope: OverdueScope = 'attention',
): Promise<{ data: OverduePremium[]; summary: OverduePremiumSummary }> {
    const qs = new URLSearchParams({ scope })
    return apiFetch<{ data: OverduePremium[]; summary: OverduePremiumSummary }>(withQuery('/policies/overdue-premiums', qs), { token })
}
