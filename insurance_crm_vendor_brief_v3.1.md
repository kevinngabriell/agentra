# 📋 Vendor Brief: Insurance Agent Management System
**Prepared by:** General Insurance Agent – Independent (Primary: Chubb General Indonesia)  
**Document Purpose:** System Requirements for Custom Insurance CRM & Policy Management Platform  
**Target Reader:** Software Development Vendor (& AI Agents assisting in development)  
**Version:** 3.1 — April 2026  
**Revision Notes:** v3.0 — Multi-insurer support, customer type split, full DB schema. v3.1 — Fire insurance coverage sub-components (BANGUNAN/STOK/INVEN) added; premium rate type (per-mille vs percentage) clarified; Chubb policy prefix → commission rate auto-detection added; meterai (stamp duty) and PPh (commission tax) fields added to policies table; HRS DISETOR (remittance amount) calculation defined; new `chubb_commission_prefixes` and `system_settings` tables added.

---

## 1. Background & Context

The agent operates as an independent general insurance agent, **primarily under Chubb General Indonesia** but also placing risks with alternative insurers when Chubb declines (e.g., high-risk warehouses, specialty cargo). The agent manages a growing portfolio of **more than 1,000 active customers** and oversees a network of **sub-agents (referral agents)**.

**Approximately 60% of customers are companies (Badan Usaha)**. The remaining 40% are individuals (Perorangan). Both types must be fully supported with different identifier fields and contact structures.

### Products Covered
- 🏠 Fire & Property Insurance (residential and commercial)
- 🛵 Motorcycle / Motor Vehicle Insurance
- ✈️ Travel Insurance
- 📦 Cargo Insurance
- 📋 Other general insurance products (miscellaneous lines)

### Current Pain Points

| # | Problem | Impact |
|---|---------|--------|
| 1 | All policy documents are **physical/paper-based** | Cannot search, filter, or audit efficiently |
| 2 | **No centralized renewal tracking** | Renewals are missed or followed up too late |
| 3 | 1,000+ customers renew on **different dates throughout the year** | Impossible to track manually |
| 4 | **No reminder system** to alert the agent on workload ahead | Agent has no visibility of upcoming renewals |
| 5 | **Multi-insurer management** is entirely manual | No unified view across Chubb and alternative insurers |
| 6 | **Sub-agent referral tracking** is unstructured | No visibility on which customers came from which agent |
| 7 | **Commission tracking is manual** | Difficult to reconcile across multiple insurers |
| 8 | **Payment reporting** is done separately per insurer | Easy to miss or mix up payment confirmations |

---

## 2. System Goals

1. **Digitize & centralize** all customer and policy data across all insurers in one platform
2. **Proactively alert the agent via WhatsApp** on daily and monthly renewal workload summaries
3. **Track commissions** accurately per policy, per insurer, per product, per agent
4. **Manage sub-agent network** with clear hierarchy and attribution
5. **Support payment consolidation reporting** per insurer for head office submission
6. **Reduce manual workload** from data lookup, follow-up coordination, and multi-insurer reconciliation

---

## 3. Platform Scope

> ⚠️ **Important for Vendor:** The system is **web-based only**. No native mobile app (iOS/Android) is required. The web application must be **mobile-responsive**. A dedicated mobile app is explicitly **out of scope**.

### Delivery Target
- Accessible via any modern browser (Chrome, Safari, Firefox, Edge)
- Fully functional on both desktop and mobile browser
- Optimized layout for both screen sizes (responsive design using CSS breakpoints)

---

## 4. Core Modules Required

---

### 4.1 Insurer Management (New — Required Before All Other Modules)

Muksin works with multiple insurers. The system must allow him to configure and manage his insurer relationships.

Each insurer record must store:

| Field | Description |
|-------|-------------|
| Insurer Name | Full name (e.g., "Chubb General Indonesia") |
| Short Name | Abbreviation for display in tables (e.g., "Chubb", "Asei") |
| Muksin's Agent Code | His agent code at this insurer (may be null if informal arrangement) |
| Is Primary | Boolean — Chubb is primary; others are secondary |
| Default Commission Rate per Product | Configurable rate table per product type at this insurer |
| Notes | Internal notes (e.g., "Use for high-risk warehouse only") |
| Status | Active / Inactive |

> **Business rule:** When adding a policy, the insurer must be selected first. The system then auto-fills the agent code and pre-populates the default commission rate for that product type at that insurer. Both are editable per policy.

---

### 4.2 Customer Management (CRM)

> ⚠️ **Critical change from v2.0:** The customer entity must support **two distinct types** — Individual (Perorangan) and Company (Badan Usaha). The customer type is set at creation and drives which fields are shown and which identifier is used.

#### Customer Type A — Individual (Perorangan)

| Field | Requirement |
|-------|-------------|
| customer_type | Fixed: "individual" |
| Full Name | Required |
| NIK (KTP) | Required — 16 digits — primary identifier |
| Date of Birth | Required |
| Phone | Required |
| WhatsApp Number | Required — used for renewal reminders |
| Email | Optional |
| Address | Required |
| NPWP | Optional |
| Customer Source | Direct or Referred (with sub-agent reference) |
| Status | Active / Inactive / Lapsed |
| Notes / Follow-up Log | Required |

