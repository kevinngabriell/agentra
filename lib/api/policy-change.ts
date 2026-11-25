// How a change to an issued policy is classified. Mirrors helpers/policy_change.php.
//   correction   the agent fixes an input mistake: reason required, no endorsement.
//   endorsement  the insurer changed the contract: endorsement number and effective date are kept in the log.

export type ChangeKind = 'correction' | 'endorsement'

export interface ChangeInfo {
    change_kind: ChangeKind
    reason: string
    endorsement_number: string
    effective_date: string
    /** How an endorsement's premium difference is billed (helpers/endorsements.php). Default pro_rata. */
    calc_method?: EndorsementCalcMethod
    /** Stamp duty / policy fee charged on the endorsement note, plain digits. */
    endorsement_materai?: string
    endorsement_biaya_polis?: string
}

export type EndorsementCalcMethod = 'pro_rata' | 'short_period' | 'flat' | 'manual'

export const CALC_METHOD_LABELS: Record<EndorsementCalcMethod, string> = {
    pro_rata:     'Pro-rata (sisa hari)',
    short_period: 'Skala jangka pendek',
    flat:         'Penuh setahun',
    manual:       'Nominal dari penanggung',
}

export const CHANGE_REASON_MIN = 5

export function newChange(kind: ChangeKind = 'correction'): ChangeInfo {
    return { change_kind: kind, reason: '', endorsement_number: '', effective_date: '' }
}

/** A message for the first thing missing, or null when the change is ready to send. */
export function validateChange(c: ChangeInfo): string | null {
    if (c.change_kind === 'correction' && c.reason.trim().length < CHANGE_REASON_MIN) {
        return `Alasan koreksi wajib diisi (minimal ${CHANGE_REASON_MIN} karakter)`
    }
    return null
}

/** The request fields for a change: only what applies to its kind, empty values left out. */
export function changeFields(c: ChangeInfo): Partial<ChangeInfo> {
    if (c.change_kind === 'correction') return { change_kind: 'correction', reason: c.reason.trim() }
    return {
        change_kind: 'endorsement',
        ...(c.endorsement_number.trim() ? { endorsement_number: c.endorsement_number.trim() } : {}),
        ...(c.effective_date ? { effective_date: c.effective_date } : {}),
        ...(c.reason.trim() ? { reason: c.reason.trim() } : {}),
        ...(c.calc_method && c.calc_method !== 'manual' ? { calc_method: c.calc_method } : {}),
        ...(c.endorsement_materai ? { endorsement_materai: c.endorsement_materai } : {}),
        ...(c.endorsement_biaya_polis ? { endorsement_biaya_polis: c.endorsement_biaya_polis } : {}),
    }
}
