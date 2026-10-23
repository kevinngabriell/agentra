"use client"

import { useEffect, useMemo, useState } from "react"
import { Box, Button, Flex, IconButton, Input, Text, Textarea } from "@chakra-ui/react"
import { LuPlus, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { createQuote, updateQuote, type ApiQuoteDetail, type QuoteOptionPayload } from "@/lib/api/quotes"
import type { ApiProspect } from "@/lib/api/prospects"
import { addToISODate, fmtIDR, localISODate } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { PRODUCT_OPTIONS } from "./constants"

const MAX_OPTIONS = 6

interface OptionForm {
    key: number; insurer_id: string; rate: string; premium: string
    biaya_polis: string; materai: string; deductible: string; terms: string
}

const blankOption = (key: number): OptionForm => ({ key, insurer_id: "", rate: "", premium: "", biaya_polis: "", materai: "", deductible: "", terms: "" })

const computedPremium = (sum: string, rate: string) => {
    const r = Number(rate.replace(",", "."))
    return sum && r > 0 ? Math.round(Number(sum) * r / 1000) : null
}

/** Quote builder: product and sum insured once, then one offer per insurer to compare side by side. */
export function QuoteDialog({ prospect, editing, onClose, onSaved }: {
    prospect: ApiProspect
    editing: ApiQuoteDetail | null
    onClose: () => void
    onSaved: (q: ApiQuoteDetail) => void
}) {
    const [insurers, setInsurers] = useState<ApiInsurer[]>([])
    const [product, setProduct] = useState(editing?.product_type ?? prospect.product_interest ?? "")
    const [object, setObject] = useState(editing?.object_description ?? "")
    const [sum, setSum] = useState(editing ? String(editing.sum_insured) : "")
    const [start, setStart] = useState(editing?.coverage_start ?? "")
    const [end, setEnd] = useState(editing?.coverage_end ?? "")
    const [validUntil, setValidUntil] = useState(editing?.valid_until ?? addToISODate(localISODate(), { days: 14 }))
    const [notes, setNotes] = useState(editing?.notes ?? "")
    const [options, setOptions] = useState<OptionForm[]>(() => editing?.options.length
        ? editing.options.map((o, i) => {
            const auto = o.rate_permille !== null && computedPremium(String(editing.sum_insured), String(o.rate_permille)) === o.premium_amount
            return {
                key: i, insurer_id: o.insurer_id, rate: o.rate_permille !== null ? String(o.rate_permille) : "", premium: auto ? "" : String(o.premium_amount),
                biaya_polis: o.biaya_polis ? String(o.biaya_polis) : "", materai: o.materai_amount ? String(o.materai_amount) : "",
                deductible: o.deductible_note ?? "", terms: o.terms_note ?? "",
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

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!product) { setError("Pilih produk"); return }
        if (!sum || Number(sum) <= 0) { setError("Nilai pertanggungan wajib diisi"); return }
        if (start && end && end <= start) { setError("Akhir periode harus setelah awal periode"); return }
        const used = options.filter(o => o.insurer_id)
        if (used.length === 0) { setError("Tambahkan minimal satu penawaran asuransi"); return }
        if (new Set(used.map(o => o.insurer_id)).size !== used.length) { setError("Satu asuransi hanya boleh muncul sekali"); return }
        for (const o of used) {
            if (!o.premium && !computedPremium(sum, o.rate)) { setError("Isi rate atau premi untuk setiap asuransi"); return }
        }

        const payloadOptions: QuoteOptionPayload[] = used.map(o => ({
            insurer_id: o.insurer_id,
            rate_permille: o.rate ? Number(o.rate.replace(",", ".")) : null,
            premium_amount: o.premium ? Number(o.premium) : null,
            biaya_polis: Number(o.biaya_polis || 0), materai_amount: Number(o.materai || 0),
            deductible_note: o.deductible.trim() || null, terms_note: o.terms.trim() || null,
        }))
        const body = {
            product_type: product, object_description: object.trim() || null, sum_insured: Number(sum),
            coverage_start: start || null, coverage_end: end || null, valid_until: validUntil || null,
            notes: notes.trim() || null, options: payloadOptions,
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

    return (
        <FormDialog title={editing ? `Ubah ${editing.quote_number}` : "Buat Penawaran"} size="760px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Produk *">
                    <SearchSelect value={product} onChange={setProduct} placeholder="Pilih produk" options={PRODUCT_OPTIONS} />
                </FormField>
                <FormField label="Nilai pertanggungan (Rp) *"><MoneyInput value={sum} onChange={setSum} /></FormField>
            </FormRow>
            <FormField label="Objek yang dipertanggungkan" hint="Contoh: Toyota Avanza 2022 B 1234 XYZ, Gudang di Cikarang">
                <Input {...CLAIM_INPUT} maxLength={500} value={object} onChange={(e) => setObject(e.target.value)} />
            </FormField>
            <FormRow>
                <FormField label="Periode mulai"><Input {...CLAIM_INPUT} type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value && !end) setEnd(addToISODate(e.target.value, { years: 1, days: -1 })) }} /></FormField>
                <FormField label="Periode berakhir"><Input {...CLAIM_INPUT} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
            </FormRow>
            <FormField label="Penawaran berlaku sampai"><Input {...CLAIM_INPUT} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></FormField>

            <Flex justify="space-between" align="center" pt="6px">
                <Text color="#1A3557" fontSize="14px" fontWeight="semibold" letterSpacing="0.04em">PENAWARAN PER ASURANSI</Text>
                <Button size="xs" variant="outline" fontSize="14px" disabled={options.length >= MAX_OPTIONS}
                    onClick={() => setOptions(os => [...os, blankOption(Math.max(...os.map(o => o.key)) + 1)])}>
                    <LuPlus size={12} /> Tambah asuransi
                </Button>
            </Flex>
            {options.map((o, idx) => {
                const auto = computedPremium(sum, o.rate)
                return (
                    <Box key={o.key} border="1px solid" borderColor="#E2E8F0" borderRadius="10px" p="12px">
                        <Flex justify="space-between" align="center" mb="8px">
                            <Text fontSize="14px" fontWeight="semibold" color="#475569">Opsi {idx + 1}</Text>
                            {options.length > 1 && (
                                <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label={`Hapus opsi ${idx + 1}`} onClick={() => setOptions(os => os.filter(x => x.key !== o.key))}><LuTrash2 size={13} /></IconButton>
                            )}
                        </Flex>
                        <Flex flexDir="column" gap="10px">
                            <FormRow>
                                <FormField label="Asuransi">
                                    <SearchSelect value={o.insurer_id} onChange={(v) => patch(o.key, { insurer_id: v })} placeholder="Pilih asuransi" options={insurerOptions} />
                                </FormField>
                                <FormField label="Rate (‰)" hint={auto !== null ? `Premi dihitung ${fmtIDR(auto)}` : "Per mil dari nilai pertanggungan"}>
                                    <Input {...CLAIM_INPUT} inputMode="decimal" maxLength={8} placeholder="2,5" value={o.rate} onChange={(e) => patch(o.key, { rate: e.target.value.replace(/[^\d.,]/g, "") })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Premi (Rp)" hint="Kosongkan agar dihitung dari rate">
                                    <MoneyInput value={o.premium} placeholder={auto !== null ? String(auto) : "0"} onChange={(v) => patch(o.key, { premium: v })} />
                                </FormField>
                                <FormRow>
                                    <FormField label="Biaya polis"><MoneyInput value={o.biaya_polis} onChange={(v) => patch(o.key, { biaya_polis: v })} /></FormField>
                                    <FormField label="Materai"><MoneyInput value={o.materai} onChange={(v) => patch(o.key, { materai: v })} /></FormField>
                                </FormRow>
                            </FormRow>
                            <FormField label="Risiko sendiri"><Input {...CLAIM_INPUT} maxLength={300} placeholder="Contoh: Rp 300.000 per kejadian" value={o.deductible} onChange={(e) => patch(o.key, { deductible: e.target.value })} /></FormField>
                            <FormField label="Klausula & perluasan"><Textarea {...CLAIM_INPUT} rows={2} maxLength={4000} placeholder="Contoh: Banjir, huru-hara, bengkel resmi" value={o.terms} onChange={(e) => patch(o.key, { terms: e.target.value })} /></FormField>
                        </Flex>
                    </Box>
                )
            })}
            <FormField label="Catatan untuk nasabah"><Textarea {...CLAIM_INPUT} rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        </FormDialog>
    )
}
