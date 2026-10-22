# Code Review Report — Agentra Insurance CRM (second pass)

**Project**: Agentra — Next.js 16.2.4 (App Router) · React 19 · Chakra UI v3 · Tailwind v4 · TypeScript
**Date**: 2026-10-21
**Scope**: `app/`, `components/`, `contexts/`, `lib/`, `proxy.ts`, `next.config.ts`, re-reviewed against the uncommitted first-pass diff. SEO metadata, robots/sitemap/manifest, icons and `public/` were out of scope.

## Summary

| Severity | Findings | Fixed | Remaining |
|----------|---------:|------:|----------:|
| Critical | 11 | 8 | 3 |
| Medium   | 30 | 28 | 2 |
| Minor    | 33 | 32 | 1 |
| **Total** | **74** | **68** | **6** |

**How the first pass held up**
- **Several "FIXED" items were never in effect.** `lib/api/client.ts` had no importers. That means C-05, C-06, M-08, M-09, M-12, M-14, M-15, m-03, m-11, m-15 and m-17 were not actually fixed, and every page except the dashboard still broke once the access token expired (see C-06).
- **The first-pass diff added these regressions:**
  - Koreksi button lost its `onClick` (C-01)
  - Valid product codes were rejected (C-02)
  - The build broke on type errors (C-03)
  - Event handlers were added to a Server Component (C-04)
  - Proxy redirect loop (C-05)
  - Dark mode no longer forced off (M-01)
  - Delete dialogs stayed open after deleting (M-02)
  - Delete errors were written to state that no visible UI showed (M-03)
  - `<button>` nested inside `<a>` (M-21)
  - "Lewat 0h" label on the due date (m-01)
- **"Lint-verified" was not true.** `npm run lint` reported 87 errors and 20 warnings, and `tsc` failed.
- **Checked and correct:** error boundaries exist, new static routes, `lang="id"`, server-side logout call, PII masking, nested-route active state, `URLSearchParams` usage, password/phone rules on register, the koreksi rename, and branding in MobileHeader.

**Verification after this pass:** `npm run lint` exits 0 with no warnings, `npx tsc --noEmit` exits 0, and `npm run build` exits 0 (25 routes, Proxy registered). A `next start` smoke test confirmed:
- `/agentra/*` redirects to `/login?from=…` without the cookie.
- `/login` with the cookie is no longer redirected (no loop).
- `/agentra/commisions` returns 308 to `/agentra/commissions`.
- The CSP header is emitted.
- `/` renders the skip link.

---

## Critical

### C-01: "Koreksi Data Polis" button had no action (regression)
- **Status**: FIXED
- **File**: `app/agentra/policies/[id]/page.tsx:2485`
- **Description**: The first-pass diff removed `w`, styling and `onClick={openKoreksiDialog}` from the button, so it rendered as an unstyled button that did nothing. ESLint confirmed this: `openKoreksiDialog` was unused.
- **Fix**: Restored the props and the handler.

### C-02: Policy creation rejected valid master-product codes (regression)
- **Status**: FIXED
- **File**: `app/agentra/policies/new/page.tsx:479`
- **Description**: The "C-09" fix checked `product_type` against a hard-coded enum. The dropdown options come from each agency's master products, whose codes are agency-defined (the code itself already treats `"kebakaran"` as fire). Any such code was blocked with "Jenis produk tidak valid".
- **Fix**: The value is now validated against the options actually offered (`productOptions`). Policy number is also required, and the end date must be after the start date.

### C-03: Build broken by type errors from the first-pass diff
- **Status**: FIXED
- **File**: `components/layout/Sidebar.tsx:88`, `app/agentra/dashboard/page.tsx:111`
- **Description**: `next build` runs TypeScript. Two props added by the diff failed it: `align` on a Chakra `Button` and `variant="link"`, which Chakra v3 does not have.
- **Fix**: `alignItems` on the Sidebar button. On the dashboard, "Lihat Semua" is now a plain `next/link`.

