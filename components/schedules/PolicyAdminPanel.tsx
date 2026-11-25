"use client"

import { useState } from "react"
import { Badge, Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react"
import { LuGlobe, LuPencil } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import { CURRENCIES, fmtMoneyFC, updatePolicyAdmin, type Currency } from "@/lib/api/schedules"
import type { ApiPolicyDetail } from "@/lib/api/policies"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT } from "@/components/claims/fields"

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v))

/** "Mata Uang, Covernote & Pengingat": fields of a policy that change no premium. */
export function PolicyAdminPanel({ policy, onChanged }: { policy: ApiPolicyDetail; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    const currency = (policy.currency ?? "IDR") as Currency
    const rate = num(policy.exchange_rate) ?? 1
    const siFc = num(policy.sum_insured_fc)
    const premFc = num(policy.premium_fc)
    const today = localISODate()
    const covernoteOpen = !!policy.covernote_expiry && !policy.policy_doc_received_date
    const covernoteLate = covernoteOpen && (policy.covernote_expiry ?? "") < today

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="16px">
                <Flex align="center" gap="8px">
                    <LuGlobe size={16} color="#0D1B3E" />
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Mata Uang, Covernote & Pengingat</Text>
                </Flex>
                <Button size="xs" variant="outline" fontSize="14px" onClick={() => setOpen(true)}><LuPencil size={12} /> Ubah</Button>
            </Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="14px" fontSize="15px">
                <Box>
                    <Text fontSize="14px" color="#64748B">MATA UANG POLIS</Text>
                    <Text fontWeight="semibold" color="#1C2833">{currency}{currency !== "IDR" && ` · kurs ${rate.toLocaleString("id-ID")}`}</Text>
                    {currency !== "IDR" && (
                        <Text color="#64748B" fontSize="14px">
                            {siFc !== null && `TSI ${fmtMoneyFC(siFc, currency)} `}{premFc !== null && `· premi ${fmtMoneyFC(premFc, currency)}`}
                            <br />Nilai rupiah di aplikasi memakai kurs ini.
                        </Text>
                    )}
                </Box>
                <Box>
                    <Text fontSize="14px" color="#64748B">COVERNOTE</Text>
                    {policy.covernote_number || policy.covernote_expiry ? (
                        <>
                            <Text fontWeight="semibold" color="#1C2833">{policy.covernote_number ?? "—"}</Text>
                            <Text color="#64748B" fontSize="14px">Berlaku s/d {fmtDate(policy.covernote_expiry)}</Text>
                            {covernoteOpen && <Badge mt="4px" fontSize="14px" bg={covernoteLate ? "#FEE2E2" : "#FEF3C7"} color={covernoteLate ? "#B91C1C" : "#B45309"}>
                                {covernoteLate ? "Covernote habis, polis belum diterima" : "Polis belum diterima"}</Badge>}
                        </>
                    ) : <Text color="#64748B">Tidak ada</Text>}
                    {policy.policy_doc_received_date && <Text color="#16A34A" fontSize="14px">Polis diterima {fmtDate(policy.policy_doc_received_date)}</Text>}
                </Box>
                <Box>
                    <Text fontSize="14px" color="#64748B">PENGINGAT PERPANJANGAN</Text>
                    <Text fontWeight="semibold" color="#1C2833">{policy.renewal_lead_days ? `${policy.renewal_lead_days} hari sebelum berakhir` : "Ikuti pengaturan umum"}</Text>
                    <Text color="#64748B" fontSize="14px">Risiko besar perlu minta terms 60–90 hari sebelumnya (survei, reasuransi).</Text>
                </Box>
            </Grid>
            {open && <AdminDialog policy={policy} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged() }} />}
        </Box>
    )
}

