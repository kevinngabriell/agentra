import type {
    IccClause, MemberRole, MotorCoverageType, MotorUsage, RiskDetails, RiskDetailsPayload, RiskGroup, RiskMember, SurveyStatus,
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
}

export interface MemberForm {
    _id: string
    member_role: MemberRole
    full_name: string; id_number: string; birth_date: string; relationship: string
    benefit_death: string; benefit_disability: string; benefit_medical: string
    share_percent: string
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
}

const MONEY_FIELDS = ["vehicle_value", "tpl_limit", "pa_driver_limit", "pa_passenger_limit"] as const
const NUMBER_FIELDS = ["vehicle_year", "tariff_region", "pa_passenger_seats"] as const
const BOOL_FIELDS = ["ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism", "is_open_cover"] as const

/** Columns that belong to each group — the same whitelist the API enforces. */
const GROUP_FIELDS: Record<RiskGroup, (keyof RiskForm)[]> = {
    motor: [
        "plate_number", "chassis_number", "engine_number", "vehicle_make", "vehicle_model", "vehicle_year", "vehicle_color",
        "vehicle_usage", "motor_coverage_type", "vehicle_value", "tariff_region",
        "ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism",
        "tpl_limit", "pa_driver_limit", "pa_passenger_limit", "pa_passenger_seats",
    ],
    cargo: ["conveyance_name", "voyage_from", "voyage_to", "bl_awb_number", "departure_date", "icc_clause", "goods_description", "is_open_cover"],
    travel: ["destinations", "schengen_certificate_no"],
    pa: [],
    fire: ["occupation_code", "occupation_description", "survey_status", "survey_date", "ext_flood", "ext_earthquake", "ext_rsmdcc", "ext_terrorism"],
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
    }
}

export function membersFormFrom(members: RiskMember[]): MemberForm[] {
    const s = (v: string | number | null) => (v === null ? "" : String(v))
    return members.map(m => ({
        _id: m.member_id ?? newMemberId(), member_role: m.member_role, full_name: m.full_name,
        id_number: s(m.id_number), birth_date: s(m.birth_date), relationship: s(m.relationship),
        benefit_death: s(m.benefit_death), benefit_disability: s(m.benefit_disability), benefit_medical: s(m.benefit_medical),
        share_percent: s(m.share_percent),
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
    return null
}

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
