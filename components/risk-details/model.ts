import type {
    IccClause, InspectionStatus, MemberRole, MotorCoverageType, MotorUsage, RiskDetails, RiskDetailsPayload, RiskGroup, RiskMember, SurveyStatus, TravelArea,
} from "@/lib/api/risk-details"

// Form state is all strings (money as plain digits) so inputs stay controlled; the converters below
// translate to and from the API shape.

export interface RiskForm {
    plate_number: string; chassis_number: string; engine_number: string
    vehicle_make: string; vehicle_model: string; vehicle_year: string; vehicle_color: string
    vehicle_usage: MotorUsage | ""; motor_coverage_type: MotorCoverageType | ""
    vehicle_value: string; tariff_region: string
    ext_flood: boolean; ext_earthquake: boolean; ext_rsmdcc: boolean; ext_terrorism: boolean
    tpl_limit: string; pa_driver_limit: string; pa_passenger_limit: string; pa_passenger_seats: string
    conveyance_name: string; voyage_from: string; voyage_to: string; bl_awb_number: string
    departure_date: string; icc_clause: IccClause | ""; goods_description: string; is_open_cover: boolean
    destinations: string; schengen_certificate_no: string
    occupation_code: string; occupation_description: string; survey_status: SurveyStatus | ""; survey_date: string
    // v2.1.0
    inspection_status: InspectionStatus | ""; inspection_date: string
    travel_plan_type: "single" | "annual" | ""; max_trip_days: string; plan_tier: string; travel_area: TravelArea | ""
    family_type: "individual" | "family" | "group" | ""; benefit_currency: string
    medical_limit: string; evacuation_limit: string; baggage_limit: string; delay_limit: string; cancellation_limit: string; max_age: string
    bi_gross_profit: string; bi_indemnity_months: string; bi_time_deductible_days: string
    is_stock_declaration: boolean; stock_max_sum_insured: string; stock_rate_permille: string; stock_deposit_premium: string; stock_refund_cap_percent: string
}

export interface MemberForm {
    _id: string
    member_role: MemberRole
    full_name: string; id_number: string; birth_date: string; relationship: string
    benefit_death: string; benefit_disability: string; benefit_medical: string
    share_percent: string
    certificate_number: string; trip_start: string; trip_end: string
}

export const EMPTY_RISK_FORM: RiskForm = {
    plate_number: "", chassis_number: "", engine_number: "",
    vehicle_make: "", vehicle_model: "", vehicle_year: "", vehicle_color: "",
    vehicle_usage: "", motor_coverage_type: "",
    vehicle_value: "", tariff_region: "",
    ext_flood: false, ext_earthquake: false, ext_rsmdcc: false, ext_terrorism: false,
    tpl_limit: "", pa_driver_limit: "", pa_passenger_limit: "", pa_passenger_seats: "",
    conveyance_name: "", voyage_from: "", voyage_to: "", bl_awb_number: "",
    departure_date: "", icc_clause: "", goods_description: "", is_open_cover: false,
    destinations: "", schengen_certificate_no: "",
    occupation_code: "", occupation_description: "", survey_status: "", survey_date: "",
    inspection_status: "", inspection_date: "",
    travel_plan_type: "", max_trip_days: "", plan_tier: "", travel_area: "", family_type: "", benefit_currency: "",
    medical_limit: "", evacuation_limit: "", baggage_limit: "", delay_limit: "", cancellation_limit: "", max_age: "",
    bi_gross_profit: "", bi_indemnity_months: "", bi_time_deductible_days: "",
    is_stock_declaration: false, stock_max_sum_insured: "", stock_rate_permille: "", stock_deposit_premium: "", stock_refund_cap_percent: "",
}

const MONEY_FIELDS = ["vehicle_value", "tpl_limit", "pa_driver_limit", "pa_passenger_limit", "bi_gross_profit", "stock_max_sum_insured", "stock_deposit_premium"] as const
const NUMBER_FIELDS = ["vehicle_year", "tariff_region", "pa_passenger_seats", "max_trip_days", "max_age", "bi_indemnity_months", "bi_time_deductible_days",
    "medical_limit", "evacuation_limit", "baggage_limit", "delay_limit", "cancellation_limit", "stock_rate_permille", "stock_refund_cap_percent"] as const
const BOOL_FIELDS = ["ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism", "is_open_cover", "is_stock_declaration"] as const

