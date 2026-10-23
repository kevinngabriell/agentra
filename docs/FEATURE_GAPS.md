# Agentra — Feature Gap Backlog

Features a general (non-life) insurance agent needs that Agentra does not have yet. Work through them one at a time, in priority order. Tick an item `[x]` when it is shipped.

Sources: [APPLICATION_OVERVIEW.md](./APPLICATION_OVERVIEW.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [the vendor brief](../insurance_crm_vendor_brief_v3.1.md), and the pages under `app/agentra/`.

**Priority:** P0 = the agent can't do daily work without it · P1 = needed per product and for selling and retention · P2 = reporting and admin.

---

## P0 — Core daily operations

### 1. [x] Document management
Shipped in v1.4.0: `documents` API module (Cloudeka S3, `migration_documents.sql`), `app/agentra/documents/page.tsx`, and a Documents panel on the customer and policy detail pages.

- [x] Upload PDF/JPG/PNG and link the file to a policy or customer (claim linking: `documents.claim_id` is reserved and gets wired up with #2)
- [x] Document types: policy, endorsement, SPPA, KTP, NPWP, NIB, deed of establishment (*akta pendirian*), survey photo, claim document, payment proof, other
- [x] Preview in the browser without downloading
- [x] Organise and filter by customer, insurer and year (plus type, status and search)
- [x] Documents tab on the policy detail and customer detail pages
- [x] Archive documents for expired policies instead of deleting them (audit trail)
- [x] Flag customers whose KYC is incomplete (APU-PPT compliance)

### 2. [x] Claims management
Shipped in v1.5.0: `claims` API module (`migration_claims.sql`), `app/agentra/claims/` (list and detail), `components/claims/`, a Claims panel on the policy and customer detail pages, a dashboard widget, and claim figures on the renewals list.

- [x] Register a claim against a policy: date of loss, cause, location, description, estimated loss
- [x] Status flow: reported → survey / loss adjuster → documents complete → approved / rejected → paid
- [x] Checklist of required documents per product (e.g. motor: police report, SIM, STNK, photos, workshop estimate)
- [x] Attach claim documents through the documents module (set `documents.claim_id` on upload; filter by claim)
- [x] Record the deductible (*risiko sendiri*), approved amount, settlement amount and payment date
- [x] Claim follow-up log and event timeline
- [x] Claims list page with filters (status, insurer, product)
- [x] Claim history and claim ratio per customer and per policy, used at renewal
- [x] Dashboard widget: open claims and claims pending documents

### 3. [x] Premium payment tracking and due dates
Shipped in v1.6.0: `migration_payments.sql`, `policies/payments.php`, a Payments panel on the policy detail page, the `app/agentra/payments/` billing page and a printable invoice at `policies/[id]/invoice`. The invoice is printed to PDF from the browser; reminders open a prefilled WhatsApp message (wa.me) for the agent to send, not an automatic send.

- [x] Record the payment date and transfer reference number (brief §4.5)
- [x] Premium due date per policy (premium payment warranty, typically 30 days)
- [x] Instalment schedule (several due dates and amounts per policy)
- [x] Unpaid / overdue premium list and reminders (in-app and WhatsApp)
- [x] Warn when a policy risks cancellation for non-payment
- [x] Generate a customer invoice / debit note (PDF) to send by WhatsApp or email

### 4. [x] Sub-agent / referral network
Shipped in v1.7.0 and v1.7.1 (login, `migration_sub_agents_login.sql`): `sub_agents` API module (`migration_sub_agents.sql`), `app/agentra/sub-agents/` (list and profile), `components/sub-agents/`, a referrer picker on the customer form, and a sub-agent picker on the new-policy form and the policy detail page. A sub-agent login is limited to a read-only portal at `/agentra/my`; the API allow-lists its routes in `helpers/access.php`. The digest is the existing renewal reminder, sent to each sub-agent's own number for their policies.

- [x] Sub-agent CRUD: name, agent code, phone/WhatsApp, date joined, status
- [x] Link a customer to the sub-agent who referred them (the customer `source` field)
- [x] Sub-agent selector on the policy form (`issuing_agent_id` / `agent_id`)
- [x] Override commission rate and split per sub-agent
- [x] Sub-agent profile: customers, policies, premium and commission by insurer
- [x] Sub-agent performance: active policies, renewal rate, month-over-month growth
- [x] Sub-agent login with role-based access, limited to their own customers
- [x] Optional: WhatsApp digest for sub-agents (renewal reminder; opt-out per sub-agent)

---

## P1 — Product depth

### 5. [x] Product-specific risk details
Shipped in v1.8.0: `risk-details` and `declarations` API routes (`migration_policy_risk_details.sql`, `helpers/risk_details.php`), `components/risk-details/` (a form shared by the new-policy page and a Risk Details panel on the policy detail page), and plate / chassis / engine / B/L search on the policy list. "Objek Pertanggungan" stays as the free-text description. Travel trip dates are the policy coverage dates. Open cover declarations are a record only and do not change the master policy's premium or sum insured.

- [x] **Motor (car / motorcycle):** plate number, chassis number, engine number, make, model, year, colour, usage (private / commercial), coverage type (Comprehensive / TLO), vehicle value, region (for the OJK tariff)
- [x] **Motor extensions:** flood, earthquake, riot (RSMDCC), terrorism, third-party liability, personal accident for driver and passengers
- [x] **Cargo:** conveyance / vessel name, voyage from → to, B/L or AWB number, departure date, ICC clause (A / B / C), goods description
- [x] **Cargo open cover:** a master policy with per-shipment declarations
- [x] **Travel:** destination(s), list of travellers, trip dates, Schengen certificate
- [x] **Personal accident (kecelakaan / AEP):** list of insured people, beneficiaries, benefits
- [x] **Fire / property:** occupation code, perils and extensions (flood, earthquake, RSMDCC), survey status and date
- [x] Search policies by plate number, chassis number and B/L number

### 6. [x] Deductibles, clauses and extensions
Shipped in v1.9.0: `policy_terms` table (`migration_policy_terms.sql`), `policies/terms.php`, and a Risiko Sendiri, Klausula & Perluasan panel (`components/policy-terms/`) on the policy detail page. The clause list is a catalog in `components/policy-terms/catalog.ts`; the API stores the title, so free text works too. Terms are copied when a policy is renewed. Claims do not read the deductible yet: the claim form still takes the deductible by hand.

- [x] Deductible (*risiko sendiri*) per policy and per coverage item
- [x] Clauses and extensions per policy (pick from a list plus free text)
- [x] Show them clearly on the policy detail page, so the agent can answer "am I covered for X?" (with a search box)

---

## P1 — Sales and retention

### 7. [x] Prospects and quotes
Shipped in v1.10.0: `prospects` and `quotes` API modules (`migration_prospects_quotes.sql`), `app/agentra/prospects/` (list and detail), `app/agentra/quotes/[id]` (comparison, print, WhatsApp), `components/sales/`, a Prospects entry in the sidebar, and a quote prefill on the new-policy form (`?quote_id=`). The quote PDF is the browser's print-to-PDF, and WhatsApp opens a prefilled wa.me message for the agent to send (same as the payment reminders).

- [x] Prospect / lead list: source, product interest, expected premium, stage
- [x] Track competitor-held policies with their expiry dates as future leads
- [x] Quote builder: product, sum insured, rate, premium; compare several insurers side by side
- [x] Quote PDF and send by WhatsApp
- [x] Convert an accepted quote into a customer and a policy
- [x] Lost-deal reasons (price, competitor, no longer needed)

### 8. [x] Renewal quote workflow
Shipped in v1.11.0: `renewal_workflows` (`migration_renewal_workflow.sql`, `helpers/renewal_workflow.php`, `/renewals/{id}/workflow`), the `components/renewals/` dialog opened from "Alur Renewal" on `app/agentra/renewals/page.tsx`, a stage column on the renewals list and a lost-reason line in the month stats. The quick "Perpanjang" button still rolls a policy over directly and also marks its workflow issued. Declining a renewal marks the policy `lapsed`; reopening puts it back to `pending`. For policies with coverage line items the renewal premium and sum insured come from the copied items, so the offered figures are a reference there and the agent adjusts the items on the new policy.

- [x] Renewal stages: request terms from the insurer → terms received → offered to the customer → accepted / declined → issued
- [x] Compare old and new premium, sum insured and terms
- [x] Prompt to review the sum insured (vehicle depreciation, updated property values)
- [x] Record why a renewal was lost
- [x] When the renewal is issued, upload the new policy document and update the expiry date (brief §4.4.4)

### 9. [x] Cross-sell and customer 360
Shipped in v1.11.0: `customer_groups` and `customers.group_id` (`migration_customer_360.sql`, `helpers/customer_360.php`), `/customers/{id}/overview`, `/cross-sell` and `/group`, `/customer-groups`, and `components/customer-360/` on the customer detail page. Cross-sell rules are a fixed table in `helpers/customer_360.php` and only offer products the company has in its active master products. Managing groups is done from a customer; there is no separate group screen yet.

- [x] Customer view that shows every product held across insurers
- [x] Group related companies under one customer group
- [x] Cross-sell suggestions (e.g. has motor, no property cover; has fire, no cargo)

### 10. [x] Customer communication
Shipped in v1.11.0: `message_templates`, `message_broadcasts` and `message_log` (`migration_communications.sql`, `helpers/messaging.php`), the `communications` API module, `notification/greetings.php` (daily cron), `app/agentra/communications/` (templates, broadcast, log), and Messages panels on the customer and policy detail pages. The API sends through the WAHA gateway, so unlike the older wa.me links the message goes out without the agent pressing send. The invoice goes out as a text summary; the printable PDF invoice is not attached. A broadcast is capped at 100 recipients. The greetings cron has to be added on the server.

- [x] Send invoices / debit notes and payment reminders by WhatsApp
- [x] Birthday and holiday greetings (automated, using templates)
- [x] Broadcast to a customer segment (by product, insurer or city)
- [x] Log of every message sent, per customer and per policy
- [x] Template library beyond the renewal template

---

## P2 — Reporting and admin

### 11. [x] Reports from the brief (§4.9)
Shipped in v1.12.0: `reports` API module (`reports/index.php`): every report answers in one generic table shape and `?format=xlsx` downloads the same table as Excel. The Reports page (`components/reports/ReportView.tsx`) has a tab per report next to the existing production report, with year, insurer and group-by filters. PDF is the browser's print-to-PDF (same as the invoice and quote). The commissions page has an Excel button (`commission-list` report). Retention is measured two ways: policies renewed out of policies that ended in the year, and customers covered last year who are covered again this year. Loss ratio = approved/paid claims (date of loss in the year) / premium of policies starting in the year.

- [x] Payment consolidation report per insurer, for head office (`getPaymentSummary` exists but no page uses it)
- [x] Lapsed policy report
- [x] Portfolio overview by product and insurer
- [x] Customer retention rate year over year
- [x] Commission summary by insurer, product, sub-agent and year
- [x] Sub-agent production report
- [x] Claims report and loss ratio
- [x] Excel / PDF export on every report and on the commissions page

### 12. [x] Renewal calendar and filters (brief §4.4.1)
Shipped in v1.12.0: `GET /renewals/calendar`, `insurer_id` / `product_type` / `sub_agent_id` (`main` = the main agent) filters on the renewals list, stats and calendar, and `components/renewals/RenewalCalendar.tsx` behind a List / Kalender toggle on the renewals page.

- [x] Monthly calendar view, colour-coded by status
- [x] Filter by insurer, product type and sub-agent
- [x] Next-month view alongside the current month

### 13. [x] In-app notification bell (brief §4.4.3)
Shipped in v1.12.0: `notifications` table (`migration_notifications_tasks.sql`), `notifications` API module and `helpers/notifications.php`, and `components/layout/NotificationBell.tsx` in the top bar (polls every minute while the tab is visible). There is no event bus: each time the feed is read, `syncNotifications` inserts one row per event found in the current data (unique `dedupe_key`, so repeats are ignored). Read state is per company, not per user. Lapsed, commission and claim events are only picked up for 14 days.

- [x] Notification feed with an unread count
- [x] Types: expiring today, expiring this week, policy lapsed, premium overdue, commission received, claim status changed
- [x] Each notification links to its record; mark as read

### 14. [x] Tasks and reminders
Shipped in v1.12.0: `tasks` table (`migration_notifications_tasks.sql`), `tasks` API module, `app/agentra/tasks/`, `components/tasks/` (a Tasks panel on the customer, policy and claim detail pages, and a "Tugas Saya Hari Ini" card on the dashboard). The digest is a new cron, `notification/tasks_digest.php`, that has to be added on the server (07:30 WIB); it sends the open tasks due today or overdue to `notification_settings.whatsapp_target_number`.

- [x] General tasks with due dates, linked to a customer, policy or claim
- [x] "My tasks today" on the dashboard
- [x] Optional: include tasks in the daily WhatsApp digest

### 15. [x] Data import
Shipped: `app/agentra/import/` (tabs for customers and policies, also linked from the Customers and Policies pages and the sidebar), `lib/api/imports.ts`, and on the API `helpers/import.php`, `customers/index.php` (`POST /customers/import`) and `policies/import.php` (`POST /policies/import`). Both accept CSV or XLSX (5 MB, 5000 rows), take `dry_run=1` to validate without saving, and serve a template at `GET /{customers|policies}/import/template?format=xlsx|csv`. Valid rows are saved and invalid ones are skipped and reported by row. No migration.

- [x] Customer CSV/Excel import screen for both customer types, with a downloadable template
- [x] Preview and per-row validation errors before saving (including NIK/NPWP already registered or repeated in the file)
- [x] Policy import (with insurer and customer matching): customers match on NIK/NPWP or exact name, insurers on short name, agent code or full name; commission is created as for `POST /policies`. Coverage breakdowns, risk details and risk location are not imported.

### 16. [x] Commission reconciliation per insurer statement
Shipped: `migration_commission_statements.sql` (run once on the API), `commissions/statements.php`, `app/agentra/commissions/statements/page.tsx`. Matching a commission to a statement marks it received (or discrepancy) with the statement's date and reference, and unmatching or deleting the statement puts it back to pending. A commission can sit on one statement only, and a commission matched to a statement can no longer be marked received by hand.

- [x] Record one insurer payment / commission statement (date, amount, reference)
- [x] Match it against many commission records at once
- [x] Show the unmatched remainder and any discrepancies per statement
- [x] Commission filters by insurer and product on `app/agentra/commissions/page.tsx` (the Excel export honours them too)
