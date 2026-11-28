"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Badge, Box, Button, Flex, Grid, IconButton, Input, Skeleton, Switch, Text, Textarea } from "@chakra-ui/react"
import { LuMapPin, LuPencil, LuPlus, LuRadar, LuTrash2, LuTriangleAlert } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, fmtIDRCompact } from "@/lib/format"
import {
    FLOOD_HISTORY_LABELS, FLOOD_ZONE_LABELS, HOUSEKEEPING_LABELS, OCCUPANCY_LABELS, PROTECTION_FIELDS, STOCK_OWNERSHIP_LABELS,
    deleteLocation, getLocations, getNearbyLocations, saveLocation,
    type LocationFields, type LocationsResponse, type NearbyLocation, type PolicyLocation, type ProtectionKey,
} from "@/lib/api/schedules"
import { COVERAGE_TYPE_LABELS, updateCoverage, type ApiCoverageItem, type ApiCoverageType } from "@/lib/api/policies"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { OccupationInput } from "@/components/tariffs/OccupationInput"
import { TariffBadge } from "@/components/tariffs/TariffBadge"
import { useConfirm } from "@/components/ui/confirm-dialog"

const opts = <K extends string>(labels: Record<K, string>) => (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }))
const covName = (t: string, l: string | null) => `${COVERAGE_TYPE_LABELS[t as ApiCoverageType] ?? t}${l ? ` · ${l}` : ""}`

export interface LocationsPanelProps {
    policyId: string
    /** Coverage items of the policy (vehicles excluded by the caller), to link them to locations. */
    coverages: ApiCoverageItem[]
    cancelled: boolean
    onChanged?: () => void
}

type Form = Record<keyof LocationFields, string | boolean>

const TEXT_KEYS: (keyof LocationFields)[] = ["label", "address", "village", "district", "city", "province", "postal_code", "area_name",
    "occupation_code", "occupation_description", "wall_material", "roof_material", "floor_material", "hazardous_goods", "adjacent_exposure",
    "third_party_stock_note", "notes"]
const NUM_KEYS: (keyof LocationFields)[] = ["latitude", "longitude", "eq_zone", "storeys", "year_built", "floor_area_m2", "rebuild_cost_per_m2",
    "fire_station_distance_km", "rack_height_m", "pml_percent"]
const ENUM_KEYS: (keyof LocationFields)[] = ["construction_class", "flood_zone", "flood_history", "housekeeping", "stock_ownership", "occupancy_status"]
const DATE_KEYS: (keyof LocationFields)[] = ["last_flood_date", "unoccupied_since"]
const BOOL_KEYS: (keyof LocationFields)[] = [...PROTECTION_FIELDS.map(([k]) => k), "bailee_liability_covered"]

function formFrom(l: PolicyLocation | null): Form {
    const f = {} as Form
    for (const k of [...TEXT_KEYS, ...NUM_KEYS, ...ENUM_KEYS, ...DATE_KEYS]) {
        const v = l?.[k]
        f[k] = v === null || v === undefined ? "" : String(v)
    }
    for (const k of BOOL_KEYS) f[k] = Boolean(l?.[k])
    return f
}

function payloadFrom(f: Form): Partial<LocationFields> {
    const out: Record<string, string | number | boolean | null> = {}
    for (const k of [...TEXT_KEYS, ...ENUM_KEYS, ...DATE_KEYS]) out[k] = String(f[k]).trim() || null
    for (const k of NUM_KEYS) out[k] = String(f[k]).trim() === "" ? null : Number(String(f[k]).replace(",", "."))
    for (const k of BOOL_KEYS) out[k] = Boolean(f[k])
    return out as Partial<LocationFields>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="10px" pt="4px">
            <Text color="#0D1B3E" fontSize="13px" fontWeight="semibold" letterSpacing="0.04em">{title.toUpperCase()}</Text>
            {children}
        </Flex>
    )
}

