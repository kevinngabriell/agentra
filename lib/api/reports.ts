import { apiDownload, apiFetch, withQuery } from "./client"

export type ReportKey =
    | 'payment-consolidation' | 'lapsed' | 'portfolio' | 'retention'
    | 'commissions' | 'sub-agent-production' | 'claims' | 'commission-list'

export type ReportColumnType = 'text' | 'int' | 'money' | 'pct' | 'date'

export interface ReportColumn {
    key: string
    label: string
    type: ReportColumnType
}

/** Every report answers in this one shape, so a single table component renders them all. */
export interface Report {
    title: string
    columns: ReportColumn[]
    rows: Record<string, string | number | null>[]
    totals?: Record<string, number>
}

export interface ReportParams {
    year?: number
    month?: string
    insurer_id?: string
    product_type?: string
    group_by?: string
    status?: string
}

function toQuery(params: ReportParams, extra?: Record<string, string>): URLSearchParams {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...params, ...extra })) {
        if (v !== undefined && v !== '') qs.set(k, String(v))
    }
    return qs
}

export async function getReport(token: string, key: ReportKey, params: ReportParams = {}, signal?: AbortSignal): Promise<Report> {
    return apiFetch<Report>(withQuery(`/reports/${key}`, toQuery(params)), { token, signal })
}

/** Excel download of the same report, with the same filters. */
export async function exportReport(token: string, key: ReportKey, params: ReportParams = {}) {
    return apiDownload(withQuery(`/reports/${key}`, toQuery(params, { format: 'xlsx' })), { token, errorMessage: 'Gagal mengekspor laporan' }, `laporan-${key}.xlsx`)
}
