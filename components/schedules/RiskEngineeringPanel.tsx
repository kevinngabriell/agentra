"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Switch, Text, Textarea } from "@chakra-ui/react"
import { LuCheck, LuClipboardCheck, LuPackage, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { ApiError, errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate, localMonth } from "@/lib/format"
import {
    adjustStockDeclarations, deleteRecommendation, deleteStockDeclaration, getLocations, getRecommendations, getStockDeclarations,
    saveRecommendation, saveStockDeclaration,
    type PolicyLocation, type RiskRecommendation, type StockDeclarationsResponse,
} from "@/lib/api/schedules"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const PRIORITY = { low: { label: "Rendah", bg: "#F1F5F9", color: "#475569" }, medium: { label: "Sedang", bg: "#FEF3C7", color: "#B45309" }, high: { label: "Tinggi", bg: "#FEE2E2", color: "#B91C1C" } }

type Loc = Pick<PolicyLocation, "location_id" | "label" | "seq">

function RecDialog({ policyId, editing, locations, onClose, onSaved }: { policyId: string; editing: RiskRecommendation | null; locations: Loc[]; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({
        description: editing?.description ?? "", location: editing?.location_id ?? "", priority: editing?.priority ?? "medium",
        warranty: editing?.is_warranty ?? false, due: editing?.due_date ?? "", source: editing?.source ?? "", notes: editing?.notes ?? "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.description.trim()) { setError("Isi rekomendasinya"); return }
        setSaving(true); setError(null)
        try {
            await saveRecommendation(token, policyId, editing?.recommendation_id ?? null, {
                description: f.description.trim(), location_id: f.location || null, priority: f.priority as RiskRecommendation["priority"],
                is_warranty: f.warranty, due_date: f.due || null, source: f.source.trim() || null, notes: f.notes.trim() || null,
            })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title={editing ? "Ubah rekomendasi" : "Tambah rekomendasi survei / warranty"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormField label="Rekomendasi"><Textarea {...CLAIM_INPUT} rows={3} maxLength={1000} placeholder="Mis: Tambah 4 APAR di area gudang B" value={f.description} onChange={(e) => set({ description: e.target.value })} /></FormField>
            <FormRow>
                <FormField label="Lokasi"><SearchSelect value={f.location} onChange={(v) => set({ location: v })} clearable placeholder="Seluruh polis"
                    options={locations.map((l) => ({ value: l.location_id, label: l.label ?? `Lokasi ${l.seq}` }))} /></FormField>
                <FormField label="Prioritas"><SearchSelect value={f.priority} onChange={(v) => set({ priority: v as typeof f.priority })}
                    options={(Object.keys(PRIORITY) as (keyof typeof PRIORITY)[]).map((k) => ({ value: k, label: PRIORITY[k].label }))} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Batas waktu"><Input {...CLAIM_INPUT} type="date" value={f.due} onChange={(e) => set({ due: e.target.value })} /></FormField>
                <FormField label="Sumber"><Input {...CLAIM_INPUT} maxLength={150} placeholder="Laporan survei, tanggal" value={f.source} onChange={(e) => set({ source: e.target.value })} /></FormField>
            </FormRow>
            <Switch.Root checked={f.warranty} onCheckedChange={(e) => set({ warranty: e.checked })} colorPalette="red" size="sm">
                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="15px">Warranty: pelanggaran bisa membatalkan klaim</Switch.Label>
            </Switch.Root>
            <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={500} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
        </FormDialog>
    )
}

function DeclarationDialog({ policyId, locations, onClose, onSaved }: { policyId: string; locations: Loc[]; onClose: () => void; onSaved: (d: StockDeclarationsResponse) => void }) {
    const [month, setMonth] = useState(localMonth())
    const [value, setValue] = useState("")
    const [loc, setLoc] = useState("")
    const [notes, setNotes] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!value) { setError("Isi nilai stok yang dideklarasikan"); return }
        setSaving(true); setError(null)
        try { onSaved(await saveStockDeclaration(token, policyId, null, { period_month: month, declared_value: Number(value), location_id: loc || null, notes: notes.trim() || null })) }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title="Deklarasi stok bulanan" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Bulan"><Input {...CLAIM_INPUT} type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField>
                <FormField label="Nilai stok (Rp)"><MoneyInput value={value} onChange={setValue} /></FormField>
            </FormRow>
            {locations.length > 0 && <FormField label="Lokasi" hint="Satu bulan bisa punya deklarasi per lokasi; nilainya dijumlah">
                <SearchSelect value={loc} onChange={setLoc} clearable placeholder="Semua lokasi" options={locations.map((l) => ({ value: l.location_id, label: l.label ?? `Lokasi ${l.seq}` }))} />
            </FormField>}
            <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        </FormDialog>
    )
}

/** Survey recommendations / warranties, and (stock declaration policies) monthly declarations with the year-end adjustment. */
export function RiskEngineeringPanel({ policyId, cancelled, onChanged, refreshKey }: { policyId: string; cancelled: boolean; onChanged?: () => void; refreshKey?: string }) {
    const [locations, setLocations] = useState<Loc[]>([])
    const [recs, setRecs] = useState<RiskRecommendation[] | null>(null)
    const [stock, setStock] = useState<StockDeclarationsResponse | null | "off">(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<null | { rec: RiskRecommendation | null } | "declare">(null)
    const [adjusting, setAdjusting] = useState(false)
    const { confirm, dialog: confirmDialog } = useConfirm()

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getRecommendations(token, policyId).then(setRecs).catch((err) => setError(errorMessage(err, "Rekomendasi belum bisa dimuat.")))
        getLocations(token, policyId).then((r) => setLocations(r.items)).catch(() => setLocations([]))
        getStockDeclarations(token, policyId).then(setStock).catch((err) => setStock(err instanceof ApiError && err.code === "ERR_V21_009" ? "off" : null))
    }, [policyId])
    useEffect(() => { load() }, [load, refreshKey])

    async function markDone(r: RiskRecommendation) {
        const token = getAccessToken()
        if (!token) return
        try { await saveRecommendation(token, policyId, r.recommendation_id, { status: "done", completed_date: localISODate() }); load(); onChanged?.() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")) }
    }
    async function removeRec(r: RiskRecommendation) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: "Hapus rekomendasi?", danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteRecommendation(token, policyId, r.recommendation_id); load() } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }
    async function removeDecl(id: string) {
        const token = getAccessToken()
        if (!token) return
        try { setStock(await deleteStockDeclaration(token, policyId, id)) } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }
    async function adjust() {
        const token = getAccessToken()
        if (!token || !stock || stock === "off") return
        const c = stock.calculation
        const ok = await confirm({
            title: c.adjustment >= 0 ? `Tagih penyesuaian ${fmtIDR(c.adjustment)}?` : `Kembalikan ${fmtIDR(-c.adjustment)}?`,
            message: `Rata-rata deklarasi ${fmtIDR(c.average_declared)} × ${c.rate_permille}‰ = ${fmtIDR(c.earned_premium)}, dibanding deposit ${fmtIDR(c.deposit_premium)}. Dibuatkan nota ${c.adjustment >= 0 ? "debit" : "kredit"}.`,
            confirmLabel: "Buat nota",
        })
        if (!ok) return
        setAdjusting(true)
        try { await adjustStockDeclarations(token, policyId); load(); onChanged?.() }
        catch (err) { setError(errorMessage(err, "Gagal membuat penyesuaian")) }
        finally { setAdjusting(false) }
    }

    const open = (recs ?? []).filter((r) => r.status === "open")
    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="14px" gap="8px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    <LuClipboardCheck size={16} color="#0D1B3E" />
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Rekomendasi Survei & Warranty</Text>
                    {open.length > 0 && <Badge fontSize="14px" bg="#FEF3C7" color="#B45309">{open.length} terbuka</Badge>}
                </Flex>
                {!cancelled && <Button size="xs" variant="outline" fontSize="14px" onClick={() => setDialog({ rec: null })}><LuPlus size={12} /> Tambah</Button>}
            </Flex>
            {error && <Text color="#DC2626" fontSize="14px" mb="8px" role="alert">{error}</Text>}
            {!recs ? <Skeleton h="50px" /> : recs.length === 0
                ? <Text color="#64748B" fontSize="15px">Belum ada rekomendasi. Catat temuan surveyor agar tenggatnya diingatkan, terutama warranty.</Text>
                : recs.map((r) => (
                    <Flex key={r.recommendation_id} justify="space-between" gap="10px" py="8px" borderTop="1px solid #E2E8F0" opacity={r.status === "open" ? 1 : 0.6}>
                        <Box minW="0">
                            <Flex gap="6px" align="center" flexWrap="wrap">
                                {r.is_warranty && <Badge fontSize="14px" bg="#FEE2E2" color="#B91C1C">Warranty</Badge>}
                                <Badge fontSize="14px" bg={PRIORITY[r.priority].bg} color={PRIORITY[r.priority].color}>{PRIORITY[r.priority].label}</Badge>
                                {r.status !== "open" && <Badge fontSize="14px" bg="#DCFCE7" color="#15803D">{r.status === "done" ? `Selesai ${fmtDate(r.completed_date)}` : "Dibebaskan"}</Badge>}
                                {r.is_overdue && <Badge fontSize="14px" bg="#DC2626" color="white">Lewat tenggat</Badge>}
                            </Flex>
                            <Text fontSize="15px" color="#1C2833" mt="2px">{r.description}</Text>
                            <Text fontSize="14px" color="#64748B">{[r.location_label, r.due_date && `tenggat ${fmtDate(r.due_date)}`, r.source].filter(Boolean).join(" · ")}</Text>
                        </Box>
                        <Flex flexShrink={0}>
                            {r.status === "open" && !cancelled && <IconButton size="2xs" variant="ghost" color="#16A34A" aria-label="Tandai selesai" onClick={() => markDone(r)}><LuCheck size={13} /></IconButton>}
                            {!cancelled && <IconButton size="2xs" variant="ghost" aria-label="Ubah" onClick={() => setDialog({ rec: r })}><LuPencil size={13} /></IconButton>}
                            {!cancelled && <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus" onClick={() => removeRec(r)}><LuTrash2 size={13} /></IconButton>}
                        </Flex>
                    </Flex>
                ))}

            {stock && stock !== "off" && (
                <Box mt="20px" pt="16px" borderTop="1px solid" borderColor="#E2E8F0">
                    <Flex align="center" justify="space-between" mb="10px" gap="8px" flexWrap="wrap">
                        <Flex align="center" gap="8px"><LuPackage size={15} color="#0D1B3E" /><Text fontSize="15px" fontWeight="semibold" color="#1C2833">Stok Deklarasi</Text></Flex>
                        {!cancelled && <Flex gap="8px">
                            <Button size="xs" variant="outline" fontSize="14px" onClick={() => setDialog("declare")}><LuPlus size={12} /> Deklarasi</Button>
                            <Button size="xs" variant="outline" fontSize="14px" loading={adjusting} disabled={stock.calculation.months_declared === 0} onClick={adjust}>Hitung penyesuaian</Button>
                        </Flex>}
                    </Flex>
                    <Text fontSize="14px" color="#64748B">
                        Maks. {fmtIDR(stock.calculation.max_sum_insured)} · rate {stock.calculation.rate_permille}‰ · deposit {fmtIDR(stock.calculation.deposit_premium)} ·
                        rata-rata {fmtIDR(stock.calculation.average_declared)} ({stock.calculation.months_declared} bulan) · puncak {fmtIDR(stock.calculation.peak_declared)}
                    </Text>
                    {stock.calculation.months_over_max > 0 && (
                        <Text fontSize="14px" color="#B91C1C">{stock.calculation.months_over_max} bulan melebihi nilai maksimum: stok di atas batas tidak terjamin penuh. Pertimbangkan endorsemen kenaikan nilai.</Text>
                    )}
                    <Text fontSize="14px" color="#0D1B3E" fontWeight="semibold" mt="4px">
                        Premi akhir {fmtIDR(stock.calculation.earned_premium)} → {stock.calculation.adjustment >= 0 ? "tagihan tambahan" : "pengembalian"} {fmtIDR(Math.abs(stock.calculation.adjustment))}
                        {stock.adjustment_note && ` · nota ${stock.adjustment_note.note_number ?? ""} sudah dibuat`}
                    </Text>
                    <Flex flexDir="column" mt="8px">
                        {stock.items.map((d) => (
                            <Flex key={d.declaration_id} justify="space-between" align="center" py="4px" borderTop="1px dashed #E2E8F0" fontSize="14px">
                                <Text>{d.period_month}{d.location_label ? ` · ${d.location_label}` : ""}</Text>
                                <Flex align="center" gap="6px">
                                    <Text>{fmtIDR(d.declared_value)}</Text>
                                    {!cancelled && <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus deklarasi" onClick={() => removeDecl(d.declaration_id)}><LuTrash2 size={12} /></IconButton>}
                                </Flex>
                            </Flex>
                        ))}
                    </Flex>
                </Box>
            )}

            {dialog && typeof dialog === "object" && <RecDialog policyId={policyId} editing={dialog.rec} locations={locations}
                onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); onChanged?.() }} />}
            {dialog === "declare" && <DeclarationDialog policyId={policyId} locations={locations} onClose={() => setDialog(null)} onSaved={(d) => { setDialog(null); setStock(d) }} />}
            {confirmDialog}
        </Box>
    )
}
