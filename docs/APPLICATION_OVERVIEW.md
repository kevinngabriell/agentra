# Agentra — Application Overview

Agentra is a web-based CRM for independent **general-insurance agents in Indonesia**. It replaces paper files and spreadsheets with one place to manage customers, policies, renewals and commissions across several insurers.

This repository is the **frontend only**. It is a Next.js app that talks to a separate REST API (documented in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)). The UI is written in Indonesian.

## The problem it solves

An agent with a large portfolio (1,000+ customers, roughly 60% companies) renews policies on different dates all year, places risks with more than one insurer, and has to reconcile commissions by hand. Agentra tracks each of those things and makes sure the agent knows what needs follow-up **today**.

The original requirements are in [insurance_crm_vendor_brief_v3.1.md](../insurance_crm_vendor_brief_v3.1.md). The product has since grown beyond that brief into a multi-tenant SaaS: accounts belong to a company, register on a subscription plan, and have a trial period. The brief is still the best source for the business rules (premium and commission maths, Chubb policy-number prefixes, WhatsApp digests).

## What you can do in the app

| Area | Route | What it does |
|---|---|---|
| Landing | `/` | Marketing page with features and pricing. Plans are loaded from the API. |
| Register | `/register` | Three-step sign-up: Akun (account), Profil (agency details), Paket (plan selection). |
| Login | `/login` | Email and password. "Ingat Saya" remembers the email only, never the password. |
| Forgot password | `/forgot-password` | OTP-based reset. |
| Dashboard | `/agentra/dashboard` | Totals (policies, renewals, due soon, commission), today's urgent actions shown as H-n days, and a recent-activity feed. |
| Customers | `/agentra/customer` | Searchable, filterable, paginated list with export and delete. |
| Customer form | `/agentra/customer/detail` | Create a customer, or edit one with `?id=<customer_id>`. Also lists that customer's policies. |
| Policies | `/agentra/policies` | Searchable, paginated list with export. |
| New policy | `/agentra/policies/new` | Full policy entry form (see [Policies](#policies)). |
| Policy detail | `/agentra/policies/[id]` | View and edit a policy, manage coverage items and co-insurers, update payment and renewal status, log follow-ups, view the event history, delete. |
| Renewals | `/agentra/renewals` | Policies grouped by urgency. Send a renewal WhatsApp message or renew a policy in place. |
| Commissions | `/agentra/commisions` | Monthly commission list and summary. Mark a commission as received, with the amount and notes on any discrepancy. |
| Reports | `/agentra/reports` | "Laporan Produksi": monthly production totals, weekly breakdown and per-agent breakdown. |
| Settings | `/agentra/settings` | Five tabs: Profil, Keamanan, Notifikasi, Asuransi, Produk (see [Settings](#settings)). |
| Sub-Agents | `/agentra/sub-agents` | **Placeholder** — page shell only. |
| Documents | `/agentra/documents` | **Placeholder** — page shell only. |

Note the route spelling: the commissions folder is `commisions` (one "s" short), so that is the live URL.

## Key concepts

### Customers
Two types, chosen at creation: **individual** (Perorangan, identified by NIK) and **company** (Badan Usaha, identified by NPWP, with a PIC contact person). Status is `active`, `inactive` or `lapsed`.

### Insurers and master products
Each agent configures the **insurers** they work with (one can be marked primary) and, per insurer, which product types are active. **Master products** define product codes, default commission rates and policy-number prefixes.

### Policies
Product types: `fire`, `motorcycle`, `car`, `travel`, `cargo`, `other`, `kecelakaan`, `aep`. A policy carries:

- **Premium components**: premium, materai (stamp duty), *biaya polis* (policy fee) and discount, giving the amount the customer pays.
- **Commission chain**: gross commission, commission tax (PPh), then net commission. If no rate is given, the API resolves it from the master product, first by product type and then by the first two characters of the policy number.
- **Coverage items**: bangunan (building), stok, inven/isi (contents), mesin (machinery) and others. Each has its own sum insured and per-mille rate, and can be counted in or out of the policy's total sum insured (TSI). When items are present, the premium is calculated from them.
- **Co-insurance (koasuransi)**: participating insurers with their share percentages, one flagged as leader.
- **Fire-specific fields**: construction class (I / II / III) and a **risk location**. The location uses a cascading province → city → district → village picker backed by the `master-wilayah` API, with manual entry as a fallback. Postal code and coordinates are optional. These fields also show whenever the policy number starts with `01`.
- **Statuses**: renewal (`pending`, `renewed`, `lapsed`, `cancelled`) and payment (`unpaid`, `paid`, `confirmed`).

### Renewals and WhatsApp
Renewals are bucketed by urgency. From the list the agent can send a WhatsApp message to the customer (sent by the backend, with an optional custom text) or renew the policy. Message templates support placeholders such as `{customer_name}`, `{policy_number}` and `{days_until_expiry}`.

### Commissions
Each policy produces a commission record with status `pending`, `received`, `discrepancy` or `cancelled`. Marking one as received records the actual amount so differences from the expected commission are visible.

### Settings
- **Profil / Keamanan** — edit profile, change password.
- **Notifikasi** — WhatsApp target number, daily digest (on/off, time, weekdays), monthly digest (on/off, day, time), renewal reminder window (1–90 days) and the renewal message template.
- **Asuransi** — create, edit, activate and deactivate insurers, and configure products per insurer.
- **Produk** — create, edit and delete master products.

The WhatsApp digests themselves are sent by the backend. The frontend only stores the preferences.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16.2.4 (App Router), run and built with `--webpack` |
| UI | React 19.2.4, Chakra UI v3, Emotion, `react-icons` |
| Styling | Chakra style props for nearly everything; Tailwind CSS 4 is installed and imported in `globals.css` |
| Language | TypeScript (strict), `@/*` path alias to the repo root |
| Theming | `next-themes`, forced to light mode |
| Fonts | Geist and Geist Mono via `next/font/google` |
| Lint | ESLint 9 with `eslint-config-next` |
| Tests | None yet |

> **Read [AGENTS.md](../AGENTS.md) before changing framework-level code.** This Next.js version has breaking changes from earlier releases. The relevant guides are in `node_modules/next/dist/docs/`.

## How it works

- **Client-rendered.** Pages under `app/agentra/` are client components that fetch in `useEffect`. There is no server-side data loading and no Next.js middleware.
- **API layer.** `lib/api/*.ts` has one module per backend resource (policies, customers, commissions, renewals, insurers, master products, wilayah, dashboard, revenue, subscription, user). Every function takes the access token explicitly and calls `${NEXT_PUBLIC_API_URL}/api/v1/...`. Responses use the envelope `{ status_code, status_message, data }`.
- **Auth.** `lib/auth/auth.ts` calls the auth endpoints. `lib/auth/session.ts` stores the JWT pair under `agentra_at` and `agentra_rt`, in `localStorage` when "remember me" is ticked and in `sessionStorage` otherwise. Route protection is per page: each page checks for a token and redirects if it is missing. Only the dashboard checks expiry and refreshes an expired access token.
- **Wilayah picker.** `lib/hooks/useWilayahCascade.ts` drives the cascading location selects and falls back to free text when a level has no data.
- **Layout.** A fixed sidebar on desktop, and a header plus bottom navigation on mobile (`components/layout/`). The app is responsive by design, since the brief rules out a native mobile app.

## Project structure

```
app/
  page.tsx                 landing page
  login/  register/  forgot-password/
  agentra/                 authenticated app
    dashboard/  customer/  policies/  renewals/
    commisions/  reports/  settings/  sub-agents/  documents/
components/
  layout/                  Sidebar, TopBar, MobileHeader, MobileBottomNav
  ui/                      Chakra provider, color mode, toaster, tooltip, password input
  *.tsx                    landing-page sections
contexts/language.tsx      id/en provider (not consumed yet)
lib/
  api/                     REST client, one file per resource
  auth/                    auth calls and token storage
  hooks/                   useWilayahCascade
  plans/                   plan fetching and price formatting
docs/API_DOCUMENTATION.md  backend API reference
```

## Getting started

Requirements: Node.js 20 and a reachable Agentra API.

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create `.env.local` (git-ignored) with:

   | Variable | Purpose |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Base URL of the backend, without `/api/v1` |
   | `NEXT_PUBLIC_APP_ID` | Application ID sent when registering and listing plans |
   | `NEXT_PUBLIC_APP_ROLE_ID` | Role ID sent when registering |

3. Start the dev server:
   ```bash
   npm run dev      # http://localhost:3000
   ```

Other scripts: `npm run build`, `npm start`, `npm run lint`.

If the API is unreachable, the pricing section renders empty rather than crashing. Everything behind login needs the API.

## Deployment

`.github/workflows/main.yml` deploys on every push to `main`:

1. A self-hosted runner checks out the code, uses Node 20 and runs `npm ci` and `npm run build`.
2. The build is rsynced to `/home/ubuntu/apps/agentra`.
3. PM2 starts or restarts the `agentra` process.

Two things to be aware of:
- `NEXT_PUBLIC_*` values are inlined at build time. The workflow sets only `NEXT_PUBLIC_API_URL`, so `NEXT_PUBLIC_APP_ID` and `NEXT_PUBLIC_APP_ROLE_ID` have to come from the runner's environment.
- `ecosystem.config.js` is referenced by the PM2 step but is not committed to this repo.

## Known gaps

- **Sub-Agents and Documents** are empty pages, although the sidebar links to them and the brief treats them as core modules.
- **Notification bell** in the top bar is decorative. There is no in-app notification feed.
- **Customer CSV import** exists in `lib/api/customers.ts` but no screen uses it.
- **Language toggle** (`contexts/language.tsx`) is provided but nothing reads it. All UI text is hard-coded Indonesian.
- **Inconsistent auth redirects.** The customer pages redirect to `/auth/login`, which is not a route (the login page is `/login`). The dashboard sends unauthenticated users to `/`.
- **No automated tests.**
- **README.md** is still the create-next-app boilerplate.