### C-04: Event handlers in a Server Component (regression)
- **Status**: FIXED
- **File**: `app/page.tsx:14`
- **Description**: The skip link added `onFocus`/`onBlur` to an `<a>` in a Server Component. RSC rejects function props, so rendering `/` throws.
- **Fix**: The reveal-on-focus is done in CSS with Tailwind (`sr-only focus:not-sr-only …`).

### C-05: Proxy redirect loop and a flag that outlives the tokens
- **Status**: FIXED
- **File**: `proxy.ts:12`, `app/login/page.tsx:13`
- **Description**: The proxy sent `/login` to the dashboard whenever `agentra_authed` was present. The cookie lives for the whole browser session, but `sessionStorage` tokens are per tab. In a new tab the dashboard found no token and went to `/login`, and the proxy sent it back: an endless loop. Users who had tokens from before the deploy but no cookie were locked out the other way.
- **Fix**:
  - The proxy only guards `/agentra/:path*` (it no longer runs on every request).
  - Auth pages are no longer bounced.
  - The login page restores the cookie for a still-present token and continues to a validated `from` target (`/agentra…` only, so no open redirect).

### C-06: Shared API client was dead code; tokens expired mid-session on every page
- **Status**: FIXED
- **File**: `lib/api/client.ts`, all of `lib/api/*.ts`
- **Description**: No module imported the client. All 12 API modules kept their own `fetch` copies, which meant:
  - Unguarded `res.json()` (a 502 HTML page became a `SyntaxError` with no status).
  - No token refresh, and no 401 handling.
  - Unencoded path segments and `any` errors.
  - `"undefined/api/v1"` when the base URL env var was missing.
- **Fix**: Every module now goes through `apiFetch` / `apiFetchOr` / `apiDownload`. The client:
  - Refreshes the token before it expires and retries once on 401.
  - On an unrecoverable session, clears tokens and redirects to `/login?from=`.
  - Parses the body safely and keeps the HTTP status.
  - Returns `ApiError` with `status`/`detail`, and status 0 on network failure.
  - Supports `AbortSignal` and FormData.
  - Percent-encodes interpolated path segments via the ``apiPath`…` `` tagged template.

  Public function signatures are unchanged, so callers did not need edits.

### C-07: Parallel requests raced on refresh-token rotation
- **Status**: FIXED
- **File**: `lib/api/client.ts:65`
- **Description**: Pages fire 3–4 requests at once. With an expired token, each one called `/auth/refresh` with the same refresh token. With rotation, all but one fail, and the user is logged out.
- **Fix**: A single in-flight refresh promise is shared by all callers.

### C-08: Settings could overwrite real data with defaults after a failed load
- **Status**: FIXED
- **File**: `app/agentra/settings/page.tsx:242`, `:503`
- **Description**:
  - If `GET notification-settings` failed, the form showed defaults, and "Simpan" overwrote the user's real settings.
  - If an insurer's product config failed to load, saving reset every product to 0% / inactive.
- **Fix**:
  - Load state is tracked, and saving is disabled with an explanation after a failed load.
  - Commission must be within 0–100.
  - Notification day and reminder ranges are validated, and at least one weekday is required.

### C-09: Access and refresh tokens in `localStorage`/`sessionStorage` (first-pass C-01)
- **Status**: REMAINING (mitigated)
- **File**: `lib/auth/session.ts`
- **Description**: Any XSS can read both tokens.
- **Mitigations applied**:
  - CSP `connect-src` is limited to `'self'` plus the API origin, so injected script can't send tokens to arbitrary hosts.
  - `'unsafe-eval'` is dev-only; `object-src 'none'` is set (M-19).
  - Stale tokens are removed from the other storage (M-25).
  - Single-flight refresh (C-07).
  - The presence cookie is now `Secure` on HTTPS.
- **What's needed**: The tokens must leave JavaScript-readable storage. Either:
  - **(a) Backend change:** `/auth/login` and `/auth/refresh` set the refresh/access tokens as `HttpOnly; Secure; SameSite` cookies, CORS allows credentials for the web origin, and the API adds CSRF protection; or
  - **(b) BFF in this repo:** a Next.js Route Handler that keeps the tokens in httpOnly cookies and forwards API calls.

  Option (b) is possible without backend work, and `lib/api/client.ts` is now the single place to switch. It was deliberately not done in this pass: it changes every request path and the deployment model, and it can't be validated against the live API from here.