#### Customer Type B — Company (Badan Usaha)

| Field | Requirement |
|-------|-------------|
| customer_type | Fixed: "company" |
| Company Name | Required — **primary search key** |
| NPWP | Required — primary formal identifier |
| NIB (Nomor Induk Berusaha) | Optional — business registration number |
| Business Type | Required (Perdagangan, Manufaktur, Logistik, Pergudangan, Jasa, etc.) |
| Operational Address | Required |
| Legal Address | Required (may differ from operational) |
| Company Phone | Optional |
| Company Email | Optional |
| **PIC Name** | Required — the person Muksin contacts |
| **PIC Phone** | Required |
| **PIC WhatsApp** | Required — **this is the number used for renewal follow-up and WhatsApp reminders** |
| PIC Role/Jabatan | Optional (e.g., "Direktur", "Admin Keuangan", "Owner") |
| Customer Source | Direct or Referred |
| Status | Active / Inactive / Lapsed |
| Notes / Follow-up Log | Required |

**Search & Filter Requirements:**
- Search by: company name, PIC name, personal name, NIK, NPWP, phone, policy number
- Primary search behavior: **match company name first** for company customers
- Filter by: customer type, product type, renewal month, insurer, agent name, policy status

---

### 4.3 Policy Management

Each policy record must contain:

| Field | Description |
|-------|-------------|
| Policy Number | Unique identifier from the insurer |
| **Insurer** | FK to insurers table — required |
| **Agent Code Used** | Auto-filled from insurer record, editable per policy |
| Customer Reference | Linked to customer profile |
| Product Type | Fire, Motorcycle, Car, Travel, Cargo, Other |
| Object Insured | Property address, vehicle plate, etc. |
| Policy Start Date | Inception date |
| Policy End Date / Expiry Date | Used for renewal tracking |
| Renewal Status | Pending / Renewed / Lapsed / Cancelled |
| Payment Status | Unpaid / Paid / Confirmed |
| Payment Date | Date customer paid (as confirmed by receipt) |
| Payment Reference | Transfer reference or receipt number |
| Document Attachment | Scanned PDF / image of original policy |
| Issuing Agent | The agent or sub-agent who sold this policy |
| Commission Status | Pending / Received / Partially Received |

#### 4.3.1 Fire Insurance — Coverage Sub-Components

> ⚠️ **Fire policies only.** Other product types use a single `sum_insured` field.

Fire insurance (Asuransi Kebakaran) can cover up to three separate components at one insured location. Each has its own sum insured, and the **total** is what the premium rate is applied to:

| Component | Field | Description | Example |
|-----------|-------|-------------|---------|
| Bangunan | `sum_insured_bangunan` | Building/structure value | Rp 200 JT |
| Stok | `sum_insured_stok` | Stock/inventory stored at location | Rp 800 JT |
| Inventaris/Isi | `sum_insured_inven_isi` | Contents, fixtures, fittings | Rp 150 JT |

Any of the three can be zero if not applicable. The UI must allow entering each separately and display the calculated total.

#### 4.3.2 Premium Rate Type — Per-Mille vs Percentage

> ⚠️ **Critical distinction** — do not confuse with commission rate.

| Product | Rate Type | Meaning | Example |
|---------|-----------|---------|---------|
| Fire (Kebakaran) | **Per-mille (‰)** | Rate per Rp 1,000 of sum insured | Rate 2.85 → Rp 2,850 per Rp 1,000,000 |
| Motorcycle, Travel, Cargo, Other | **Percentage (%)** | Rate as % of sum insured | Standard % rates |

The system must store `premium_rate_type` alongside `premium_rate` so the correct calculation is applied.

#### 4.3.3 Full Premium & Commission Calculation Chain

The following chain applies to **all product types**. For fire, step 1 uses sub-components:

```
-- Step 1: Total Sum Insured
total_sum_insured = sum_insured_bangunan + sum_insured_stok + sum_insured_inven_isi
                  (for non-fire: total_sum_insured = sum_insured)

-- Step 2: Base Premium
IF premium_rate_type = 'per_mille':
  premi = total_sum_insured × premium_rate ÷ 1,000
ELSE (percentage):
  premi = total_sum_insured × premium_rate ÷ 100

-- Step 3: Premium + Meterai (stamp duty)
premi_plus_meterai = premi + meterai_amount   -- meterai = Rp 10,000 (configurable)

-- Step 4: Gross Commission
komisi_gross = premi × commission_rate ÷ 100   -- commission rate based on prefix (Chubb) or insurer default

-- Step 5: PPh (tax on commission)
pajak_komisi = komisi_gross × pph_rate ÷ 100  -- pph_rate ≈ 2.5% (configurable)

-- Step 6: Net Commission
komisi_nett = komisi_gross - pajak_komisi

-- Step 7: Amount to remit to insurer head office (HRS DISETOR)
hrs_disetor = premi_plus_meterai - komisi_nett
```

> **HRS DISETOR** is the critical number for Muksin's head office reporting — it is the net amount he must remit to the insurer after deducting his net commission.

#### 4.3.4 Chubb Commission Prefix Rules

For **Chubb policies only**, the commission rate is determined by the **prefix of the policy number** (digits before the first dot). This overrides the default insurer × product rate.

