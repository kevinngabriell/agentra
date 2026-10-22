"use client"

import { useState, type ReactNode } from "react"
import { Button, Dialog, Flex, Input, Text, Textarea } from "@chakra-ui/react"
import { SearchSelect } from "@/components/ui/search-select"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    CLAIM_CHANNEL_LABELS, CLAIM_STATUS_LABELS, CLAIM_TRANSITIONS, addClaimEvent, changeClaimStatus, updateClaim,
    type ApiClaim, type ApiClaimFollowUpChannel, type ApiClaimStatus, type ChangeClaimStatusPayload, type UpdateClaimPayload,
} from "@/lib/api/claims"
import { fmtIDR, localISODate } from "@/lib/format"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput, Required } from "./fields"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

function Shell({ title, subtitle, saving, error, submitLabel, onClose, onSubmit, children }: {
    title: string; subtitle?: string; saving: boolean; error: string | null; submitLabel: string
    onClose: () => void; onSubmit: () => void; children: ReactNode
}) {
    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="480px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Flex flexDir="column" gap="2px">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{title}</Dialog.Title>
                            {subtitle && <Text color="#64748B" fontSize="14px">{subtitle}</Text>}
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="14px">
                            {children}
                            {error && <Text fontSize="14px" color="#DC2626">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                            _hover={{ bg: "#F1F5F9" }} disabled={saving} onClick={onClose}>Batal</Button>
                        <Button flex="1" bg="#1A3557" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#162C47" }}
                            loading={saving} loadingText="Menyimpan..." onClick={onSubmit}>{submitLabel}</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="4px">
            <Text {...CLAIM_LABEL}>{label} {required && <Required />}</Text>
            {children}
        </Flex>
    )
}

/** Runs `action` with the token, then closes; shared save/err handling for the three dialogs. */
function useSubmit(onClose: () => void) {
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState<string | null>(null)
    async function run(fallback: string, action: (token: string) => Promise<unknown>) {
        const token = getAccessToken()
        if (!token) return
        setSaving(true)
        setError(null)
        try {
            await action(token)
            onClose()
        } catch (err) {
            setError(errorMessage(err, fallback))
        } finally {
            setSaving(false)
        }
    }
    return { saving, error, setError, run }
}

// ── Status change ─────────────────────────────────────────────────────────────

