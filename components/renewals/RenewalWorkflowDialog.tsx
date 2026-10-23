"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Checkbox, Dialog, Flex, Input, Skeleton, Table, Text, Textarea } from "@chakra-ui/react"
import { LuCheck, LuFileUp } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    RENEWAL_LOST_REASON_LABELS, RENEWAL_STAGE_FLOW, RENEWAL_STAGE_LABELS, changeRenewalStage, getRenewalWorkflow, updateRenewalWorkflow,
    type RenewalStage, type RenewalWorkflow,
} from "@/lib/api/renewals"
import type { RenewPolicyResult } from "@/lib/api/policies"
import { fmtIDR } from "@/lib/format"
import { UploadDocumentDialog } from "@/components/documents"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { RenewalStageBadge } from "./RenewalStageBadge"
import { DeclineRenewalDialog } from "./DeclineRenewalDialog"
import { IssueRenewalDialog } from "./IssueRenewalDialog"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"
import { OpenOnMount } from "@/components/ui/open-on-mount"

const REVIEW_HINT = {
    vehicle_depreciation: "Nilai kendaraan turun setiap tahun. Cek nilai pasar saat ini dan sesuaikan nilai pertanggungan sebelum menawarkan.",
    property_values: "Nilai bangunan, isi dan stok berubah. Tanyakan apakah ada renovasi atau tambahan aset, lalu sesuaikan nilai pertanggungan.",
} as const

