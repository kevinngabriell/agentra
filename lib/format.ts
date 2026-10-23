export function fmtIDR(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID")
}

export function fmtIDRCompact(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`
  return fmtIDR(n)
}

// ── Dates ────────────────────────────────────────────────────────────────────
// `new Date().toISOString()` is UTC, so between 00:00 and 07:00 WIB it still
// reports yesterday (and on the 1st, last month). These use the local calendar.

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Today's local date as "YYYY-MM-DD". */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** The local month as "YYYY-MM". */
export function localMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** Shifts a "YYYY-MM" string by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  return localMonth(new Date(y, m - 1 + delta, 1))
}

/** "YYYY-MM" → "Oktober 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
}

/** Adds whole years/days to a "YYYY-MM-DD" date without any time-zone drift. */
export function addToISODate(iso: string, { years = 0, days = 0 }: { years?: number; days?: number }): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y + years, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

// ── People ───────────────────────────────────────────────────────────────────

/** Up to two initials from a display name; "??" when there is nothing usable. */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "??"
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "??"
}

/**
 * wa.me link for an Indonesian phone number. Numbers are stored in local form
 * ("0812…"), but wa.me needs the international form without "+" ("62812…").
 */
export function whatsappUrl(phone: string): string | null {
  let digits = phone.replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("0")) digits = "62" + digits.slice(1)
  else if (digits.startsWith("8")) digits = "62" + digits
  return `https://wa.me/${digits}`
}

export function fmtFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}
