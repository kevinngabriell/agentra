"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Switch, Text } from "@chakra-ui/react"
import { LuCar, LuPencil, LuPlus, LuTrash2, LuUpload } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, fmtIDRCompact } from "@/lib/format"
import {
    addVehicle, deleteVehicle, getVehicles, importVehicles, updateVehicle,
    type FleetVehicle, type VehiclePayload, type VehiclesResponse,
} from "@/lib/api/schedules"
import { changeFields, newChange, validateChange, type ChangeInfo } from "@/lib/api/policy-change"
import { ChangeKindFields } from "@/components/policy-change/ChangeKindFields"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { TariffBadge } from "@/components/tariffs/TariffBadge"
import { MOTOR_COVERAGE_OPTIONS, TARIFF_REGION_OPTIONS, USAGE_OPTIONS } from "@/components/risk-details/model"
import { csvNumber, csvRecords, readFileText } from "@/lib/csv"

const EXT = [["ext_flood", "Banjir"], ["ext_earthquake", "Gempa"], ["ext_rsmdcc", "RSMDCC"], ["ext_terrorism", "Terorisme"]] as const

interface VForm {
    plate_number: string; chassis_number: string; engine_number: string; vehicle_make: string; vehicle_model: string
    vehicle_year: string; vehicle_color: string; vehicle_usage: string; motor_coverage_type: string; tariff_region: string
    ext_flood: boolean; ext_earthquake: boolean; ext_rsmdcc: boolean; ext_terrorism: boolean
    tpl_limit: string; sum_insured: string; rate_percent: string; inspection_date: string; notes: string
}

function formFrom(v: FleetVehicle | null): VForm {
    const s = (x: unknown) => (x === null || x === undefined ? "" : String(x))
    return {
        plate_number: s(v?.plate_number), chassis_number: s(v?.chassis_number), engine_number: s(v?.engine_number),
        vehicle_make: s(v?.vehicle_make), vehicle_model: s(v?.vehicle_model), vehicle_year: s(v?.vehicle_year), vehicle_color: s(v?.vehicle_color),
        vehicle_usage: s(v?.vehicle_usage), motor_coverage_type: s(v?.motor_coverage_type), tariff_region: s(v?.tariff_region),
        ext_flood: !!v?.ext_flood, ext_earthquake: !!v?.ext_earthquake, ext_rsmdcc: !!v?.ext_rsmdcc, ext_terrorism: !!v?.ext_terrorism,
        tpl_limit: s(v?.tpl_limit), sum_insured: s(v?.sum_insured), rate_percent: s(v?.rate_percent), inspection_date: s(v?.inspection_date), notes: s(v?.notes),
    }
}

function payloadFrom(f: VForm): VehiclePayload {
    const t = (x: string) => x.trim() || null
    const n = (x: string) => (x.trim() === "" ? null : Number(x.replace(",", ".")))
    return {
        plate_number: t(f.plate_number), chassis_number: t(f.chassis_number), engine_number: t(f.engine_number),
        vehicle_make: t(f.vehicle_make), vehicle_model: t(f.vehicle_model), vehicle_year: n(f.vehicle_year), vehicle_color: t(f.vehicle_color),
        vehicle_usage: (t(f.vehicle_usage) as VehiclePayload["vehicle_usage"]), motor_coverage_type: (t(f.motor_coverage_type) as VehiclePayload["motor_coverage_type"]),
        tariff_region: n(f.tariff_region), ext_flood: f.ext_flood, ext_earthquake: f.ext_earthquake, ext_rsmdcc: f.ext_rsmdcc, ext_terrorism: f.ext_terrorism,
        tpl_limit: n(f.tpl_limit), inspection_date: t(f.inspection_date), notes: t(f.notes),
        sum_insured: Number(f.sum_insured || 0), rate_percent: Number(f.rate_percent.replace(",", ".") || 0),
    }
}