function AdminDialog({ policy, onClose, onSaved }: { policy: ApiPolicyDetail; onClose: () => void; onSaved: () => void }) {
    const s = (v: unknown) => (v === null || v === undefined ? "" : String(v))
    const [f, setF] = useState({
        currency: (policy.currency ?? "IDR") as Currency, rate: s(policy.exchange_rate === "1.000000" ? "" : policy.exchange_rate),
        siFc: s(policy.sum_insured_fc), premFc: s(policy.premium_fc),
        cnNumber: s(policy.covernote_number), cnDate: s(policy.covernote_date), cnExpiry: s(policy.covernote_expiry),
        received: s(policy.policy_doc_received_date), lead: s(policy.renewal_lead_days),
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }))
    const foreign = f.currency !== "IDR"
    const rateN = Number(f.rate.replace(",", "."))

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (foreign && !(rateN > 0)) { setError("Isi kurs ke rupiah"); return }
        setSaving(true); setError(null)
        try {
            await updatePolicyAdmin(token, policy.policy_id, {
                currency: f.currency, ...(foreign ? { exchange_rate: rateN, sum_insured_fc: f.siFc ? Number(f.siFc) : null, premium_fc: f.premFc ? Number(f.premFc) : null } : {}),
                covernote_number: f.cnNumber.trim() || null, covernote_date: f.cnDate || null, covernote_expiry: f.cnExpiry || null,
                policy_doc_received_date: f.received || null, renewal_lead_days: f.lead ? Number(f.lead) : null,
            })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }

    return (
        <FormDialog title="Mata uang, covernote & pengingat" size="560px" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Mata uang polis">
                    <SearchSelect value={f.currency} onChange={(v) => set({ currency: v as Currency })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
                </FormField>
                {foreign && <FormField label={`Kurs 1 ${f.currency} (Rp)`}><Input {...CLAIM_INPUT} inputMode="decimal" value={f.rate} onChange={(e) => set({ rate: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>}
            </FormRow>
            {foreign && (
                <FormRow>
                    <FormField label={`TSI (${f.currency})`} hint={rateN > 0 && f.siFc ? `≈ ${fmtIDR(Number(f.siFc) * rateN)}` : undefined}>
                        <Input {...CLAIM_INPUT} inputMode="decimal" value={f.siFc} onChange={(e) => set({ siFc: e.target.value.replace(/[^\d.]/g, "") })} />
                    </FormField>
                    <FormField label={`Premi (${f.currency})`} hint={rateN > 0 && f.premFc ? `≈ ${fmtIDR(Number(f.premFc) * rateN)}` : undefined}>
                        <Input {...CLAIM_INPUT} inputMode="decimal" value={f.premFc} onChange={(e) => set({ premFc: e.target.value.replace(/[^\d.]/g, "") })} />
                    </FormField>
                </FormRow>
            )}
            <FormRow>
                <FormField label="No. covernote"><Input {...CLAIM_INPUT} maxLength={60} value={f.cnNumber} onChange={(e) => set({ cnNumber: e.target.value })} /></FormField>
                <FormField label="Tanggal covernote"><Input {...CLAIM_INPUT} type="date" value={f.cnDate} onChange={(e) => set({ cnDate: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Covernote berlaku s/d"><Input {...CLAIM_INPUT} type="date" value={f.cnExpiry} onChange={(e) => set({ cnExpiry: e.target.value })} /></FormField>
                <FormField label="Polis asli diterima" hint="Isi agar pengingat covernote berhenti"><Input {...CLAIM_INPUT} type="date" value={f.received} onChange={(e) => set({ received: e.target.value })} /></FormField>
            </FormRow>
            <FormField label="Pengingat perpanjangan (hari sebelum berakhir)" hint="Kosongkan untuk mengikuti pengaturan umum">
                <Input {...CLAIM_INPUT} inputMode="numeric" maxLength={3} placeholder="mis. 90" value={f.lead} onChange={(e) => set({ lead: e.target.value.replace(/\D/g, "") })} />
            </FormField>
        </FormDialog>
    )
}