| Policy Prefix | Commission Rate |
|---------------|----------------|
| 01, 08, 88, 61, 62 | 15% |
| 02 | 25% |
| Aep | 30% |
| Kecelakaan (accident product) | 20% |

**Auto-detection logic:** When Muksin types a Chubb policy number, the system extracts the prefix, looks it up in the `chubb_commission_prefixes` table, and auto-fills `commission_rate`. The rate remains editable per policy.

For **non-Chubb insurers**, the commission rate is sourced from `insurer_commission_rates` (insurer × product default).

---

### 4.4 Renewal Management & Agent Notification

This is the **most critical module**. The focus is on making sure the agent is always aware of their renewal workload — proactively pushed to them, not something they have to remember to check.

#### 4.4.1 Renewal Calendar View (Web Dashboard)
- Monthly calendar or list view showing all policies expiring in the current and next month
- Color-coded status: 🟢 Renewed | 🟡 Follow-up Needed | 🔴 Expired/Lapsed
- Filterable by product type, insurer, sub-agent, or customer name

#### 4.4.2 WhatsApp Digest Notification to Agent ⭐ Core Feature

The system must automatically send **WhatsApp summary messages** to the **main agent's registered WhatsApp number**.

##### Monthly Digest — Sent on the 1st of Every Month at 08:00 WIB

```
📋 *Renewal Summary – [Month Year]*

Halo! Berikut ringkasan renewal Anda bulan ini:

📌 Total polis yang harus di-follow up: *47 polis*

Rincian berdasarkan waktu:
• Jatuh tempo minggu ini (1–7 [Month]): 8 polis
• Jatuh tempo minggu depan (8–14 [Month]): 12 polis
• Jatuh tempo akhir bulan: 27 polis

Rincian berdasarkan produk:
• 🛵 Kendaraan: 18 polis
• 🏠 Kebakaran: 14 polis
• ✈️ Perjalanan: 9 polis
• 📦 Cargo & Lainnya: 6 polis

Silakan buka dashboard untuk melihat detail lengkap:
🔗 [link to renewal list page]
```

##### Daily Digest — Sent Every Morning (Configurable Days) at 08:00 WIB

```
🔔 *Daily Renewal Reminder – [Day, Date]*

Berikut polis yang perlu Anda tindak lanjuti hari ini:

⚠️ Jatuh tempo HARI INI: *3 polis*
• Budi Santoso – Asuransi Kendaraan (Chubb)
• PT Maju Jaya – Cargo (Asei) — PIC: Rini, 08123456789
• Dewi Rahayu – Kebakaran Rumah (Chubb)

📅 Jatuh tempo dalam 7 hari ke depan: *11 polis*

Buka dashboard untuk follow up:
🔗 [link to today's renewal list]
```

> **Note:** For company customers, the daily digest shows the **PIC name and PIC WhatsApp number** alongside the company name, so Muksin knows exactly who to contact without opening the app.

##### Agent Configuration Options (in Settings):
- Toggle daily digest ON / OFF
- Set preferred time for daily digest (default: 08:00 WIB)
- Toggle monthly digest ON / OFF
- Choose which days of the week to receive daily digest (e.g., Mon–Sat)
- Agent's registered WhatsApp number (editable)

#### 4.4.3 In-App Notification Bell (Web)
- Bell icon in top nav with unread count badge
- Notification types: policy expiring today, policies expiring this week (count), policy marked Lapsed, commission received
- All notifications are clickable and link to the relevant record

#### 4.4.4 Renewal Workflow (Per Policy)
1. Agent sees reminder (via WhatsApp digest or dashboard)
2. Agent opens the policy in the web app
3. Agent logs follow-up action: Contacted / Customer Confirmed / Customer Declined / No Response
4. After renewal: agent uploads new policy document → system auto-updates expiry date
5. Commission from renewal is auto-calculated and added to ledger

---

### 4.5 Payment Consolidation & Reporting

> **New in v3.0 — insurer-level filtering required**

Muksin submits payment confirmation reports to **each insurer's head office separately**. The system must support:

- Recording per-policy payment status: Unpaid / Paid / Confirmed
- Recording payment date and transfer reference number
- A **consolidated payment view** filterable by insurer — showing which customers have paid and which haven't
- A **Payment Summary Report** exportable per insurer (for head office submission)

---

### 4.6 Commission Tracking

#### Per Policy Commission:
- Rate varies by insurer × product type (configurable in insurer settings)
- Calculated: `Commission Amount = Premium × Commission Rate`
- Track: Earned date, Expected payment date, Actual payment date, Amount received

#### Commission Dashboard:
- Total earned this month / year
- Pending vs. received — **filterable by insurer**
- Breakdown by insurer
- Breakdown by product type
- Breakdown by sub-agent (for override commissions)
- Export to Excel / PDF

#### Commission Ledger:
- Full log of all commission transactions across all insurers
- Ability to mark commission as "Received" with date and amount
- Flag discrepancies between expected and received amounts

---

### 4.7 Sub-Agent / Referral Network Management

#### Agent Hierarchy:
```
Main Agent (Muksin)
├── Sub-Agent A
│   ├── Customer 1 — Company (Policy X, Chubb)
│   └── Customer 2 — Individual (Policy Y, Asei)
├── Sub-Agent B
│   └── Customer 3 — Company (Policy Z, Chubb)
└── Direct Customers (no referral)
```

