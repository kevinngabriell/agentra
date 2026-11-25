// Minimal CSV reader for the schedule imports (fleet vehicles, travellers, occupation codes).
// Handles quoted fields, escaped quotes, CRLF, and ; or , separators (Excel in Indonesian locale saves with ;).

/** Rows of cells. The separator is taken from the first line: ";" when it has more of them than ",". */
export function parseCsv(text: string): string[][] {
    const src = text.replace(/^﻿/, "")
    const firstLine = src.split(/\r?\n/, 1)[0] ?? ""
    const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ","
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let quoted = false
    for (let i = 0; i < src.length; i++) {
        const ch = src[i]
        if (quoted) {
            if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
            else if (ch === '"') quoted = false
            else cell += ch
        } else if (ch === '"') quoted = true
        else if (ch === sep) { row.push(cell); cell = "" }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n") i++
            row.push(cell); cell = ""
            if (row.some((c) => c.trim() !== "")) rows.push(row)
            row = []
        } else cell += ch
    }
    row.push(cell)
    if (row.some((c) => c.trim() !== "")) rows.push(row)
    return rows
}

/**
 * Rows as objects keyed by the header, matched case-insensitively against `aliases`
 * ({ field: ["header a", "header b"] }). Unknown columns are ignored.
 */
export function csvRecords<K extends string>(text: string, aliases: Record<K, string[]>): Record<K, string>[] {
    const rows = parseCsv(text)
    if (rows.length < 2) return []
    const header = rows[0].map((h) => h.trim().toLowerCase())
    const index = {} as Record<K, number>
    for (const key of Object.keys(aliases) as K[]) {
        index[key] = header.findIndex((h) => aliases[key].map((a) => a.toLowerCase()).includes(h))
    }
    return rows.slice(1).map((r) => {
        const out = {} as Record<K, string>
        for (const key of Object.keys(aliases) as K[]) out[key] = index[key] >= 0 ? (r[index[key]] ?? "").trim() : ""
        return out
    })
}

/** "1.500.000" / "1,500,000" / "1500000" → 1500000; "" → null. */
export function csvNumber(v: string): number | null {
    const digits = v.replace(/[^\d,.-]/g, "")
    if (!digits) return null
    // Thousands separators: drop dots and commas that are followed by exactly 3 digits.
    const normalized = digits.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".")
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
}

/** dd/mm/yyyy, dd-mm-yyyy or yyyy-mm-dd → yyyy-mm-dd; anything else → "". */
export function csvDate(v: string): string {
    const s = v.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""
}

/** Reads a picked file as text. */
export function readFileText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result ?? ""))
        r.onerror = () => reject(r.error)
        r.readAsText(file)
    })
}