/** Columns that belong to each group — the same whitelist the API enforces. */
const GROUP_FIELDS: Record<RiskGroup, (keyof RiskForm)[]> = {
    motor: [
        "plate_number", "chassis_number", "engine_number", "vehicle_make", "vehicle_model", "vehicle_year", "vehicle_color",
        "vehicle_usage", "motor_coverage_type", "vehicle_value", "tariff_region",
        "ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism",
        "tpl_limit", "pa_driver_limit", "pa_passenger_limit", "pa_passenger_seats",
        "inspection_status", "inspection_date",
    ],
    cargo: ["conveyance_name", "voyage_from", "voyage_to", "bl_awb_number", "departure_date", "icc_clause", "goods_description", "is_open_cover"],
    travel: ["destinations", "schengen_certificate_no", "travel_plan_type", "max_trip_days", "plan_tier", "travel_area", "family_type",
        "benefit_currency", "medical_limit", "evacuation_limit", "baggage_limit", "delay_limit", "cancellation_limit", "max_age"],
    pa: [],
    fire: ["occupation_code", "occupation_description", "survey_status", "survey_date", "ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism",
        "bi_gross_profit", "bi_indemnity_months", "bi_time_deductible_days",
        "is_stock_declaration", "stock_max_sum_insured", "stock_rate_permille", "stock_deposit_premium", "stock_refund_cap_percent"],
}

export function riskFormFrom(details: RiskDetails | null | undefined): RiskForm {
    const form: Record<string, string | boolean> = { ...EMPTY_RISK_FORM }
    if (!details) return form as unknown as RiskForm
    for (const [key, value] of Object.entries(details)) {
        if (!(key in EMPTY_RISK_FORM) || value === null || value === undefined) continue
        form[key] = typeof value === "boolean" ? value : String(value)
    }
    return form as unknown as RiskForm
}

export function riskFormToPayload(form: RiskForm, group: RiskGroup): NonNullable<RiskDetailsPayload["risk_details"]> {
    const out: NonNullable<RiskDetailsPayload["risk_details"]> = {}
    for (const key of GROUP_FIELDS[group]) {
        const value = form[key]
        if ((BOOL_FIELDS as readonly string[]).includes(key)) out[key] = Boolean(value)
        else if ((MONEY_FIELDS as readonly string[]).includes(key) || (NUMBER_FIELDS as readonly string[]).includes(key)) out[key] = value === "" ? null : Number(value)
        else out[key] = typeof value === "string" && value.trim() !== "" ? value.trim() : null
    }
    return out
}

export const newMemberId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36)

export function emptyMember(role: MemberRole): MemberForm {
    return {
        _id: newMemberId(), member_role: role, full_name: "", id_number: "", birth_date: "", relationship: "",
        benefit_death: "", benefit_disability: "", benefit_medical: "", share_percent: "",
        certificate_number: "", trip_start: "", trip_end: "",
    }
}

export function membersFormFrom(members: RiskMember[]): MemberForm[] {
    const s = (v: string | number | null) => (v === null ? "" : String(v))
    return members.map(m => ({
        _id: m.member_id ?? newMemberId(), member_role: m.member_role, full_name: m.full_name,
        id_number: s(m.id_number), birth_date: s(m.birth_date), relationship: s(m.relationship),
        benefit_death: s(m.benefit_death), benefit_disability: s(m.benefit_disability), benefit_medical: s(m.benefit_medical),
        share_percent: s(m.share_percent),
        certificate_number: s(m.certificate_number ?? null), trip_start: s(m.trip_start ?? null), trip_end: s(m.trip_end ?? null),
    }))
}

export function membersToPayload(members: MemberForm[]): RiskMember[] {
    const text = (v: string) => (v.trim() === "" ? null : v.trim())
    const num = (v: string) => (v === "" ? null : Number(v))
    return members.map(m => ({
        member_role: m.member_role,
        full_name: m.full_name.trim(),
        id_number: text(m.id_number),
        birth_date: text(m.birth_date),
        relationship: text(m.relationship),
        benefit_death: m.member_role === "beneficiary" ? null : num(m.benefit_death),
        benefit_disability: m.member_role === "beneficiary" ? null : num(m.benefit_disability),
        benefit_medical: m.member_role === "beneficiary" ? null : num(m.benefit_medical),
        share_percent: m.member_role === "beneficiary" ? num(m.share_percent) : null,
        certificate_number: m.member_role === "traveller" ? text(m.certificate_number) : null,
        trip_start: m.member_role === "traveller" ? text(m.trip_start) : null,
        trip_end: m.member_role === "traveller" ? text(m.trip_end) : null,
    }))
}

/** Client-side checks that mirror the API, so the user sees the problem before submitting. Returns a message or null. */
export function validateRisk(form: RiskForm, members: MemberForm[], group: RiskGroup): string | null {
    if (group === "motor") {
        if (form.pa_passenger_limit && !form.pa_passenger_seats) return "Isi jumlah kursi penumpang untuk PA penumpang"
        const year = Number(form.vehicle_year)
        if (form.vehicle_year && (year < 1950 || year > new Date().getFullYear() + 1)) return "Tahun kendaraan tidak valid"
    }
    const named = members.filter(m => m.full_name.trim() === "")
    if (named.length > 0) return "Nama wajib diisi untuk setiap orang yang ditambahkan"
    const share = members.filter(m => m.member_role === "beneficiary").reduce((sum, m) => sum + (Number(m.share_percent) || 0), 0)
    if (share > 100) return "Total persentase penerima manfaat tidak boleh melebihi 100%"
    const badTrip = members.find(m => m.trip_start && m.trip_end && m.trip_end < m.trip_start)
    if (badTrip) return `Tanggal kembali ${badTrip.full_name || "traveller"} sebelum tanggal berangkat`
    return null
}