#### Sub-Agent Profile:
- Name, agent code, contact info (including WhatsApp number)
- Date joined / active status
- List of customers referred (with customer type indicator)
- List of policies generated (with insurer indicator)
- Total premium and commission generated per insurer

#### Sub-Agent Performance Dashboard:
- Number of active policies per sub-agent
- Renewal rate per sub-agent
- Total premium & commission generated
- Month-over-month growth

---

### 4.8 Document Management

- Upload and store scanned policy documents (PDF, JPG, PNG)
- Link document to specific policy record
- Organize by customer, insurer, and year
- Preview document in-browser without downloading
- Archive expired policies (never delete — keep for audit trail)

---

### 4.9 Reporting & Analytics

| Report | Description | Insurer Filter |
|--------|-------------|---------------|
| Monthly Renewal Report | All renewals due in a given month | Yes |
| Commission Summary | Earned vs. received, by period | Yes |
| Payment Consolidation Report | Payment status per insurer for head office | Yes — required |
| Portfolio Overview | Active policies by product type | Yes |
| Lapsed Policy Report | Policies that expired without renewal | Yes |
| Sub-Agent Production | Performance per sub-agent | Yes |
| Customer Retention Rate | % of customers who renew year over year | Optional |

All reports must be **exportable to Excel or PDF**.

---

## 5. Non-Functional Requirements

### Platform
- Web-based only — no native mobile app required
- Mobile-responsive design for browser on smartphone
- Minimum browser support: Chrome 100+, Safari 15+, Firefox 100+

### Performance
- Must handle 1,000+ customer records with fast search response (< 2 seconds)
- Scalable to 5,000+ records as portfolio grows

### Security
- Role-based access control (Main Agent vs. Sub-Agent view)
- Sub-agents see only their own customers and policies
- All data encrypted at rest and in transit (HTTPS, encrypted DB)
- Login with username + password; optional 2FA

### Data
- Daily automatic backup
- Data export capability — agent must own their data
- Ability to import existing data via Excel/CSV upload
- Import template must support both customer types and insurer field

### Notifications
- WhatsApp digest to agent is a primary required feature (not optional)
- In-app notification bell for real-time alerts
- Email notifications are optional / secondary

---

## 6. Database Schema (PostgreSQL)

### 6.1 Entity Relationship Overview

```
insurers              (master insurer list + Muksin's agent codes)
  ↓ one-to-many
insurer_commission_rates    (default rates per insurer × product)
chubb_commission_prefixes   (Chubb-only prefix → commission rate rules)

system_settings       (global configurable values: meterai amount, PPh rate, etc.)

customers             (individual or company — type-driven fields)
  ↓ one-to-many
policies              (each policy linked to one insurer + one customer)
  │   fire policies have sum_insured_bangunan / stok / inven_isi sub-components
  │   all policies carry full calculation chain: premi → meterai → komisi → pph → hrs_disetor
  ↓ one-to-one
commissions           (one commission record per policy)
  ↓ one-to-many
documents             (scanned policy files)
  ↓ one-to-many
follow_up_logs        (renewal follow-up history)

agents                (main agent + sub-agents)
  ↓ one-to-many
customers             (referral attribution)

notification_settings (per agent WhatsApp digest preferences)
whatsapp_digest_logs  (sent message history)
in_app_notifications  (bell icon notifications)
```

---

### 6.2 Full Table Definitions

