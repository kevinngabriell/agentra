"use client"

import { useState, type ReactNode } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Text } from "@chakra-ui/react"
import { LuClock, LuHandCoins, LuPencil, LuPlus, LuRecycle, LuScale, LuTrash2, LuTrendingDown } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import {
    REPAIR_STATUS_LABELS, RESERVE_SOURCE_LABELS, addClaimPayment, addClaimRecovery, addClaimReserve, deleteClaimPayment,
    deleteClaimRecovery, updateClaim,
    type ApiClaimDetail, type ClaimExtraFields, type RepairStatus, type ReserveSource,
} from "@/lib/api/claims"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { CURRENCIES } from "@/lib/api/schedules"

const CARD = { bg: "white", borderRadius: "12px", border: "1px solid", borderColor: "#E2E8F0", p: "20px" } as const
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")

function Title({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
    return (
        <Flex justify="space-between" align="center" mb="10px" gap="8px">
            <Flex align="center" gap="8px" color="#0D1B3E">{icon}<Text color="#1C2833" fontSize="15px" fontWeight="semibold">{children}</Text></Flex>
            {action}
        </Flex>
    )
}

function Line({ label, value, strong, muted }: { label: string; value: ReactNode; strong?: boolean; muted?: boolean }) {
    return (
        <Flex justify="space-between" gap="12px" py="5px" fontSize="14px" borderBottom="1px solid #F1F5F9">
            <Text color={muted ? "#94A3B8" : "#64748B"}>{label}</Text>
            <Text color="#1C2833" fontWeight={strong ? "bold" : "normal"} textAlign="right">{value}</Text>
        </Flex>
    )
}

/** Batas waktu: notice / documents / insurer decision / payment, with met / overdue state. */
export function ClaimDeadlinesCard({ claim }: { claim: ApiClaimDetail }) {
    const set = claim.deadlines.filter((d) => d.state !== "not_set")
    const style = { met: ["#DCFCE7", "#15803D", "Terpenuhi"], overdue: ["#FEE2E2", "#B91C1C", "Terlewat"], due: ["#FEF3C7", "#B45309", ""], closed: ["#F1F5F9", "#64748B", "Ditutup"], not_set: ["#F1F5F9", "#64748B", ""] } as const
    return (
        <Box {...CARD}>
            <Title icon={<LuClock size={15} />}>Batas Waktu</Title>
            {set.length === 0 ? <Text fontSize="13px" color="#64748B">Belum ada batas waktu. Isi batas lapor & dokumen sesuai wording polis lewat tombol Ubah data klaim besar.</Text>
                : set.map((d) => {
                    const [bg, color, label] = style[d.state]
                    return (
                        <Flex key={d.key} justify="space-between" align="center" py="5px" borderBottom="1px solid #F1F5F9" fontSize="13px" gap="8px">
                            <Box><Text color="#1C2833">{d.label}</Text><Text color="#64748B">{fmtDate(d.date)}</Text></Box>
                            <Badge bg={bg} color={color} fontSize="13px">{label || (d.days_left !== null ? (d.days_left === 0 ? "Hari ini" : `${d.days_left} hari lagi`) : "")}</Badge>
                        </Flex>
                    )
                })}
            <Text fontSize="13px" color="#94A3B8" mt="6px">Keputusan & pembayaran penanggung: umumnya 30 hari (POJK 69/2016), dihitung otomatis.</Text>
        </Box>
    )
}

/** Perhitungan ganti rugi: assessed loss → average → deductible from the policy terms → salvage → net, vs what the insurer approved. */
export function SettlementCard({ claim, onChanged }: { claim: ApiClaimDetail; onChanged: () => void }) {
    const s = claim.settlement
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function useSuggested() {
        const token = getAccessToken()
        if (!token) return
        setBusy(true); setError(null)
        try { await updateClaim(token, claim.claim_id, { deductible: s.deductible_suggested }); onChanged() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")) } finally { setBusy(false) }
    }
    return (
        <Box {...CARD}>
            <Title icon={<LuScale size={15} />}>Perhitungan Ganti Rugi</Title>
            <Line label="Kerugian dinilai (estimasi terakhir)" value={fmtIDR(s.gross_loss)} />
            <Line label={`Nilai pertanggungan${claim.coverage_label ? ` · ${claim.coverage_label}` : ""}`} value={fmtIDR(s.sum_insured)} muted />
            {s.average_applies && (
                <Line label={s.value_at_risk ? `Average: ${fmtIDR(s.sum_insured)} ÷ nilai sebenarnya ${fmtIDR(s.value_at_risk)}` : "Average (isi nilai sebenarnya saat kejadian)"}
                    value={s.average_factor < 1 ? `− ${fmtIDR(s.underinsurance_cut)} (${(s.average_factor * 100).toFixed(1)}%)` : "tidak underinsured"} />
            )}
            <Line label={`Risiko sendiri${s.deductible_term ? ` (${s.deductible_term})` : ""}`} value={`− ${fmtIDR(s.deductible_used)}`} />
            {s.salvage > 0 && <Line label="Salvage diambil tertanggung" value={`− ${fmtIDR(s.salvage)}`} />}
            <Line label="Perkiraan ganti rugi bersih" value={fmtIDR(s.net_payable)} strong />
            {s.approved_amount !== null && (
                <Line label="Disetujui penanggung" value={<>{fmtIDR(s.approved_amount)}{s.difference_vs_approved !== null && s.difference_vs_approved !== 0 &&
                    <Text as="span" color={s.difference_vs_approved < 0 ? "#B91C1C" : "#15803D"} fontSize="13px"> ({s.difference_vs_approved > 0 ? "+" : "−"}{fmtIDR(Math.abs(s.difference_vs_approved))})</Text>}</>} />
            )}
            <Line label="Sudah dibayar" value={fmtIDR(s.paid_to_date)} />
            <Line label="Sisa" value={fmtIDR(s.outstanding)} strong />
            {s.deductible_differs && (
                <Flex mt="8px" p="8px 10px" bg="#FFFBEB" borderRadius="8px" fontSize="13px" color="#92400E" justify="space-between" align="center" gap="8px" flexWrap="wrap">
                    <Text>Risiko sendiri tercatat {fmtIDR(s.deductible_on_claim)}, ketentuan polis memberi {fmtIDR(s.deductible_suggested)} untuk kerugian ini.</Text>
                    <Button size="2xs" variant="outline" loading={busy} onClick={useSuggested}>Pakai dari polis</Button>
                </Flex>
            )}
            {error && <Text color="#DC2626" fontSize="13px">{error}</Text>}
        </Box>
    )
}

export function ReservesCard({ claim, onChanged }: { claim: ApiClaimDetail; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    return (
        <Box {...CARD}>
            <Title icon={<LuTrendingDown size={15} />} action={<Button size="xs" variant="outline" fontSize="13px" onClick={() => setOpen(true)}><LuPlus size={12} /> Perbarui estimasi</Button>}>
                Riwayat Estimasi Kerugian
            </Title>
            {claim.reserves.length === 0 ? <Text fontSize="13px" color="#64748B">Belum ada riwayat.</Text> : claim.reserves.map((r) => (
                <Flex key={r.reserve_id} justify="space-between" gap="10px" py="5px" borderBottom="1px solid #F1F5F9" fontSize="13px">
                    <Box><Text color="#1C2833">{r.source_label}</Text><Text color="#64748B">{fmtDate(r.reserve_date)}{r.note ? ` · ${r.note}` : ""}</Text></Box>
                    <Text fontWeight="semibold">{fmtIDR(r.amount)}</Text>
                </Flex>
            ))}
            {open && <ReserveDialog claim={claim} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged() }} />}
        </Box>
    )
}

function ReserveDialog({ claim, onClose, onSaved }: { claim: ApiClaimDetail; onClose: () => void; onSaved: () => void }) {
    const [amount, setAmount] = useState(String(claim.estimated_loss || ""))
    const [source, setSource] = useState<ReserveSource>("adjuster_prelim")
    const [date, setDate] = useState(localISODate())
    const [note, setNote] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!amount) { setError("Isi nilai estimasi"); return }
        setSaving(true); setError(null)
        try { await addClaimReserve(token, claim.claim_id, { amount: Number(amount), source, reserve_date: date, note: note.trim() || undefined }); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title="Perbarui estimasi kerugian" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Estimasi baru (Rp)"><MoneyInput value={amount} onChange={setAmount} /></FormField>
                <FormField label="Sumber"><SearchSelect value={source} onChange={(v) => setSource(v as ReserveSource)}
                    options={(Object.entries(RESERVE_SOURCE_LABELS) as [ReserveSource, string][]).filter(([k]) => k !== "initial").map(([value, label]) => ({ value, label }))} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Tanggal"><Input {...CLAIM_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
                <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
            </FormRow>
        </FormDialog>
    )
}