function LocationDialog({ policyId, editing, onClose, onSaved }: { policyId: string; editing: PolicyLocation | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<Form>(() => formFrom(editing))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }))
    const txt = (k: keyof LocationFields, label: string, max = 120, placeholder?: string) => (
        <FormField label={label}><Input {...CLAIM_INPUT} maxLength={max} placeholder={placeholder} value={String(f[k])} onChange={(e) => set({ [k]: e.target.value })} /></FormField>
    )
    const numIn = (k: keyof LocationFields, label: string, hint?: string) => (
        <FormField label={label} hint={hint}><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={14} value={String(f[k])} onChange={(e) => set({ [k]: e.target.value.replace(/[^\d.,-]/g, "") })} /></FormField>
    )
    const sel = (k: keyof LocationFields, label: string, options: { value: string; label: string }[]) => (
        <FormField label={label}><SearchSelect value={String(f[k])} onChange={(v) => set({ [k]: v })} options={options} placeholder="Pilih" clearable /></FormField>
    )
    const rebuild = Number(f.floor_area_m2) > 0 && Number(f.rebuild_cost_per_m2) > 0 ? Number(f.floor_area_m2) * Number(f.rebuild_cost_per_m2) : null

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (Boolean(String(f.latitude)) !== Boolean(String(f.longitude))) { setError("Latitude dan longitude harus diisi bersamaan"); return }
        if (String(f.postal_code) && !/^\d{5}$/.test(String(f.postal_code))) { setError("Kode pos harus 5 digit"); return }
        setSaving(true); setError(null)
        try { await saveLocation(token, policyId, editing?.location_id ?? null, payloadFrom(f)); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan lokasi")); setSaving(false) }
    }

    return (
        <FormDialog title={editing ? `Ubah ${editing.label ?? "lokasi"}` : "Tambah lokasi risiko"} size="720px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <Section title="Alamat">
                <FormRow>{txt("label", "Nama lokasi", 120, "Mis: Gudang A")}{txt("area_name", "Kawasan / kompleks", 150, "Mis: Kawasan Industri Jababeka")}</FormRow>
                <FormField label="Alamat"><Textarea {...CLAIM_INPUT} rows={2} maxLength={2000} value={String(f.address)} onChange={(e) => set({ address: e.target.value })} /></FormField>
                <FormRow>{txt("city", "Kota / kabupaten", 100)}{txt("district", "Kecamatan", 100)}</FormRow>
                <FormRow>{txt("province", "Provinsi", 100)}{txt("postal_code", "Kode pos", 5)}</FormRow>
                <FormRow>{numIn("latitude", "Latitude", "Untuk cek akumulasi radius")}{numIn("longitude", "Longitude")}</FormRow>
            </Section>
            <Section title="Okupasi & konstruksi">
                <FormRow>
                    <FormField label="Kode okupasi">
                        <OccupationInput code={String(f.occupation_code)} onPick={(code, description) => set(description !== null ? { occupation_code: code, occupation_description: description } : { occupation_code: code })} />
                    </FormField>
                    {txt("occupation_description", "Deskripsi okupasi", 200)}
                </FormRow>
                <FormRow>
                    {sel("construction_class", "Kelas konstruksi", [{ value: "I", label: "Kelas I" }, { value: "II", label: "Kelas II" }, { value: "III", label: "Kelas III" }])}
                    {numIn("storeys", "Jumlah lantai")}
                </FormRow>
                <FormRow>{txt("wall_material", "Dinding", 80, "Bata / beton")}{txt("roof_material", "Atap", 80, "Baja ringan / beton")}</FormRow>
                <FormRow>{txt("floor_material", "Lantai", 80)}{numIn("year_built", "Tahun dibangun")}</FormRow>
                <FormRow>
                    {numIn("floor_area_m2", "Luas bangunan (m²)")}
                    <FormField label="Biaya bangun ulang per m² (Rp)" hint={rebuild ? `Nilai bangun ulang ≈ ${fmtIDR(rebuild)}` : "Untuk saran nilai pertanggungan bangunan"}>
                        <MoneyInput value={String(f.rebuild_cost_per_m2)} onChange={(v) => set({ rebuild_cost_per_m2: v })} />
                    </FormField>
                </FormRow>
            </Section>
            <Section title="Proteksi kebakaran & keamanan">
                <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="8px">
                    {PROTECTION_FIELDS.map(([k, label]) => (
                        <Switch.Root key={k} checked={Boolean(f[k as ProtectionKey])} onCheckedChange={(e) => set({ [k]: e.checked })} colorPalette="blue" size="sm">
                            <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">{label}</Switch.Label>
                        </Switch.Root>
                    ))}
                </Grid>
                <FormRow>{numIn("fire_station_distance_km", "Jarak ke pos damkar (km)")}{sel("housekeeping", "Kerapian (housekeeping)", opts(HOUSEKEEPING_LABELS))}</FormRow>
            </Section>
            <Section title="Eksposur bencana & sekitar">
                <FormRow>
                    {sel("eq_zone", "Zona gempa (tarif)", [1, 2, 3, 4, 5].map((z) => ({ value: String(z), label: `Zona ${z}` })))}
                    {sel("flood_zone", "Zona banjir", opts(FLOOD_ZONE_LABELS))}
                </FormRow>
                <FormRow>{sel("flood_history", "Riwayat banjir", opts(FLOOD_HISTORY_LABELS))}
                    <FormField label="Banjir terakhir"><Input {...CLAIM_INPUT} type="date" value={String(f.last_flood_date)} onChange={(e) => set({ last_flood_date: e.target.value })} /></FormField>
                </FormRow>
                <FormRow>{txt("adjacent_exposure", "Eksposur sekitar", 300, "Mis: pabrik kimia di sebelah")}{txt("hazardous_goods", "Barang berbahaya disimpan", 300)}</FormRow>
                <FormRow>{numIn("rack_height_m", "Tinggi rak (m)")}{numIn("pml_percent", "PML (% dari TSI lokasi)", "Estimasi kerugian maksimum")}</FormRow>
            </Section>
            <Section title="Stok & hunian">
                <FormRow>{sel("stock_ownership", "Kepemilikan stok", opts(STOCK_OWNERSHIP_LABELS))}{txt("third_party_stock_note", "Pemilik stok titipan", 300)}</FormRow>
                <Switch.Root checked={Boolean(f.bailee_liability_covered)} onCheckedChange={(e) => set({ bailee_liability_covered: e.checked })} colorPalette="blue" size="sm">
                    <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">Tanggung jawab atas barang titipan (bailee / warehouse keeper) dijamin</Switch.Label>
                </Switch.Root>
                <FormRow>{sel("occupancy_status", "Status hunian", opts(OCCUPANCY_LABELS))}
                    <FormField label="Kosong sejak"><Input {...CLAIM_INPUT} type="date" value={String(f.unoccupied_since)} onChange={(e) => set({ unoccupied_since: e.target.value })} /></FormField>
                </FormRow>
                <FormField label="Catatan"><Textarea {...CLAIM_INPUT} rows={2} maxLength={2000} value={String(f.notes)} onChange={(e) => set({ notes: e.target.value })} /></FormField>
            </Section>
        </FormDialog>
    )
}