```sql
-- ============================================================
-- INSURERS
-- ============================================================
CREATE TABLE insurers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  short_name        VARCHAR(50)  NOT NULL,
  muksin_agent_code VARCHAR(100),
  is_primary        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSURER COMMISSION RATES (default rates per insurer x product)
-- ============================================================
CREATE TABLE insurer_commission_rates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id   UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  product_type VARCHAR(50) NOT NULL, -- 'fire','motorcycle','car','travel','cargo','other'
  rate_percent NUMERIC(5,2) NOT NULL, -- e.g. 15.00 for 15%
  notes        TEXT,
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (insurer_id, product_type)
);

-- ============================================================
-- AGENTS (main agent + sub-agents)
-- ============================================================
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('main_agent', 'sub_agent')),
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  whatsapp      VARCHAR(20),
  parent_id     UUID REFERENCES agents(id) ON DELETE SET NULL, -- NULL for main agent
  is_active     BOOLEAN   NOT NULL DEFAULT TRUE,
  joined_date   DATE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type       VARCHAR(20) NOT NULL CHECK (customer_type IN ('individual', 'company')),
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'lapsed')),
  source              VARCHAR(20) NOT NULL DEFAULT 'direct'
                        CHECK (source IN ('direct', 'referral')),
  referred_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- ── Shared fields ──────────────────────────────────────────
  -- For individual: display_name = full personal name
  -- For company:    display_name = company commercial/trade name
  display_name        VARCHAR(200) NOT NULL,
  phone               VARCHAR(20),
  whatsapp_number     VARCHAR(20),  -- individual: personal WA; company: general company WA (optional)
  email               VARCHAR(200),
  operational_address TEXT,
  notes               TEXT,

  -- ── Individual-only fields (NULL when customer_type = 'company') ──
  nik                 VARCHAR(16),  -- KTP number
  date_of_birth       DATE,
  npwp_personal       VARCHAR(20),

  -- ── Company-only fields (NULL when customer_type = 'individual') ──
  company_legal_name  VARCHAR(200), -- as on NPWP / legal docs (may differ from display_name)
  npwp_company        VARCHAR(20),  -- primary corporate identifier
  nib                 VARCHAR(30),  -- Nomor Induk Berusaha
  business_type       VARCHAR(100), -- e.g., 'Perdagangan', 'Manufaktur', 'Logistik', 'Pergudangan'
  legal_address       TEXT,         -- registered address (may differ from operational)
  company_phone       VARCHAR(20),
  company_email       VARCHAR(200),

  -- ── PIC (for company — the human Muksin contacts) ──────────
  pic_name            VARCHAR(200), -- required for company type
  pic_phone           VARCHAR(20),  -- required for company type
  pic_whatsapp        VARCHAR(20),  -- USED FOR RENEWAL REMINDERS on company policies
  pic_role            VARCHAR(100), -- e.g., 'Direktur', 'Admin Keuangan', 'Owner'

  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT nik_required_for_individual
    CHECK (customer_type != 'individual' OR nik IS NOT NULL),
  CONSTRAINT npwp_required_for_company
    CHECK (customer_type != 'company' OR npwp_company IS NOT NULL),
  CONSTRAINT pic_required_for_company
    CHECK (customer_type != 'company' OR (pic_name IS NOT NULL AND pic_whatsapp IS NOT NULL))
);

CREATE INDEX idx_customers_type       ON customers(customer_type);
CREATE INDEX idx_customers_display    ON customers(display_name);
CREATE INDEX idx_customers_nik        ON customers(nik);
CREATE INDEX idx_customers_npwp       ON customers(npwp_company);
CREATE INDEX idx_customers_agent      ON customers(referred_by_agent_id);
CREATE INDEX idx_customers_status     ON customers(status);

-- ============================================================
-- CHUBB COMMISSION PREFIX RULES (Chubb-only)
-- ============================================================
CREATE TABLE chubb_commission_prefixes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix          VARCHAR(20) NOT NULL UNIQUE, -- e.g. '01', '02', '62', 'Aep'
  commission_rate NUMERIC(5,2) NOT NULL,        -- e.g. 15.00
  description     VARCHAR(200),                 -- e.g. 'Standard fire & property'
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data:
-- INSERT INTO chubb_commission_prefixes (prefix, commission_rate, description) VALUES
--   ('01',  15.00, 'Standard'),
--   ('08',  15.00, 'Standard'),
--   ('88',  15.00, 'Standard'),
--   ('61',  15.00, 'Standard'),
--   ('62',  15.00, 'Standard'),
--   ('02',  25.00, 'Higher tier'),
--   ('Aep', 30.00, 'AEP product'),
--   ('Kecelakaan', 20.00, 'Accident product');

-- ============================================================
-- SYSTEM SETTINGS (global configurable values)
-- ============================================================
CREATE TABLE system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       VARCHAR(500) NOT NULL,
  description TEXT,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data:
-- INSERT INTO system_settings (key, value, description) VALUES
--   ('meterai_amount', '10000',  'Stamp duty added to every premium (Rp)'),
--   ('pph_rate',       '2.5',    'PPh tax rate applied to gross commission (%)'),
--   ('default_currency', 'IDR',  'System currency');

-- ============================================================
-- POLICIES
-- ============================================================
CREATE TABLE policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number         VARCHAR(100) NOT NULL,
  insurer_id            UUID NOT NULL REFERENCES insurers(id),
  agent_code_used       VARCHAR(100),    -- auto-filled from insurer, editable
  customer_id           UUID NOT NULL REFERENCES customers(id),
  issuing_agent_id      UUID NOT NULL REFERENCES agents(id),

  product_type          VARCHAR(50) NOT NULL
                          CHECK (product_type IN ('fire','motorcycle','car','travel','cargo','other')),

  -- ── Object insured ─────────────────────────────────────────
  object_insured        TEXT,            -- e.g. "Gudang Jl. Sudirman No. 5" or "Honda Beat B 1234 XYZ"

  -- ── Sum Insured — Fire sub-components (fire only; others use sum_insured) ──
  sum_insured_bangunan  NUMERIC(18,2) DEFAULT 0,  -- Building/structure
  sum_insured_stok      NUMERIC(18,2) DEFAULT 0,  -- Stock/inventory at location
  sum_insured_inven_isi NUMERIC(18,2) DEFAULT 0,  -- Contents/fixtures/fittings
  -- For non-fire products:
  sum_insured           NUMERIC(18,2),             -- Single sum insured (NULL for fire — use sub-components)

  -- ── Premium calculation ─────────────────────────────────────
  -- total_sum_insured: computed at application level
  --   fire:     sum_insured_bangunan + sum_insured_stok + sum_insured_inven_isi
  --   non-fire: sum_insured
  premium_rate          NUMERIC(10,4) NOT NULL,     -- Numeric value of rate
  premium_rate_type     VARCHAR(20)   NOT NULL DEFAULT 'percentage'
                          CHECK (premium_rate_type IN ('per_mille', 'percentage')),
                          -- fire = 'per_mille'; motorcycle/travel/cargo/other = 'percentage'
  premi                 NUMERIC(18,2) NOT NULL,     -- Base premium (calculated)
  meterai_amount        NUMERIC(18,2) NOT NULL DEFAULT 10000, -- Stamp duty (from system_settings)
  premi_plus_meterai    NUMERIC(18,2) NOT NULL,     -- premi + meterai_amount

  -- ── Commission calculation ───────────────────────────────────
  -- For Chubb: commission_rate auto-filled from chubb_commission_prefixes by policy number prefix
  -- For others: auto-filled from insurer_commission_rates
  commission_rate       NUMERIC(5,2),               -- % commission rate (editable)
  komisi_gross          NUMERIC(18,2),              -- premi × commission_rate / 100
  pph_rate              NUMERIC(5,2) NOT NULL DEFAULT 2.5, -- PPh rate % (from system_settings)
  pajak_komisi          NUMERIC(18,2),              -- komisi_gross × pph_rate / 100
  komisi_nett           NUMERIC(18,2),              -- komisi_gross - pajak_komisi
  hrs_disetor           NUMERIC(18,2),              -- premi_plus_meterai - komisi_nett (remittance to insurer)

  -- ── Coverage dates ──────────────────────────────────────────
  coverage_start        DATE NOT NULL,
  coverage_end          DATE NOT NULL,              -- primary renewal tracking field

  -- ── Renewal workflow ────────────────────────────────────────
  renewal_status        VARCHAR(30) NOT NULL DEFAULT 'pending'
                          CHECK (renewal_status IN ('pending','renewed','lapsed','cancelled')),
  follow_up_status      VARCHAR(30) NOT NULL DEFAULT 'not_contacted'
                          CHECK (follow_up_status IN (
                            'not_contacted','contacted','customer_confirmed',
                            'customer_declined','no_response'
                          )),

  -- ── Payment (customer pays direct to insurer) ───────────────
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid','paid','confirmed')),
  payment_date          DATE,
  payment_reference     VARCHAR(200),

  notes                 TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (policy_number, insurer_id),

  -- Fire policies must use sub-components; non-fire must use sum_insured
  CONSTRAINT fire_uses_subcomponents
    CHECK (product_type != 'fire' OR sum_insured IS NULL),
  CONSTRAINT nonfire_uses_sum_insured
    CHECK (product_type = 'fire' OR sum_insured IS NOT NULL)
);

CREATE INDEX idx_policies_customer    ON policies(customer_id);
CREATE INDEX idx_policies_insurer     ON policies(insurer_id);
CREATE INDEX idx_policies_expiry      ON policies(coverage_end);
CREATE INDEX idx_policies_renewal     ON policies(renewal_status);
CREATE INDEX idx_policies_payment     ON policies(payment_status);
CREATE INDEX idx_policies_agent       ON policies(issuing_agent_id);
CREATE INDEX idx_policies_product     ON policies(product_type);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID UNIQUE NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  insurer_id        UUID NOT NULL REFERENCES insurers(id),
  -- Expected = komisi_nett from policies table at time of policy creation
  expected_amount   NUMERIC(18,2) NOT NULL,
  received_amount   NUMERIC(18,2) DEFAULT 0,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','received','partially_received','discrepancy')),
  expected_date     DATE,
  received_date     DATE,
  reference_number  VARCHAR(200),    -- insurer payment reference
  notes             TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_insurer  ON commissions(insurer_id);
CREATE INDEX idx_commissions_status   ON commissions(status);

-- ============================================================
-- DOCUMENTS (policy document attachments)
-- ============================================================
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id     UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  insurer_id    UUID NOT NULL REFERENCES insurers(id),
  document_type VARCHAR(50) NOT NULL DEFAULT 'policy_document'
                  CHECK (document_type IN (
                    'policy_document','endorsement','renewal_document',
                    'payment_receipt','other'
                  )),
  file_name     VARCHAR(300) NOT NULL,
  file_url      TEXT NOT NULL,        -- S3 or equivalent URL
  file_size_kb  INTEGER,
  mime_type     VARCHAR(100),
  policy_year   INTEGER,              -- for easy archiving by year
  uploaded_by   UUID REFERENCES agents(id),
  uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_policy     ON documents(policy_id);
CREATE INDEX idx_documents_customer   ON documents(customer_id);

-- ============================================================
-- FOLLOW-UP LOGS (renewal follow-up history per policy)
-- ============================================================
CREATE TABLE follow_up_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id     UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  action        VARCHAR(50) NOT NULL
                  CHECK (action IN (
                    'contacted','customer_confirmed','customer_declined',
                    'no_response','document_uploaded','policy_renewed','other'
                  )),
  note          TEXT,
  logged_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followup_policy      ON follow_up_logs(policy_id);
CREATE INDEX idx_followup_customer    ON follow_up_logs(customer_id);

-- ============================================================
-- NOTIFICATION SETTINGS (per agent)
-- ============================================================
CREATE TABLE notification_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                UUID UNIQUE NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  daily_digest_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  daily_digest_time       TIME    NOT NULL DEFAULT '08:00:00',
  daily_digest_days       INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- ISO weekday 1=Mon
  monthly_digest_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_number         VARCHAR(20) NOT NULL,
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP DIGEST LOGS (audit trail of sent messages)
-- ============================================================
CREATE TABLE whatsapp_digest_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  digest_type   VARCHAR(20) NOT NULL CHECK (digest_type IN ('daily','monthly')),
  message_body  TEXT NOT NULL,
  sent_to       VARCHAR(20) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent','failed','pending')),
  error_message TEXT,
  sent_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- IN-APP NOTIFICATIONS
-- ============================================================
CREATE TABLE in_app_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  policy_id      UUID REFERENCES policies(id) ON DELETE SET NULL,
  type           VARCHAR(50) NOT NULL
                   CHECK (type IN (
                     'expiring_today','expiring_this_week','policy_lapsed',
                     'commission_received','payment_confirmed','other'
                   )),
  title          VARCHAR(300) NOT NULL,
  body           TEXT,
  is_read        BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_agent          ON in_app_notifications(agent_id);
CREATE INDEX idx_notif_read           ON in_app_notifications(agent_id, is_read);
```

