"use client"

import type { ReactNode } from "react"
import { Box, Button, Flex, Grid, IconButton, Input, Switch, Text, Textarea } from "@chakra-ui/react"
import { LuPlus, LuTrash2 } from "react-icons/lu"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput } from "@/components/claims/fields"
import type { MemberRole, RiskGroup } from "@/lib/api/risk-details"
import {
    EXTENSION_LABELS, ICC_OPTIONS, MOTOR_COVERAGE_OPTIONS, SURVEY_OPTIONS, TARIFF_REGION_OPTIONS, USAGE_OPTIONS,
    emptyMember, type MemberForm, type RiskForm,
} from "./model"

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
            <Text color="#1A3557" fontSize="14px" fontWeight="semibold" letterSpacing="0.04em">{title.toUpperCase()}</Text>
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
    return (
        <Grid {...GRID}>
            <Field label="Negara Tujuan" span={2} hint={coverage?.start && coverage.end ? `Tanggal perjalanan mengikuti periode polis: ${coverage.start} s/d ${coverage.end}` : "Tanggal perjalanan mengikuti periode polis"}>
                <Input {...CLAIM_INPUT} placeholder="Pisahkan dengan koma, mis: Jepang, Korea Selatan" maxLength={500} value={form.destinations} onChange={(e) => onChange({ destinations: e.target.value })} />
            </Field>
            <Field label="No. Sertifikat Schengen" hint="Diisi jika sertifikat Schengen sudah diterbitkan">
                <Input {...CLAIM_INPUT} maxLength={60} value={form.schengen_certificate_no} onChange={(e) => onChange({ schengen_certificate_no: e.target.value.toUpperCase() })} />
            </Field>
        </Grid>
    )
}

function FireFields({ form, onChange }: Pick<RiskDetailsFieldsProps, "form" | "onChange">) {
    return (
        <Flex flexDir="column" gap="20px">
            <Group title="Okupasi">
                <Grid {...GRID}>
                    <Field label="Kode Okupasi"><Input {...CLAIM_INPUT} maxLength={40} value={form.occupation_code} onChange={(e) => onChange({ occupation_code: e.target.value })} /></Field>
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
                        <Box>
                            <Button size="xs" variant="outline" fontSize="14px" onClick={() => onChange([...members, emptyMember(role)])}>
                                <LuPlus size={12} /> {ROLE_ADD[role]}
                            </Button>
                        </Box>
                    </Group>
                )
            })}
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
                    <MembersEditor roles={["traveller"]} members={members} onChange={onMembersChange} />
                </Flex>
            )
        case "pa":
            return <MembersEditor roles={["insured", "beneficiary"]} members={members} onChange={onMembersChange} />
    }
}