function NearbyDialog({ policyId, loc, onClose }: { policyId: string; loc: PolicyLocation; onClose: () => void }) {
    const [radius, setRadius] = useState("1")
    const [data, setData] = useState<{ items: NearbyLocation[]; total_sum_insured: number; has_coordinates: boolean } | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const r = Math.max(0.05, Number(radius) || 1)
        getNearbyLocations(token, policyId, loc.location_id, r).then(setData).catch((err) => setError(errorMessage(err, "Gagal memuat")))
    }, [policyId, loc.location_id, radius])
    return (
        <FormDialog title={`Akumulasi di sekitar ${loc.label ?? "lokasi"}`} size="640px" saving={false} error={error} submitLabel="Tutup" onClose={onClose} onSubmit={onClose}>
            <FormField label="Radius (km)" hint={data && !data.has_coordinates ? "Lokasi ini belum punya koordinat; hanya kawasan yang sama yang dicocokkan." : "Plus semua lokasi di kawasan yang sama"}>
                <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={5} value={radius} onChange={(e) => setRadius(e.target.value.replace(/[^\d.]/g, ""))} />
            </FormField>
            {!data ? <Skeleton h="60px" /> : (
                <>
                    <Box p="12px" bg="#F8FAFC" borderRadius="8px" fontSize="14px">
                        <Text fontWeight="semibold">Lokasi ini {fmtIDR(loc.total_sum_insured)} + sekitar {fmtIDR(data.total_sum_insured)} = {fmtIDR(loc.total_sum_insured + data.total_sum_insured)}</Text>
                        <Text color="#64748B" fontSize="13px">Total nilai di satu area bencana (banjir / gempa / kebakaran merambat). Bandingkan dengan kapasitas penanggung sebelum menambah risiko.</Text>
                    </Box>
                    {data.items.length === 0 ? <Text color="#64748B" fontSize="14px">Tidak ada lokasi lain yang diasuransikan di sekitar.</Text> : data.items.map((n, i) => (
                        <Flex key={i} justify="space-between" gap="8px" p="8px 0" borderTop="1px solid #E2E8F0" fontSize="13px">
                            <Box minW="0">
                                <Text fontWeight="semibold" color="#1C2833">{n.customer_name} · {n.policy_number}</Text>
                                <Text color="#64748B">{n.label ?? "—"}{n.area_name ? ` · ${n.area_name}` : ""}</Text>
                            </Box>
                            <Box textAlign="right" flexShrink={0}>
                                <Text fontWeight="semibold">{fmtIDRCompact(n.sum_insured)}</Text>
                                <Text color="#64748B">{n.distance_km !== null ? `${n.distance_km.toFixed(2)} km` : "kawasan sama"}</Text>
                            </Box>
                        </Flex>
                    ))}
                </>
            )}
        </FormDialog>
    )
}