---

### 6.3 Key Business Rules Enforced at DB Level

| Rule | Enforcement |
|------|-------------|
| Individual customers must have NIK | CHECK constraint on customers |
| Company customers must have NPWP + PIC WA | CHECK constraint on customers |
| Policy number is unique per insurer | UNIQUE (policy_number, insurer_id) |
| Fire policies use sub-components, not sum_insured | CHECK constraint on policies |
| Non-fire policies use sum_insured, not sub-components | CHECK constraint on policies |
| premium_rate_type must be 'per_mille' for fire or 'percentage' for others | Application logic (enforced in form + service layer) |
| Chubb commission rate auto-filled from prefix table | Application logic on policy number input |
| Non-Chubb commission rate auto-filled from insurer_commission_rates | Application logic |
| komisi_gross, pajak_komisi, komisi_nett, hrs_disetor all calculated server-side | Never computed client-side — always recalculated on save |
| meterai_amount defaults from system_settings | Application logic; stored per-policy for historical accuracy |
| pph_rate defaults from system_settings | Application logic; stored per-policy for historical accuracy |

### 6.4 Calculation Rules — Application Layer

All monetary calculations must happen **server-side** on policy save/update. Never trust client-computed values for financial fields.

```python
def calculate_policy_financials(policy, system_settings):

    # 1. Total sum insured
    if policy.product_type == 'fire':
        total_si = (policy.sum_insured_bangunan or 0) +
                   (policy.sum_insured_stok or 0) +
                   (policy.sum_insured_inven_isi or 0)
    else:
        total_si = policy.sum_insured

    # 2. Base premium
    if policy.premium_rate_type == 'per_mille':
        premi = total_si * policy.premium_rate / 1000
    else:  # percentage
        premi = total_si * policy.premium_rate / 100

    # 3. Premium + meterai
    meterai = Decimal(system_settings['meterai_amount'])  # default 10000
    premi_plus_meterai = premi + meterai

    # 4. Gross commission
    # For Chubb: rate comes from chubb_commission_prefixes (by prefix)
    # For others: rate comes from insurer_commission_rates (by insurer × product)
    komisi_gross = premi * policy.commission_rate / 100

    # 5. PPh tax on commission
    pph_rate = Decimal(system_settings['pph_rate'])  # default 2.5
    pajak_komisi = komisi_gross * pph_rate / 100

    # 6. Net commission
    komisi_nett = komisi_gross - pajak_komisi

    # 7. Remittance to insurer
    hrs_disetor = premi_plus_meterai - komisi_nett

    return {
        'premi': premi,
        'meterai_amount': meterai,
        'premi_plus_meterai': premi_plus_meterai,
        'komisi_gross': komisi_gross,
        'pph_rate': pph_rate,
        'pajak_komisi': pajak_komisi,
        'komisi_nett': komisi_nett,
        'hrs_disetor': hrs_disetor,
    }


def get_chubb_commission_rate(policy_number: str, db) -> Decimal | None:
    """Extract prefix from policy number and look up commission rate."""
    prefix = policy_number.split('.')[0]  # digits before first dot
    row = db.query(
        "SELECT commission_rate FROM chubb_commission_prefixes WHERE prefix = %s",
        [prefix]
    ).first()
    return row.commission_rate if row else None
```

