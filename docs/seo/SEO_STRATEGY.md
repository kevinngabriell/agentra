# Agentra SEO Strategy

Last updated: 2026-11-19. Production domain: https://agentra.getmovira.com. All volume and difficulty notes below are **unmeasured estimates** (no keyword tool or Search Console data has been pulled yet). Replace them with real numbers after the first 4 weeks of Search Console data.

## 1. Positioning decision

- Agentra is a CRM for independent **general-insurance** agents in Indonesia (kebakaran, kendaraan, cargo, perjalanan, kecelakaan, AEP). It does not serve life insurance.
- Head term stays **"CRM asuransi"**, always paired with the qualifier **"agen asuransi umum"** so life-insurance agents (who would bounce) are not attracted.
- Honesty rules: Agentra is used today by one general-insurance agent. No customer counts, ratings, retention, speed numbers, rankings or certifications are claimed anywhere. Pricing is never hard-coded in copy or FAQ; plans come from the API.
- Brand relationship: Agentra is a product of Movira (https://getmovira.com). The link is expressed in copy, footer, `parentOrganization`/`brand` JSON-LD and `llms.txt`.

## 2. Keyword clusters (priority is a judgment call, not data)

| Cluster | Keywords | Intent | Estimated demand / difficulty | Target URL |
|---|---|---|---|---|
| Core | CRM asuransi; aplikasi agen asuransi; CRM agen asuransi umum; software agen asuransi | Commercial | Low to medium / medium (unmeasured) | `/` |
| Module: renewal | pengingat renewal polis; pengingat jatuh tempo polis; reminder perpanjangan polis | Informational + commercial | Low / low (unmeasured) | `/` now, future guide |
| Module: komisi | software komisi agen asuransi; hitung komisi agen asuransi umum | Informational + commercial | Low / low (unmeasured) | `/` now, future guide |
| Module: sub-agen | manajemen sub-agen asuransi | Commercial | Very low / low (unmeasured) | `/` now |
| Module: koasuransi | koasuransi polis kebakaran; pencatatan koasuransi | Informational | Very low / low (unmeasured) | future guide |
| Product lines | polis kebakaran, kendaraan, cargo (as record-keeping topics) | Informational | Unknown | future guides |

Brand terms ("Agentra", "Agentra Movira") are tracked separately from non-branded traffic.

## 3. Page ownership map (6 indexable URLs)

| URL | Owns (primary) | Must NOT target |
|---|---|---|
| `/` | CRM asuransi, aplikasi agen asuransi, CRM agen asuransi umum, fitur, FAQ | "daftar", "bantuan", "kontak" |
| `/register` | daftar Agentra, buat akun Agentra (conversion page, canonical drops `?plan`) | CRM asuransi head term |
| `/help` | panduan/cara pakai Agentra (tambah nasabah, catat polis, lihat komisi) | CRM asuransi head term |
| `/contact` | hubungi Agentra, kontak | product keywords |
| `/privacy` | kebijakan privasi Agentra | n/a (low priority) |
| `/terms` | syarat dan ketentuan Agentra | n/a (low priority) |

Not indexed: `/login`, `/forgot-password` (noindex, follow, still crawlable so the tag is read), `/agentra/*` (noindex in `app/agentra/layout.tsx` and disallowed in robots), `/api/`.

Cannibalization status: no Search Console data yet. By construction each title/H1 uses a distinct primary phrase and only `/` carries "CRM asuransi". Re-check with page+query data once impressions exist.

## 4. Content roadmap (not built in this pass)

1. Guide: "Cara mengelola renewal polis asuransi umum dengan WhatsApp" (renewal bucket workflow).
2. Guide: "Koasuransi: cara mencatat porsi penanggung dan komisinya".
3. Guide: "Rekonsiliasi komisi agen asuransi umum: pending, diterima, selisih".
4. Template: "Contoh pesan WhatsApp renewal polis" (uses the real message placeholders).
5. Guide: "Spreadsheet vs CRM untuk agen asuransi umum".
6. Case write-up from the one real agent, only with the agent's written consent and only verified outcomes.
Rule: every new page gets one owner query, a distinct title/H1, a self-canonical and a place in `app/sitemap.ts`.

## 5. Measurement plan

- Search Console: URL-prefix or domain property for `agentra.getmovira.com`, plus a domain property for `getmovira.com` (Agentra is linked from there). Submit `https://agentra.getmovira.com/sitemap.xml`.
- Bing Webmaster Tools: import from Search Console, submit the same sitemap.
- Weekly (10 min): impressions, clicks, average position for the clusters in section 2; branded vs non-branded split; any "Crawled - not indexed".
- Monthly: page+query export to check cannibalization; Core Web Vitals field data; rich result status for FAQPage and SoftwareApplication.
- Conversion: count `/register` completions from organic landing pages (needs analytics; none confirmed in this repo).
- Success is judged on leads and registrations, not rankings. Baseline today: 0 organic leads (unmeasured).

## 6. Changelog (this pass)

- `app/seo.ts`: fallback site URL changed from `https://agentra.id` (no DNS) to `https://agentra.getmovira.com`; support email now `kevin@getmovira.com`; added WhatsApp and Movira constants; new title/description targeting "agen asuransi umum".
- Layout keywords, manifest and OG image text aligned to the new positioning.
- Landing page: removed invented claims (No. 1, 500+ agen, 5rb+ agen aktif, 99% retensi, 500+ perusahaan asuransi, < 3 dtk, "terkemuka", "kepatuhan regulasi OJK", "Paling Populer", "Tidak ada biaya tersembunyi"); replaced with feature facts and a one-user provenance line; mockup labelled as sample (`Contoh`).
- `/register`: removed "Berlisensi AAJI/AAUI", "Bantuan 24/7", "Akun aktif dalam 5 menit", "TERPOPULER", "Platform digital terbaik"; added a single H1 per step.
- Features section expanded to 6 truthful cards with links to `/help` and `/register`; new visible FAQ section (`components/FaqSection.tsx`) feeding FAQPage JSON-LD from the same data.
- JSON-LD: `parentOrganization`, `brand`, `audience`, `inLanguage`, WhatsApp `contactPoint`, FAQPage.
- `/contact`, `/help`, footer: real email, WhatsApp and Movira links; `public/llms.txt` added.
- Verified unchanged: `/login` and `/forgot-password` noindex; `/register` indexable with canonical `/register`; `/agentra/*` noindex.

## 7. Owner follow-ups

- Set `NEXT_PUBLIC_SITE_URL=https://agentra.getmovira.com` in the production build environment (the code fallback now matches, but explicit is safer).
- Verify Search Console and Bing properties, submit the sitemap, request indexing of `/`.
- Confirm whether a free plan or trial exists in the plans API; adjust "Coba Gratis" and the FAQ wording if not.
- Add a link to Agentra from getmovira.com/agentra and other Movira properties (first inbound links).
