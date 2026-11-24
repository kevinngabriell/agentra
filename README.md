<p align="center">
  <img src="public/brand/agentra-logo-horizontal.svg" alt="Agentra" width="280">
</p>

<p align="center"><strong>CRM for independent general-insurance agents in Indonesia.</strong><br>
Policies, renewals, WhatsApp reminders and commissions in one place, so no policy gets missed.</p>

Agentra replaces paper files and spreadsheets for agents who manage many policies with different renewal dates, place risks with more than one insurer, and reconcile commissions by hand. It is built for **general insurance** (fire, motor, cargo, travel, accident, AEP). Life insurance is out of scope. The UI is in Indonesian.

This repository is the **frontend only**: a Next.js app that talks to a separate REST API.

## What it does

- **Customers and policies**: individuals (NIK) and companies (NPWP, with a PIC contact), policies with coverage items, deductibles, clauses and extensions.
- **Co-insurance**: several insurers per policy, each with a share, one marked as leader.
- **Renewals**: policies grouped by how close they are to expiry, with renewal messages sent over WhatsApp from the list.
- **Commissions**: one record per policy with status `pending`, `received` or `discrepancy`, so differences from the expected amount are visible.
- **Sub-agents**: network totals, per-sub-agent performance and commission splits.
- **Prospects and quotes**: track leads, compare offers from several insurers, print or send a quote.
- **Reports**: monthly production totals, weekly and per-agent breakdowns.
- **Marketing site**: SEO-optimised landing page, pricing loaded from the plans API, help centre, legal pages.

See [docs/APPLICATION_OVERVIEW.md](docs/APPLICATION_OVERVIEW.md) for every screen and business rule.

## Quick start

**You need:** Node.js 20 or later, and the URL of a running Agentra API.

```bash
git clone <repository-url> agentra
cd agentra
npm ci
```

Create `.env.local` in the project root (it is git-ignored):

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_ID=<application id>
NEXT_PUBLIC_APP_ROLE_ID=<role id>
```

Start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>. The landing page loads even if the API is down (the pricing section renders empty). Everything behind login needs the API.

## Configuration

All variables are read at **build time** (`NEXT_PUBLIC_*` values are inlined into the bundle), so rebuild after changing them.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend base URL, without `/api/v1`. Also the only origin the Content Security Policy allows for `connect-src`. |
| `NEXT_PUBLIC_APP_ID` | Yes | Application ID sent when registering and listing plans. |
| `NEXT_PUBLIC_APP_ROLE_ID` | Yes | Role ID sent when registering. |
| `NEXT_PUBLIC_STORAGE_URL` | For documents | Object-storage origin(s), comma-separated, allowed for document previews. |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for canonical links, sitemap and OG image. Defaults to `https://agentra.getmovira.com`. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (webpack) on port 3000. |
| `npm run build` | Production build (webpack). |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint. |

There are no automated tests yet. Before opening a PR, run `npm run lint`, `npx tsc --noEmit` and `npm run build`.

## Project structure

```
app/                  Routes (App Router)
  page.tsx            Landing page
  login/ register/ forgot-password/ help/ contact/ privacy/ terms/
  agentra/            Authenticated app (noindex)
  seo.ts              Shared SEO constants: domain, title, description, contacts
  opengraph-image.tsx robots.ts sitemap.ts manifest.ts
components/           Landing-page sections (Hero, Problem, Features, HowItWorks,
                      Comparison, Pricing, Faq, Cta), Header, Footer, Logo,
                      StructuredData (JSON-LD), plus app feature folders
lib/                  API client (one module per resource), auth, hooks, plans
public/brand/         Official logo SVGs
public/icons/         PWA icons
docs/                 Overview, API reference, SEO strategy
proxy.ts              Route guard for /agentra/*
```

## Brand and landing page

- The logo kit lives in `public/brand/`; use the `<Logo>` component ([components/Logo.tsx](components/Logo.tsx)) instead of referencing files directly. Colours: navy `#0D1B3E`, blue `#3B82F6`, light blue `#60A5FA` (on dark backgrounds).
- Landing copy follows the rules in [docs/seo/SEO_STRATEGY.md](docs/seo/SEO_STRATEGY.md): the head term "CRM asuransi" is always paired with "agen asuransi umum", prices are never hard-coded (they come from the plans API), and no customer counts, ratings or other unverifiable claims are made.
- The FAQ in `components/FaqSection.tsx` is the single source for both the visible accordion and the `FAQPage` JSON-LD.

## Deployment

Pushes to `main` trigger a GitHub Actions deploy: a self-hosted runner runs `npm ci` and `npm run build`, copies the result to the server and restarts the `agentra` process with PM2. Because `NEXT_PUBLIC_*` values are inlined at build time, all of them must be present in the runner's environment during the build.

## Notes for contributors

- **This is not the Next.js you know.** The project uses Next.js 16 with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before changing framework-level code (see [AGENTS.md](AGENTS.md)).
- Styling is Chakra UI v3 style props; Tailwind 4 is installed but used sparingly.
- Pages under `app/agentra/` are client components that fetch from the API in `useEffect`.
- Known gaps are listed in [docs/APPLICATION_OVERVIEW.md](docs/APPLICATION_OVERVIEW.md#known-gaps).

## Credits

Agentra is built by [Movira](https://getmovira.com), a software house in Tangerang. Questions: kevin@getmovira.com.
