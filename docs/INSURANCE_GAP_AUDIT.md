# Agentra: Insurance Feature Gap Audit (Large Accounts)

**Point of view:** a general-insurance agent in Indonesia whose book includes large ("jumbo") accounts: warehouses and commercial property, homes, cars and motorcycles (single and fleet), and travel (single trips and corporate).
**Date:** 24 November 2026 · **Branch audited:** `dev/release/v2.0.0`
**Related:** [FEATURE_GAPS.md](./FEATURE_GAPS.md) (all 16 items shipped), [the vendor brief](../insurance_crm_vendor_brief_v3.1.md)

---

## 0. Implementation status (v2.1.0, 25 November 2026)

Every gap below now has an implementation on `dev/release/v2.0.0` in both repositories (not yet committed). The schema change is `agentra_api/migrations/v2.1.0/20261124_v2.1.0_large_accounts.sql`. It is additive and re-runnable, and is applied on the dev schema only. The endpoints are documented under "Large Accounts (v2.1.0)" in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

| § | Gap | Where it lives now |
|---|-----|--------------------|
| 3.1 | Several locations / vehicles / travellers per policy | **Lokasi Risiko**, **Jadwal Armada** (with CSV import), traveller CSV import plus certificate and trip dates per traveller |
| 3.2 | Endorsement premium, cancellation, refunds | **Nota & Endorsemen** panel: debit/credit notes (pro-rata / short-period / flat / insurer's figure), commission per note, cancellation with refund and clawback, printable notes. The original debit note is frozen at issue. |
| 3.3 | Quotes and placement | Itemised quotes (rate per item / peril), placement status per insurer (submitted / declined / awaiting reinsurance), structured deductible and extensions, co-insurance panel acceptance. Covernote tracking is on the policy. |
| 3.4 | Multi-currency | Currency + exchange rate + FC amounts on policies, quotes and claims; IDR stays the reporting currency |
| 3.5 | Large-loss claims | Reserve history, interim / final payments, settlement calculation (deductible from policy terms, average, salvage), adjuster and repair fields, co-insurance split, salvage / subrogation, deadlines with alerts, withdraw / appeal / reopen |
| 3.6 | Product types | Pickers and labels use the company's master products. The insurer commission screen (its API route was missing) now covers all 12 lines and feeds new policies. |
| 3.7 | Compliance | **Kepatuhan APU-PPT** panel: risk rating, PEP, screening result, beneficial owners, EDD flag. **Pengaturan → Tarif & Okupasi** holds occupation codes and tariff bands, with rate warnings on locations and vehicles. |
| 4.x | Line depth | Stock declaration (adjustable) policies, BI values, rebuild-value / underinsurance hint, EQ / flood zones, survey recommendations and warranties, accumulation (nearby + report), bank / leasing parties printed as QQ, multi-year schedules, motor inspection, NCD / loading hint at renewal, travel plan and benefits with Schengen / trip-length / age warnings, emergency-info WhatsApp |
| 5 | Smaller findings | Renewal blocked until co-insurance totals 100%; per-policy renewal lead time; sequential DN / CN numbers; statement of account per customer or group |

**What still depends on the agent:**
- **Tariff bands and occupation codes:** the app ships no tariff figures. The rate warnings work once the agent enters the bands from the regulator's circular.
- **Screening:** the app records the result of a DTTOT / PEP check the agent ran. It does not query those lists.
- **Deadlines:** claim notice deadlines follow each policy's wording, so the agent sets them (quick picks are provided). The insurer's 30-day decision and payment deadlines are filled in automatically.

**Fixed along the way (bugs that existed before this work):**
- **Renewal failed for itemised policies:** renewing any policy with coverage items failed with a server error, because the renewal never read the items' premium.
- **Insurer commission screen:** Settings → Asuransi → Produk called an API route that did not exist.
- **Invoice discount:** the printed invoice added string amounts, so its discount line was wrong.
- **Claim checklists:** checklists ignored master product types, so a fire policy coded `01` got the generic checklist.

---

## 1. Bottom line

Agentra runs the **admin side of a retail and small-business book** well. Customers, policies, renewals, payments, commission reconciliation, documents, claims logging and WhatsApp are all there and joined up. An agent with 1,000 ordinary motor, house and shop-fire policies could run their whole day in it.

It is **not yet built for large accounts**. The data model assumes **one policy = one risk object at one location, in rupiah, with one premium that never changes**. Large accounts break every part of that:

- A warehouse client has **several locations**, each with building, stock and machinery, and stock levels that move every month.
- A fleet client has **50 vehicles on one policy**.
- A factory or cargo account is priced in **USD**.
- Big policies get **endorsed and cancelled mid-term**, which creates additional or returned premium and commission that has to be clawed back.
- Big losses are paid **in instalments**, with an adjuster, a reserve that moves, and an underinsurance (*average*) calculation.

None of these can be recorded properly today. When one comes up, the agent goes back to Excel and email, which is exactly what Agentra was meant to replace.

**The six gaps to close first** (detail in §3):

| # | Gap | Why it matters for large accounts |
|---|-----|------------------------------------|
| 1 | **Multi-location / multi-object schedule** (property locations, fleet vehicles, group travellers) | A warehouse or fleet account can't be entered as one policy. |
| 2 | **Endorsement premium and cancellation / refund** | Today an endorsement just overwrites the premium. There is no additional-premium bill, refund note or commission clawback. |
| 3 | **Quote and placement for large risks** | A quote takes one sum insured and one rate. You can't quote building + stock + machinery + flood + earthquake, or track which insurers declined. |
| 4 | **Multi-currency** | USD and EUR policies (cargo, factory property, travel benefits) can't be recorded. |
| 5 | **Claims for large losses** | One estimate, one payment, deductible typed by hand, no underinsurance calculation, no reserve history, no salvage or recovery. |
| 6 | **Risk engineering data for property** | No fire protection, survey recommendations, earthquake or flood zone, or accumulation. Insurers ask for these on every large property quote and renewal. |

---

## 2. Scope and method

- **Audited:** every page under `app/agentra/`, the domain components under `components/`, and the API contracts in `lib/api/*.ts`, compared against how large commercial and personal-lines business is actually placed and serviced in Indonesia.
- **Limits:** this repository is the frontend only. Some logic may exist in the backend without appearing in the API types. Where a finding rests only on the frontend, it says so. A gap here means **the agent can't see or do it in the app**, whatever the backend holds.
- **Already covered:** items in [FEATURE_GAPS.md](./FEATURE_GAPS.md) are not repeated except where a large-account case shows they are incomplete.

### What is already strong (keep it)

- Coverage line items (bangunan / stok / inven / mesin) with per-mille rates and the "count in TSI" flag.
- Co-insurance participants with leader and share %, and a check that shares total 100%.
- Deductibles, clauses and extensions per policy *and* per coverage item, with an "am I covered for X?" search box.
- Correction vs. endorsement distinction on every policy change, with an audit log.
- Cargo open cover with per-shipment declarations.
- Renewal workflow with a sum-insured review prompt (vehicle depreciation, property values) and lost reasons.
- Claim document checklist per product, claim ratio shown at renewal.
- Commission statement matching against insurer statements.
- KYC (APU-PPT) document flags.

---

## 3. Cross-cutting gaps (all lines)

### 3.1 Multiple objects and locations per policy — **P0**

**Today:** a policy has **one** risk address (`risk_address`, `risk_city`, … in `lib/api/policies.ts`) and **one** risk-details record (`RiskDetails` in `lib/api/risk-details.ts`: one plate number, one chassis, one occupation code). Coverage items are not tied to a location.

**What large accounts need:**
- **Property location schedule:** a list of locations under one policy. Each location has its own address, occupation, construction class, coverage items (building / stock / machinery), sum insured, rate, earthquake zone and flood exposure. Policy TSI = sum of locations.
- **Motor fleet schedule:** one policy covering many vehicles. Each vehicle has its own plate, chassis, value, coverage type (Comprehensive or TLO), extensions and premium. It needs bulk import from Excel, plus endorsements that add or remove a vehicle mid-term with pro-rata premium.
- **Group travel / corporate roster:** travellers already exist as `members`, but a corporate annual policy needs CSV import, and each traveller needs their own plan, trip dates and certificate number.
- Search must reach inside schedules: finding a plate number in a 50-vehicle fleet, or an address in a 12-location warehouse policy.

### 3.2 Endorsement premium, cancellation and refunds — **P0**

**Today:**
- An endorsement (`handleEndorse` in `app/agentra/policies/[id]/page.tsx`) sends the **new total** premium and sum insured and overwrites the policy.
- Nothing records the *difference*: additional premium (*premi tambahan*) or return premium (*pengembalian premi*).
- Cancellation is only `renewal_status = 'cancelled'`. There is no cancellation date, method or refund.

**Needed:**
- **Endorsement record** as its own object: endorsement no., effective date, type (add/remove item, change SI, add extension, change insured name, cancel), **premium delta** (+/−) and its own **debit note / credit note** with a due date that the Payments page tracks.
- **Pro-rata and short-period calculation** from the effective date to expiry. Pro-rata for insurer-initiated changes, the short-period scale for insured-initiated cancellation.
- **Commission follows the premium delta:** extra commission on additional premium and **clawback** on returned premium, both visible in commission reconciliation.
- **Cancellation flow:**
  - Inputs: cancellation date, reason (non-payment / sold / moved insurer / insured request), refund amount, refund paid date.
  - Notice to the bank or leasing company where a banker's clause or loss payee exists.
  - Non-payment cancellation should come straight from the existing `cancellation_risk` payment urgency.

### 3.3 Quote and placement for large risks — **P0**

**Today:** `QuotePayload` has one `sum_insured`. Each insurer option (`QuoteOption`) has one `rate_permille` and free-text `deductible_note` / `terms_note`.

**Needed:**
- **Itemised quote:** quote per coverage item and per peril (fire/FLEXAS, flood & windstorm, earthquake, RSMDCC, theft), so the comparison shows the real price difference between insurers.
- **Structured deductibles and clauses on each option**, reusing `PolicyTermPayload`, so the accepted option's terms carry straight onto the policy instead of being retyped.
- **Placement tracker:** per insurer, when the submission was sent, the information supplied (SPPA, survey, photos, claims history), and the response (quoted / declined with reason / referred to reinsurance) with a date. The brief says the agent goes to other insurers when Chubb declines. Today a decline isn't recorded anywhere, so next year the agent asks the same insurer again.
- **Co-insurance placement:** build the co-insurance panel during quoting, not only after the policy is issued.
- **Facultative reinsurance flag:** when the risk exceeds the insurer's retention, issuance takes longer. Record "awaiting reinsurance support" as a quote or renewal stage so the agent sets the customer's expectations.
- **Covernote:** large risks are usually bound by covernote before the policy is printed. Record the covernote number, date and expiry, and chase the policy if it isn't issued within N days. The words "covernote" and "cover note" don't appear anywhere in the codebase.

### 3.4 Multi-currency — **P0 for cargo and factory property, P1 otherwise**

**Today:** every amount is a rupiah integer. The only currency references are for subscription plans.

**Needed:**
- Policy currency (IDR / USD / EUR / SGD) and the exchange rate used for premium, sum insured and commission.
- Reports and commission totals converted to IDR at the recorded rate, with the original currency kept.
- Claims in foreign currency (cargo, overseas medical costs on travel).

### 3.5 Claims for large losses — **P0**

**Today** (`lib/api/claims.ts`):
- The claim has one `estimated_loss`, one `deductible` (typed by hand, as FEATURE_GAPS #6 notes), one `approved_amount`, one `settlement_amount` and one `payment_date`.
- Status runs `reported → survey → documents_complete → approved → paid`.

**Needed:**
- **Reserve history:** estimate changes over time (initial notice → adjuster preliminary report → final adjustment), each with a date and source.
- **Interim payments** (*uang muka klaim*): several payments per claim. Add a "partially paid" status. A large fire loss is rarely settled in one payment.
- **Settlement calculation shown in the app:**
  - Gross loss − deductible (**read from the policy's terms**, including "10% of claim, minimum Rp X") − **underinsurance / average** (SI ÷ value at risk; see `cl_average` in `components/policy-terms/catalog.ts`) − salvage = net payable.
  - The agent explains this number to the customer, so the app should produce it.
- **Loss adjuster:** firm, adjuster name, appointment date, preliminary and final report dates, and the adjuster's requested-documents list. Today there is only a free-text `surveyor_name`.
- **Co-insurance split:** each co-insurer's share of the claim and payment status (the leader often pays first, followers pay late).
- **Salvage and subrogation recovery** (`cl_subrogation` exists as a clause only): who recovered, how much, and whether part goes back to the insured's deductible.
- **Time bars and SLAs:** notification deadline and document deadline from the policy wording, insurer decision SLA, and an alert as each one approaches. A late notice is the most common reason a valid claim is rejected.
- **More status paths:** withdrawn by insured, reopened after payment (additional loss found), appeal / ex-gratia after rejection.
- **Cause list by line:** today's `CAUSE_SUGGESTIONS` are generic. Add per-line causes: motor (partial damage, total loss, theft, third-party); travel (medical, baggage, delay, trip cancellation); property (fire, lightning, explosion, flood, earthquake, burglary, RSMDCC).

### 3.6 Product type model is inconsistent — **P1 (data correctness)**

There are three different product-type lists:

| Where | Values |
|-------|--------|
| `ApiProductType` (policies) | fire, motorcycle, car, travel, cargo, other, kecelakaan, aep |
| `ApiProductTypeCode` (master products) | fire, earthquake, motor, cargo, travel, personal_accident, liability, engineering, marine_hull, health, bonds, others |
| `ApiInsurerProductType` (insurer commission defaults) | fire, motorcycle, car, travel, cargo, other |

Consequences:
- **Liability, engineering (CAR/EAR, machinery breakdown), marine hull, bonds and money / burglary** have no proper policy type. They fall into `other` and lose their risk details, claim checklists and cross-sell rules.
- Default commission per product at an insurer can't be set for PA, liability or engineering.
- On the new-policy page, the selected **product code** is sent as `product_type` and cast to `ApiProductType` (`app/agentra/policies/new/page.tsx:626`). Check with the backend that this mapping is what it expects.

Large commercial clients usually hold several of these lines alongside fire. Without them, Customer 360 and cross-sell undercount the account.

### 3.7 Compliance for large-premium clients — **P1**

KYC document flags exist (`KYC_DOCUMENT_TYPES`). Missing for large and corporate premiums:
- **Beneficial owner** of corporate customers (APU-PPT).
- **Screening** against the terrorist-financing list (DTTOT) and **PEP** checks, with the result and date stored.
- **Customer risk rating** (low / medium / high) that triggers enhanced due diligence.
- **OJK tariff band check:** warn when a property or motor rate is below the floor (or above the ceiling) of the OJK tariff for that occupation / earthquake zone / vehicle category and region, or when a discount exceeds the cap. This protects the agent when an insurer quotes off-tariff.

---

## 4. Gaps by line of business

### 4.1 Warehouses and commercial property (jumbo fire / PAR)

**Have:** coverage items, construction class I–III, one risk location with coordinates, occupation code (free text), survey status and date, flood / EQVET / RSMDCC / BI extensions as clauses.

| Priority | Gap | Detail |
|---|---|---|
| P0 | **Location schedule** | See §3.1. A 3PL or distributor typically has 3–15 warehouses on one policy. |
| P0 | **Stock declaration (adjustable) policy** | Warehouse stock rises and falls (seasonal peaks, imports). Needed: deposit premium on a maximum SI, monthly or quarterly stock declarations per location, and a premium adjustment at year end (additional or return). This is the same pattern as the cargo open cover already built, applied to stock. A fixed SI leaves the client either underinsured at peak (average applies) or overpaying off-peak. |
| P1 | **Risk engineering fields** | Walls / roof / floor material, storeys, year built, floor area m². Fire protection: APAR, hydrant, sprinkler, detectors / alarm, distance to fire station. Hazardous goods stored, rack height, housekeeping, security / CCTV, adjacent exposure. Insurers ask for these on every large property quote and renewal. |
| P1 | **Occupation code from the OJK table** | `occupation_code` is a free-text input. It should be a lookup (code → description → tariff class) so the rate check in §3.7 works and two warehouses with the same use get the same code. |
| P1 | **Earthquake zone and flood exposure** | Earthquake zone (1–5) derived from the risk location, and flood history and flood zone per location. These drive the EQVET and flood rates and accumulation. |
| P1 | **Survey report and risk improvement recommendations** | Store the surveyor, report and each recommendation (e.g. "add 4 APAR in warehouse B by 31 Jan"). Each needs a deadline, an owner and a done/not-done status. Some become **warranties**, and a breached warranty can void a claim, so overdue items must alert. |
| P1 | **Accumulation / PML view** | Total SI per location and per area: industrial estate, district, coordinates within a radius. Show the PML / EML estimate per location. This tells the agent when one insurer can't take the whole risk (co-insurance needed), and shows flood and earthquake concentration across the agent's own book. |
| P1 | **Business interruption as cover, not just a clause** | Gross profit SI, indemnity period (months), time deductible (days). Today BI is only `ext_bi` in the clause catalog with no values. |
| P2 | **Goods held in trust / bailee liability** | 3PL warehouses store *other people's* goods. Record whose stock it is and whether warehouse-keeper's liability is covered. This is a common gap when a 3PL claim happens. |
| P2 | **Related lines on the same customer** | Machinery breakdown, burglary, money, public liability, inland transit, fidelity. These are the cross-sell set for any warehouse client. They depend on §3.6. |

### 4.2 Houses (residential property)

**Have:** fire policy with building / contents items, risk location, construction class, extensions, `cl_bank` banker's-clause clause.

| Priority | Gap | Detail |
|---|---|---|
| P1 | **Mortgage bank as a structured party** | Most house policies are mortgage-linked (KPR). Record the bank name, branch, loan / account number, and whether the bank is on the insurer's panel. Policy and renewal proof must reach the bank **before** expiry, or the bank force-places its own cover. Today the bank exists only as clause text and inside the free-text `insured_name` ("Bank X QQ Name"). |
| P1 | **Rebuild value guidance** | Building area m² × construction cost per m² (by construction class and city) → suggested building SI. Renewal already prompts a review; give the agent a number to propose. Underinsured homes are the most common average-clause dispute. |
| P1 | **Earthquake zone and flood** | Same as §4.1: EQ zone and flood history per address drive the rates and are the main reason people buy cover in many areas. |
| P2 | **Contents detail** | High-value items (jewellery, art, electronics) with single-item limits. |
| P2 | **Occupancy conditions** | Unoccupied more than N days, under renovation, or partly rented out. All of these change cover and should be asked at renewal. |
| P2 | **Long-term mortgage policies** | Policies that run for the mortgage term with yearly premium (see §4.3, long-term). |

### 4.3 Cars and motorcycles

**Have:** full single-vehicle details (plate, chassis, engine, make / model / year, usage, Comprehensive / TLO, value, OJK tariff region, flood / EQ / RSMDCC / terrorism, TPL, PA driver / passenger), plate and chassis search, authorised-workshop clause, motor claim checklist.

| Priority | Gap | Detail |
|---|---|---|
| P0 | **Fleet policies** | See §3.1. Corporate customers are about 60% of the book, and their vehicles are on fleet policies. Each vehicle needs its own SI, premium and claim history. |
| P1 | **Leasing / finance company** | Leasing as loss payee: company name, contract no., tenor. Many car and motorcycle policies are leasing-driven and run for the tenor, so renewal proof goes to the leasing company and a total-loss payment goes to them first. |
| P1 | **Multi-year policies with a yearly schedule** | Leasing policies run 2–5 years with a **yearly SI that falls** (depreciation) and a yearly premium. `policy_year` exists, but no per-year SI and premium table is visible. |
| P1 | **OJK tariff check** | Rate band by vehicle category (value bracket), region, coverage type, plus age and commercial-use loading. The region is already captured; add the band check (§3.7). |
| P1 | **Motor claim stages** | After approval: workshop chosen, SPK (repair order) issued, own-risk paid by insured, repair in progress, vehicle ready / handed over. Plus a **total loss** path: TL threshold, BPKB and keys handover, salvage. Theft needs a police report and a waiting period. The current statuses end at `approved → paid`, which doesn't fit a repair claim. |
| P2 | **Claims history at renewal** | Claim count is already on the renewals list. Add a no-claim / loading suggestion for the renewal quote. |
| P2 | **Pre-cover inspection** | Inspection required / done, with photo set. The `survey_photo` document type exists; link it to a required step before binding for used vehicles. |

### 4.4 Travel

**Have:** destinations, travellers (name, passport, date of birth), Schengen certificate no., trip dates = policy dates.

| Priority | Gap | Detail |
|---|---|---|
| P1 | **Plan structure** | Single trip vs **annual multi-trip** (with max days per trip), plan tier, area (ASEAN / Asia / worldwide with or without USA), individual / family / group. Without these, renewals and quotes can't compare like with like. |
| P1 | **Benefit limits in the policy currency** | Medical, evacuation, baggage, delay, cancellation limits, usually in USD or EUR. A Schengen visa needs medical cover of at least €30,000, so a check against that helps (§3.4). |
| P1 | **Corporate / group roster** | Import travellers by CSV, issue a certificate per traveller, and add or remove travellers by endorsement. This is the large-account form of travel. |
| P1 | **Travel claim types** | Medical abroad (foreign-currency invoices), baggage loss / delay, flight delay, trip cancellation, each with its own document checklist. Today's claim causes don't include these. |
| P2 | **Issue-before-departure guard** | Warn when the policy start is on or after departure, or when a traveller is over the plan's age limit. |
| P2 | **Emergency assistance details** | The insurer's 24-hour assistance number and the traveller's certificate, sent by WhatsApp before departure. The communications module can do this once the data exists. |

---

## 5. Smaller findings

- **Claim deductible doesn't read policy terms:** already known (FEATURE_GAPS #6). It matters more for large accounts because percent-with-minimum deductibles are the norm.
- **Co-insurance totals only warn:** a policy can be saved with shares that don't add up to 100%. Block issuing, or at least block renewal, until they do.
- **`insured_name` is free text:** QQ structures ("PT Bank X QQ PT ABC") should be built from structured parties (insured + mortgagee / loss payee) so they print the same way on invoices, quotes and claim letters.
- **Renewal lead time:** large risks need terms requested 60–90 days before expiry (survey, reinsurance). Allow a per-policy or per-SI-band reminder lead time, not only the single company-wide window in Settings.
- **Debit note / credit note numbering:** the invoice page exists. Large clients' finance teams require sequential DN / CN numbers and a statement of account per customer group.

---

## 6. Suggested order of work

1. **Policy schedules** (locations / vehicles / travellers) and **endorsement premium + cancellation**. Everything else for large accounts depends on these two.
2. **Multi-currency.** Do it before item-level quotes so quotes are built currency-aware from the start.
3. **Itemised quotes + placement tracker + covernote.**
4. **Large-loss claims:** reserve history, interim payments, the settlement calculation with deductible and average, adjuster fields, co-insurance split, time-bar alerts.
5. **Property risk engineering:** structured fields, OJK occupation lookup, EQ and flood zone, survey recommendations / warranties, accumulation view.
6. **Line depth:** stock declaration policy, BI values, leasing / mortgage parties, multi-year motor schedule, travel plans and benefits, and unifying the product types (§3.6).
7. **Compliance:** beneficial owner, DTTOT / PEP screening, OJK tariff band warnings.