---

## 7. Technical Guidance for Development Team

### Suggested Tech Stack (flexible)
- **Frontend:** React or Vue.js — mobile-responsive, web only
- **Backend:** Node.js / Python (FastAPI or Django)
- **Database:** PostgreSQL (schema above)
- **File Storage:** AWS S3 or equivalent for policy document uploads
- **WhatsApp:** Twilio WhatsApp API or official WhatsApp Business API
- **Scheduler:** Cron jobs or task queue (Celery / Bull) for digest dispatch

### WhatsApp Digest Scheduler — Updated Logic (Pseudocode)

```
=== DAILY DIGEST ===

function send_daily_digest(agent):
  today       = current_date()
  in_7_days   = today + 7 days

  expiring_today = policies
    WHERE coverage_end = today
    AND renewal_status = 'pending'
    AND issuing_agent_id IN agent.team_ids

  expiring_week = policies
    WHERE coverage_end BETWEEN today+1 AND in_7_days
    AND renewal_status = 'pending'
    AND issuing_agent_id IN agent.team_ids

  FOR each policy IN expiring_today:
    customer = get_customer(policy.customer_id)
    IF customer.customer_type = 'company':
      contact_info = customer.pic_name + ' ' + customer.pic_whatsapp
    ELSE:
      contact_info = customer.display_name

  IF expiring_today.count > 0 OR expiring_week.count > 0:
    message = build_daily_message(expiring_today, expiring_week, contact_info)
    send_whatsapp(agent.whatsapp_number, message)
    log_digest(agent, 'daily', message)


=== MONTHLY DIGEST ===

function send_monthly_digest(agent):
  month_start = first_day_of_current_month()
  month_end   = last_day_of_current_month()

  all_expiring = policies
    WHERE coverage_end BETWEEN month_start AND month_end
    AND renewal_status = 'pending'

  by_week    = group_by_week(all_expiring)
  by_product = group_by_product_type(all_expiring)

  message = build_monthly_message(all_expiring.count, by_week, by_product)
  send_whatsapp(agent.whatsapp_number, message)
  log_digest(agent, 'monthly', message)
```