### C-10: Client-controlled `app_role_id` at registration (first-pass C-03)
- **Status**: REMAINING (backend)
- **File**: `lib/auth/auth.ts` (`RegisterAgent`)
- **Description**: `NEXT_PUBLIC_APP_ROLE_ID` ships in the bundle and is sent by the browser. A caller can submit any role.
- **What the backend must do**: Ignore `app_role_id` and `app_id` from `/auth/register`, and assign the self-registration role server-side.
- **Frontend**: Nothing the frontend does is a real control, because an attacker can call the API directly. A code comment documents this. The field is still sent to stay compatible with the current API.

### C-11: Password reset trusts a 6-digit OTP with no verify step (first-pass C-04 and M-07)
- **Status**: REMAINING (backend; mitigated)
- **File**: `app/forgot-password/page.tsx:17`, `lib/auth/auth.ts:105`
- **Description**: The OTP is only checked when the reset is submitted, and nothing visible enforces rate limits.
- **Mitigations applied**:
  - A rejected code sends the user back to the OTP step.
  - After 5 rejections, a new code is required.
  - The OTP inputs have `autocomplete="one-time-code"`.
  - Forgot-password responds the same way whether or not the email exists.
  - The reset password follows the registration rule.
- **What the backend must do**:
  - Add `POST /auth/verify-otp` (email + code), rate-limited and returning a short-lived reset token.
  - Bind `reset-password` to email + that token.
  - Lock the account after N failed attempts and expire codes.
  - Return the same status for unknown emails on `/auth/forgot-password`.

---

## Medium

### M-01: Dark-mode regression
- **Status**: FIXED
- **File**: `components/ui/provider.tsx:15`
- **Description**: Removing `forcedTheme="light"` made Chakra surfaces follow the OS dark mode, while all text uses hard-coded light-theme hex colours. Dialogs and inputs became dark-on-dark.
- **Fix**: `forcedTheme="light"` is restored, with a comment explaining why.

### M-02: Delete-confirm dialogs stayed open after a successful delete (regression)
- **Status**: FIXED
- **File**: `app/agentra/settings/page.tsx:725`
- **Fix**: `confirmDeleteId` is cleared on success, for insurers and master products.

### M-03: Delete errors went to states rendered only in other, closed dialogs
- **Status**: FIXED
- **File**: `app/agentra/policies/[id]/page.tsx:1848`
- **Description**: The first-pass M-20 fix put coverage and co-assurance delete errors into `covError` / `caEditError`, which only show inside the edit dialogs.
- **Fix**: Separate `covDeleteError` / `caDeleteError`, shown in the delete dialogs and cleared on close.

### M-04: Redirects to the non-existent `/auth/login`
- **Status**: FIXED
- **File**: `app/agentra/customer/page.tsx:163,216`, `app/agentra/customer/detail/page.tsx:318,450`
- **Fix**: These now go to `/login`.

### M-05: Raw backend auth messages / account enumeration (first-pass M-01)
- **Status**: FIXED (frontend)
- **File**: `lib/auth/auth.ts:150`, `:105`
- **Fix**:
  - **Login:** a generic message for 4xx, with separate messages for 429, 5xx and 403.
  - **Forgot-password:** 404 is treated as success, and the UI says "Jika email terdaftar, kode OTP telah dikirim".
  - **Reset:** curated messages.
  - **All auth calls:** responses are parsed safely, and network errors carry status 0.
- **Backend note**: The HTTP status itself can still reveal account existence. Use uniform statuses as described in C-11.

### M-06: Race conditions and stale responses; setState inside effects
- **Status**: FIXED
- **File**: customer, policies, renewals, commissions, reports, customer-policies section, policy detail
- **Description**: Effects set `loading`/`error` synchronously (the `react-hooks/set-state-in-effect` lint error) and never cancelled. A slow response for an old filter or month overwrote a newer one.
- **Fix**: Results are tagged with the query key they answer, and `loading` is derived from that key. Requests are aborted or cancelled on change. Page resets moved into event handlers.