export function ClaimStatusDialog({ claim, missingDocs, onClose, onChanged }: {
    claim: ApiClaim; missingDocs: number; onClose: () => void; onChanged: () => void
}) {
    const targets = CLAIM_TRANSITIONS[claim.status]
    const today = localISODate()
    const [target, setTarget] = useState<ApiClaimStatus>(targets[0])
    const [note, setNote]     = useState("")
    const [surveyor, setSurveyor]     = useState(claim.surveyor_name ?? "")
    const [surveyDate, setSurveyDate] = useState(claim.survey_date ?? today)
    const [approved, setApproved]     = useState(String(claim.approved_amount ?? claim.estimated_loss ?? ""))
    const [deductible, setDeductible] = useState(String(claim.deductible || ""))
    const [reason, setReason]         = useState("")
    const [settlement, setSettlement] = useState(String(Math.max(0, (claim.approved_amount ?? 0) - claim.deductible) || ""))
    const [paymentDate, setPaymentDate] = useState(today)
    const { saving, error, setError, run } = useSubmit(onClose)

    function submit() {
        const payload: ChangeClaimStatusPayload = { status: target, note: note.trim() || undefined }
        if (target === "survey") {
            payload.surveyor_name = surveyor.trim() || undefined
            payload.survey_date = surveyDate || undefined
        } else if (target === "approved") {
            if (!Number(approved)) { setError("Jumlah disetujui wajib diisi."); return }
            payload.approved_amount = Number(approved)
            payload.deductible = deductible ? Number(deductible) : 0
        } else if (target === "rejected") {
            if (!reason.trim()) { setError("Alasan penolakan wajib diisi."); return }
            payload.rejection_reason = reason.trim()
        } else if (target === "paid") {
            if (!settlement) { setError("Jumlah dibayar wajib diisi."); return }
            if (claim.approved_amount !== null && Number(settlement) > claim.approved_amount) {
                setError(`Jumlah dibayar tidak boleh melebihi jumlah disetujui (${fmtIDR(claim.approved_amount)}).`); return
            }
            if (!paymentDate) { setError("Tanggal pembayaran wajib diisi."); return }
            payload.settlement_amount = Number(settlement)
            payload.payment_date = paymentDate
        }
        run("Gagal mengubah status klaim", async (token) => { await changeClaimStatus(token, claim.claim_id, payload); onChanged() })
    }

    return (
        <Shell title="Ubah Status Klaim" subtitle={`${claim.claim_number} · saat ini ${CLAIM_STATUS_LABELS[claim.status]}`}
            saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <Field label="Status Baru" required>
                <SearchSelect value={target} onChange={(v) => { if (v) { setTarget(v as ApiClaimStatus); setError(null) } }}
                    options={targets.map((s) => ({ value: s, label: CLAIM_STATUS_LABELS[s] }))} ariaLabel="Status baru" />
            </Field>

            {target === "survey" && (
                <>
                    <Field label="Surveyor / Loss Adjuster">
                        <Input {...CLAIM_INPUT} maxLength={150} value={surveyor} onChange={(e) => setSurveyor(e.target.value)} />
                    </Field>
                    <Field label="Tanggal Survei">
                        <Input {...CLAIM_INPUT} type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
                    </Field>
                </>
            )}

            {target === "documents_complete" && missingDocs > 0 && (
                <Text fontSize="14px" color="#92400E" bg="#FFFBEB" border="1px solid #FDE68A" borderRadius="8px" px="12px" py="8px">
                    Masih ada {missingDocs} dokumen wajib yang belum diunggah di checklist. Lanjutkan hanya jika dokumen sudah diserahkan ke asuransi.
                </Text>
            )}

            {target === "approved" && (
                <>
                    <Field label="Jumlah Disetujui (Rp)" required>
                        <MoneyInput value={approved} onChange={setApproved} aria-label="Jumlah disetujui" />
                    </Field>
                    <Field label="Risiko Sendiri / Deductible (Rp)">
                        <MoneyInput value={deductible} onChange={setDeductible} aria-label="Risiko sendiri" />
                    </Field>
                </>
            )}

            {target === "rejected" && (
                <Field label="Alasan Penolakan" required>
                    <Textarea {...CLAIM_INPUT} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
            )}

            {target === "paid" && (
                <>
                    <Field label="Jumlah Dibayar Asuransi (Rp)" required>
                        <MoneyInput value={settlement} onChange={setSettlement} aria-label="Jumlah dibayar" />
                        <Text color="#64748B" fontSize="14px">
                            Disetujui {fmtIDR(claim.approved_amount ?? 0)} − risiko sendiri {fmtIDR(claim.deductible)} = {fmtIDR(Math.max(0, (claim.approved_amount ?? 0) - claim.deductible))}
                        </Text>
                    </Field>
                    <Field label="Tanggal Pembayaran" required>
                        <Input {...CLAIM_INPUT} type="date" min={claim.date_of_loss} max={today} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </Field>
                </>
            )}

            <Field label="Catatan">
                <Textarea {...CLAIM_INPUT} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
        </Shell>
    )
}

// ── Follow-up / note ──────────────────────────────────────────────────────────

const CHANNEL_OPTIONS = (Object.entries(CLAIM_CHANNEL_LABELS) as [ApiClaimFollowUpChannel, string][]).map(([value, label]) => ({ value, label }))

export function ClaimFollowUpDialog({ claim, onClose, onChanged }: { claim: ApiClaim; onClose: () => void; onChanged: () => void }) {
    const today = localISODate()
    const [kind, setKind]       = useState<"followup" | "note">("followup")
    const [channel, setChannel] = useState<ApiClaimFollowUpChannel>("whatsapp")
    const [date, setDate]       = useState(today)
    const [text, setText]       = useState("")
    const { saving, error, setError, run } = useSubmit(onClose)

    function submit() {
        if (!text.trim()) { setError("Isi catatan wajib diisi."); return }
        run("Gagal menyimpan follow-up", async (token) => {
            await addClaimEvent(token, claim.claim_id, {
                event_type: kind, description: text.trim(),
                channel: kind === "followup" ? channel : undefined, event_date: date,
            })
            onChanged()
        })
    }

    return (
        <Shell title="Catat Hubungan dengan Nasabah" subtitle={claim.claim_number} saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <Field label="Jenis">
                <SearchSelect value={kind} onChange={(v) => v && setKind(v as "followup" | "note")} ariaLabel="Jenis catatan"
                    options={[{ value: "followup", label: "Hubungi Lagi" }, { value: "note", label: "Catatan internal" }]} />
            </Field>
            {kind === "followup" && (
                <Field label="Melalui">
                    <SearchSelect value={channel} onChange={(v) => v && setChannel(v as ApiClaimFollowUpChannel)} options={CHANNEL_OPTIONS} ariaLabel="Saluran follow-up" />
                </Field>
            )}
            <Field label="Tanggal">
                <Input {...CLAIM_INPUT} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Catatan" required>
                <Textarea {...CLAIM_INPUT} rows={3} maxLength={2000} placeholder="Contoh: Menghubungi surveyor, survei dijadwalkan Jumat."
                    value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
        </Shell>
    )
}