function VehicleDialog({ policyId, editing, onClose, onSaved }: { policyId: string; editing: FleetVehicle | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<VForm>(() => formFrom(editing))
    const [change, setChange] = useState<ChangeInfo>(() => newChange("endorsement"))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<VForm>) => setF((x) => ({ ...x, ...p }))
    const rate = Number(f.rate_percent.replace(",", ".")) || 0
    const premium = Math.round((Number(f.sum_insured) || 0) * rate / 100)
    const moneyChanged = !editing || Number(f.sum_insured) !== editing.sum_insured || Math.abs(rate - editing.rate_percent) > 0.00001

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.sum_insured || !(rate > 0)) { setError("Isi nilai pertanggungan dan rate"); return }
        if (moneyChanged) { const p = validateChange(change); if (p) { setError(p); return } }
        setSaving(true); setError(null)
        try {
            const body = payloadFrom(f)
            const ch = moneyChanged ? changeFields(change) : {}
            if (editing) await updateVehicle(token, policyId, editing.vehicle_id, body, ch)
            else await addVehicle(token, policyId, body, ch)
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan kendaraan")); setSaving(false) }
    }

    const txt = (k: keyof VForm, label: string, max: number, upper = false) => (
        <FormField label={label}><Input {...CLAIM_INPUT} maxLength={max} value={String(f[k])} onChange={(e) => set({ [k]: upper ? e.target.value.toUpperCase() : e.target.value })} /></FormField>
    )
    return (
        <FormDialog title={editing ? `Ubah ${editing.plate_number ?? "kendaraan"}` : "Tambah kendaraan ke armada"} size="640px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>{txt("plate_number", "Nomor polisi", 20, true)}{txt("chassis_number", "Nomor rangka", 40, true)}</FormRow>
            <FormRow>{txt("engine_number", "Nomor mesin", 40, true)}{txt("vehicle_make", "Merek", 60)}</FormRow>
            <FormRow>{txt("vehicle_model", "Model / tipe", 80)}{txt("vehicle_year", "Tahun", 4)}</FormRow>
            <FormRow>
                <FormField label="Penggunaan"><SearchSelect value={f.vehicle_usage} onChange={(v) => set({ vehicle_usage: v })} options={USAGE_OPTIONS} clearable placeholder="Pilih" /></FormField>
                <FormField label="Jenis pertanggungan"><SearchSelect value={f.motor_coverage_type} onChange={(v) => set({ motor_coverage_type: v })} options={MOTOR_COVERAGE_OPTIONS} clearable placeholder="Comprehensive / TLO" /></FormField>
            </FormRow>
            <FormField label="Wilayah tarif"><SearchSelect value={f.tariff_region} onChange={(v) => set({ tariff_region: v })} options={TARIFF_REGION_OPTIONS} clearable placeholder="Pilih wilayah" /></FormField>
            <FormRow>
                <FormField label="Nilai pertanggungan (Rp)"><MoneyInput value={f.sum_insured} onChange={(v) => set({ sum_insured: v })} /></FormField>
                <FormField label="Rate (%)" hint={premium > 0 ? `Premi setahun ${fmtIDR(premium)}` : undefined}>
                    <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={8} value={f.rate_percent} onChange={(e) => set({ rate_percent: e.target.value.replace(/[^\d.,]/g, "") })} />
                </FormField>
            </FormRow>
            <Flex gap="6px" flexWrap="wrap">
                <TariffBadge showMissing params={f.sum_insured && f.tariff_region && rate > 0
                    ? { type: "motor", vehicle_value: f.sum_insured, tariff_region: f.tariff_region, coverage: f.motor_coverage_type || "comprehensive", rate_percent: rate } : null} />
            </Flex>
            <Flex gap="14px" flexWrap="wrap">
                {EXT.map(([k, label]) => (
                    <Switch.Root key={k} checked={f[k]} onCheckedChange={(e) => set({ [k]: e.checked })} colorPalette="blue" size="sm">
                        <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="15px">{label}</Switch.Label>
                    </Switch.Root>
                ))}
            </Flex>
            <FormRow>
                <FormField label="Limit TJH pihak ketiga (Rp)"><MoneyInput value={f.tpl_limit} onChange={(v) => set({ tpl_limit: v })} /></FormField>
                <FormField label="Tanggal inspeksi"><Input {...CLAIM_INPUT} type="date" value={f.inspection_date} onChange={(e) => set({ inspection_date: e.target.value })} /></FormField>
            </FormRow>
            {moneyChanged && <ChangeKindFields value={change} onChange={setChange} billing />}
        </FormDialog>
    )
}

