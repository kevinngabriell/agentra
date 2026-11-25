import { apiFetch, apiPath, withQuery } from "./client"

// Occupation codes, regulator tariff bands (entered by the company) and rate checks (tariffs/index.php, v2.1.0).

export type TariffType = 'property' | 'earthquake' | 'motor'

export const TARIFF_TYPE_LABELS: Record<TariffType, string> = { property: 'Properti (okupasi × kelas)', earthquake: 'Gempa bumi (zona)', motor: 'Kendaraan bermotor' }

/** How the band key is written for each tariff type. */
export const BAND_KEY_HINTS: Record<TariffType, string> = {
    property:   '<kode okupasi atau kelas tarif>:<kelas konstruksi>, mis. 2976:I atau GUDANG:II',
    earthquake: 'zone:<1-5>, mis. zone:4',
    motor:      '<kategori 1-5>:<wilayah 1-3>:<comprehensive|tlo>, mis. 3:2:comprehensive',
}

export interface Occupation { occupation_id: string; code: string; description: string; tariff_class: string | null; notes: string | null }

export interface TariffBand {
    band_id: string
    tariff_type: TariffType
    band_key: string
    description: string | null
    rate_min: number | null
    rate_max: number | null
    discount_max_percent: number | null
}

export type TariffVerdict = 'within' | 'below' | 'above' | 'no_band'

export interface TariffCheck {
    type: TariffType
    band_key: string
    rate_permille: number
    verdict: TariffVerdict
    band: { rate_min: number | null; rate_max: number | null; discount_max_percent: number | null; description: string | null } | null
    motor_category: number | null
}

export async function getOccupations(token: string, search = ''): Promise<Occupation[]> {
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    return (await apiFetch<{ items: Occupation[] }>(withQuery('/tariffs/occupations', qs), { token })).items
}

export async function saveOccupation(token: string, id: string | null, data: Partial<Omit<Occupation, 'occupation_id'>>): Promise<Occupation> {
    return id
        ? apiFetch<Occupation>(apiPath`/tariffs/occupations/${id}`, { method: 'PUT', token, body: data })
        : apiFetch<Occupation>('/tariffs/occupations', { method: 'POST', token, body: data })
}

export async function deleteOccupation(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/tariffs/occupations/${id}`, { method: 'DELETE', token })
}

export async function importOccupations(token: string, rows: Partial<Omit<Occupation, 'occupation_id'>>[]): Promise<{ imported: number }> {
    return apiFetch<{ imported: number }>('/tariffs/occupations/import', { method: 'POST', token, body: { rows } })
}

export async function getTariffBands(token: string, type?: TariffType): Promise<TariffBand[]> {
    const qs = new URLSearchParams()
    if (type) qs.set('tariff_type', type)
    return (await apiFetch<{ items: TariffBand[] }>(withQuery('/tariffs/bands', qs), { token })).items
}

export async function saveTariffBand(token: string, id: string | null, data: Partial<Omit<TariffBand, 'band_id'>>): Promise<TariffBand> {
    return id
        ? apiFetch<TariffBand>(apiPath`/tariffs/bands/${id}`, { method: 'PUT', token, body: data })
        : apiFetch<TariffBand>('/tariffs/bands', { method: 'POST', token, body: data })
}

export async function deleteTariffBand(token: string, id: string): Promise<void> {
    await apiFetch<unknown>(apiPath`/tariffs/bands/${id}`, { method: 'DELETE', token })
}

export async function checkTariff(token: string, params: Record<string, string | number>): Promise<TariffCheck> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== '' && v !== undefined) qs.set(k, String(v))
    return apiFetch<TariffCheck>(withQuery('/tariffs/check', qs), { token })
}

export const TARIFF_VERDICT_TEXT: Record<TariffVerdict, string> = {
    within: 'Rate sesuai rentang tarif',
    below: 'Rate DI BAWAH batas bawah tarif',
    above: 'Rate DI ATAS batas atas tarif',
    no_band: 'Belum ada rentang tarif untuk kombinasi ini (isi di Pengaturan → Tarif & Okupasi)',
}