---

## 8. Phased Delivery

### Phase 1 — Core MVP
- Insurer setup and management
- Customer CRM (both individual and company types)
- Policy management (with insurer linkage)
- Renewal calendar (web dashboard)
- Document upload and management
- Basic commission tracking
- In-app notification bell
- Payment status tracking per policy

### Phase 2 — WhatsApp Digest & Automation
- Daily WhatsApp digest (with PIC info for company customers)
- Monthly WhatsApp digest
- Notification settings panel
- Renewal workflow (follow-up status logging per policy)
- Commission auto-calculation per insurer × product
- Payment consolidation report (per insurer)

### Phase 3 — Network & Reports
- Sub-agent management module
- Optional: WhatsApp digest extended to sub-agents
- Full reporting & analytics dashboard (all reports with insurer filter)
- Data export (Excel/PDF)

### Phase 4 — Advanced / Future
- Chubb API integration (if available)
- Customer self-service portal

---

## 9. Questions for Vendor to Clarify Before Development

1. What is the estimated timeline and cost per phase?
2. Will the system be hosted (SaaS) or deployed on a dedicated server?
3. Is WhatsApp Business API setup and cost included, or handled separately by the agent?
4. What is the process for importing existing customer data from Excel files (supporting both customer types)?
5. What SLA is offered for bug fixes and uptime?
6. Will source code be handed over, or is this a hosted proprietary solution?
7. How is multi-user access (main agent + sub-agents) licensed/priced?
8. What happens to WhatsApp message delivery if the API has downtime — is there a fallback?

---

## 10. Summary Checklist for Vendor

**Platform**
- [ ] Web-based only (no native mobile app)
- [ ] Mobile-responsive design

**Insurer Management**
- [ ] Insurer master list with agent codes per insurer
- [ ] Default commission rate table per insurer × product type
- [ ] Insurer field on every policy record

**Customer & Policy**
- [ ] Customer CRM — Individual type with NIK as primary identifier
- [ ] Customer CRM — Company type with NPWP/NIB + PIC fields
- [ ] Company name as primary search key for company customers
- [ ] PIC WhatsApp used for renewal reminders on company policies
- [ ] Policy management with insurer linkage on every policy
- [ ] Fire policies: separate sum insured fields for BANGUNAN, STOK, INVEN/ISI
- [ ] Non-fire policies: single sum insured field
- [ ] Premium rate stored as per-mille (‰) for fire, percentage (%) for others
- [ ] Full calculation chain auto-computed server-side: PREMI → METERAI → KOMISI → PPH → KOMISI NETT → HRS DISETOR
- [ ] Chubb policy prefix → commission rate auto-detection (chubb_commission_prefixes table)
- [ ] Non-Chubb commission rate from insurer_commission_rates table
- [ ] Meterai amount and PPh rate configurable in system_settings
- [ ] Document upload and archive per policy

**Renewal & Notifications**
- [ ] Renewal calendar with insurer filter
- [ ] ⭐ Daily WhatsApp digest — includes PIC info for company customer policies
- [ ] ⭐ Monthly WhatsApp digest — full month count by week and product type
- [ ] Notification settings panel (toggle, time, days)
- [ ] In-app notification bell with unread count
- [ ] Renewal follow-up status logging per policy

**Payment**
- [ ] Payment status per policy (Unpaid / Paid / Confirmed)
- [ ] Payment reference and date recording
- [ ] Consolidated payment view filterable by insurer
- [ ] Payment summary report exportable per insurer

**Commission**
- [ ] Commission auto-calculation per policy (rate from insurer × product default)
- [ ] Commission ledger with insurer filter
- [ ] Export commission report to Excel / PDF

**Sub-Agent Network**
- [ ] Sub-agent hierarchy and profile management
- [ ] Sub-agent performance dashboard (with insurer breakdown)
- [ ] Optional: extend WhatsApp digest to sub-agents

**System**
- [ ] Role-based access (main agent vs. sub-agent)
- [ ] CSV/Excel import supporting both customer types and insurer field
- [ ] Secure login with optional 2FA
- [ ] Daily automated data backup
- [ ] Full data export capability

---

*This document supersedes Vendor Brief v2.0. All prior references to "Chubb-only" scope are updated to reflect multi-insurer reality. For visual and interaction specifications, refer to UI/UX Design Brief v2.0.*