/** Pembayaran klaim (interim / akhir) and the co-insurance split. */
export function PaymentsCard({ claim, onChanged }: { claim: ApiClaimDetail; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { confirm, dialog } = useConfirm()
    const canPay = claim.status === "approved" || claim.status === "partially_paid"
    async function remove(id: string) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: "Hapus pembayaran?", message: "Status klaim ikut disesuaikan.", danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteClaimPayment(token, claim.claim_id, id); onChanged() } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }
    return (
        <Box {...CARD}>
            <Title icon={<LuHandCoins size={15} />} action={canPay && <Button size="xs" variant="outline" fontSize="13px" onClick={() => setOpen(true)}><LuPlus size={12} /> Catat pembayaran</Button>}>
                Pembayaran Klaim
            </Title>
            {error && <Text color="#DC2626" fontSize="13px">{error}</Text>}
            {claim.payments.length === 0
                ? <Text fontSize="13px" color="#64748B">{canPay ? "Belum ada pembayaran. Klaim besar sering dibayar bertahap (uang muka klaim) — catat tiap pembayaran." : "Pembayaran dicatat setelah klaim disetujui."}</Text>
                : claim.payments.map((p) => (
                    <Flex key={p.payment_id} justify="space-between" align="center" gap="10px" py="5px" borderBottom="1px solid #F1F5F9" fontSize="13px">
                        <Box>
                            <Flex gap="6px" align="center"><Text color="#1C2833">{fmtDate(p.payment_date)}</Text>
                                <Badge fontSize="13px" bg={p.payment_type === "final" ? "#E0E7FF" : "#EDE9FE"} color={p.payment_type === "final" ? "#4338CA" : "#6D28D9"}>{p.payment_type === "final" ? "Akhir" : "Sebagian"}</Badge></Flex>
                            <Text color="#64748B">{[p.payer_name, p.reference].filter(Boolean).join(" · ") || "—"}</Text>
                        </Box>
                        <Flex align="center" gap="4px"><Text fontWeight="semibold">{fmtIDR(p.amount)}</Text>
                            <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus pembayaran" onClick={() => remove(p.payment_id)}><LuTrash2 size={12} /></IconButton></Flex>
                    </Flex>
                ))}
            {claim.coinsurance_split.length > 0 && (
                <Box mt="12px">
                    <Text fontSize="13px" fontWeight="semibold" color="#0D1B3E" mb="4px">Porsi koasuransi</Text>
                    {claim.coinsurance_split.map((c) => (
                        <Flex key={c.co_insurer_name} justify="space-between" gap="8px" py="4px" fontSize="13px" borderBottom="1px dashed #E2E8F0">
                            <Text>{c.co_insurer_name}{c.is_leader ? " (leader)" : ""} · {c.share_percent}%</Text>
                            <Text color={c.outstanding > 0 ? "#B45309" : "#15803D"}>{fmtIDR(c.paid_amount)} / {fmtIDR(c.share_amount)}</Text>
                        </Flex>
                    ))}
                    <Text fontSize="13px" color="#94A3B8" mt="4px">Isi nama pembayar sama dengan nama co-insurer agar porsinya terhitung.</Text>
                </Box>
            )}
            {open && <PaymentDialog claim={claim} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged() }} />}
            {dialog}
        </Box>
    )
}

