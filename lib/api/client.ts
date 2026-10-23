import { getAccessToken, getRefreshToken, saveTokens, clearTokens, isTokenExpired, wasPersisted } from "@/lib/auth/session"
import { RefreshToken } from "@/lib/auth/auth"

// Shared fetch layer for every authenticated call to the Agentra API.
// - Refreshes an expired access token before the request, and retries once on 401.
// - Never calls res.json() blindly: non-JSON bodies (502 HTML pages, 204s) keep their HTTP status.
// - Turns network failures into ApiError(status 0) instead of a bare "Failed to fetch".
// - When the session can't be recovered it clears the tokens and sends the user to /login.

export class ApiError extends Error {
  status: number
  /** Most specific error text the API returned (e.g. `data.error` on a failed delete). */
  detail?: string
  /** Raw parsed JSON body, when there was one. */
  body?: Record<string, unknown>
  /** `error.request_id` from the API envelope, for support to trace the failure. */
  requestId?: string
  /** `error.code` from the API envelope (e.g. ERR_PLAN_005). */
  code?: string
  /** `error.details.required_plan` on plan errors, e.g. "Tim". */
  requiredPlan?: string
  constructor(message: string, status: number, detail?: string, body?: Record<string, unknown>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
    this.body = body
    const env = body?.error as { request_id?: unknown; code?: unknown; details?: { required_plan?: unknown } } | null | undefined
    if (typeof env?.request_id === "string" && env.request_id) this.requestId = env.request_id
    if (typeof env?.code === "string" && env.code) this.code = env.code
    if (typeof env?.details?.required_plan === "string") this.requiredPlan = env.details.required_plan
  }
}

/** True when the API refused a feature because the company's plan doesn't include it (ERR_PLAN_005). */
export function isPlanLockedError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === "ERR_PLAN_005"
}

/** Reads `.status` off anything thrown by the API layer (ApiError or the auth helpers). */
export function errorStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown } | null)?.status
  return typeof s === "number" ? s : undefined
}

/** User-facing message for a caught error, with a fallback for non-Error values. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!BASE_URL && typeof window !== "undefined") {
  console.error("[api] NEXT_PUBLIC_API_URL is not set — all API calls will fail")
}

const NETWORK_ERROR = "Koneksi terputus. Periksa internet Anda."
const SESSION_EXPIRED = "Sesi berakhir. Silakan login kembali."

/**
 * Tagged template that percent-encodes every interpolated path segment:
 * apiPath`/policies/${id}/coverages/${coverageId}`
 */
export function apiPath(strings: TemplateStringsArray, ...values: (string | number)[]): string {
  return strings.reduce(
    (acc, s, i) => acc + s + (i < values.length ? encodeURIComponent(String(values[i])) : ""),
    "",
  )
}

/** Appends a query string only when it is non-empty. */
export function withQuery(path: string, qs: URLSearchParams): string {
  const q = qs.toString()
  return q ? `${path}?${q}` : path
}

// Refresh tokens are usually rotated on use, so several requests refreshing in
// parallel would invalidate each other and log the user out. All callers share
// one in-flight refresh instead.
let refreshInFlight: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const rt = getRefreshToken()
      if (!rt) return null
      try {
        const fresh = await RefreshToken(rt)
        saveTokens(fresh.access_token, fresh.refresh_token, wasPersisted())
        return fresh.access_token
      } catch (err) {
        const status = errorStatus(err)
        // Only a definitive rejection ends the session; a network blip or 5xx must not log the user out.
        if (status === 400 || status === 401 || status === 403) return null
        throw new ApiError(NETWORK_ERROR, 0)
      }
    })().finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

async function getValidToken(hint?: string | null): Promise<string | null> {
  const at = getAccessToken() ?? hint ?? null
  if (!at) return null
  if (!isTokenExpired(at)) return at
  return refreshAccessToken()
}

let redirecting = false

function endSession(): ApiError {
  clearTokens()
  if (typeof window !== "undefined" && !redirecting && !window.location.pathname.startsWith("/login")) {
    redirecting = true
    const from = window.location.pathname + window.location.search
    window.location.assign(`/login?from=${encodeURIComponent(from)}`)
  }
  return new ApiError(SESSION_EXPIRED, 401)
}

