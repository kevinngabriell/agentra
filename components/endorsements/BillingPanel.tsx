"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Box, Button, Flex, Grid, IconButton, Input, Skeleton, Text, Textarea } from "@chakra-ui/react"
import { LuBan, LuCheck, LuPlus, LuPrinter, LuReceipt, LuUndo2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import {
    CANCELLATION_METHOD_LABELS, CANCELLATION_REASON_LABELS, ENDORSEMENT_COMMISSION_LABELS, ENDORSEMENT_TYPE_LABELS,
    addEndorsement, cancelPolicy, getPolicyEndorsements, previewCancellation, previewEndorsement, updateEndorsement,
    type CancellationMethod, type CancellationPreview, type CancellationReason, type EndorsementPreview, type EndorsementType,
    type PolicyEndorsement, type PolicyEndorsementsResponse,
} from "@/lib/api/endorsements"
import { CALC_METHOD_LABELS, type EndorsementCalcMethod } from "@/lib/api/policy-change"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"

const signed = (n: number) => (n < 0 ? `− ${fmtIDR(-n)}` : fmtIDR(n))
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")

export interface BillingPanelProps {
    policy: { id: string; number: string; coverage_start: string; coverage_end: string; cancelled: boolean; hasCoverageItems: boolean }
    /** Called after any change so the page reloads the policy and its timeline. */
    onChanged?: () => void
    /** Changes when the policy or its items change elsewhere on the page (their endorsements bill here). */
    refreshKey?: string
}

/** Signed digits: "-" prefix kept, everything else digits only. */
function SignedMoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const neg = value.startsWith("-")
    const digits = value.replace(/\D/g, "")
    return (
        <Flex gap="6px">
            <Button size="sm" variant="outline" minW="44px" fontSize="14px" aria-label={neg ? "Pengurangan" : "Penambahan"}
                onClick={() => onChange(neg ? digits : `-${digits}`)}>{neg ? "−" : "+"}</Button>
            <MoneyInput value={digits} onChange={(d) => onChange(neg ? `-${d}` : d)} />
        </Flex>
    )
}

const toSigned = (v: string) => (v.replace(/[^\d-]/g, "") === "" || v === "-" ? 0 : Number(v.replace(/[^\d-]/g, "")))

