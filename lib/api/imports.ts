import { apiDownload, apiFetch } from "./client"

export type ImportKind = 'customers' | 'policies'
export type ImportTemplateFormat = 'xlsx' | 'csv'

export interface ImportRowError {
    row: number
    reason: string
}

export interface ImportPreviewRow {
    row: number
    errors: string[]
    // customers
    customer_type?: string
    display_name?: string
    identifier?: string
    // policies
    policy_number?: string
    customer_name?: string | null
    insurer_name?: string | null
    product_type?: string
    premium_amount?: number
}

/** Answer to a dry run: nothing was saved. `preview` covers only the first rows; `failed` covers every invalid row. */
export interface ImportPreviewResult {
    dry_run: true
    total: number
    valid_count: number
    failed_count: number
    failed: ImportRowError[]
    preview: ImportPreviewRow[]
}

export interface ImportResult {
    dry_run: false
    total: number
    inserted: number
    failed_count: number
    failed: ImportRowError[]
}

function importForm(file: File, dryRun: boolean): FormData {
    const formData = new FormData()
    formData.append('file', file)
    if (dryRun) formData.append('dry_run', '1')
    return formData
}

// FormData: the client leaves Content-Type unset so the browser adds the multipart boundary.
export async function previewImport(token: string, kind: ImportKind, file: File): Promise<ImportPreviewResult> {
    return apiFetch<ImportPreviewResult>(`/${kind}/import`, {
        method: 'POST', token, body: importForm(file, true), errorMessage: 'Gagal memeriksa file',
    })
}

export async function runImport(token: string, kind: ImportKind, file: File): Promise<ImportResult> {
    return apiFetch<ImportResult>(`/${kind}/import`, {
        method: 'POST', token, body: importForm(file, false), errorMessage: 'Import gagal',
    })
}

export async function downloadImportTemplate(token: string, kind: ImportKind, format: ImportTemplateFormat) {
    return apiDownload(`/${kind}/import/template?format=${format}`, { token, errorMessage: 'Gagal mengunduh template' },
        `template-import-${kind}.${format}`)
}