const NEXT_LABELS: Partial<Record<RenewalStage, string>> = {
    terms_requested: "Minta ketentuan ke asuransi",
    terms_received:  "Ketentuan diterima",
    offered:         "Tandai sudah ditawarkan",
    accepted:        "Nasabah setuju",
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function Delta({ before, after, rate = false }: { before: number; after: number | null; rate?: boolean }) {
    if (after === null || after === before) return <Text color="#64748B" fontSize="16px">—</Text>
    const diff = after - before
    const pct = before > 0 && !rate ? ` (${diff > 0 ? "+" : ""}${((diff / before) * 100).toFixed(1)}%)` : ""
    const text = rate ? `${diff > 0 ? "+" : ""}${diff.toFixed(2)} poin` : `${diff > 0 ? "+" : "−"}${fmtIDR(Math.abs(diff))}${pct}`
    return <Text fontSize="16px" fontWeight="semibold" color={diff > 0 ? "#B45309" : "#15803D"}>{text}</Text>
}

interface Form { reference: string; sum: string; premium: string; rate: string; notes: string; reviewed: boolean; reviewNote: string }

function toForm(d: RenewalWorkflow): Form {
    const w = d.workflow
    return {
        reference: w.insurer_reference ?? "",
        sum: w.new_sum_insured !== null ? String(w.new_sum_insured) : "",
        premium: w.new_premium !== null ? String(w.new_premium) : "",
        rate: w.new_commission_rate !== null ? String(w.new_commission_rate) : "",
        notes: w.new_terms_notes ?? "",
        reviewed: w.sum_insured_reviewed,
        reviewNote: w.review_note ?? "",
    }
}

/**
 * The renewal quote workflow for one expiring policy: request terms from the insurer, compare old and new,
 * offer to the customer, then issue the new policy (or record why it was lost).
 */
export function RenewalWorkflowDialog({ policyId, onClose, onChanged }: {
    policyId: string
    onClose: () => void
    /** Called after every change so the list behind the dialog can refresh its row. */
    onChanged: (d: RenewalWorkflow) => void
}) {
    const router = useRouter()
    const [data, setData]       = useState<RenewalWorkflow | null>(null)
    const [form, setForm]       = useState<Form | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [busy, setBusy]       = useState(false)
    const [error, setError]     = useState<string | null>(null)
    const [declining, setDeclining] = useState(false)
    const [issuing, setIssuing] = useState(false)
    const [issued, setIssued]   = useState<RenewPolicyResult | null>(null)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getRenewalWorkflow(token, policyId)
            .then((d) => { if (!cancelled) { setData(d); setForm(toForm(d)) } })
            .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, "Data alur perpanjangan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [policyId])

    function apply(d: RenewalWorkflow) {
        setData(d); setForm(toForm(d)); onChanged(d)
    }

    const dirty = data && form ? JSON.stringify(form) !== JSON.stringify(toForm(data)) : false

    async function save(): Promise<RenewalWorkflow | null> {
        const token = getAccessToken()
        if (!token || !form) return null
        const digits = (s: string) => (s === "" ? null : Number(s))
        const rate = form.rate.trim() === "" ? null : Number(form.rate.replace(",", "."))
        if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 100)) { setError("Komisi harus antara 0 dan 100"); return null }
        setBusy(true); setError(null)
        try {
            const d = await updateRenewalWorkflow(token, policyId, {
                insurer_reference: form.reference.trim() || null,
                new_sum_insured: digits(form.sum),
                new_premium: digits(form.premium),
                new_commission_rate: rate,
                new_terms_notes: form.notes.trim() || null,
                sum_insured_reviewed: form.reviewed,
                review_note: form.reviewNote.trim() || null,
            })
            apply(d)
            return d
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
            return null
        } finally {
            setBusy(false)
        }
    }

    async function moveTo(stage: RenewalStage) {
        const token = getAccessToken()
        if (!token || !data) return
        if (dirty && !(await save())) return
        setBusy(true); setError(null)
        try {
            apply(await changeRenewalStage(token, policyId, { stage }))
        } catch (err) {
            setError(errorMessage(err, "Gagal mengubah tahap"))
        } finally {
            setBusy(false)
        }
    }

    const stage = data?.workflow.stage
    const open = data && !["issued"].includes(stage ?? "") && data.policy.renewal_status !== "renewed" && data.policy.renewal_status !== "cancelled"
    const editable = !!open
    const nextSteps = (data?.allowed_next ?? []).filter((s) => s !== "declined" && s !== "issued")
    const canDecline = data?.allowed_next.includes("declined")
    const reopenable = stage === "declined" && data?.allowed_next.includes("terms_requested")
    const needsReview = !!data?.review_kind && !form?.reviewed && editable

    const p = data?.policy
    const newSum = form && form.sum !== "" ? Number(form.sum) : null
    const newPremium = form && form.premium !== "" ? Number(form.premium) : null
    const newRate = form && form.rate.trim() !== "" && !Number.isNaN(Number(form.rate.replace(",", "."))) ? Number(form.rate.replace(",", ".")) : null

    const { open: shown } = useOpenOnMount()

    return (
        <>
            <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !busy) onClose() }}>
                <Dialog.Backdrop bg="rgba(0,0,0,0.4)" />
                <Dialog.Positioner>
                    <Dialog.Content bg="white" borderRadius="12px" maxW="760px" w="95vw" shadow="xl">
                        <Dialog.Header px="24px" pt="24px" pb="0" flexDir="column" alignItems="flex-start" gap="4px">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Alur Perpanjangan</Dialog.Title>
                            {p && (
                                <Text fontSize="16px" color="#64748B">
                                    {p.customer_name} · {p.policy_number} · {p.insurer_name ?? "—"} · berakhir {fmtDate(p.coverage_end)}
                                    {p.days_until_expiry >= 0 ? ` (${p.days_until_expiry} hari lagi)` : ` (lewat ${Math.abs(p.days_until_expiry)} hari)`}
                                </Text>
                            )}
                        </Dialog.Header>

                        <Dialog.Body px="24px" py="16px">
                            {loadError && <Text color="#DC2626" fontSize="16px">{loadError}</Text>}
                            {!data && !loadError && <Flex flexDir="column" gap="10px"><Skeleton h="32px" /><Skeleton h="160px" /></Flex>}

                            {data && form && p && (
                                <Flex flexDir="column" gap="18px">
                                    {/* Progress line */}
                                    <Flex gap="6px" flexWrap="wrap" align="center">
                                        {RENEWAL_STAGE_FLOW.map((s, i) => {
                                            const reached = stage ? RENEWAL_STAGE_FLOW.indexOf(stage) >= i : false
                                            const current = stage === s
                                            return (
                                                <Flex key={s} align="center" gap="6px">
                                                    <Flex align="center" gap="5px" px="10px" py="4px" borderRadius="full" fontSize="16px" fontWeight="semibold"
                                                        bg={current ? "#1A3557" : reached ? "#DCFCE7" : "#F1F5F9"} color={current ? "white" : reached ? "#15803D" : "#94A3B8"}>
                                                        {reached && !current && <LuCheck size={11} />}{RENEWAL_STAGE_LABELS[s]}
                                                    </Flex>
                                                    {i < RENEWAL_STAGE_FLOW.length - 1 && <Text color="#CBD5E1" fontSize="16px">›</Text>}
                                                </Flex>
                                            )
                                        })}
                                        {stage === "declined" && <RenewalStageBadge stage="declined" />}
                                    </Flex>

                                    {stage === "declined" && data.workflow.lost_reason && (
                                        <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="8px" p="12px">
                                            <Text fontSize="16px" color="#B91C1C" fontWeight="semibold">Perpanjangan hilang: {RENEWAL_LOST_REASON_LABELS[data.workflow.lost_reason]}</Text>
                                            {data.workflow.lost_note && <Text fontSize="16px" color="#7F1D1D" mt="2px">{data.workflow.lost_note}</Text>}
                                        </Box>
                                    )}

                                    {stage === "issued" && data.workflow.renewed_policy_id && (
                                        <Flex bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="8px" p="12px" align="center" justify="space-between" gap="8px" flexWrap="wrap">
                                            <Text fontSize="16px" color="#15803D" fontWeight="semibold">Perpanjangan sudah terbit.</Text>
                                            <Button size="xs" variant="outline" onClick={() => router.push(`/agentra/policies/${encodeURIComponent(data.workflow.renewed_policy_id!)}`)}>Buka polis baru</Button>
                                        </Flex>
                                    )}

                                    {/* Sum insured review prompt */}
                                    {data.review_kind && editable && (
                                        <Box bg={needsReview ? "#FFFBEB" : "#F8FAFC"} border="1px solid" borderColor={needsReview ? "#FDE68A" : "#E2E8F0"} borderRadius="8px" p="12px">
                                            <Text fontSize="16px" fontWeight="semibold" color={needsReview ? "#92400E" : "#475569"}>Tinjau nilai pertanggungan</Text>
                                            <Text fontSize="16px" color="#64748B" mt="2px">{REVIEW_HINT[data.review_kind]}</Text>
                                            <Checkbox.Root mt="8px" checked={form.reviewed} onCheckedChange={(d) => setForm({ ...form, reviewed: d.checked === true })}>
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control />
                                                <Checkbox.Label fontSize="16px" color="#334155">Sudah ditinjau bersama nasabah</Checkbox.Label>
                                            </Checkbox.Root>
                                            <Input {...CLAIM_INPUT} mt="8px" placeholder="Catatan tinjauan (opsional)" maxLength={500} value={form.reviewNote} onChange={(e) => setForm({ ...form, reviewNote: e.target.value })} />
                                        </Box>
                                    )}

                                    {/* Old vs new terms */}
                                    <Box border="1px solid #E2E8F0" borderRadius="8px" overflowX="auto">
                                        <Table.Root size="sm">
                                            <Table.Header>
                                                <Table.Row bg="#F8FAFC">
                                                    {["", "POLIS LAMA", "PENAWARAN BARU", "SELISIH"].map((h) => (
                                                        <Table.ColumnHeader key={h} color="#64748B" fontSize="16px" fontWeight="bold" px="12px" py="8px">{h}</Table.ColumnHeader>
                                                    ))}
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                <Table.Row>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px" color="#64748B">Nilai pertanggungan</Table.Cell>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px">{fmtIDR(p.sum_insured)}</Table.Cell>
                                                    <Table.Cell px="12px" py="8px">
                                                        <MoneyInput value={form.sum} disabled={!editable} onChange={(v) => setForm({ ...form, sum: v })} />
                                                    </Table.Cell>
                                                    <Table.Cell px="12px" py="8px"><Delta before={p.sum_insured} after={newSum} /></Table.Cell>
                                                </Table.Row>
                                                <Table.Row>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px" color="#64748B">Premi</Table.Cell>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px">{fmtIDR(p.premium_amount)}</Table.Cell>
                                                    <Table.Cell px="12px" py="8px">
                                                        <MoneyInput value={form.premium} disabled={!editable} onChange={(v) => setForm({ ...form, premium: v })} />
                                                    </Table.Cell>
                                                    <Table.Cell px="12px" py="8px"><Delta before={p.premium_amount} after={newPremium} /></Table.Cell>
                                                </Table.Row>
                                                <Table.Row>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px" color="#64748B">Komisi (%)</Table.Cell>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px">{p.commission_rate}%</Table.Cell>
                                                    <Table.Cell px="12px" py="8px">
                                                        <Input {...CLAIM_INPUT} inputMode="decimal" placeholder={String(p.commission_rate)} disabled={!editable} value={form.rate}
                                                            onChange={(e) => setForm({ ...form, rate: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })} />
                                                    </Table.Cell>
                                                    <Table.Cell px="12px" py="8px"><Delta before={p.commission_rate} after={newRate} rate /></Table.Cell>
                                                </Table.Row>
                                                <Table.Row>
                                                    <Table.Cell px="12px" py="8px" fontSize="16px" color="#64748B" verticalAlign="top">Ketentuan saat ini</Table.Cell>
                                                    <Table.Cell px="12px" py="8px" colSpan={3} fontSize="16px" color="#475569">
                                                        {p.terms.length === 0 ? "Belum ada risiko sendiri, klausula atau perluasan tercatat." : p.terms.map((t) => t.title).join(" · ")}
                                                    </Table.Cell>
                                                </Table.Row>
                                            </Table.Body>
                                        </Table.Root>
                                    </Box>
                                    {p.coverage_items > 0 && (
                                        <Text fontSize="16px" color="#64748B" mt="-8px">
                                            Polis ini punya {p.coverage_items} item pertanggungan. Saat terbit, item disalin dan premi dihitung dari item; sesuaikan item di polis baru bila ketentuan berubah.
                                        </Text>
                                    )}

                                    <Flex gap="12px" flexWrap="wrap">
                                        <Flex flexDir="column" gap="4px" flex="1" minW="200px">
                                            <Text fontSize="16px" color="#5D6D7E" fontWeight="medium">No. penawaran asuransi</Text>
                                            <Input {...CLAIM_INPUT} maxLength={100} disabled={!editable} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                                        </Flex>
                                    </Flex>
                                    <Flex flexDir="column" gap="4px">
                                        <Text fontSize="16px" color="#5D6D7E" fontWeight="medium">Perubahan ketentuan dari asuransi</Text>
                                        <Textarea fontSize="16px" rows={3} maxLength={4000} disabled={!editable}
                                            placeholder="Mis. risiko sendiri naik jadi 5%, klausula banjir ditambahkan..."
                                            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                    </Flex>

                                    {error && <Text color="#DC2626" fontSize="16px" role="alert">{error}</Text>}

                                    {/* Actions */}
                                    {(editable || reopenable) && (
                                        <Flex gap="8px" flexWrap="wrap" align="center">
                                            {editable && <Button size="sm" variant="outline" fontSize="16px" disabled={!dirty || busy} loading={busy && dirty} onClick={() => void save()}>Simpan ketentuan</Button>}
                                            {nextSteps.map((s) => (
                                                <Button key={s} size="sm" bg="#1A3557" color="white" fontSize="16px" disabled={busy} onClick={() => void moveTo(s)}>
                                                    {NEXT_LABELS[s] ?? RENEWAL_STAGE_LABELS[s]}
                                                </Button>
                                            ))}
                                            {stage === "accepted" && (
                                                <Button size="sm" bg="#16A34A" color="white" fontSize="16px" disabled={busy} onClick={() => setIssuing(true)}>Terbitkan polis baru</Button>
                                            )}
                                            {reopenable && <Button size="sm" bg="#1A3557" color="white" fontSize="16px" disabled={busy} onClick={() => void moveTo("terms_requested")}>Buka kembali</Button>}
                                            {canDecline && <Button size="sm" variant="outline" borderColor="#FCA5A5" color="#DC2626" fontSize="16px" disabled={busy} onClick={() => setDeclining(true)}>Perpanjangan hilang</Button>}
                                        </Flex>
                                    )}

                                    {/* Timeline */}
                                    {data.events.length > 0 && (
                                        <Flex flexDir="column" gap="6px">
                                            <Text fontSize="16px" fontWeight="bold" color="#64748B" letterSpacing="0.05em">RIWAYAT</Text>
                                            {data.events.map((e, i) => (
                                                <Flex key={i} gap="8px" align="baseline" fontSize="16px" color="#475569" flexWrap="wrap">
                                                    <Text color="#64748B" minW="96px">{fmtDate(e.created_at)}</Text>
                                                    <Text>{RENEWAL_STAGE_LABELS[e.from_stage]} → <b>{RENEWAL_STAGE_LABELS[e.to_stage]}</b>{e.note ? ` — ${e.note}` : ""}</Text>
                                                </Flex>
                                            ))}
                                        </Flex>
                                    )}
                                </Flex>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer px="24px" pb="24px" pt="8px">
                            <Button variant="outline" size="sm" fontSize="16px" onClick={onClose}>Tutup</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            {declining && data && (
                <DeclineRenewalDialog data={data} onClose={() => setDeclining(false)} onSaved={(d) => { setDeclining(false); apply(d) }} />
            )}
            {issuing && data && (
                <IssueRenewalDialog data={data} onClose={() => setIssuing(false)} onIssued={(r) => {
                    setIssuing(false); setIssued(r)
                    void getRenewalWorkflow(getAccessToken() ?? "", policyId).then(apply).catch(() => {})
                }} />
            )}

            {/* After issuing: the new policy document and the new expiry date */}
            {issued && !uploading && (
                <OpenOnMount>{(shown) => (
                <Dialog.Root open={shown} onOpenChange={(d) => { if (!d.open) onClose() }}>
                    <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                    <Dialog.Positioner zIndex={1501}>
                        <Dialog.Content bg="white" borderRadius="12px" maxW="440px" w="94vw" shadow="xl" p="24px">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Perpanjangan terbit</Dialog.Title>
                            <Text mt="8px" fontSize="16px" color="#475569">
                                Polis <b>{issued.policy_number}</b> berlaku {fmtDate(issued.coverage_start)} – {fmtDate(issued.coverage_end)}. Tanggal jatuh tempo berikutnya: <b>{fmtDate(issued.coverage_end)}</b>.
                            </Text>
                            <Text mt="8px" fontSize="16px" color="#64748B">Unggah dokumen polis baru dari asuransi agar tersimpan bersama polisnya.</Text>
                            <Flex mt="16px" gap="8px" flexWrap="wrap" justify="flex-end">
                                <Button size="sm" variant="outline" fontSize="16px" onClick={onClose}>Nanti</Button>
                                <Button size="sm" variant="outline" fontSize="16px" onClick={() => router.push(`/agentra/policies/${encodeURIComponent(issued.policy_id)}`)}>Buka polis</Button>
                                <Button size="sm" bg="#1A3557" color="white" fontSize="16px" gap="6px" onClick={() => setUploading(true)}><LuFileUp size={13} /> Unggah dokumen</Button>
                            </Flex>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>
                )}</OpenOnMount>
            )}
            {issued && (
                <UploadDocumentDialog open={uploading} policy={{ id: issued.policy_id, number: issued.policy_number }} defaultType="policy"
                    onClose={() => { setUploading(false); onClose() }} onUploaded={() => { setUploading(false); onClose() }} />
            )}
        </>
    )
}