### M-07: UTC date bugs
- **Status**: FIXED
- **File**: `lib/format.ts:26`, `components/ui/month-picker.tsx:8`
- **Description**: `toISOString()` was used for "this month", "today" and the default coverage-end date, and `new Date("YYYY-MM-01")` was parsed as UTC. Between 00:00 and 07:00 WIB this gave the previous day or month.
- **Fix**: Calendar helpers (`localMonth`, `localISODate`, `shiftMonth`, `monthLabel`, `addToISODate`). The three duplicated `MonthPickerButton`s are now one shared component with aria-labels.

### M-08: Broken WhatsApp links
- **Status**: FIXED
- **File**: `lib/format.ts:61`, `app/agentra/policies/[id]/page.tsx:2527`
- **Description**: Numbers are stored as `08…`, but `wa.me` needs `628…`. `window.open` also ran without `noopener`.
- **Fix**: `whatsappUrl()` converts the number, and the window opens with `noopener,noreferrer`.

### M-09: No logout on mobile
- **Status**: FIXED
- **File**: `components/layout/MobileHeader.tsx:12`, `lib/auth/logout.ts:7`
- **Description**: The Sidebar, which holds the only logout, is hidden below `md`. MobileHeader also showed hard-coded "AD" initials.
- **Fix**: A shared `logout()` clears the session locally first, then revokes it on the server as best-effort. It is used by both the Sidebar and a new mobile logout button.

### M-10: Settings logged users out on any profile error
- **Status**: FIXED
- **File**: `app/agentra/settings/page.tsx:1251`
- **Description**: A 500 from `/users/me` pushed the user to `/login`.
- **Fix**: 401 is handled centrally by the API client. Other errors show a retry option.

### M-11: New-policy customer picker problems
- **Status**: FIXED
- **File**: `app/agentra/policies/new/page.tsx:204`, `:236`
- **Description**: Only the first 200 customers were loaded, with client-side filtering, so larger agencies couldn't find everyone. The `?customer_id=` link from the customer list was ignored.
- **Fix**:
  - Debounced server-side search (with abort) is merged into the list.
  - `?customer_id` is preselected, and fetched if it isn't in the list.
  - Load failures are shown instead of swallowed.

### M-12: Register ignored `?plan=` from the pricing section
- **Status**: FIXED
- **File**: `app/register/page.tsx:614`
- **Description**: The first-pass M-37 only encoded the parameter; nothing read it.
- **Fix**: The plan is preselected in the plan step.

### M-13: Co-assurance failure after the policy was created looked like a create failure
- **Status**: FIXED
- **File**: `app/agentra/policies/new/page.tsx:573`
- **Description**: Resubmitting would create the policy a second time.
- **Fix**: Co-assurance failures are counted per row. The user is told the policy exists and is sent to its detail page, and the submit button stays disabled.

### M-14: Optional money fields could not be cleared in endorsement/koreksi
- **Status**: FIXED
- **File**: `app/agentra/policies/[id]/page.tsx:31`
- **Description**: `Number(x) || undefined` kept the old materai, biaya polis or diskon when the field was emptied.
- **Fix**: `moneyField()` sends 0. `pctString()` also removes float noise from the tax-rate field.

### M-15: Follow-up type and notes were hard-coded (first-pass M-22)
- **Status**: FIXED
- **File**: `app/agentra/policies/[id]/page.tsx:439`
- **Fix**: A "Catat Follow-up" dialog with action type, notes and outcome.

### M-16: WhatsApp "Sama" mirror used an effect (first-pass M-27)
- **Status**: FIXED
- **File**: `app/agentra/customer/detail/page.tsx:371`
- **Fix**: The mirroring now happens in the checkbox and phone `onChange` handlers. Both effects were removed.