function PaymentDialog({ claim, onClose, onSaved }: { claim: ApiClaimDetail; onClose: () => void; onSaved: () => void }) {
    const remaining = Math.max(0, (claim.approved_amount ?? 0) - claim.settlement.paid_to_date)
    const [amount, setAmount] = useState(String(remaining || ""))
    const [type, setType] = useState<"interim" | "final">(claim.payments.length === 0 ? "interim" : "final")
    const [date, setDate] = useState(localISODate())
    const [payer, setPayer] = useState(claim.coinsurance_split.find((c) => c.is_leader)?.co_insurer_name ?? claim.insurer_name ?? "")
    const [ref, setRef] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!Number(amount)) { setError("Isi jumlah pembayaran"); return }
        setSaving(true); setError(null)
        try { await addClaimPayment(token, claim.claim_id, { payment_date: date, amount: Number(amount), payment_type: type, payer_name: payer.trim() || undefined, reference: ref.trim() || undefined }); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan pembayaran")); setSaving(false) }
    }
    const payerOptions = [...new Set([...claim.coinsurance_split.map((c) => c.co_insurer_name), claim.insurer_name ?? ""].filter(Boolean))]
    return (
        <FormDialog title="Catat pembayaran klaim" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <Text fontSize="13px" color="#64748B">Disetujui {fmtIDR(claim.approved_amount ?? 0)} · sudah dibayar {fmtIDR(claim.settlement.paid_to_date)} · sisa {fmtIDR(remaining)}</Text>
            <FormRow>
                <FormField label="Jumlah (Rp)"><MoneyInput value={amount} onChange={setAmount} /></FormField>
                <FormField label="Jenis"><SearchSelect value={type} onChange={(v) => setType(v as "interim" | "final")}
                    options={[{ value: "interim", label: "Sebagian / uang muka klaim" }, { value: "final", label: "Pembayaran akhir (menutup klaim)" }]} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Tanggal"><Input {...CLAIM_INPUT} type="date" max={localISODate()} value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
                <FormField label="Dibayar oleh">
                    {payerOptions.length > 1
                        ? <SearchSelect value={payer} onChange={setPayer} options={payerOptions.map((p) => ({ value: p, label: p }))} />
                        : <Input {...CLAIM_INPUT} maxLength={200} value={payer} onChange={(e) => setPayer(e.target.value)} />}
                </FormField>
            </FormRow>
            <FormField label="Referensi transfer"><Input {...CLAIM_INPUT} maxLength={100} value={ref} onChange={(e) => setRef(e.target.value)} /></FormField>
        </FormDialog>
    )
}