// ── Edit details ──────────────────────────────────────────────────────────────

export function ClaimEditDialog({ claim, onClose, onChanged }: { claim: ApiClaim; onClose: () => void; onChanged: () => void }) {
    const today = localISODate()
    const [dateOfLoss, setDateOfLoss] = useState(claim.date_of_loss)
    const [cause, setCause]       = useState(claim.cause)
    const [location, setLocation] = useState(claim.loss_location ?? "")
    const [description, setDescription] = useState(claim.description ?? "")
    const [estimated, setEstimated]   = useState(String(claim.estimated_loss || ""))
    const [deductible, setDeductible] = useState(String(claim.deductible || ""))
    const [approved, setApproved]     = useState(String(claim.approved_amount ?? ""))
    const [insurerRef, setInsurerRef] = useState(claim.insurer_claim_number ?? "")
    const [surveyor, setSurveyor]     = useState(claim.surveyor_name ?? "")
    const [surveyDate, setSurveyDate] = useState(claim.survey_date ?? "")
    const { saving, error, setError, run } = useSubmit(onClose)

    function submit() {
        if (!cause.trim()) { setError("Penyebab kerugian wajib diisi."); return }
        if (dateOfLoss < claim.coverage_start || dateOfLoss > claim.coverage_end) {
            setError(`Tanggal kejadian harus dalam masa pertanggungan (${claim.coverage_start} s/d ${claim.coverage_end}).`); return
        }
        const payload: UpdateClaimPayload = {
            date_of_loss: dateOfLoss, cause: cause.trim(), loss_location: location.trim(), description: description.trim(),
            estimated_loss: Number(estimated || 0), deductible: Number(deductible || 0),
            insurer_claim_number: insurerRef.trim(), surveyor_name: surveyor.trim(), survey_date: surveyDate || null,
        }
        if (claim.status === "approved" && approved) payload.approved_amount = Number(approved)
        run("Gagal menyimpan perubahan", async (token) => { await updateClaim(token, claim.claim_id, payload); onChanged() })
    }

    return (
        <Shell title="Ubah Data Klaim" subtitle={claim.claim_number} saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <Field label="Tanggal Kejadian" required>
                <Input {...CLAIM_INPUT} type="date" min={claim.coverage_start} max={claim.coverage_end < today ? claim.coverage_end : today}
                    value={dateOfLoss} onChange={(e) => setDateOfLoss(e.target.value)} />
            </Field>
            <Field label="Penyebab Kerugian" required>
                <Input {...CLAIM_INPUT} maxLength={200} value={cause} onChange={(e) => setCause(e.target.value)} />
            </Field>
            <Field label="Lokasi Kejadian">
                <Input {...CLAIM_INPUT} maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="Kronologi">
                <Textarea {...CLAIM_INPUT} rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Flex gap="12px" flexWrap="wrap">
                <Flex flex="1" minW="150px"><Field label="Estimasi Kerugian (Rp)"><MoneyInput value={estimated} onChange={setEstimated} /></Field></Flex>
                <Flex flex="1" minW="150px"><Field label="Risiko Sendiri (Rp)"><MoneyInput value={deductible} onChange={setDeductible} /></Field></Flex>
            </Flex>
            {claim.status === "approved" && (
                <Field label="Jumlah Disetujui (Rp)"><MoneyInput value={approved} onChange={setApproved} /></Field>
            )}
            <Field label="No. Klaim Asuransi">
                <Input {...CLAIM_INPUT} maxLength={100} value={insurerRef} onChange={(e) => setInsurerRef(e.target.value)} />
            </Field>
            <Flex gap="12px" flexWrap="wrap">
                <Flex flex="1" minW="150px"><Field label="Surveyor"><Input {...CLAIM_INPUT} maxLength={150} value={surveyor} onChange={(e) => setSurveyor(e.target.value)} /></Field></Flex>
                <Flex flex="1" minW="150px"><Field label="Tanggal Survei"><Input {...CLAIM_INPUT} type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} /></Field></Flex>
            </Flex>
        </Shell>
    )
}