### M-17: Wilayah cascade problems (first-pass M-13, m-14, m-38)
- **Status**: FIXED
- **File**: `lib/hooks/useWilayahCascade.ts:50`
- **Description**: A failed or empty province list left the location fields impossible to fill. Effects reset state synchronously, a stale response could show for the wrong parent, and four `exhaustive-deps` rules were disabled.
- **Fix**:
  - `provinceManual` falls back to free text, now handled in both consumers.
  - Each level is tagged with its parent code, and loading is derived from that.
  - Resets moved into the select handlers.
  - The initial values are captured in a ref, with no lint disables.

### M-18: SearchSelect rendered every option (first-pass M-34)
- **Status**: FIXED
- **File**: `components/ui/search-select.tsx:54`
- **Fix**: At most 200 matches are rendered (the selected one is always kept), with a "type to narrow" hint. No new dependency.

### M-19: CSP too permissive
- **Status**: FIXED
- **File**: `next.config.ts:15`
- **Description**: `connect-src https:` allowed any host, `'unsafe-eval'` was on in production, `img-src https:` was open, and HSTS used `preload`.
- **Fix**:
  - `connect-src` is `'self'` plus the API origin (from `NEXT_PUBLIC_API_URL`).
  - `'unsafe-eval'` and `ws:` are dev-only.
  - `img-src 'self' data: blob:` and `object-src 'none'`.
  - HSTS without `preload`, which is an irreversible opt-in.

### M-20: Login page issues
- **Status**: FIXED
- **File**: `app/login/page.tsx:13`
- **Description**: The page ignored `from`, used a fixed 450px card that overflowed on phones, and had footer "links" that were plain text.
- **Fix**: Validated redirect target, responsive card, and real links to `/terms`, `/privacy` and `/help`.

### M-21: `<button>` nested inside `<a>`
- **Status**: FIXED
- **File**: dashboard, `components/HeroSection.tsx:143`, PricingSection, Footer, register footer, `app/not-found.tsx`
- **Description**: Invalid interactive nesting with a double tab stop. The first-pass "Lihat Semua" fix added another instance.
- **Fix**: `Button asChild` around the link. The dashboard FAB is now a labelled link button.

### M-22: Lint failing (87 errors / 20 warnings)
- **Status**: FIXED
- **File**: repo-wide
- **Description**: Included components declared inside render (`ActionRow`, `RadioDot`), which remount on every render, plus `any` types, unescaped entities and unused imports.
- **Fix**: `renderActionRow()` is now a render helper. All `catch (err: any)` blocks use `errorMessage` / `errorStatus`.

### M-23: Profile re-fetched on every navigation
- **Status**: FIXED
- **File**: `lib/api/user.ts:16`, `components/layout/TopBar.tsx`
- **Description**: TopBar mounts on every page.
- **Fix**: The profile is cached for the session. The cache is updated on `updateProfile`, cleared on logout, and dropped on error.

### M-24: Inconsistent password rules
- **Status**: FIXED
- **File**: `app/agentra/settings/page.tsx:152`, `app/forgot-password/page.tsx`
- **Description**: Change-password and reset only required 8 characters, and change-password didn't require the current password.
- **Fix**: Letters + digits everywhere, and the current password is required. `autocomplete` attributes added.

### M-25: Stale tokens survived a re-login
- **Status**: FIXED
- **File**: `lib/auth/session.ts:26`
- **Description**: `saveTokens` never cleared the other storage. `getAccessToken` prefers `localStorage`, so an old token kept being used.
- **Fix**: The other storage is cleared on save.

### M-26: A network blip during refresh logged the user out
- **Status**: FIXED
- **File**: `lib/api/client.ts`
- **Fix**: Only a 400, 401 or 403 from refresh ends the session. Network errors and 5xx surface as a connection error instead.

### M-27: Customer document upload discarded files (first-pass M-19)
- **Status**: REMAINING (mitigated)
- **File**: `app/agentra/customer/detail/page.tsx` (FileUpload and "Unggah Foto KTP")
- **Description**: The dropzones accepted files, but nothing uploaded them.
- **Mitigation**: Both are disabled and labelled "segera hadir", so users don't believe documents were saved.
- **What's needed**: `uploadDocument()` (linked to `customer_id`) appeared in `lib/api/documents.ts` during this session, from the documents feature being built in parallel. Its backlog item includes "Documents tab on … customer detail". The dropzones should be wired to it as part of that work; they were left alone here to avoid conflicting with it.