/** "Lokasi Risiko": property schedule with risk engineering, item allocation, underinsurance and accumulation. */
export function LocationsPanel({ policyId, coverages, cancelled, onChanged }: LocationsPanelProps) {
    const [data, setData] = useState<LocationsResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<{ editing: PolicyLocation | null } | null>(null)
    const [nearby, setNearby] = useState<PolicyLocation | null>(null)
    const [moving, setMoving] = useState<string | null>(null)
    const { confirm, dialog: confirmDialog } = useConfirm()
    const covKey = coverages.map((c) => `${c.coverage_id}:${c.location_id ?? ""}:${c.sum_insured}`).join(",")

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getLocations(token, policyId).then(setData).catch((err) => setError(errorMessage(err, "Lokasi risiko belum bisa dimuat.")))
    }, [policyId])
    useEffect(() => { load() }, [load, covKey])

    async function moveItem(coverageId: string, locationId: string) {
        const token = getAccessToken()
        if (!token) return
        setMoving(coverageId)
        try { await updateCoverage(token, policyId, coverageId, { location_id: locationId || null }); load(); onChanged?.() }
        catch (err) { setError(errorMessage(err, "Gagal memindah item")) }
        finally { setMoving(null) }
    }

    async function remove(l: PolicyLocation) {
        const token = getAccessToken()
        if (!token) return
        if (!(await confirm({ title: `Hapus ${l.label ?? "lokasi"}?`, message: "Pindahkan item pertanggungannya ke lokasi lain dahulu.", danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteLocation(token, policyId, l.location_id); load(); onChanged?.() }
        catch (err) { setError(errorMessage(err, "Gagal menghapus lokasi")) }
    }

    const locOptions = [{ value: "", label: "Tanpa lokasi" }, ...(data?.items ?? []).map((l) => ({ value: l.location_id, label: l.label ?? `Lokasi ${l.seq}` }))]
    const unassigned = coverages.filter((c) => !c.location_id && c.coverage_type !== "kendaraan")

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="16px" gap="8px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    <LuMapPin size={16} color="#0D1B3E" />
                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Lokasi Risiko</Text>
                </Flex>
                {!cancelled && <Button size="xs" variant="outline" fontSize="13px" onClick={() => setDialog({ editing: null })}><LuPlus size={12} /> Tambah Lokasi</Button>}
            </Flex>
            {error && <Text color="#DC2626" fontSize="13px" mb="8px" role="alert">{error}</Text>}
            {!data ? <Skeleton h="80px" /> : (
                <Flex flexDir="column" gap="14px">
                    {data.items.length > 0 && (
                        <Text fontSize="13px" color="#64748B">
                            {data.summary.location_count} lokasi · TSI {fmtIDR(data.summary.total_sum_insured)} · lokasi terbesar {fmtIDR(data.summary.max_location_sum_insured)}
                            {data.summary.total_pml > 0 && ` · PML ${fmtIDR(data.summary.total_pml)}`}
                        </Text>
                    )}
                    {data.items.length === 0 && (
                        <Text color="#64748B" fontSize="14px">Belum ada lokasi. Untuk gudang / pabrik dengan beberapa lokasi, tambahkan tiap lokasi lalu tautkan item pertanggungannya.</Text>
                    )}
                    {data.items.map((l) => {
                        const protections = PROTECTION_FIELDS.filter(([k]) => l[k])
                        return (
                            <Box key={l.location_id} p="14px" border="1px solid" borderColor={l.underinsured ? "#FDE68A" : "#E2E8F0"} borderRadius="10px">
                                <Flex justify="space-between" gap="8px" align="flex-start">
                                    <Box minW="0">
                                        <Text fontWeight="semibold" color="#1C2833" fontSize="14px">{l.label ?? `Lokasi ${l.seq}`}</Text>
                                        <Text fontSize="13px" color="#64748B">{[l.address, l.city, l.area_name].filter(Boolean).join(" · ") || "Alamat belum diisi"}</Text>
                                        <Flex gap="6px" mt="6px" flexWrap="wrap">
                                            {l.occupation_code && <Badge fontSize="13px" bg="#E0F2FE" color="#0369A1">Okupasi {l.occupation_code}</Badge>}
                                            {l.construction_class && <Badge fontSize="13px" bg="#F1F5F9" color="#334155">Kelas {l.construction_class}</Badge>}
                                            {l.eq_zone && <Badge fontSize="13px" bg="#FEF3C7" color="#B45309">Zona gempa {l.eq_zone}</Badge>}
                                            {l.flood_zone && <Badge fontSize="13px" bg={l.flood_zone === "high" ? "#FEE2E2" : "#E0F2FE"} color={l.flood_zone === "high" ? "#B91C1C" : "#0369A1"}>Banjir {FLOOD_ZONE_LABELS[l.flood_zone].toLowerCase()}</Badge>}
                                            {protections.length > 0 && <Badge fontSize="13px" bg="#DCFCE7" color="#15803D">{protections.map(([, label]) => label).join(", ")}</Badge>}
                                            {l.stock_ownership && l.stock_ownership !== "own" && <Badge fontSize="13px" bg={l.bailee_liability_covered ? "#DCFCE7" : "#FEE2E2"} color={l.bailee_liability_covered ? "#15803D" : "#B91C1C"}>
                                                Stok titipan {l.bailee_liability_covered ? "· bailee dijamin" : "· bailee belum dijamin"}</Badge>}
                                            {l.occupancy_status && l.occupancy_status !== "occupied" && <Badge fontSize="13px" bg="#FEF3C7" color="#B45309">{OCCUPANCY_LABELS[l.occupancy_status]}</Badge>}
                                        </Flex>
                                    </Box>
                                    <Flex flexShrink={0}>
                                        <IconButton size="2xs" variant="ghost" aria-label="Akumulasi sekitar" title="Akumulasi sekitar" onClick={() => setNearby(l)}><LuRadar size={13} /></IconButton>
                                        {!cancelled && <IconButton size="2xs" variant="ghost" aria-label="Ubah lokasi" onClick={() => setDialog({ editing: l })}><LuPencil size={13} /></IconButton>}
                                        {!cancelled && <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus lokasi" onClick={() => remove(l)}><LuTrash2 size={13} /></IconButton>}
                                    </Flex>
                                </Flex>

                                {l.underinsured && l.rebuild_value && (
                                    <Flex mt="8px" gap="6px" p="8px 10px" bg="#FFFBEB" borderRadius="8px" fontSize="13px" color="#92400E">
                                        <Box mt="2px"><LuTriangleAlert size={13} /></Box>
                                        <Text>Bangunan diasuransikan {fmtIDR(l.building_sum_insured)}, nilai bangun ulang ≈ {fmtIDR(l.rebuild_value)} ({Math.round((l.insured_ratio ?? 0) * 100)}%).
                                            Bila terjadi klaim, klausula average memotong ganti rugi secara proporsional. Tawarkan penyesuaian nilai.</Text>
                                    </Flex>
                                )}

                                <Flex flexDir="column" mt="10px" gap="4px">
                                    {l.items.length === 0 && <Text fontSize="13px" color="#64748B">Belum ada item pertanggungan di lokasi ini.</Text>}
                                    {l.items.map((it) => (
                                        <Flex key={it.coverage_id} justify="space-between" align="center" gap="8px" fontSize="13px" py="4px" borderTop="1px dashed #E2E8F0" flexWrap="wrap">
                                            <Flex gap="6px" align="center" flexWrap="wrap" minW="0">
                                                <Text color="#1C2833">{covName(it.coverage_type, it.coverage_label)}</Text>
                                                <TariffBadge params={l.occupation_code && l.construction_class && it.coverage_type === "bangunan"
                                                    ? { type: "property", occupation_code: l.occupation_code, construction_class: l.construction_class, rate_permille: it.rate_permille } : null} />
                                            </Flex>
                                            <Flex gap="10px" align="center">
                                                <Text color="#64748B">{fmtIDRCompact(it.sum_insured)} × {it.rate_permille}‰ = {fmtIDR(it.premium_amount)}</Text>
                                                {!cancelled && data.items.length > 1 && (
                                                    <Box w="150px"><SearchSelect value={l.location_id} onChange={(v) => v !== l.location_id && moveItem(it.coverage_id, v)}
                                                        options={locOptions} fontSize="13px" disabled={moving === it.coverage_id} /></Box>
                                                )}
                                            </Flex>
                                        </Flex>
                                    ))}
                                </Flex>
                                <Text mt="6px" fontSize="13px" fontWeight="semibold" color="#0D1B3E">
                                    TSI lokasi {fmtIDR(l.total_sum_insured)} · premi {fmtIDR(l.total_premium)}{l.pml_amount !== null && ` · PML ${fmtIDR(l.pml_amount)}`}
                                </Text>
                            </Box>
                        )
                    })}

                    {data.items.length > 0 && unassigned.length > 0 && (
                        <Box p="12px" bg="#FFFBEB" border="1px solid" borderColor="#FDE68A" borderRadius="10px">
                            <Text fontSize="13px" fontWeight="semibold" color="#92400E" mb="6px">Item belum ditautkan ke lokasi ({unassigned.length})</Text>
                            {unassigned.map((c) => (
                                <Flex key={c.coverage_id} justify="space-between" align="center" gap="8px" py="4px" fontSize="13px" flexWrap="wrap">
                                    <Text>{covName(c.coverage_type, c.coverage_label)} · {fmtIDRCompact(c.sum_insured)}</Text>
                                    {!cancelled && <Box w="170px"><SearchSelect value="" onChange={(v) => v && moveItem(c.coverage_id, v)} options={locOptions.slice(1)} placeholder="Tautkan ke..." fontSize="13px" disabled={moving === c.coverage_id} /></Box>}
                                </Flex>
                            ))}
                        </Box>
                    )}
                </Flex>
            )}
            {dialog && <LocationDialog policyId={policyId} editing={dialog.editing} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); onChanged?.() }} />}
            {nearby && <NearbyDialog policyId={policyId} loc={nearby} onClose={() => setNearby(null)} />}
            {confirmDialog}
        </Box>
    )
}
