"use client"

import type { ReactNode } from "react"
import { Box, Button, Flex, Grid, IconButton, Input, Switch, Text, Textarea } from "@chakra-ui/react"
import { LuPlus, LuTrash2, LuTriangleAlert, LuUpload } from "react-icons/lu"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput } from "@/components/claims/fields"
import type { MemberRole, RiskGroup } from "@/lib/api/risk-details"
import {
    EXTENSION_LABELS, FAMILY_TYPE_OPTIONS, ICC_OPTIONS, INSPECTION_OPTIONS, MOTOR_COVERAGE_OPTIONS, SURVEY_OPTIONS, TARIFF_REGION_OPTIONS,
    TRAVEL_AREA_OPTIONS, TRAVEL_PLAN_OPTIONS, USAGE_OPTIONS,
    emptyMember, travelWarnings, type MemberForm, type RiskForm,
} from "./model"
import { OccupationInput } from "@/components/tariffs/OccupationInput"
import { csvDate, csvRecords, readFileText } from "@/lib/csv"

export interface RiskDetailsFieldsProps {
    group: RiskGroup
    form: RiskForm
    onChange: (patch: Partial<RiskForm>) => void
    members: MemberForm[]
    onMembersChange: (members: MemberForm[]) => void
    /** Travel: the trip dates are the policy coverage dates. */
    coverage?: { start: string; end: string }
}

function Field({ label, hint, span, children }: { label: string; hint?: string; span?: number; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="4px" gridColumn={span ? { base: "auto", md: `span ${span}` } : undefined}>
            <Text {...CLAIM_LABEL}>{label}</Text>
            {children}
            {hint && <Text fontSize="14px" color="#64748B">{hint}</Text>}
        </Flex>
    )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <Switch.Root checked={checked} onCheckedChange={(e) => onChange(e.checked)} colorPalette="blue" size="sm">
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label fontSize="15px" color="#1C2833">{label}</Switch.Label>
        </Switch.Root>
    )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="12px">
            <Text color="#0D1B3E" fontSize="14px" fontWeight="semibold" letterSpacing="0.04em">{title.toUpperCase()}</Text>
            {children}
        </Flex>
    )
}

const GRID = { templateColumns: { base: "1fr", md: "repeat(2, 1fr)" }, gap: "12px" } as const

function Extensions({ form, onChange }: Pick<RiskDetailsFieldsProps, "form" | "onChange">) {
    return (
        <Grid {...GRID}>
            {(Object.keys(EXTENSION_LABELS) as (keyof typeof EXTENSION_LABELS)[]).map(key => (
                <Toggle key={key} label={EXTENSION_LABELS[key]} checked={form[key]} onChange={(v) => onChange({ [key]: v })} />
            ))}
        </Grid>
    )
}

/** Optional limit: the extension is taken when a limit is filled in. */
function LimitField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
    return (
        <Field label={label} hint={hint ?? "Kosongkan jika tidak diambil"}>
            <MoneyInput value={value} onChange={onChange} />
        </Field>
    )
}