export function RecoveriesCard({ claim, onChanged }: { claim: ApiClaimDetail; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const labels = { salvage: "Salvage", subrogation: "Subrogasi", other: "Lainnya" } as const
    async function remove(id: string) {
        const token = getAccessToken()
        if (!token) return
        try { await deleteClaimRecovery(token, claim.claim_id, id); onChanged() } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }
    if (!["approved", "partially_paid", "paid"].includes(claim.status) && claim.recoveries.length === 0) return null
    return (
        <Box {...CARD}>
            <Title icon={<LuRecycle size={15} />} action={<Button size="xs" variant="outline" fontSize="13px" onClick={() => setOpen(true)}><LuPlus size={12} /> Catat</Button>}>
                Salvage & Subrogasi
            </Title>
            {error && <Text color="#DC2626" fontSize="13px">{error}</Text>}
            {claim.recoveries.length === 0 ? <Text fontSize="13px" color="#64748B">Belum ada pemulihan. Catat penjualan sisa barang (salvage) atau tuntutan ke pihak penyebab (subrogasi).</Text>
                : claim.recoveries.map((r) => (
                    <Flex key={r.recovery_id} justify="space-between" align="center" gap="10px" py="5px" borderBottom="1px solid #F1F5F9" fontSize="13px">
                        <Box><Text color="#1C2833">{labels[r.recovery_type]}{r.party ? ` · ${r.party}` : ""}</Text>
                            <Text color="#64748B">{fmtDate(r.recovery_date)}{r.returned_to_insured ? ` · ke tertanggung ${fmtIDR(r.returned_to_insured)}` : ""}</Text></Box>
                        <Flex align="center" gap="4px"><Text fontWeight="semibold">{fmtIDR(r.amount)}</Text>
                            <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus" onClick={() => remove(r.recovery_id)}><LuTrash2 size={12} /></IconButton></Flex>
                    </Flex>
                ))}
            {open && <RecoveryDialog claim={claim} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged() }} />}
        </Box>
    )
}