### M-28: UI copy is hard-coded Indonesian; the language context is unused (first-pass M-32, m-28)
- **Status**: REMAINING (product scope)
- **File**: `contexts/language.tsx`
- **Partial fix**: The preference persists (`useSyncExternalStore` + `localStorage`), the context value is memoized, and `<html lang>` follows it.
- **Why remaining**: A full translation needs a dictionary and translated copy for essentially every string. That is content work and a sweeping change, not a code defect.

### M-29: Unnecessary `"use client"` (first-pass M-38)
- **Status**: FIXED
- **File**: `components/Header.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`
- **Fix**: These are now Server Components. Chakra components carry their own `"use client"`, and Header uses links instead of `router.push`. Footer stays a client component (`usePathname`).

### M-30: `getPaymentSummary` returned `any` (first-pass M-11)
- **Status**: FIXED
- **File**: `lib/api/policies.ts:369`
- **Fix**: Typed `Promise<unknown>`. It has no callers, and callers must narrow the result.

---

## Minor

| ID | File | Issue | Fix |
|----|------|-------|-----|
| m-01 | `app/agentra/dashboard/page.tsx:55` | Regression: `days === 0` was shown as "Lewat 0h" (overdue) | Separate "Berakhir Hari Ini"; overdue shows "Lewat N hari" — FIXED |
| m-02 | dashboard, renewals | `PRODUCT_LABELS` missing `kecelakaan` / `aep` | Added — FIXED |
| m-03 | `lib/format.ts` | Inconsistent initials, including `slice(0,2)` on policy detail and TopBar (first-pass m-25) | Shared `getInitials` — FIXED |
| m-04 | `app/agentra/settings/page.tsx:617` | `color + "18"` hex-alpha concatenation (first-pass m-27) | `tint()` using `color-mix()` — FIXED |
| m-05 | customer filters, settings day chips, commissions tabs | Toggle chips had no `aria-pressed` (first-pass m-23) | Added — FIXED |
| m-06 | list searches, OTP digits, risk-location cascade, product config, notification switches | Inputs and switches without accessible names | `aria-label` / `ariaLabel` added — FIXED |
| m-07 | `app/agentra/renewals/page.tsx:267` | Section headers were clickable `Flex`, not keyboard operable | `as="button"` with `aria-expanded` — FIXED |
| m-08 | `components/ui/password-input.tsx:85`, register | Visibility toggle was mouse-only (`tabIndex=-1`) with an English label; register toggles unlabelled; no `autocomplete` | Keyboard activation, `aria-pressed`, Indonesian labels, `new-password` / `current-password` — FIXED |
| m-09 | `components/layout/TopBar.tsx:41` | First-pass fix created a bell button that does nothing; avatar had a pointer cursor; title was not a heading | Bell is decorative, settings is a link, title is `h1` — FIXED |
| m-10 | `components/Header.tsx` | Login/register CTAs were `router.push` buttons (no new tab, not crawlable) | Real links — FIXED |
| m-11 | privacy, terms, help, contact pages | "Terakhir diperbarui" year changed every January; no way back to the site | Static wording; back link added — FIXED |
| m-12 | register footer, login footer | "AgenAsuransi", `support@agenasuransi.id`, "© 2024 Insurance CRM Indonesia" | Agentra branding, `halo@agentra.id`, current year — FIXED |
| m-13 | `app/register/page.tsx` | Unreachable `Step4Form` with a fake "Konfirmasi & Bayar" payment UI and a nested component | Removed (remains in git history) — FIXED |
| m-14 | `lib/api/client.ts` (`saveBlob`) | `revokeObjectURL` ran right after `click()`, which can cancel downloads in Safari/Firefox | Revoke delayed — FIXED |
| m-15 | `contexts/language.tsx` | Language preference not persisted; context value recreated every render (first-pass m-37) | Persisted and memoized — FIXED |
| m-16 | `components/ui/search-select.tsx:50` | `useFilter().contains` was unstable, so the memo rebuilt every render (first-pass m-35) | Module-level, accent-insensitive `contains` — FIXED |
| m-17 | customer detail, login, forgot-password | Missing `alt` on images; redundant `alt` next to the visible "Agentra" text | `alt=""` for decorative images — FIXED |
| m-18 | renewals | Search crashed on a null `customer_name`; badge read "Hari Ini / Lewat" | Null-safe search; precise labels — FIXED |
| m-19 | new policy, renew dialog | No end-after-start check; policy number required but not validated | Validated — FIXED |
| m-20 | master-products, master-wilayah, insurers | Hard assumption about the double-nested `data.data` envelope (first-pass m-09) | Both shapes accepted — FIXED |
| m-21 | list APIs | Empty-result pagination defaults didn't match the request (first-pass m-16) | Echo the requested page and limit — FIXED |
| m-22 | list pages | IDs interpolated into navigation URLs without encoding | `encodeURIComponent` — FIXED |
| m-23 | policy detail | Tax rate shown with float noise (e.g. `2.5000000000000004`) | `pctString()` — FIXED |
| m-24 | documents, sub-agents | Rendered `null` until an async guard ran | Render immediately, redirect if there is no token (proxy guards too) — FIXED |
| m-25 | `proxy.ts` | Matcher ran the proxy on every request | `'/agentra/:path*'` — FIXED |
| m-26 | `lib/auth/session.ts:11` | Presence cookie lacked `Secure` | `Secure` on HTTPS — FIXED |
| m-27 | `lib/auth/session.ts:69` | Expiry check had no clock-skew margin | 30 s margin; a token with no `exp` is treated as valid (server decides) — FIXED |
| m-28 | `app/error.tsx`, `app/agentra/error.tsx` | Rendered raw `error.message`; used `reset` instead of Next 16 `unstable_retry`; `Error` shadowed the global | Generic text + digest, `unstable_retry`, renamed — FIXED |
| m-29 | `app/agentra/commissions/` | Route was misspelled `commisions` (first-pass m-18) | Renamed, permanent redirect in `next.config.ts`, links updated — FIXED |
| m-30 | customer list | Deleting the last row on a page left an empty page | Steps back a page or refetches — FIXED |
| m-31 | Sidebar, bottom navs | No nav landmark or `aria-current` | Added — FIXED |
| m-32 | `.env`, `.env.local` | Byte-identical duplicates (first-pass m-08) | REMAINING — the files are git-ignored and outside the repo; delete one in each environment |
| m-33 | dashboard | `toLocaleString()` without a locale, so "1,234" instead of "1.234" | `"id-ID"` — FIXED |