function MotorFields({ form, onChange }: Pick<RiskDetailsFieldsProps, "form" | "onChange">) {
    return (
        <Flex flexDir="column" gap="20px">
            <Group title="Identitas Kendaraan">
                <Grid {...GRID}>
                    <Field label="Nomor Polisi"><Input {...CLAIM_INPUT} placeholder="B 1234 XYZ" maxLength={20} value={form.plate_number} onChange={(e) => onChange({ plate_number: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Nomor Rangka"><Input {...CLAIM_INPUT} maxLength={40} value={form.chassis_number} onChange={(e) => onChange({ chassis_number: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Nomor Mesin"><Input {...CLAIM_INPUT} maxLength={40} value={form.engine_number} onChange={(e) => onChange({ engine_number: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Merek"><Input {...CLAIM_INPUT} placeholder="Toyota" maxLength={60} value={form.vehicle_make} onChange={(e) => onChange({ vehicle_make: e.target.value })} /></Field>
                    <Field label="Model / Tipe"><Input {...CLAIM_INPUT} placeholder="Avanza 1.5 G" maxLength={80} value={form.vehicle_model} onChange={(e) => onChange({ vehicle_model: e.target.value })} /></Field>
                    <Field label="Tahun"><Input {...CLAIM_INPUT} inputMode="numeric" placeholder="2022" maxLength={4} value={form.vehicle_year} onChange={(e) => onChange({ vehicle_year: e.target.value.replace(/\D/g, "") })} /></Field>
                    <Field label="Warna"><Input {...CLAIM_INPUT} maxLength={30} value={form.vehicle_color} onChange={(e) => onChange({ vehicle_color: e.target.value })} /></Field>
                    <Field label="Penggunaan">
                        <SearchSelect value={form.vehicle_usage} onChange={(v) => onChange({ vehicle_usage: v as RiskForm["vehicle_usage"] })} options={USAGE_OPTIONS} placeholder="Pilih penggunaan" fontSize="15px" clearable />
                    </Field>
                </Grid>
            </Group>

            <Group title="Pertanggungan">
                <Grid {...GRID}>
                    <Field label="Jenis Pertanggungan">
                        <SearchSelect value={form.motor_coverage_type} onChange={(v) => onChange({ motor_coverage_type: v as RiskForm["motor_coverage_type"] })} options={MOTOR_COVERAGE_OPTIONS} placeholder="Comprehensive / TLO" fontSize="15px" clearable />
                    </Field>
                    <Field label="Nilai Kendaraan (Rp)"><MoneyInput value={form.vehicle_value} onChange={(v) => onChange({ vehicle_value: v })} /></Field>
                    <Field label="Wilayah Tarif OJK" span={2}>
                        <SearchSelect value={form.tariff_region} onChange={(v) => onChange({ tariff_region: v })} options={TARIFF_REGION_OPTIONS} placeholder="Pilih wilayah" fontSize="15px" clearable />
                    </Field>
                </Grid>
            </Group>

            <Group title="Perluasan Jaminan">
                <Extensions form={form} onChange={onChange} />
                <Grid {...GRID}>
                    <LimitField label="Tanggung Jawab Hukum Pihak Ketiga (Rp)" value={form.tpl_limit} onChange={(v) => onChange({ tpl_limit: v })} />
                    <LimitField label="PA Pengemudi (Rp)" value={form.pa_driver_limit} onChange={(v) => onChange({ pa_driver_limit: v })} />
                    <LimitField label="PA Penumpang per Orang (Rp)" value={form.pa_passenger_limit} onChange={(v) => onChange({ pa_passenger_limit: v })} />
                    <Field label="Jumlah Kursi Penumpang" hint="Wajib jika PA penumpang diambil">
                        <Input {...CLAIM_INPUT} inputMode="numeric" maxLength={2} value={form.pa_passenger_seats} onChange={(e) => onChange({ pa_passenger_seats: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                </Grid>
            </Group>

            <Group title="Inspeksi Sebelum Penutupan">
                <Grid {...GRID}>
                    <Field label="Status Inspeksi" hint="Kendaraan bekas umumnya wajib diinspeksi (foto) sebelum jaminan berlaku">
                        <SearchSelect value={form.inspection_status} onChange={(v) => onChange({ inspection_status: v as RiskForm["inspection_status"] })} options={INSPECTION_OPTIONS} placeholder="Pilih status" fontSize="15px" clearable />
                    </Field>
                    <Field label="Tanggal Inspeksi"><Input {...CLAIM_INPUT} type="date" value={form.inspection_date} onChange={(e) => onChange({ inspection_date: e.target.value })} /></Field>
                </Grid>
            </Group>
        </Flex>
    )
}

function CargoFields({ form, onChange }: Pick<RiskDetailsFieldsProps, "form" | "onChange">) {
    return (
        <Flex flexDir="column" gap="20px">
            <Group title="Pengangkutan">
                <Grid {...GRID}>
                    <Field label="Nama Kapal / Alat Angkut"><Input {...CLAIM_INPUT} maxLength={120} value={form.conveyance_name} onChange={(e) => onChange({ conveyance_name: e.target.value })} /></Field>
                    <Field label="No. B/L atau AWB" hint={form.is_open_cover ? "Open cover: nomor B/L dicatat pada tiap deklarasi" : undefined}>
                        <Input {...CLAIM_INPUT} maxLength={60} value={form.bl_awb_number} onChange={(e) => onChange({ bl_awb_number: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Pelabuhan / Kota Asal"><Input {...CLAIM_INPUT} maxLength={120} value={form.voyage_from} onChange={(e) => onChange({ voyage_from: e.target.value })} /></Field>
                    <Field label="Pelabuhan / Kota Tujuan"><Input {...CLAIM_INPUT} maxLength={120} value={form.voyage_to} onChange={(e) => onChange({ voyage_to: e.target.value })} /></Field>
                    <Field label="Tanggal Keberangkatan"><Input {...CLAIM_INPUT} type="date" value={form.departure_date} onChange={(e) => onChange({ departure_date: e.target.value })} /></Field>
                    <Field label="Klausul ICC">
                        <SearchSelect value={form.icc_clause} onChange={(v) => onChange({ icc_clause: v as RiskForm["icc_clause"] })} options={ICC_OPTIONS} placeholder="Pilih klausul" fontSize="15px" clearable />
                    </Field>
                    <Field label="Deskripsi Barang" span={2}>
                        <Textarea {...CLAIM_INPUT} rows={3} maxLength={2000} value={form.goods_description} onChange={(e) => onChange({ goods_description: e.target.value })} />
                    </Field>
                </Grid>
            </Group>
            <Toggle label="Open cover (polis induk dengan deklarasi per pengiriman)" checked={form.is_open_cover} onChange={(v) => onChange({ is_open_cover: v })} />
        </Flex>
    )
}

function TravelFields({ form, onChange, coverage }: Pick<RiskDetailsFieldsProps, "form" | "onChange" | "coverage">) {
    const cur = form.benefit_currency || "USD"
    const limit = (key: "medical_limit" | "evacuation_limit" | "baggage_limit" | "delay_limit" | "cancellation_limit", label: string) => (
        <Field label={`${label} (${cur})`}>
            <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={14} value={form[key]} onChange={(e) => onChange({ [key]: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
    )
    return (
        <Flex flexDir="column" gap="20px">
            <Grid {...GRID}>
                <Field label="Negara Tujuan" span={2} hint={coverage?.start && coverage.end ? `Periode polis: ${coverage.start} s/d ${coverage.end}. Untuk annual / grup, isi tanggal perjalanan per peserta.` : "Tanggal perjalanan mengikuti periode polis"}>
                    <Input {...CLAIM_INPUT} placeholder="Pisahkan dengan koma, mis: Jepang, Korea Selatan" maxLength={500} value={form.destinations} onChange={(e) => onChange({ destinations: e.target.value })} />
                </Field>
                <Field label="No. Sertifikat Schengen" hint="Diisi jika sertifikat Schengen sudah diterbitkan">
                    <Input {...CLAIM_INPUT} maxLength={60} value={form.schengen_certificate_no} onChange={(e) => onChange({ schengen_certificate_no: e.target.value.toUpperCase() })} />
                </Field>
            </Grid>
            <Group title="Plan">
                <Grid {...GRID}>
                    <Field label="Jenis Plan"><SearchSelect value={form.travel_plan_type} onChange={(v) => onChange({ travel_plan_type: v as RiskForm["travel_plan_type"] })} options={TRAVEL_PLAN_OPTIONS} placeholder="Single / annual" fontSize="15px" clearable /></Field>
                    <Field label="Maks. hari per perjalanan" hint="Annual multi-trip umumnya 90 hari"><Input {...CLAIM_INPUT} inputMode="numeric" maxLength={3} value={form.max_trip_days} onChange={(e) => onChange({ max_trip_days: e.target.value.replace(/\D/g, "") })} /></Field>
                    <Field label="Area"><SearchSelect value={form.travel_area} onChange={(v) => onChange({ travel_area: v as RiskForm["travel_area"] })} options={TRAVEL_AREA_OPTIONS} placeholder="Pilih area" fontSize="15px" clearable /></Field>
                    <Field label="Tingkatan Plan"><Input {...CLAIM_INPUT} placeholder="Mis: Gold" maxLength={60} value={form.plan_tier} onChange={(e) => onChange({ plan_tier: e.target.value })} /></Field>
                    <Field label="Tipe Peserta"><SearchSelect value={form.family_type} onChange={(v) => onChange({ family_type: v as RiskForm["family_type"] })} options={FAMILY_TYPE_OPTIONS} placeholder="Individu / keluarga / grup" fontSize="15px" clearable /></Field>
                    <Field label="Batas Usia (tahun)"><Input {...CLAIM_INPUT} inputMode="numeric" maxLength={3} value={form.max_age} onChange={(e) => onChange({ max_age: e.target.value.replace(/\D/g, "") })} /></Field>
                </Grid>
            </Group>
            <Group title="Limit Manfaat">
                <Grid {...GRID}>
                    <Field label="Mata Uang Manfaat">
                        <SearchSelect value={form.benefit_currency} onChange={(v) => onChange({ benefit_currency: v })} fontSize="15px" clearable placeholder="USD / EUR"
                            options={["USD", "EUR", "SGD", "IDR"].map(c => ({ value: c, label: c }))} />
                    </Field>
                    {limit("medical_limit", "Biaya medis")}
                    {limit("evacuation_limit", "Evakuasi medis")}
                    {limit("baggage_limit", "Bagasi")}
                    {limit("delay_limit", "Keterlambatan")}
                    {limit("cancellation_limit", "Pembatalan perjalanan")}
                </Grid>
            </Group>
        </Flex>
    )
}

function FireFields({ form, onChange }: Pick<RiskDetailsFieldsProps, "form" | "onChange">) {
    return (
        <Flex flexDir="column" gap="20px">
            <Group title="Okupasi">
                <Grid {...GRID}>
                    <Field label="Kode Okupasi" hint="Pilih dari tabel okupasi (Pengaturan → Tarif & Okupasi) agar tarif bisa dicek">
                        <OccupationInput code={form.occupation_code}
                            onPick={(code, description) => onChange(description !== null ? { occupation_code: code, occupation_description: description } : { occupation_code: code })} />
                    </Field>
                    <Field label="Deskripsi Okupasi"><Input {...CLAIM_INPUT} placeholder="Mis: Toko bangunan" maxLength={200} value={form.occupation_description} onChange={(e) => onChange({ occupation_description: e.target.value })} /></Field>
                </Grid>
            </Group>
            <Group title="Perluasan Jaminan">
                <Extensions form={form} onChange={onChange} />
            </Group>
            <Group title="Survei">
                <Grid {...GRID}>
                    <Field label="Status Survei">
                        <SearchSelect value={form.survey_status} onChange={(v) => onChange({ survey_status: v as RiskForm["survey_status"] })} options={SURVEY_OPTIONS} placeholder="Pilih status" fontSize="15px" clearable />
                    </Field>
                    <Field label="Tanggal Survei"><Input {...CLAIM_INPUT} type="date" value={form.survey_date} onChange={(e) => onChange({ survey_date: e.target.value })} /></Field>
                </Grid>
            </Group>
            <Group title="Gangguan Usaha (Business Interruption)">
                <Grid {...GRID}>
                    <Field label="Laba Kotor Dipertanggungkan (Rp)" hint="Kosongkan jika BI tidak diambil"><MoneyInput value={form.bi_gross_profit} onChange={(v) => onChange({ bi_gross_profit: v })} /></Field>
                    <Field label="Periode Ganti Rugi (bulan)"><Input {...CLAIM_INPUT} inputMode="numeric" maxLength={2} value={form.bi_indemnity_months} onChange={(e) => onChange({ bi_indemnity_months: e.target.value.replace(/\D/g, "") })} /></Field>
                    <Field label="Risiko Sendiri Waktu (hari)"><Input {...CLAIM_INPUT} inputMode="numeric" maxLength={3} value={form.bi_time_deductible_days} onChange={(e) => onChange({ bi_time_deductible_days: e.target.value.replace(/\D/g, "") })} /></Field>
                </Grid>
            </Group>
            <Group title="Stok Deklarasi (Adjustable)">
                <Toggle label="Polis stok deklarasi: premi deposit, deklarasi bulanan, penyesuaian di akhir periode" checked={form.is_stock_declaration} onChange={(v) => onChange({ is_stock_declaration: v })} />
                {form.is_stock_declaration && (
                    <Grid {...GRID}>
                        <Field label="Nilai Stok Maksimum (Rp)"><MoneyInput value={form.stock_max_sum_insured} onChange={(v) => onChange({ stock_max_sum_insured: v })} /></Field>
                        <Field label="Rate Stok (‰)"><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={9} value={form.stock_rate_permille} onChange={(e) => onChange({ stock_rate_permille: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
                        <Field label="Premi Deposit (Rp)"><MoneyInput value={form.stock_deposit_premium} onChange={(v) => onChange({ stock_deposit_premium: v })} /></Field>
                        <Field label="Batas Pengembalian (% deposit)" hint="Umumnya 50% sesuai wording"><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={6} placeholder="50" value={form.stock_refund_cap_percent} onChange={(e) => onChange({ stock_refund_cap_percent: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
                    </Grid>
                )}
            </Group>
        </Flex>
    )
}

const ROLE_TITLE: Record<MemberRole, string> = { traveller: "Peserta Perjalanan", insured: "Tertanggung", beneficiary: "Penerima Manfaat" }
const ROLE_ADD: Record<MemberRole, string> = { traveller: "Tambah Peserta", insured: "Tambah Tertanggung", beneficiary: "Tambah Penerima Manfaat" }

function MembersEditor({ roles, members, onChange }: { roles: MemberRole[]; members: MemberForm[]; onChange: (members: MemberForm[]) => void }) {
    const patch = (id: string, p: Partial<MemberForm>) => onChange(members.map(m => (m._id === id ? { ...m, ...p } : m)))

    return (
        <Flex flexDir="column" gap="20px">
            {roles.map(role => {
                const rows = members.filter(m => m.member_role === role)
                return (
                    <Group key={role} title={`${ROLE_TITLE[role]} (${rows.length})`}>
                        {rows.map((m, i) => (
                            <Box key={m._id} p="12px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" bg="#F8FAFC">
                                <Flex justify="space-between" align="center" mb="8px">
                                    <Text fontSize="14px" fontWeight="semibold" color="#64748B">#{i + 1}</Text>
                                    <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label={`Hapus ${ROLE_TITLE[role]} ${i + 1}`} onClick={() => onChange(members.filter(x => x._id !== m._id))}>
                                        <LuTrash2 size={13} />
                                    </IconButton>
                                </Flex>
                                <Grid {...GRID}>
                                    <Field label="Nama Lengkap"><Input {...CLAIM_INPUT} bg="white" maxLength={150} value={m.full_name} onChange={(e) => patch(m._id, { full_name: e.target.value })} /></Field>
                                    <Field label={role === "traveller" ? "No. Paspor" : "No. KTP / Identitas"}><Input {...CLAIM_INPUT} bg="white" maxLength={40} value={m.id_number} onChange={(e) => patch(m._id, { id_number: e.target.value.toUpperCase() })} /></Field>
                                    <Field label="Tanggal Lahir"><Input {...CLAIM_INPUT} bg="white" type="date" value={m.birth_date} onChange={(e) => patch(m._id, { birth_date: e.target.value })} /></Field>
                                    <Field label="Hubungan dengan Pemegang Polis"><Input {...CLAIM_INPUT} bg="white" placeholder="Mis: Suami / Istri / Anak" maxLength={60} value={m.relationship} onChange={(e) => patch(m._id, { relationship: e.target.value })} /></Field>
                                    {role === "traveller" && (
                                        <>
                                            <Field label="No. Sertifikat"><Input {...CLAIM_INPUT} bg="white" maxLength={60} value={m.certificate_number} onChange={(e) => patch(m._id, { certificate_number: e.target.value.toUpperCase() })} /></Field>
                                            <Field label="Berangkat"><Input {...CLAIM_INPUT} bg="white" type="date" value={m.trip_start} onChange={(e) => patch(m._id, { trip_start: e.target.value })} /></Field>
                                            <Field label="Kembali"><Input {...CLAIM_INPUT} bg="white" type="date" value={m.trip_end} onChange={(e) => patch(m._id, { trip_end: e.target.value })} /></Field>
                                        </>
                                    )}
                                    {role === "beneficiary" ? (
                                        <Field label="Bagian (%)" hint="Total semua penerima manfaat maksimal 100%">
                                            <Input {...CLAIM_INPUT} bg="white" inputMode="decimal" maxLength={6} value={m.share_percent} onChange={(e) => patch(m._id, { share_percent: e.target.value.replace(/[^\d.]/g, "") })} />
                                        </Field>
                                    ) : (
                                        <>
                                            <Field label="Santunan Meninggal (Rp)"><MoneyInput bg="white" value={m.benefit_death} onChange={(v) => patch(m._id, { benefit_death: v })} /></Field>
                                            <Field label="Cacat Tetap (Rp)"><MoneyInput bg="white" value={m.benefit_disability} onChange={(v) => patch(m._id, { benefit_disability: v })} /></Field>
                                            <Field label="Biaya Medis (Rp)"><MoneyInput bg="white" value={m.benefit_medical} onChange={(v) => patch(m._id, { benefit_medical: v })} /></Field>
                                        </>
                                    )}
                                </Grid>
                            </Box>
                        ))}
                        <Flex gap="8px" flexWrap="wrap">
                            <Button size="xs" variant="outline" fontSize="14px" onClick={() => onChange([...members, emptyMember(role)])}>
                                <LuPlus size={12} /> {ROLE_ADD[role]}
                            </Button>
                            {role === "traveller" && <RosterImport onRows={(rows) => onChange([...members, ...rows])} />}
                        </Flex>
                    </Group>
                )
            })}
        </Flex>
    )
}

/**
 * Corporate / group travel: add travellers from a CSV (Nama, Paspor, Tanggal Lahir, Sertifikat, Berangkat, Kembali).
 * Rows are appended to the form; nothing is saved until the form is saved.
 */
function RosterImport({ onRows }: { onRows: (rows: MemberForm[]) => void }) {
    async function pick(file: File | undefined) {
        if (!file) return
        const text = await readFileText(file)
        const recs = csvRecords(text, {
            name: ["nama", "name", "nama lengkap", "full_name"], passport: ["paspor", "passport", "no paspor", "id_number"],
            birth: ["tanggal lahir", "birth_date", "dob", "tgl lahir"], cert: ["sertifikat", "certificate", "certificate_number", "no sertifikat"],
            start: ["berangkat", "trip_start", "departure"], end: ["kembali", "trip_end", "return"],
        })
        onRows(recs.filter(r => r.name).map(r => ({
            ...emptyMember("traveller"), full_name: r.name, id_number: r.passport.toUpperCase(), birth_date: csvDate(r.birth),
            certificate_number: r.cert.toUpperCase(), trip_start: csvDate(r.start), trip_end: csvDate(r.end),
        })))
    }
    return (
        <Button as="label" size="xs" variant="outline" fontSize="14px" cursor="pointer">
            <LuUpload size={12} /> Impor CSV peserta
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = "" }} />
        </Button>
    )
}

function Warnings({ items }: { items: string[] }) {
    if (!items.length) return null
    return (
        <Flex flexDir="column" gap="4px" p="10px 12px" bg="#FFFBEB" border="1px solid" borderColor="#FDE68A" borderRadius="8px">
            {items.map((w) => (
                <Flex key={w} gap="6px" align="flex-start"><Box mt="3px" color="#B45309"><LuTriangleAlert size={13} /></Box><Text fontSize="14px" color="#92400E">{w}</Text></Flex>
            ))}
        </Flex>
    )
}

/** Product-specific fields for one risk group. Pure and controlled: the page owns `form` and `members`. */
export function RiskDetailsFields({ group, form, onChange, members, onMembersChange, coverage }: RiskDetailsFieldsProps) {
    switch (group) {
        case "motor":  return <MotorFields form={form} onChange={onChange} />
        case "cargo":  return <CargoFields form={form} onChange={onChange} />
        case "fire":   return <FireFields form={form} onChange={onChange} />
        case "travel":
            return (
                <Flex flexDir="column" gap="20px">
                    <TravelFields form={form} onChange={onChange} coverage={coverage} />
                    <Warnings items={travelWarnings(form, members, coverage?.start)} />
                    <MembersEditor roles={["traveller"]} members={members} onChange={onMembersChange} />
                </Flex>
            )
        case "pa":
            return <MembersEditor roles={["insured", "beneficiary"]} members={members} onChange={onMembersChange} />
    }
}