function ImportDialog({ policyId, onClose, onSaved }: { policyId: string; onClose: () => void; onSaved: (n: number) => void }) {
    const [rows, setRows] = useState<VehiclePayload[]>([])
    const [skipped, setSkipped] = useState(0)
    const [change, setChange] = useState<ChangeInfo>(() => newChange("correction"))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function pick(file: File | undefined) {
        if (!file) return
        const recs = csvRecords(await readFileText(file), {
            plate: ["nomor polisi", "no polisi", "plat", "plate", "plate_number"], chassis: ["nomor rangka", "no rangka", "chassis", "chassis_number"],
            engine: ["nomor mesin", "no mesin", "engine", "engine_number"], make: ["merek", "merk", "make"], model: ["model", "tipe", "type"],
            year: ["tahun", "year"], coverage: ["jenis", "pertanggungan", "coverage"], region: ["wilayah", "region"],
            si: ["nilai pertanggungan", "nilai", "harga", "sum_insured", "tsi"], rate: ["rate", "rate %", "rate_percent"],
        })
        const ok = recs.filter((r) => r.plate && csvNumber(r.si))
        setSkipped(recs.length - ok.length)
        setRows(ok.map((r) => ({
            plate_number: r.plate.toUpperCase(), chassis_number: r.chassis.toUpperCase() || null, engine_number: r.engine.toUpperCase() || null,
            vehicle_make: r.make || null, vehicle_model: r.model || null, vehicle_year: csvNumber(r.year),
            motor_coverage_type: /tlo|total/i.test(r.coverage) ? "tlo" : r.coverage ? "comprehensive" : null,
            tariff_region: csvNumber(r.region), sum_insured: csvNumber(r.si) ?? 0, rate_percent: csvNumber(r.rate) ?? 0,
        })))
    }

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!rows.length) { setError("Pilih file CSV berisi kendaraan"); return }
        if (rows.some((r) => !(Number(r.rate_percent) > 0))) { setError("Setiap baris perlu kolom Rate (%)"); return }
        const p = validateChange(change); if (p) { setError(p); return }
        setSaving(true); setError(null)
        try { const res = await importVehicles(token, policyId, rows, changeFields(change)); onSaved(res.imported) }
        catch (err) { setError(errorMessage(err, "Impor gagal; tidak ada kendaraan yang disimpan")); setSaving(false) }
    }

    return (
        <FormDialog title="Impor jadwal armada (CSV)" size="600px" saving={saving} error={error} submitLabel={`Impor ${rows.length || ""} kendaraan`} onClose={onClose} onSubmit={submit}>
            <Text fontSize="14px" color="#64748B">
                Kolom: Nomor Polisi, Nomor Rangka, Nomor Mesin, Merek, Model, Tahun, Jenis (Comprehensive/TLO), Wilayah (1-3), Nilai Pertanggungan, Rate (%).
                Semua baris disimpan sekaligus; satu baris salah membatalkan seluruh impor.
            </Text>
            <Button as="label" size="sm" variant="outline" cursor="pointer" w="max-content">
                <LuUpload size={13} /> Pilih file CSV
                <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = "" }} />
            </Button>
            {rows.length > 0 && (
                <Text fontSize="14px" color="#1C2833">{rows.length} kendaraan siap diimpor · total {fmtIDR(rows.reduce((s, r) => s + Number(r.sum_insured || 0), 0))}
                    {skipped > 0 && ` · ${skipped} baris dilewati (tanpa nomor polisi / nilai)`}</Text>
            )}
            <ChangeKindFields value={change} onChange={setChange} billing />
        </FormDialog>
    )
}

function RemoveDialog({ policyId, vehicle, onClose, onSaved }: { policyId: string; vehicle: FleetVehicle; onClose: () => void; onSaved: () => void }) {
    const [change, setChange] = useState<ChangeInfo>(() => newChange("endorsement"))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        const p = validateChange(change); if (p) { setError(p); return }
        setSaving(true); setError(null)
        try { await deleteVehicle(token, policyId, vehicle.vehicle_id, changeFields(change)); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menghapus kendaraan")); setSaving(false) }
    }
    return (
        <FormDialog title={`Keluarkan ${vehicle.plate_number ?? "kendaraan"} dari armada?`} saving={saving} error={error} submitLabel="Keluarkan" onClose={onClose} onSubmit={submit}>
            <Text fontSize="14px" color="#64748B">Sebagai endorsemen, premi sisa periode ({fmtIDR(vehicle.premium_amount)} setahun) dikembalikan lewat nota kredit.</Text>
            <ChangeKindFields value={change} onChange={setChange} billing />
        </FormDialog>
    )
}