function EndorsementDialog({ policy, onClose, onSaved }: { policy: BillingPanelProps["policy"]; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({
        type: "sum_insured_change" as EndorsementType, effective: localISODate(), number: "", description: "",
        method: "pro_rata" as EndorsementCalcMethod, annual: "", manual: "", si: "", materai: "", biaya: "", apply: !policy.hasCoverageItems,
    })
    const [preview, setPreview] = useState<EndorsementPreview | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }))

    const body = useCallback(() => ({
        endorsement_type: f.type, effective_date: f.effective, calc_method: f.method,
        annual_premium_delta: toSigned(f.annual), ...(f.method === "manual" ? { premium_delta: toSigned(f.manual) } : {}),
        sum_insured_delta: toSigned(f.si), endorsement_materai: Number(f.materai || 0), endorsement_biaya_polis: Number(f.biaya || 0),
        ...(f.number.trim() ? { endorsement_number: f.number.trim() } : {}), ...(f.description.trim() ? { description: f.description.trim() } : {}),
        apply_to_contract: f.apply,
    }), [f])

    useEffect(() => {
        const token = getAccessToken()
        if (!token || !f.effective) return
        const t = setTimeout(() => {
            previewEndorsement(token, policy.id, body()).then(setPreview).catch(() => setPreview(null))
        }, 300)
        return () => clearTimeout(t)
    }, [body, f.effective, policy.id])

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (f.effective < policy.coverage_start || f.effective > policy.coverage_end) { setError(`Tanggal efektif harus dalam periode polis (${policy.coverage_start} s/d ${policy.coverage_end})`); return }
        if (f.method === "manual" && !f.manual.replace(/\D/g, "")) { setError("Isi nominal premi dari penanggung"); return }
        setSaving(true); setError(null)
        try { await addEndorsement(token, policy.id, body()); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal mencatat endorsemen")); setSaving(false) }
    }

    return (
        <FormDialog title="Catat Endorsemen dari Penanggung" size="620px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <Text fontSize="13px" color="#64748B">
                Untuk perubahan item pertanggungan, kendaraan armada, atau lokasi, ubah langsung di panelnya (nota dibuat otomatis).
                Pakai formulir ini untuk endorsemen lain, misalnya perpanjangan periode atau nominal yang sudah dihitung penanggung.
            </Text>
            <FormRow>
                <FormField label="Jenis endorsemen">
                    <SearchSelect value={f.type} onChange={(v) => set({ type: v as EndorsementType })}
                        options={(Object.entries(ENDORSEMENT_TYPE_LABELS) as [EndorsementType, string][]).filter(([k]) => k !== "cancellation" && k !== "stock_adjustment").map(([value, label]) => ({ value, label }))} />
                </FormField>
                <FormField label="Tanggal efektif"><Input {...CLAIM_INPUT} type="date" value={f.effective} onChange={(e) => set({ effective: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Nomor endorsemen"><Input {...CLAIM_INPUT} maxLength={60} value={f.number} onChange={(e) => set({ number: e.target.value })} /></FormField>
                <FormField label="Perhitungan premi">
                    <SearchSelect value={f.method} onChange={(v) => set({ method: v as EndorsementCalcMethod })}
                        options={(Object.entries(CALC_METHOD_LABELS) as [EndorsementCalcMethod, string][]).map(([value, label]) => ({ value, label }))} />
                </FormField>
            </FormRow>
            <FormRow>
                <FormField label="Perubahan premi setahun (Rp)" hint="Tekan +/− untuk penambahan / pengurangan"><SignedMoneyInput value={f.annual} onChange={(v) => set({ annual: v })} /></FormField>
                {f.method === "manual"
                    ? <FormField label="Premi endorsemen dari penanggung (Rp)"><SignedMoneyInput value={f.manual} onChange={(v) => set({ manual: v })} /></FormField>
                    : <FormField label="Perubahan nilai pertanggungan (Rp)"><SignedMoneyInput value={f.si} onChange={(v) => set({ si: v })} /></FormField>}
            </FormRow>
            <FormRow>
                <FormField label="Materai nota (Rp)"><MoneyInput value={f.materai} onChange={(v) => set({ materai: v })} /></FormField>
                <FormField label="Biaya endorsemen (Rp)"><MoneyInput value={f.biaya} onChange={(v) => set({ biaya: v })} /></FormField>
            </FormRow>
            <FormField label="Keterangan"><Textarea {...CLAIM_INPUT} rows={2} maxLength={1000} value={f.description} onChange={(e) => set({ description: e.target.value })} /></FormField>
            {!policy.hasCoverageItems && (
                <Flex as="label" gap="8px" align="center" fontSize="13px" color="#1C2833">
                    <input type="checkbox" checked={f.apply} onChange={(e) => set({ apply: e.target.checked })} />
                    Ubah juga premi & nilai pertanggungan tahunan polis
                </Flex>
            )}
            {preview && (
                <Box p="12px" bg="#F8FAFC" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" fontSize="13px">
                    <Text fontWeight="semibold" color="#0D1B3E" mb="4px">
                        {preview.gross_amount >= 0 ? "Nota debit" : "Nota kredit"}: {signed(preview.gross_amount)}
                    </Text>
                    <Text color="#64748B">
                        Premi {signed(preview.premium_delta)} · komisi {signed(preview.commission_delta)}
                        {f.method === "pro_rata" && ` · sisa ${preview.remaining_days} dari ${preview.period_days} hari (${(preview.pro_rata_factor * 100).toFixed(1)}%)`}
                        {f.method === "short_period" && ` · skala jangka pendek ${preview.short_period_percent}%`}
                    </Text>
                </Box>
            )}
        </FormDialog>
    )
}

function SettleDialog({ policyId, row, onClose, onSaved }: { policyId: string; row: PolicyEndorsement; onClose: () => void; onSaved: () => void }) {
    const credit = row.note_type === "credit"
    const [date, setDate] = useState(row.settled_date ?? localISODate())
    const [ref, setRef] = useState(row.settled_reference ?? "")
    const [comm, setComm] = useState(row.commission_status)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        setSaving(true); setError(null)
        try {
            await updateEndorsement(token, policyId, row.endorsement_id, {
                ...(row.note_type !== "none" ? { settled_date: date || null, settled_reference: ref.trim() || null } : {}),
                commission_status: comm,
            })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }

    return (
        <FormDialog title={`Nota ${row.note_number ?? ""}`} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            {row.note_type !== "none" && (
                <FormRow>
                    <FormField label={credit ? "Tanggal dikembalikan ke nasabah" : "Tanggal dibayar nasabah"}>
                        <Input {...CLAIM_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </FormField>
                    <FormField label="Referensi transfer"><Input {...CLAIM_INPUT} maxLength={100} value={ref} onChange={(e) => setRef(e.target.value)} /></FormField>
                </FormRow>
            )}
            <FormField label={`Komisi endorsemen (${signed(row.commission_delta)})`}
                hint={row.commission_delta < 0 ? "Komisi negatif: ditarik kembali / dipotong penanggung dari komisi berikutnya." : undefined}>
                <SearchSelect value={comm} onChange={(v) => setComm(v as typeof comm)}
                    options={(row.commission_delta < 0 ? ["pending", "clawed_back", "waived"] : ["pending", "received", "waived"])
                        .map((k) => ({ value: k, label: ENDORSEMENT_COMMISSION_LABELS[k as keyof typeof ENDORSEMENT_COMMISSION_LABELS] }))} />
            </FormField>
        </FormDialog>
    )
}

function CancelDialog({ policy, onClose, onSaved }: { policy: BillingPanelProps["policy"]; onClose: () => void; onSaved: () => void }) {
    const [date, setDate] = useState(localISODate())
    const [reason, setReason] = useState<CancellationReason>("insured_request")
    const [method, setMethod] = useState<CancellationMethod>("short_period")
    const [refund, setRefund] = useState("")
    const [note, setNote] = useState("")
    const [number, setNumber] = useState("")
    // Preview tagged with the inputs it was computed for, so a stale one is never shown.
    const [previewed, setPreviewed] = useState<{ key: string; data: CancellationPreview | null } | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // The usual method follows from who cancels.
    function pickReason(r: CancellationReason) {
        setReason(r)
        setMethod(r === "insurer_request" ? "pro_rata" : r === "non_payment" ? "none" : "short_period")
    }

    const previewKey = `${date}|${reason}|${method}|${refund}`
    const previewable = !!date && date >= policy.coverage_start && date <= policy.coverage_end && !(method === "manual" && !refund)
    const preview = previewable && previewed?.key === previewKey ? previewed.data : null
    useEffect(() => {
        const token = getAccessToken()
        if (!token || !previewable) return
        const t = setTimeout(() => {
            previewCancellation(token, policy.id, { cancellation_date: date, reason, method, ...(method === "manual" ? { refund_amount: Number(refund) } : {}) })
                .then((d) => setPreviewed({ key: previewKey, data: d })).catch(() => setPreviewed({ key: previewKey, data: null }))
        }, 250)
        return () => clearTimeout(t)
    }, [date, reason, method, refund, policy.id, previewable, previewKey])

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        setSaving(true); setError(null)
        try {
            await cancelPolicy(token, policy.id, {
                cancellation_date: date, reason, method, ...(method === "manual" ? { refund_amount: Number(refund || 0) } : {}),
                ...(note.trim() ? { note: note.trim() } : {}), ...(number.trim() ? { endorsement_number: number.trim() } : {}),
            })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal membatalkan polis")); setSaving(false) }
    }

    return (
        <FormDialog title={`Batalkan polis ${policy.number}?`} size="560px" saving={saving} error={error} submitLabel="Batalkan Polis" onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Tanggal pembatalan"><Input {...CLAIM_INPUT} type="date" min={policy.coverage_start} max={policy.coverage_end} value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
                <FormField label="Alasan">
                    <SearchSelect value={reason} onChange={(v) => pickReason(v as CancellationReason)}
                        options={(Object.entries(CANCELLATION_REASON_LABELS) as [CancellationReason, string][]).map(([value, label]) => ({ value, label }))} />
                </FormField>
            </FormRow>
            <FormField label="Pengembalian premi">
                <SearchSelect value={method} onChange={(v) => setMethod(v as CancellationMethod)}
                    options={(Object.entries(CANCELLATION_METHOD_LABELS) as [CancellationMethod, string][]).map(([value, label]) => ({ value, label }))} />
            </FormField>
            {method === "manual" && <FormField label="Nominal pengembalian (Rp)"><MoneyInput value={refund} onChange={setRefund} /></FormField>}
            <FormRow>
                <FormField label="Nomor endorsemen pembatalan"><Input {...CLAIM_INPUT} maxLength={60} value={number} onChange={(e) => setNumber(e.target.value)} /></FormField>
                <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
            </FormRow>
            {preview && (
                <Box p="12px" bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" fontSize="13px">
                    <Text color="#1C2833">Premi ditagih {fmtIDR(preview.billed_premium)} · {preview.months_on_risk} bulan berjalan</Text>
                    <Text fontWeight="semibold" color="#B91C1C">Dikembalikan ke nasabah: {fmtIDR(preview.refund_amount)} (nota kredit)</Text>
                    <Text color="#64748B">Premi tertahan {fmtIDR(preview.retained_premium)} · komisi ditarik {fmtIDR(preview.commission_clawback)}
                        {method === "short_period" && ` · skala ${preview.short_period_percent}%`}</Text>
                    {preview.payment_status === "unpaid" && method !== "none" && method !== "full" && (
                        <Text color="#92400E" mt="4px">Premi polis ini belum dibayar. Untuk pembatalan karena tidak bayar, biasanya tanpa pengembalian.</Text>
                    )}
                </Box>
            )}
            <Text fontSize="13px" color="#64748B">Bank / leasing yang tercatat pada polis akan dibuatkan tugas pemberitahuan pembatalan.</Text>
        </FormDialog>
    )
}

/** "Nota & Endorsemen": the original debit note, every endorsement note with its commission, and cancellation. */
export function BillingPanel({ policy, onChanged, refreshKey }: BillingPanelProps) {
    const [data, setData] = useState<PolicyEndorsementsResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<null | "add" | "cancel" | { settle: PolicyEndorsement }>(null)
    const { confirm, dialog: confirmDialog } = useConfirm()

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getPolicyEndorsements(token, policy.id).then(setData).catch((err) => setError(errorMessage(err, "Nota endorsemen belum bisa dimuat.")))
    }, [policy.id])
    useEffect(() => { load() }, [load, refreshKey])

    const saved = () => { setDialog(null); load(); onChanged?.() }
    const s = data?.summary

    async function voidRow(r: PolicyEndorsement) {
        const token = getAccessToken()
        if (!token) return
        if (!(await confirm({ title: `Void nota ${r.note_number ?? ""}?`, message: "Nota tidak dihitung lagi di tagihan dan komisi. Pakai bila nota salah dibuat.", danger: true, confirmLabel: "Void" }))) return
        try { await updateEndorsement(token, policy.id, r.endorsement_id, { is_void: true }); saved() }
        catch (err) { setError(errorMessage(err, "Gagal membatalkan nota")) }
    }

    return (
        <Box id="nota" scrollMarginTop="80px" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" gap="8px" mb="16px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    <LuReceipt size={16} color="#0D1B3E" />
                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Nota & Endorsemen</Text>
                </Flex>
                {!policy.cancelled && (
                    <Flex gap="8px">
                        <Button size="xs" variant="outline" fontSize="13px" onClick={() => setDialog("add")}><LuPlus size={12} /> Catat Endorsemen</Button>
                        <Button size="xs" variant="outline" fontSize="13px" color="#DC2626" borderColor="#FECACA" onClick={() => setDialog("cancel")}><LuBan size={12} /> Batalkan Polis</Button>
                    </Flex>
                )}
            </Flex>

            {error && <Text color="#DC2626" fontSize="13px" mb="8px" role="alert">{error}</Text>}
            {data?.cancellation && (
                <Box mb="12px" p="12px" bg="#F1F5F9" borderRadius="8px" fontSize="13px">
                    <Text fontWeight="semibold" color="#1C2833">Polis dibatalkan per {fmtDate(data.cancellation.date)}</Text>
                    <Text color="#64748B">{CANCELLATION_REASON_LABELS[data.cancellation.reason] ?? data.cancellation.reason} · {CANCELLATION_METHOD_LABELS[data.cancellation.method] ?? data.cancellation.method}{data.cancellation.note ? ` · ${data.cancellation.note}` : ""}</Text>
                </Box>
            )}

            {!data ? <Skeleton h="80px" /> : (
                <Flex flexDir="column" gap="14px">
                    <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="10px">
                        {[
                            ["Nota debit polis", s?.debit_note_number ?? "—", fmtIDR(s?.issued_premium ?? 0)],
                            ["Premi endorsemen", `${s?.endorsement_count ?? 0} nota`, signed(s?.endorsement_premium ?? 0)],
                            ["Total premi ditagih", "polis + endorsemen", fmtIDR(s?.billed_premium ?? 0)],
                            ["Belum lunas", `kredit ${fmtIDR(s?.open_credit_amount ?? 0)}`, fmtIDR(s?.open_debit_amount ?? 0)],
                        ].map(([label, sub, value]) => (
                            <Box key={label} p="10px 12px" bg="#F8FAFC" borderRadius="8px" border="1px solid" borderColor="#E2E8F0">
                                <Text fontSize="13px" color="#64748B">{label}</Text>
                                <Text fontSize="15px" fontWeight="semibold" color="#1C2833">{value}</Text>
                                <Text fontSize="13px" color="#94A3B8">{sub}</Text>
                            </Box>
                        ))}
                    </Grid>

                    {data.items.length === 0
                        ? <Text color="#64748B" fontSize="14px">Belum ada endorsemen yang mengubah premi.</Text>
                        : (
                            <Box overflowX="auto">
                                <Box as="table" w="100%" fontSize="13px" style={{ borderCollapse: "collapse" }}>
                                    <Box as="thead">
                                        <Box as="tr" color="#64748B" textAlign="left">
                                            {["Nota", "Berlaku", "Jenis", "Premi", "Komisi", "Pelunasan", ""].map((h) => <Box as="th" key={h} py="6px" pr="10px" fontWeight="semibold">{h}</Box>)}
                                        </Box>
                                    </Box>
                                    <Box as="tbody">
                                        {data.items.map((r) => (
                                            <Box as="tr" key={r.endorsement_id} borderTop="1px solid #E2E8F0" color={r.is_void ? "#94A3B8" : "#1C2833"} textDecoration={r.is_void ? "line-through" : undefined}>
                                                <Box as="td" py="8px" pr="10px">
                                                    <Text fontWeight="semibold">{r.note_number ?? "—"}</Text>
                                                    {r.endorsement_number && <Text color="#64748B">End. {r.endorsement_number}</Text>}
                                                </Box>
                                                <Box as="td" py="8px" pr="10px" whiteSpace="nowrap">{fmtDate(r.effective_date)}</Box>
                                                <Box as="td" py="8px" pr="10px">
                                                    <Text>{ENDORSEMENT_TYPE_LABELS[r.endorsement_type] ?? r.endorsement_type}</Text>
                                                    {r.description && <Text color="#64748B" lineClamp={2}>{r.description}</Text>}
                                                </Box>
                                                <Box as="td" py="8px" pr="10px" whiteSpace="nowrap" color={r.gross_amount < 0 ? "#B91C1C" : undefined}>
                                                    {signed(r.gross_amount)}
                                                    {r.calc_method !== "manual" && r.annual_premium_delta !== 0 && <Text color="#94A3B8">setahun {signed(r.annual_premium_delta)}</Text>}
                                                </Box>
                                                <Box as="td" py="8px" pr="10px" whiteSpace="nowrap">
                                                    {signed(r.commission_delta)}
                                                    <Text color="#64748B">{ENDORSEMENT_COMMISSION_LABELS[r.commission_status]}</Text>
                                                </Box>
                                                <Box as="td" py="8px" pr="10px">
                                                    {r.note_type === "none" ? "—" : r.is_settled
                                                        ? <Badge bg="#DCFCE7" color="#16A34A" fontSize="13px">{r.note_type === "credit" ? "Dikembalikan" : "Lunas"} {fmtDate(r.settled_date)}</Badge>
                                                        : <Badge bg="#FEF3C7" color="#B45309" fontSize="13px">{r.due_date ? `Jatuh tempo ${fmtDate(r.due_date)}` : "Belum"}</Badge>}
                                                </Box>
                                                <Box as="td" py="8px" whiteSpace="nowrap">
                                                    {!r.is_void && (
                                                        <>
                                                            {r.note_type !== "none" && (
                                                                <IconButton asChild size="2xs" variant="ghost" aria-label="Cetak nota">
                                                                    <a href={`/agentra/policies/${encodeURIComponent(policy.id)}/invoice?note=${encodeURIComponent(r.endorsement_id)}`} target="_blank" rel="noopener noreferrer"><LuPrinter size={13} /></a>
                                                                </IconButton>
                                                            )}
                                                            <IconButton size="2xs" variant="ghost" aria-label="Catat pelunasan / komisi" onClick={() => setDialog({ settle: r })}><LuCheck size={13} /></IconButton>
                                                            {r.endorsement_type !== "cancellation" && <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Void nota" onClick={() => voidRow(r)}><LuUndo2 size={13} /></IconButton>}
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        )}
                </Flex>
            )}

            {dialog === "add" && <EndorsementDialog policy={policy} onClose={() => setDialog(null)} onSaved={saved} />}
            {dialog === "cancel" && <CancelDialog policy={policy} onClose={() => setDialog(null)} onSaved={saved} />}
            {dialog && typeof dialog === "object" && <SettleDialog policyId={policy.id} row={dialog.settle} onClose={() => setDialog(null)} onSaved={saved} />}
            {confirmDialog}
        </Box>
    )
}