const SCHENGEN = ["austria", "belgia", "belgium", "ceko", "czech", "denmark", "estonia", "finlandia", "finland", "prancis", "perancis", "france",
    "jerman", "germany", "yunani", "greece", "hongaria", "hungary", "islandia", "iceland", "italia", "italy", "latvia", "liechtenstein", "lituania",
    "lithuania", "luksemburg", "luxembourg", "malta", "belanda", "netherlands", "norwegia", "norway", "polandia", "poland", "portugal", "slovakia",
    "slovenia", "spanyol", "spain", "swedia", "sweden", "swiss", "switzerland", "kroasia", "croatia", "bulgaria", "rumania", "romania", "schengen", "eropa", "europe"]

/** Non-blocking travel warnings: Schengen minimum, trip length vs plan, age limit. */
export function travelWarnings(form: RiskForm, members: MemberForm[], coverageStart?: string): string[] {
    const out: string[] = []
    const dest = form.destinations.toLowerCase()
    if (SCHENGEN.some(c => dest.includes(c))) {
        const med = Number(form.medical_limit) || 0
        if (form.benefit_currency.toUpperCase() === "EUR" && med > 0 && med < 30000) out.push("Visa Schengen mensyaratkan jaminan medis minimal EUR 30.000.")
        if (!form.medical_limit) out.push("Tujuan Schengen: isi limit medis (minimal EUR 30.000) untuk sertifikat visa.")
    }
    const maxDays = Number(form.max_trip_days) || 0
    const maxAge = Number(form.max_age) || 0
    const refDate = coverageStart ? new Date(coverageStart) : new Date()
    for (const m of members.filter(x => x.member_role === "traveller")) {
        if (maxDays && m.trip_start && m.trip_end) {
            const days = Math.round((new Date(m.trip_end).getTime() - new Date(m.trip_start).getTime()) / 86400000) + 1
            if (days > maxDays) out.push(`${m.full_name || "Traveller"}: perjalanan ${days} hari melebihi batas ${maxDays} hari per perjalanan.`)
        }
        if (maxAge && m.birth_date) {
            const b = new Date(m.birth_date)
            let age = refDate.getFullYear() - b.getFullYear()
            if (refDate < new Date(refDate.getFullYear(), b.getMonth(), b.getDate())) age--
            if (age > maxAge) out.push(`${m.full_name || "Traveller"}: usia ${age} tahun melebihi batas plan ${maxAge} tahun.`)
        }
    }
    return out
}

export const INSPECTION_OPTIONS = [
    { value: "not_required", label: "Tidak perlu" },
    { value: "pending", label: "Belum diinspeksi" },
    { value: "done", label: "Sudah diinspeksi" },
    { value: "waived", label: "Dibebaskan penanggung" },
]
export const TRAVEL_PLAN_OPTIONS = [{ value: "single", label: "Single trip" }, { value: "annual", label: "Annual multi-trip" }]
export const TRAVEL_AREA_OPTIONS = [
    { value: "asean", label: "ASEAN" }, { value: "asia", label: "Asia" },
    { value: "worldwide_excl_us", label: "Worldwide (tanpa USA/Kanada)" }, { value: "worldwide", label: "Worldwide" },
]
export const FAMILY_TYPE_OPTIONS = [{ value: "individual", label: "Individu" }, { value: "family", label: "Keluarga" }, { value: "group", label: "Grup / korporat" }]

export const USAGE_OPTIONS = [
    { value: "private", label: "Pribadi" },
    { value: "commercial", label: "Komersial" },
]
export const MOTOR_COVERAGE_OPTIONS = [
    { value: "comprehensive", label: "Comprehensive (All Risk)" },
    { value: "tlo", label: "TLO (Total Loss Only)" },
]
export const TARIFF_REGION_OPTIONS = [
    { value: "1", label: "Wilayah 1 (Sumatera & sekitarnya)" },
    { value: "2", label: "Wilayah 2 (DKI Jakarta, Jawa Barat, Banten)" },
    { value: "3", label: "Wilayah 3 (daerah lainnya)" },
]
export const ICC_OPTIONS = [
    { value: "A", label: "ICC (A) — All Risks" },
    { value: "B", label: "ICC (B)" },
    { value: "C", label: "ICC (C) — Risiko Terbatas" },
]
export const SURVEY_OPTIONS = [
    { value: "not_required", label: "Tidak perlu survei" },
    { value: "pending", label: "Belum disurvei" },
    { value: "scheduled", label: "Terjadwal" },
    { value: "done", label: "Sudah disurvei" },
]
export const EXTENSION_LABELS = {
    ext_flood: "Banjir",
    ext_earthquake: "Gempa Bumi",
    ext_rsmdcc: "RSMDCC (Huru-hara)",
    ext_terrorism: "Terorisme & Sabotase",
} as const

export const LABEL_OF = (options: { value: string; label: string }[], value: string | null | undefined): string =>
    options.find(o => o.value === value)?.label ?? ""
