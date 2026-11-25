"use client"

import { useEffect, useMemo, useState } from "react"
import { Box, Button, Flex, IconButton, Input, Switch, Text, Textarea } from "@chakra-ui/react"
import { LuPlus, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import {
    PLACEMENT_STATUS_LABELS, createQuote, updateQuote,
    type ApiQuoteDetail, type PlacementStatus, type QuoteItemPayload, type QuoteOptionPayload, type QuoteOptionTerm,
} from "@/lib/api/quotes"
import type { ApiProspect } from "@/lib/api/prospects"
import { COVERAGE_TYPE_LABELS, type ApiCoverageType } from "@/lib/api/policies"
import type { DeductibleType } from "@/lib/api/policy-terms"
import { CURRENCIES } from "@/lib/api/schedules"
import { addToISODate, fmtIDR, localISODate } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { TERM_CATALOG } from "@/components/policy-terms/catalog"
import { useProductOptions } from "@/lib/hooks/useProductOptions"

const MAX_OPTIONS = 6
const EXTENSIONS = TERM_CATALOG.filter((e) => e.type === "extension")

interface ItemForm { key: number; coverage_type: string; label: string; sum: string; in_tsi: boolean }
interface OptionForm {
    key: number; insurer_id: string; rate: string; premium: string; biaya_polis: string; materai: string
    deductible: string; terms: string; item_rates: Record<number, string>
    placement: PlacementStatus; decline: string; share: string; leader: boolean
    dType: "" | DeductibleType; dPercent: string; dAmount: string; exts: string[]
}

const blankOption = (key: number): OptionForm => ({
    key, insurer_id: "", rate: "", premium: "", biaya_polis: "", materai: "", deductible: "", terms: "", item_rates: {},
    placement: "quoted", decline: "", share: "", leader: false, dType: "", dPercent: "", dAmount: "", exts: [],
})
const blankItem = (key: number, type = "bangunan"): ItemForm => ({ key, coverage_type: type, label: "", sum: "", in_tsi: true })
const num = (v: string) => Number(v.replace(",", ".")) || 0
const computedPremium = (sum: string, rate: string) => (sum && num(rate) > 0 ? Math.round(Number(sum) * num(rate) / 1000) : null)

/** Quote builder: product and sum insured (optionally itemised per coverage / peril), then one offer per insurer. */
export function QuoteDialog({ prospect, editing, onClose, onSaved }: {
    prospect: ApiProspect
    editing: ApiQuoteDetail | null
    onClose: () => void
    onSaved: (q: ApiQuoteDetail) => void
}) {
    const [insurers, setInsurers] = useState<ApiInsurer[]>([])
    const productCatalog = useProductOptions()
    const [product, setProduct] = useState(editing?.product_type ?? prospect.product_interest ?? "")
    const [object, setObject] = useState(editing?.object_description ?? "")
    const [sum, setSum] = useState(editing ? String(editing.sum_insured) : "")
    const [start, setStart] = useState(editing?.coverage_start ?? "")
    const [end, setEnd] = useState(editing?.coverage_end ?? "")
    const [validUntil, setValidUntil] = useState(editing?.valid_until ?? addToISODate(localISODate(), { days: 14 }))
    const [notes, setNotes] = useState(editing?.notes ?? "")
    const [currency, setCurrency] = useState(editing?.currency ?? "IDR")
    const [fx, setFx] = useState(editing && editing.currency !== "IDR" ? String(editing.exchange_rate) : "")
    const [itemised, setItemised] = useState((editing?.items.length ?? 0) > 0)
    const [items, setItems] = useState<ItemForm[]>(() => editing?.items.length
        ? editing.items.map((it, i) => ({ key: i, coverage_type: it.coverage_type, label: it.label ?? "", sum: String(it.sum_insured), in_tsi: it.count_in_tsi }))
        : [blankItem(0, "bangunan"), blankItem(1, "stok")])
    const [options, setOptions] = useState<OptionForm[]>(() => editing?.options.length
        ? editing.options.map((o, i) => {
            const auto = o.rate_permille !== null && computedPremium(String(editing.sum_insured), String(o.rate_permille)) === o.premium_amount
            const ded = o.terms.find((t) => t.term_type === "deductible")
            const rates: Record<number, string> = {}
            editing.items.forEach((it, idx) => { const r = o.item_rates.find((x) => x.item_id === it.item_id); if (r) rates[idx] = String(r.rate_permille) })
            return {
                ...blankOption(i), insurer_id: o.insurer_id, rate: o.rate_permille !== null ? String(o.rate_permille) : "",
                premium: auto || o.item_rates.length ? "" : String(o.premium_amount || ""),
                biaya_polis: o.biaya_polis ? String(o.biaya_polis) : "", materai: o.materai_amount ? String(o.materai_amount) : "",
                deductible: o.deductible_note ?? "", terms: o.terms_note ?? "", item_rates: rates,
                placement: o.placement_status, decline: o.decline_reason ?? "", share: o.share_percent !== null ? String(o.share_percent) : "", leader: o.is_leader,
                dType: (ded?.deductible_type ?? "") as OptionForm["dType"], dPercent: ded?.deductible_percent != null ? String(ded.deductible_percent) : "",
                dAmount: ded?.deductible_amount != null ? String(ded.deductible_amount) : "",
                exts: o.terms.filter((t) => t.term_type === "extension" && t.clause_code).map((t) => t.clause_code as string),
            }
        })
        : [blankOption(0), blankOption(1)])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getInsurers(token, true).then(setInsurers).catch(() => setInsurers([]))
    }, [])

    const insurerOptions = useMemo(() => insurers.map(i => ({ value: i.insurer_id, label: i.short_name || i.name })), [insurers])
    const patch = (key: number, p: Partial<OptionForm>) => setOptions(os => os.map(o => o.key === key ? { ...o, ...p } : o))
    const patchItem = (key: number, p: Partial<ItemForm>) => setItems(is => is.map(i => i.key === key ? { ...i, ...p } : i))
    const itemTsi = items.reduce((s, i) => s + (i.in_tsi ? Number(i.sum || 0) : 0), 0)
    const effectiveSum = itemised ? String(itemTsi) : sum
    const optionPremium = (o: OptionForm) => itemised
        ? items.reduce((s, it, idx) => s + (computedPremium(it.sum, o.item_rates[idx] ?? "") ?? 0), 0)
        : (o.premium ? Number(o.premium) : computedPremium(sum, o.rate) ?? 0)
    const shareTotal = options.filter(o => o.insurer_id && o.share).reduce((s, o) => s + num(o.share), 0)

    function termsOf(o: OptionForm): QuoteOptionTerm[] {
        const out: QuoteOptionTerm[] = []
        if (o.dType) {
            out.push({ term_type: "deductible", deductible_type: o.dType, deductible_amount: o.dAmount ? Number(o.dAmount) : null,
                deductible_percent: o.dType === "fixed" ? null : num(o.dPercent) || null, description: o.deductible.trim() || null })
        }
        for (const code of o.exts) {
            const e = EXTENSIONS.find((x) => x.code === code)
            if (e) out.push({ term_type: "extension", clause_code: e.code, title: e.label, description: e.hint })
        }
        return out
    }

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!product) { setError("Pilih produk"); return }
        if (itemised) {
            if (items.length === 0 || items.some(i => !i.sum)) { setError("Isi nilai pertanggungan setiap item"); return }
        } else if (!sum || Number(sum) <= 0) { setError("Nilai pertanggungan wajib diisi"); return }
        if (start && end && end <= start) { setError("Akhir periode harus setelah awal periode"); return }
        if (currency !== "IDR" && !(num(fx) > 0)) { setError("Isi kurs mata uang"); return }
        const used = options.filter(o => o.insurer_id)
        if (used.length === 0) { setError("Tambahkan minimal satu penawaran asuransi"); return }
        if (new Set(used.map(o => o.insurer_id)).size !== used.length) { setError("Satu asuransi hanya boleh muncul sekali"); return }
        for (const o of used) {
            if (o.placement !== "quoted") continue
            if (itemised ? items.some((_, idx) => !(num(o.item_rates[idx] ?? "") >= 0) || (o.item_rates[idx] ?? "") === "") : (!o.premium && !computedPremium(sum, o.rate))) {
                setError(itemised ? "Isi rate setiap item untuk penawaran yang sudah diterima" : "Isi rate atau premi untuk setiap asuransi"); return
            }
        }

        const payloadOptions: QuoteOptionPayload[] = used.map(o => ({
            insurer_id: o.insurer_id,
            rate_permille: !itemised && o.rate ? num(o.rate) : null,
            premium_amount: !itemised && o.premium ? Number(o.premium) : null,
            ...(itemised && items.every((_, idx) => (o.item_rates[idx] ?? "") !== "") ? { item_rates: items.map((_, idx) => num(o.item_rates[idx] ?? "0")) } : {}),
            biaya_polis: Number(o.biaya_polis || 0), materai_amount: Number(o.materai || 0),
            deductible_note: o.deductible.trim() || null, terms_note: o.terms.trim() || null,
            placement_status: o.placement, decline_reason: o.placement === "declined" ? o.decline.trim() || null : null,
            share_percent: o.share ? num(o.share) : null, is_leader: o.leader, terms: termsOf(o),
        }))
        const itemPayload: QuoteItemPayload[] | undefined = itemised
            ? items.map(i => ({ coverage_type: i.coverage_type, label: i.label.trim() || null, sum_insured: Number(i.sum), count_in_tsi: i.in_tsi }))
            : (editing?.items.length ? [] : undefined)
        const body = {
            product_type: product, object_description: object.trim() || null, sum_insured: Number(effectiveSum),
            coverage_start: start || null, coverage_end: end || null, valid_until: validUntil || null,
            notes: notes.trim() || null, options: payloadOptions,
            ...(itemPayload !== undefined ? { items: itemPayload } : {}),
            currency, ...(currency !== "IDR" ? { exchange_rate: num(fx) } : {}),
        }
        setSaving(true); setError(null)
        try {
            onSaved(editing
                ? await updateQuote(token, editing.quote_id, body)
                : await createQuote(token, { ...body, prospect_id: prospect.prospect_id }))
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan penawaran"))
            setSaving(false)
        }
    }

    const covTypeOptions = (Object.entries(COVERAGE_TYPE_LABELS) as [ApiCoverageType, string][]).filter(([k]) => k !== "kendaraan").map(([value, label]) => ({ value, label }))

    return (
        <FormDialog title={editing ? `Ubah ${editing.quote_number}` : "Buat Penawaran"} size="820px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Produk *">
                    <SearchSelect value={product} onChange={setProduct} placeholder="Pilih produk" options={productCatalog.options} />
                </FormField>
                {itemised
                    ? <FormField label="Nilai pertanggungan (TSI)"><Text fontSize="15px" fontWeight="semibold" pt="8px">{fmtIDR(itemTsi)}</Text></FormField>
                    : <FormField label="Nilai pertanggungan (Rp) *"><MoneyInput value={sum} onChange={setSum} /></FormField>}
            </FormRow>
            <Switch.Root checked={itemised} onCheckedChange={(e) => setItemised(e.checked)} colorPalette="blue" size="sm">
                <Switch.HiddenInput /><Switch.Control />
                <Switch.Label fontSize="15px">Rinci per item / peril (bangunan, stok, mesin, banjir, gempa…) — untuk risiko besar</Switch.Label>
            </Switch.Root>
            {itemised && (
                <Box border="1px solid" borderColor="#E2E8F0" borderRadius="10px" p="12px">
                    {items.map((it, idx) => (
                        <Flex key={it.key} gap="8px" align="flex-end" mb="8px" flexWrap="wrap">
                            <Box flex="1" minW="150px"><FormField label={idx === 0 ? "Jenis" : ""}><SearchSelect value={it.coverage_type} onChange={(v) => patchItem(it.key, { coverage_type: v })} options={covTypeOptions} /></FormField></Box>
                            <Box flex="1" minW="150px"><FormField label={idx === 0 ? "Keterangan" : ""}><Input {...CLAIM_INPUT} maxLength={150} placeholder="Mis: Gudang A / Banjir" value={it.label} onChange={(e) => patchItem(it.key, { label: e.target.value })} /></FormField></Box>
                            <Box flex="1" minW="150px"><FormField label={idx === 0 ? "Nilai (Rp)" : ""}><MoneyInput value={it.sum} onChange={(v) => patchItem(it.key, { sum: v })} /></FormField></Box>
                            <Switch.Root checked={it.in_tsi} onCheckedChange={(e) => patchItem(it.key, { in_tsi: e.checked })} size="sm" colorPalette="blue" title="Dihitung ke TSI (matikan untuk perluasan atas objek yang sama)">
                                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">TSI</Switch.Label>
                            </Switch.Root>
                            {items.length > 1 && <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus item" onClick={() => setItems(is => is.filter(x => x.key !== it.key))}><LuTrash2 size={13} /></IconButton>}
                        </Flex>
                    ))}
                    <Button size="xs" variant="outline" fontSize="14px" onClick={() => setItems(is => [...is, blankItem(Math.max(0, ...is.map(i => i.key)) + 1, "dll")])}><LuPlus size={12} /> Tambah item / peril</Button>
                </Box>
            )}
            <FormField label="Objek yang dipertanggungkan" hint="Contoh: Toyota Avanza 2022 B 1234 XYZ, Gudang di Cikarang">
                <Input {...CLAIM_INPUT} maxLength={500} value={object} onChange={(e) => setObject(e.target.value)} />
            </FormField>
            <FormRow>
                <FormField label="Periode mulai"><Input {...CLAIM_INPUT} type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value && !end) setEnd(addToISODate(e.target.value, { years: 1, days: -1 })) }} /></FormField>
                <FormField label="Periode berakhir"><Input {...CLAIM_INPUT} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Penawaran berlaku sampai"><Input {...CLAIM_INPUT} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></FormField>
                <FormRow>
                    <FormField label="Mata uang"><SearchSelect value={currency} onChange={setCurrency} options={CURRENCIES.map(c => ({ value: c, label: c }))} /></FormField>
                    {currency !== "IDR" && <FormField label="Kurs (Rp)"><Input {...CLAIM_INPUT} inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value.replace(/[^\d.,]/g, ""))} /></FormField>}
                </FormRow>
            </FormRow>
            {currency !== "IDR" && <Text fontSize="14px" color="#64748B" mt="-6px">Nilai diisi dalam rupiah; dicetak juga dalam {currency} dengan kurs ini.</Text>}

            <Flex justify="space-between" align="center" pt="6px" gap="8px" flexWrap="wrap">
                <Text color="#0D1B3E" fontSize="14px" fontWeight="semibold" letterSpacing="0.04em">PENAWARAN / PENEMPATAN PER ASURANSI</Text>
                <Button size="xs" variant="outline" fontSize="14px" disabled={options.length >= MAX_OPTIONS}
                    onClick={() => setOptions(os => [...os, blankOption(Math.max(...os.map(o => o.key)) + 1)])}>
                    <LuPlus size={12} /> Tambah asuransi
                </Button>
            </Flex>
            {shareTotal > 0 && (
                <Text fontSize="14px" color={Math.abs(shareTotal - 100) < 0.01 ? "#15803D" : "#B45309"}>Total share koasuransi: {shareTotal}% {Math.abs(shareTotal - 100) < 0.01 ? "✓" : "(harus 100% untuk diterima sebagai panel)"}</Text>
            )}
            {options.map((o, idx) => {
                const auto = computedPremium(sum, o.rate)
                const prem = optionPremium(o)
                return (
                    <Box key={o.key} border="1px solid" borderColor="#E2E8F0" borderRadius="10px" p="12px">
                        <Flex justify="space-between" align="center" mb="8px">
                            <Text fontSize="14px" fontWeight="semibold" color="#475569">Opsi {idx + 1}{prem > 0 ? ` · premi ${fmtIDR(prem)}` : ""}</Text>
                            {options.length > 1 && (
                                <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label={`Hapus opsi ${idx + 1}`} onClick={() => setOptions(os => os.filter(x => x.key !== o.key))}><LuTrash2 size={13} /></IconButton>
                            )}
                        </Flex>
                        <Flex flexDir="column" gap="10px">
                            <FormRow>
                                <FormField label="Asuransi">
                                    <SearchSelect value={o.insurer_id} onChange={(v) => patch(o.key, { insurer_id: v })} placeholder="Pilih asuransi" options={insurerOptions} />
                                </FormField>
                                <FormField label="Status penempatan">
                                    <SearchSelect value={o.placement} onChange={(v) => patch(o.key, { placement: v as PlacementStatus })}
                                        options={(Object.entries(PLACEMENT_STATUS_LABELS) as [PlacementStatus, string][]).map(([value, label]) => ({ value, label }))} />
                                </FormField>
                            </FormRow>
                            {o.placement === "declined" && (
                                <FormField label="Alasan ditolak"><Input {...CLAIM_INPUT} maxLength={300} placeholder="Mis: okupasi di luar selera risiko" value={o.decline} onChange={(e) => patch(o.key, { decline: e.target.value })} /></FormField>
                            )}
                            {itemised ? (
                                <Flex gap="8px" flexWrap="wrap">
                                    {items.map((it, i2) => {
                                        const p = computedPremium(it.sum, o.item_rates[i2] ?? "")
                                        return (
                                            <Box key={it.key} flex="1" minW="140px">
                                                <FormField label={`Rate ‰ · ${it.label || COVERAGE_TYPE_LABELS[it.coverage_type as ApiCoverageType] || it.coverage_type}`} hint={p !== null ? fmtIDR(p) : undefined}>
                                                    <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={8} value={o.item_rates[i2] ?? ""}
                                                        onChange={(e) => patch(o.key, { item_rates: { ...o.item_rates, [i2]: e.target.value.replace(/[^\d.,]/g, "") } })} />
                                                </FormField>
                                            </Box>
                                        )
                                    })}
                                </Flex>
                            ) : (
                                <FormRow>
                                    <FormField label="Rate (‰)" hint={auto !== null ? `Premi dihitung ${fmtIDR(auto)}` : "Per mil dari nilai pertanggungan"}>
                                        <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={8} placeholder="2,5" value={o.rate} onChange={(e) => patch(o.key, { rate: e.target.value.replace(/[^\d.,]/g, "") })} />
                                    </FormField>
                                    <FormField label="Premi (Rp)" hint="Kosongkan agar dihitung dari rate">
                                        <MoneyInput value={o.premium} placeholder={auto !== null ? String(auto) : "0"} onChange={(v) => patch(o.key, { premium: v })} />
                                    </FormField>
                                </FormRow>
                            )}
                            <FormRow>
                                <FormRow>
                                    <FormField label="Biaya polis"><MoneyInput value={o.biaya_polis} onChange={(v) => patch(o.key, { biaya_polis: v })} /></FormField>
                                    <FormField label="Materai"><MoneyInput value={o.materai} onChange={(v) => patch(o.key, { materai: v })} /></FormField>
                                </FormRow>
                                <FormRow>
                                    <FormField label="Share koas. (%)"><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={6} placeholder="Kosong = penuh" value={o.share} onChange={(e) => patch(o.key, { share: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
                                    <FormField label="Leader">
                                        <Switch.Root checked={o.leader} onCheckedChange={(e) => patch(o.key, { leader: e.checked })} size="sm" colorPalette="purple" mt="8px">
                                            <Switch.HiddenInput /><Switch.Control />
                                        </Switch.Root>
                                    </FormField>
                                </FormRow>
                            </FormRow>
                            <FormRow>
                                <FormField label="Risiko sendiri">
                                    <SearchSelect value={o.dType} onChange={(v) => patch(o.key, { dType: v as OptionForm["dType"] })} clearable placeholder="Tidak ada / catatan saja"
                                        options={[{ value: "fixed", label: "Nominal tetap" }, { value: "percent_claim", label: "% klaim (min.)" }, { value: "percent_sum_insured", label: "% TSI (min.)" }]} />
                                </FormField>
                                <FormRow>
                                    {o.dType && o.dType !== "fixed" && <FormField label="%"><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={6} value={o.dPercent} onChange={(e) => patch(o.key, { dPercent: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>}
                                    {o.dType && <FormField label={o.dType === "fixed" ? "Nominal" : "Minimum"}><MoneyInput value={o.dAmount} onChange={(v) => patch(o.key, { dAmount: v })} /></FormField>}
                                </FormRow>
                            </FormRow>
                            <FormField label="Perluasan jaminan" hint="Dipilih di sini ikut tersalin ke polis saat penawaran diterima">
                                <Flex gap="6px" flexWrap="wrap">
                                    {EXTENSIONS.map((e) => {
                                        const on = o.exts.includes(e.code)
                                        return (
                                            <Button key={e.code} size="2xs" fontSize="14px" variant={on ? "solid" : "outline"} bg={on ? "#0D1B3E" : undefined} color={on ? "white" : undefined}
                                                onClick={() => patch(o.key, { exts: on ? o.exts.filter(x => x !== e.code) : [...o.exts, e.code] })}>{e.label}</Button>
                                        )
                                    })}
                                </Flex>
                            </FormField>
                            <FormField label="Catatan risiko sendiri & klausula lain"><Textarea {...CLAIM_INPUT} rows={2} maxLength={4000} placeholder="Contoh: bengkel resmi, warranty APAR" value={o.terms} onChange={(e) => patch(o.key, { terms: e.target.value })} /></FormField>
                        </Flex>
                    </Box>
                )
            })}
            <FormField label="Catatan untuk nasabah"><Textarea {...CLAIM_INPUT} rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        </FormDialog>
    )
}