/** "Jadwal Armada": the vehicles of a fleet policy. Each is a coverage item, so totals and deductibles per vehicle work as usual. */
export function VehiclesPanel({ policyId, cancelled, onChanged }: { policyId: string; cancelled: boolean; onChanged?: () => void }) {
    const [data, setData] = useState<VehiclesResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [dialog, setDialog] = useState<null | { edit: FleetVehicle | null } | { remove: FleetVehicle } | "import">(null)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getVehicles(token, policyId).then(setData).catch((err) => setError(errorMessage(err, "Jadwal armada belum bisa dimuat.")))
    }, [policyId])
    useEffect(() => { load() }, [load])
    const saved = (msg?: string) => { setDialog(null); setNotice(msg ?? null); load(); onChanged?.() }

    const q = query.trim().toUpperCase().replace(/[\s-]/g, "")
    const rows = (data?.items ?? []).filter((v) => !q || `${v.plate_number ?? ""}${v.chassis_number ?? ""}${v.vehicle_make ?? ""}${v.vehicle_model ?? ""}`.toUpperCase().replace(/[\s-]/g, "").includes(q))

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="14px" gap="8px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    <LuCar size={16} color="#0D1B3E" />
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Jadwal Armada</Text>
                    {data && data.summary.vehicle_count > 0 && <Badge fontSize="14px" bg="#E0F2FE" color="#0369A1">{data.summary.vehicle_count} kendaraan</Badge>}
                </Flex>
                {!cancelled && (
                    <Flex gap="8px">
                        <Button size="xs" variant="outline" fontSize="14px" onClick={() => setDialog("import")}><LuUpload size={12} /> Impor CSV</Button>
                        <Button size="xs" variant="outline" fontSize="14px" onClick={() => setDialog({ edit: null })}><LuPlus size={12} /> Tambah</Button>
                    </Flex>
                )}
            </Flex>
            {error && <Text color="#DC2626" fontSize="14px" mb="8px" role="alert">{error}</Text>}
            {notice && <Text color="#16A34A" fontSize="14px" mb="8px">{notice}</Text>}
            {!data ? <Skeleton h="60px" /> : data.items.length === 0 ? (
                <Text color="#64748B" fontSize="15px">Belum ada kendaraan. Untuk polis armada, tambahkan tiap kendaraan atau impor dari Excel (simpan sebagai CSV).</Text>
            ) : (
                <>
                    <Text fontSize="14px" color="#64748B" mb="8px">
                        TSI {fmtIDR(data.summary.total_sum_insured)} · premi setahun {fmtIDR(data.summary.total_premium)} · {data.summary.comprehensive_count} comprehensive, {data.summary.tlo_count} TLO
                    </Text>
                    {data.items.length > 8 && <Input {...CLAIM_INPUT} mb="8px" placeholder="Cari nomor polisi / rangka / merek" value={query} onChange={(e) => setQuery(e.target.value)} />}
                    <Box overflowX="auto">
                        <Box as="table" w="100%" fontSize="14px" style={{ borderCollapse: "collapse" }}>
                            <Box as="thead"><Box as="tr" color="#64748B" textAlign="left">
                                {["Kendaraan", "Jenis", "Nilai", "Rate", "Premi", ""].map((h) => <Box as="th" key={h} py="6px" pr="10px" fontWeight="semibold">{h}</Box>)}
                            </Box></Box>
                            <Box as="tbody">
                                {rows.map((v) => (
                                    <Box as="tr" key={v.vehicle_id} borderTop="1px solid #E2E8F0">
                                        <Box as="td" py="6px" pr="10px">
                                            <Text fontWeight="semibold">{v.plate_number ?? "—"}</Text>
                                            <Text color="#64748B">{[v.vehicle_make, v.vehicle_model, v.vehicle_year].filter(Boolean).join(" ")}</Text>
                                        </Box>
                                        <Box as="td" py="6px" pr="10px">{v.motor_coverage_type === "tlo" ? "TLO" : v.motor_coverage_type === "comprehensive" ? "Comprehensive" : "—"}</Box>
                                        <Box as="td" py="6px" pr="10px" whiteSpace="nowrap">{fmtIDRCompact(v.sum_insured)}</Box>
                                        <Box as="td" py="6px" pr="10px">{v.rate_percent}%</Box>
                                        <Box as="td" py="6px" pr="10px" whiteSpace="nowrap">{fmtIDR(v.premium_amount)}</Box>
                                        <Box as="td" py="6px" whiteSpace="nowrap">
                                            {!cancelled && <>
                                                <IconButton size="2xs" variant="ghost" aria-label="Ubah kendaraan" onClick={() => setDialog({ edit: v })}><LuPencil size={13} /></IconButton>
                                                <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Keluarkan kendaraan" onClick={() => setDialog({ remove: v })}><LuTrash2 size={13} /></IconButton>
                                            </>}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </>
            )}
            {dialog && typeof dialog === "object" && "edit" in dialog && <VehicleDialog policyId={policyId} editing={dialog.edit} onClose={() => setDialog(null)} onSaved={() => saved()} />}
            {dialog && typeof dialog === "object" && "remove" in dialog && <RemoveDialog policyId={policyId} vehicle={dialog.remove} onClose={() => setDialog(null)} onSaved={() => saved()} />}
            {dialog === "import" && <ImportDialog policyId={policyId} onClose={() => setDialog(null)} onSaved={(n) => saved(`${n} kendaraan berhasil diimpor.`)} />}
        </Box>
    )
}