function RecoveryDialog({ claim, onClose, onSaved }: { claim: ApiClaimDetail; onClose: () => void; onSaved: () => void }) {
    const [type, setType] = useState<"salvage" | "subrogation" | "other">("salvage")
    const [party, setParty] = useState("")
    const [amount, setAmount] = useState("")
    const [returned, setReturned] = useState("")
    const [date, setDate] = useState(localISODate())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!amount) { setError("Isi nilai pemulihan"); return }
        setSaving(true); setError(null)
        try { await addClaimRecovery(token, claim.claim_id, { recovery_type: type, party: party.trim() || undefined, amount: Number(amount), recovery_date: date, returned_to_insured: Number(returned || 0) }); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title="Catat salvage / subrogasi" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Jenis"><SearchSelect value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: "salvage", label: "Salvage (sisa barang)" }, { value: "subrogation", label: "Subrogasi (pihak penyebab)" }, { value: "other", label: "Lainnya" }]} /></FormField>
                <FormField label="Pihak"><Input {...CLAIM_INPUT} maxLength={200} value={party} onChange={(e) => setParty(e.target.value)} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Nilai dipulihkan (Rp)"><MoneyInput value={amount} onChange={setAmount} /></FormField>
                <FormField label="Dikembalikan ke tertanggung (Rp)" hint="Mis. porsi risiko sendiri tertanggung"><MoneyInput value={returned} onChange={setReturned} /></FormField>
            </FormRow>
            <FormField label="Tanggal"><Input {...CLAIM_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        </FormDialog>
    )
}

/** Adjuster, motor repair / total-loss handling, underinsurance inputs and deadlines. */
export function LargeLossInfoCard({ claim, productGroup, onChanged }: { claim: ApiClaimDetail; productGroup: string; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    const motor = productGroup === "motor"
    return (
        <Box {...CARD}>
            <Title icon={<LuScale size={15} />} action={claim.status !== "paid" && <Button size="xs" variant="outline" fontSize="13px" onClick={() => setOpen(true)}><LuPencil size={12} /> Ubah</Button>}>
                {motor ? "Bengkel & Adjuster" : "Adjuster & Penilaian"}
            </Title>
            <Line label="Jenis kerugian" value={claim.claim_type === "total_loss" ? "Total loss" : "Sebagian"} />
            {claim.coverage_label && <Line label="Item terdampak" value={claim.coverage_label} />}
            <Line label="Nilai sebenarnya saat kejadian" value={claim.value_at_risk ? fmtIDR(claim.value_at_risk) : "—"} />
            <Line label="Adjuster" value={[claim.adjuster_firm, claim.adjuster_name].filter(Boolean).join(" · ") || "—"} />
            {(claim.prelim_report_date || claim.final_report_date) && <Line label="Laporan adjuster" value={`awal ${fmtDate(claim.prelim_report_date)} · akhir ${fmtDate(claim.final_report_date)}`} />}
            {claim.currency !== "IDR" && <Line label="Mata uang" value={`${claim.currency} · kurs ${claim.exchange_rate.toLocaleString("id-ID")}${claim.estimated_loss_fc ? ` · estimasi ${claim.currency} ${claim.estimated_loss_fc.toLocaleString("id-ID")}` : ""}`} />}
            {motor && (
                <>
                    <Line label="Bengkel" value={claim.workshop_name ?? "—"} />
                    <Line label="SPK" value={fmtDate(claim.spk_date)} />
                    <Line label="Risiko sendiri dibayar" value={fmtDate(claim.own_risk_paid_date)} />
                    <Line label="Status perbaikan" value={claim.repair_status ? REPAIR_STATUS_LABELS[claim.repair_status] : "—"} />
                    {claim.claim_type === "total_loss" && <Line label="Serah BPKB & kunci" value={fmtDate(claim.bpkb_handover_date)} />}
                </>
            )}
            {open && <LargeLossDialog claim={claim} motor={motor} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged() }} />}
        </Box>
    )
}