---

## Remaining items and what's needed

| ID | Needs | What has to happen |
|----|-------|--------------------|
| C-09 | Backend or a BFF | httpOnly, Secure, SameSite token cookies set by the API, plus CORS credentials and CSRF protection; or a Next Route Handler BFF that stores the tokens and proxies `/api/v1/*` (switch point: `lib/api/client.ts`) |
| C-10 | Backend | `/auth/register` ignores client `app_role_id` / `app_id` and assigns the role server-side |
| C-11 | Backend | Rate-limited `POST /auth/verify-otp` → short-lived reset token; reset bound to email + token; attempt lockout; uniform responses for unknown emails |
| M-27 | Documents feature (in progress) | Wire the customer-detail dropzones to `uploadDocument()` in `lib/api/documents.ts` |
| M-28 | Product / content | Translation dictionary and translated copy |
| m-32 | Environment | Remove the duplicate env file on each machine and deployment |

## Notes
- **Concurrent edits:** Another agent was editing `app/agentra/documents/page.tsx`, `components/documents/`, `lib/api/documents.ts`, `docs/` and the icon/manifest files during this pass. Those files were not reviewed or changed here. A lint error that appeared in `app/agentra/documents/page.tsx` mid-pass was gone by the final run.
- **API call signatures:** All API functions still take a `token` argument for compatibility. The client uses the stored (possibly refreshed) token and treats the argument as a fallback.