function safeParse(text: string): Record<string, unknown> {
  if (!text) return {}
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// The API answers in English; users see Indonesian. Specific phrases first, generic ones after.
const MESSAGE_ID: Array<[RegExp, string]> = [
  [/a master product with this code already exists/i, "Kode produk ini sudah digunakan. Gunakan kode lain."],
  [/(?:an? )?(.+?) with this (.+?) already exists/i, "$1 dengan $2 ini sudah terdaftar."],
  [/(.+?) already exists/i, "$1 sudah terdaftar."],
  [/(.+?) not found/i, "$1 tidak ditemukan."],
  [/(.+?) is required/i, "$1 wajib diisi."],
  [/(.+?) cannot be empty/i, "$1 tidak boleh kosong."],
  [/invalid (.+)/i, "$1 tidak valid."],
  [/^(?:forbidden|access denied|permission denied)\.?$/i, "Anda tidak memiliki akses untuk tindakan ini."],
  [/^unauthorized\.?$/i, "Sesi berakhir. Silakan login kembali."],
  [/^internal server error\.?$/i, "Terjadi kesalahan pada server. Coba lagi nanti."],
  [/too many requests|rate limit/i, "Terlalu banyak permintaan. Coba lagi sebentar lagi."],
  [/^validation (?:failed|error)\.?$/i, "Data yang dikirim belum valid. Periksa kembali isian Anda."],
]

export function translateApiMessage(msg: string): string {
  for (const [re, id] of MESSAGE_ID) {
    if (re.test(msg)) return msg.replace(re, id)
  }
  return msg
}

function errorFromBody(json: Record<string, unknown>, status: number, fallback: string): ApiError {
  // Current envelope: { success: false, error: { code, message } }; older endpoints used status_message.
  const envelope = json.error as { message?: unknown } | null | undefined
  const msg = (typeof envelope?.message === "string" && envelope.message)
    || (typeof json.status_message === "string" && json.status_message)
    || (typeof json.message === "string" && json.message)
    || fallback
  const data = json.data as { error?: unknown } | undefined
  const detail = typeof data?.error === "string" ? translateApiMessage(data.error) : undefined
  return new ApiError(translateApiMessage(msg), status, detail, json)
}

export interface ApiRequestOptions {
  method?: string
  /** Plain objects are sent as JSON; FormData is passed through untouched. */
  body?: unknown
  /** Token the caller already holds; the stored (possibly refreshed) token takes precedence. */
  token?: string | null
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Message used when the API returns an error without one. */
  errorMessage?: string
}

/**
 * Sends an authenticated request and returns the raw Response once it is known to be OK.
 * Use for non-JSON payloads (file exports); everything else should use apiFetch.
 */
export async function apiRequest(path: string, opts: ApiRequestOptions = {}): Promise<Response> {
  const token = await getValidToken(opts.token)
  if (!token) throw endSession()

  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData
  const hasBody = opts.body !== undefined

  const send = (bearer: string) => fetch(`${BASE_URL}/api/v1${path}`, {
    method: opts.method ?? "GET",
    signal: opts.signal,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(hasBody && !isForm ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
    body: !hasBody ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  }).catch((e: unknown) => {
    if (e instanceof DOMException && e.name === "AbortError") throw e
    throw new ApiError(NETWORK_ERROR, 0)
  })

  let res = await send(token)

  if (res.status === 401) {
    const fresh = await refreshAccessToken()
    if (!fresh) throw endSession()
    res = await send(fresh)
    if (res.status === 401) throw endSession()
  }

  if (!res.ok) {
    const json = safeParse(await res.text().catch(() => ""))
    // Reads (page loads, background pickers) show their own inline locked state; only actions the user triggered get the dialog.
    if (opts.method && opts.method !== "GET") announcePlanLimit(json)
    throw errorFromBody(json, res.status, opts.errorMessage ?? `Permintaan gagal (HTTP ${res.status})`)
  }

  return res
}

/** Fired when the API refuses something because of the company's plan (ERR_PLAN_005 feature, ERR_PLAN_006 policy cap). */
export const PLAN_LIMIT_EVENT = "agentra:plan-limit"
export interface PlanLimitDetail { code: string; message: string; requiredPlan?: string }

function announcePlanLimit(json: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const env = json.error as { code?: unknown; message?: unknown; details?: { required_plan?: unknown } } | null | undefined
  const code = typeof env?.code === "string" ? env.code : ""
  if (code !== "ERR_PLAN_005" && code !== "ERR_PLAN_006") return
  const detail: PlanLimitDetail = {
    code,
    message: typeof env?.message === "string" ? env.message : "Fitur ini tidak tersedia di paket Anda.",
    requiredPlan: typeof env?.details?.required_plan === "string" ? env.details.required_plan : undefined,
  }
  window.dispatchEvent(new CustomEvent<PlanLimitDetail>(PLAN_LIMIT_EVENT, { detail }))
}

/** Sends an authenticated request and returns the `data` field of the JSON envelope. */
export async function apiFetch<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const res = await apiRequest(path, opts)
  const json = safeParse(await res.text())
  return json.data as T
}

/**
 * Like apiFetch, but resolves to `notFoundValue` on 404 — several list endpoints
 * answer 404 when nothing matches the filter, which is not an error for the UI.
 */
export async function apiFetchOr<T>(path: string, opts: ApiRequestOptions, notFoundValue: T): Promise<T> {
  try {
    return await apiFetch<T>(path, opts)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return notFoundValue
    throw err
  }
}

/** Downloads a file response, using the server's Content-Disposition filename when present. */
export async function apiDownload(path: string, opts: ApiRequestOptions, fallbackName: string): Promise<{ blob: Blob; filename: string }> {
  const res = await apiRequest(path, opts)
  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\r\n]+)"?/i)
  let filename = fallbackName
  if (match?.[1]) {
    try { filename = decodeURIComponent(match[1]) } catch { filename = match[1] }
  }
  return { blob, filename }
}

/** Triggers a browser download for a Blob without revoking the URL before the download starts. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