function LargeLossDialog({ claim, motor, onClose, onSaved }: { claim: ApiClaimDetail; motor: boolean; onClose: () => void; onSaved: () => void }) {
    const s = (v: unknown) => (v === null || v === undefined ? "" : String(v))
    const [f, setF] = useState({
        claim_type: claim.claim_type, value_at_risk: s(claim.value_at_risk), salvage_amount: s(claim.salvage_amount || ""),
        adjuster_firm: s(claim.adjuster_firm), adjuster_name: s(claim.adjuster_name), adjuster_appointed_date: s(claim.adjuster_appointed_date),
        prelim_report_date: s(claim.prelim_report_date), final_report_date: s(claim.final_report_date),
        workshop_name: s(claim.workshop_name), spk_date: s(claim.spk_date), own_risk_paid_date: s(claim.own_risk_paid_date),
        repair_status: s(claim.repair_status), vehicle_handover_date: s(claim.vehicle_handover_date), bpkb_handover_date: s(claim.bpkb_handover_date),
        notice_deadline: s(claim.notice_deadline), docs_deadline: s(claim.docs_deadline), decision_due: s(claim.decision_due), payment_due: s(claim.payment_due),
        currency: claim.currency || "IDR", exchange_rate: claim.currency !== "IDR" ? s(claim.exchange_rate) : "", estimated_loss_fc: s(claim.estimated_loss_fc),
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
    const date = (k: keyof typeof f, label: string) => <FormField label={label}><Input {...CLAIM_INPUT} type="date" value={f[k]} onChange={(e) => set({ [k]: e.target.value })} /></FormField>
    const plusDays = (base: string, n: number) => { const d = new Date((base || localISODate()) + "T00:00:00"); d.setDate(d.getDate() + n); return localISODate(d) }

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        const body: ClaimExtraFields = {
            claim_type: f.claim_type, value_at_risk: f.value_at_risk ? Number(f.value_at_risk) : null, salvage_amount: Number(f.salvage_amount || 0),
            adjuster_firm: f.adjuster_firm.trim() || null, adjuster_name: f.adjuster_name.trim() || null,
            adjuster_appointed_date: f.adjuster_appointed_date || null, prelim_report_date: f.prelim_report_date || null, final_report_date: f.final_report_date || null,
            notice_deadline: f.notice_deadline || null, docs_deadline: f.docs_deadline || null, decision_due: f.decision_due || null, payment_due: f.payment_due || null,
            currency: f.currency, ...(f.currency !== "IDR" ? { exchange_rate: Number(f.exchange_rate.replace(",", ".")) || undefined, estimated_loss_fc: f.estimated_loss_fc ? Number(f.estimated_loss_fc) : null } : {}),
            ...(motor ? {
                workshop_name: f.workshop_name.trim() || null, spk_date: f.spk_date || null, own_risk_paid_date: f.own_risk_paid_date || null,
                repair_status: (f.repair_status || null) as RepairStatus | null, vehicle_handover_date: f.vehicle_handover_date || null, bpkb_handover_date: f.bpkb_handover_date || null,
            } : {}),
        }
        setSaving(true); setError(null)
        try { await updateClaim(token, claim.claim_id, body); onSaved() }
        catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }

    return (
        <FormDialog title="Data klaim besar" size="620px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Jenis kerugian"><SearchSelect value={f.claim_type} onChange={(v) => set({ claim_type: v as typeof f.claim_type })} options={[{ value: "partial", label: "Sebagian" }, { value: "total_loss", label: "Total loss" }]} /></FormField>
                <FormField label="Nilai sebenarnya saat kejadian (Rp)" hint="Untuk menghitung average / underinsurance"><MoneyInput value={f.value_at_risk} onChange={(v) => set({ value_at_risk: v })} /></FormField>
            </FormRow>
            <FormField label="Salvage diambil tertanggung (Rp)" hint="Dikurangkan dari ganti rugi"><MoneyInput value={f.salvage_amount} onChange={(v) => set({ salvage_amount: v })} /></FormField>
            <FormRow>
                <FormField label="Mata uang kerugian"><SearchSelect value={f.currency} onChange={(v) => set({ currency: v || "IDR" })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></FormField>
                {f.currency !== "IDR" ? (
                    <FormRow>
                        <FormField label="Kurs (Rp)"><Input {...CLAIM_INPUT} inputMode="decimal" value={f.exchange_rate} onChange={(e) => set({ exchange_rate: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
                        <FormField label={`Estimasi (${f.currency})`}><Input {...CLAIM_INPUT} inputMode="decimal" value={f.estimated_loss_fc} onChange={(e) => set({ estimated_loss_fc: e.target.value.replace(/[^\d.]/g, "") })} /></FormField>
                    </FormRow>
                ) : <Box />}
            </FormRow>
            <FormRow>
                <FormField label="Perusahaan adjuster"><Input {...CLAIM_INPUT} maxLength={150} value={f.adjuster_firm} onChange={(e) => set({ adjuster_firm: e.target.value })} /></FormField>
                <FormField label="Nama adjuster"><Input {...CLAIM_INPUT} maxLength={150} value={f.adjuster_name} onChange={(e) => set({ adjuster_name: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>{date("adjuster_appointed_date", "Adjuster ditunjuk")}{date("prelim_report_date", "Laporan awal")}</FormRow>
            <FormRow>{date("final_report_date", "Laporan akhir")}<Box /></FormRow>
            {motor && (
                <>
                    <FormRow>
                        <FormField label="Bengkel"><Input {...CLAIM_INPUT} maxLength={150} value={f.workshop_name} onChange={(e) => set({ workshop_name: e.target.value })} /></FormField>
                        <FormField label="Status perbaikan"><SearchSelect value={f.repair_status} onChange={(v) => set({ repair_status: v })} clearable placeholder="Pilih"
                            options={(Object.entries(REPAIR_STATUS_LABELS) as [RepairStatus, string][]).map(([value, label]) => ({ value, label }))} /></FormField>
                    </FormRow>
                    <FormRow>{date("spk_date", "SPK terbit")}{date("own_risk_paid_date", "Risiko sendiri dibayar")}</FormRow>
                    <FormRow>{date("vehicle_handover_date", "Kendaraan diserahkan")}{f.claim_type === "total_loss" ? date("bpkb_handover_date", "BPKB & kunci diserahkan") : <Box />}</FormRow>
                </>
            )}
            <FormRow>
                <FormField label="Batas lapor ke penanggung" hint="Sesuai wording polis">
                    <Input {...CLAIM_INPUT} type="date" value={f.notice_deadline} onChange={(e) => set({ notice_deadline: e.target.value })} />
                    <Flex gap="4px" mt="4px">{[3, 5, 7, 14].map((n) => <Button key={n} size="2xs" variant="outline" onClick={() => set({ notice_deadline: plusDays(claim.date_of_loss, n) })}>+{n}h</Button>)}</Flex>
                </FormField>
                {date("docs_deadline", "Batas dokumen lengkap")}
            </FormRow>
            <FormRow>{date("decision_due", "Batas keputusan penanggung")}{date("payment_due", "Batas pembayaran")}</FormRow>
        </FormDialog>
    )
}
