import { apiFetch, apiPath } from "./client"
import type { ChangeInfo } from "./policy-change"

// Deductibles (risiko sendiri), clauses and extensions on a policy. Mirrors policies/terms.php.

export type TermType = 'deductible' | 'clause' | 'extension'
export type DeductibleType = 'fixed' | 'percent_claim' | 'percent_sum_insured'

export const TERM_TYPE_LABELS: Record<TermType, string> = {
    deductible: 'Risiko Sendiri',
    clause:     'Klausula',
    extension:  'Perluasan Jaminan',
}

export const DEDUCTIBLE_TYPE_LABELS: Record<DeductibleType, string> = {
    fixed:               'Nominal tetap',
    percent_claim:       '% dari nilai klaim',
    percent_sum_insured: '% dari nilai pertanggungan',
}

export interface PolicyTerm {
    term_id: string
    /** Null = applies to the whole policy. */
    coverage_id: string | null
    coverage_type: string | null
    coverage_label: string | null
    term_type: TermType
    /** Catalog code when picked from the list, null for free text. */
    clause_code: string | null
    title: string
    description: string | null
    deductible_type: DeductibleType | null
    /** The fixed amount, or the minimum for a percent deductible. */
    deductible_amount: number | null
    deductible_percent: number | null
    created_at: string
    updated_at: string
}

export interface PolicyTermPayload {
    term_type?: TermType
    coverage_id?: string | null
    clause_code?: string | null
    title?: string | null
    description?: string | null
    deductible_type?: DeductibleType | null
    deductible_amount?: number | null
    deductible_percent?: number | null
}

export async function getPolicyTerms(token: string, policyId: string): Promise<PolicyTerm[]> {
    const res = await apiFetch<{ items: PolicyTerm[] }>(apiPath`/policies/${policyId}/terms`, { token })
    return res.items ?? []
}

export async function addPolicyTerm(token: string, policyId: string, data: PolicyTermPayload, change?: Partial<ChangeInfo>): Promise<PolicyTerm> {
    return apiFetch<PolicyTerm>(apiPath`/policies/${policyId}/terms`, { method: 'POST', token, body: { ...data, ...change } })
}

export async function updatePolicyTerm(
    token: string,
    policyId: string,
    termId: string,
    data: PolicyTermPayload,
    change?: Partial<ChangeInfo>,
): Promise<PolicyTerm> {
    return apiFetch<PolicyTerm>(apiPath`/policies/${policyId}/terms/${termId}`, { method: 'PUT', token, body: { ...data, ...change } })
}

export async function deletePolicyTerm(token: string, policyId: string, termId: string, change?: Partial<ChangeInfo>): Promise<void> {
    await apiFetch<unknown>(apiPath`/policies/${policyId}/terms/${termId}`, { method: 'DELETE', token, body: change })
}
