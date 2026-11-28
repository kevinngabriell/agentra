"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Switch, Text } from "@chakra-ui/react"
import { LuBuilding2, LuCalendarRange, LuCheck, LuPencil, LuPlus, LuSend, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import {
    PARTY_TYPE_LABELS, clearYears, deleteParty, generateYears, getParties, getYears, saveParty, updateYear,
    type PartyType, type PolicyParty, type PolicyYear, type YearsResponse,
} from "@/lib/api/schedules"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")

function PartyDialog({ policyId, editing, onClose, onSaved }: { policyId: string; editing: PolicyParty | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({
        type: (editing?.party_type ?? "mortgagee") as PartyType, name: editing?.name ?? "", branch: editing?.branch ?? "",
        ref: editing?.reference_number ?? "", tenor: editing?.tenor_end ?? "", panel: editing?.on_insurer_panel === null || editing?.on_insurer_panel === undefined ? "" : editing.on_insurer_panel ? "yes" : "no",
        qq: editing?.qq_in_name ?? true, notify: editing?.notify_renewal ?? true, proof: editing?.proof_sent_date ?? "", notes: editing?.notes ?? "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.name.trim()) { setError("Isi nama bank / leasing"); return }
        setSaving(true); setError(null)
        try {
            await saveParty(token, policyId, editing?.party_id ?? null, {
                party_type: f.type, name: f.name.trim(), branch: f.branch.trim() || null, reference_number: f.ref.trim() || null,
                tenor_end: f.tenor || null, on_insurer_panel: f.panel === "" ? null : f.panel === "yes", qq_in_name: f.qq, notify_renewal: f.notify,
                proof_sent_date: f.proof || null, notes: f.notes.trim() || null,
            })
            onSaved()
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title={editing ? `Ubah ${editing.name}` : "Tambah bank / leasing / loss payee"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Jenis"><SearchSelect value={f.type} onChange={(v) => set({ type: v as PartyType })} options={(Object.entries(PARTY_TYPE_LABELS) as [PartyType, string][]).map(([value, label]) => ({ value, label }))} /></FormField>
                <FormField label="Nama"><Input {...CLAIM_INPUT} maxLength={200} placeholder="Mis: Bank BTN" value={f.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Cabang"><Input {...CLAIM_INPUT} maxLength={150} value={f.branch} onChange={(e) => set({ branch: e.target.value })} /></FormField>
                <FormField label="No. kredit / kontrak"><Input {...CLAIM_INPUT} maxLength={100} value={f.ref} onChange={(e) => set({ ref: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Akhir tenor"><Input {...CLAIM_INPUT} type="date" value={f.tenor} onChange={(e) => set({ tenor: e.target.value })} /></FormField>
                <FormField label="Penanggung masuk panel bank?"><SearchSelect value={f.panel} onChange={(v) => set({ panel: v })} clearable placeholder="Belum dicek"
                    options={[{ value: "yes", label: "Ya, rekanan" }, { value: "no", label: "Tidak / belum rekanan" }]} /></FormField>
            </FormRow>
            <Switch.Root checked={f.qq} onCheckedChange={(e) => set({ qq: e.checked })} colorPalette="blue" size="sm">
                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">Cetak di nama tertanggung (&ldquo;{f.name || "Bank"} QQ Tertanggung&rdquo;)</Switch.Label>
            </Switch.Root>
            <Switch.Root checked={f.notify} onCheckedChange={(e) => set({ notify: e.checked })} colorPalette="blue" size="sm">
                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">Ingatkan kirim bukti perpanjangan sebelum polis berakhir</Switch.Label>
            </Switch.Root>
            <FormField label="Bukti polis terakhir dikirim"><Input {...CLAIM_INPUT} type="date" value={f.proof} onChange={(e) => set({ proof: e.target.value })} /></FormField>
        </FormDialog>
    )
}

function YearsSection({ policyId, cancelled }: { policyId: string; cancelled: boolean }) {
    const [data, setData] = useState<YearsResponse | null>(null)
    const [years, setYears] = useState("3")
    const [dep, setDep] = useState("10")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { confirm, dialog } = useConfirm()
    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getYears(token, policyId).then(setData).catch(() => setData({ items: [], total_premium: 0, unpaid_premium: 0 }))
    }, [policyId])
    useEffect(() => { load() }, [load])

    async function generate() {
        const token = getAccessToken()
        if (!token) return
        setBusy(true); setError(null)
        try { setData(await generateYears(token, policyId, Number(years) || 2, Number(dep.replace(",", ".")) || 0)) }
        catch (err) { setError(errorMessage(err, "Gagal membuat jadwal")) } finally { setBusy(false) }
    }
    async function pay(y: PolicyYear) {
        const token = getAccessToken()
        if (!token) return
        try { setData(await updateYear(token, policyId, y.year_id, { paid_date: y.is_paid ? null : localISODate() })) } catch (err) { setError(errorMessage(err, "Gagal menyimpan")) }
    }
    async function clear() {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: "Hapus jadwal multi-tahun?", message: "Tahun yang sudah dibayar tetap tersimpan.", danger: true, confirmLabel: "Hapus" }))) return
        try { setData(await clearYears(token, policyId)) } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }

    return (
        <Box mt="18px" pt="16px" borderTop="1px solid" borderColor="#E2E8F0">
            <Flex align="center" gap="8px" mb="8px"><LuCalendarRange size={15} color="#0D1B3E" /><Text fontSize="14px" fontWeight="semibold" color="#1C2833">Jadwal Multi-Tahun</Text></Flex>
            {error && <Text color="#DC2626" fontSize="13px" role="alert">{error}</Text>}
            {!data ? <Skeleton h="40px" /> : data.items.length === 0 ? (
                <Flex flexDir="column" gap="8px">
                    <Text fontSize="13px" color="#64748B">Untuk polis jangka panjang (KPR / leasing 2–5 tahun): premi per tahun dengan nilai pertanggungan yang menyusut.</Text>
                    {!cancelled && (
                        <Flex gap="8px" align="flex-end" flexWrap="wrap">
                            <FormField label="Jumlah tahun"><Input {...CLAIM_INPUT} w="110px" inputMode="numeric" maxLength={2} value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ""))} /></FormField>
                            <FormField label="Penyusutan / tahun (%)"><Input {...CLAIM_INPUT} w="150px" inputMode="decimal" maxLength={5} value={dep} onChange={(e) => setDep(e.target.value.replace(/[^\d.,]/g, ""))} /></FormField>
                            <Button size="sm" variant="outline" loading={busy} onClick={generate}>Buat jadwal</Button>
                        </Flex>
                    )}
                </Flex>
            ) : (
                <>
                    {data.items.map((y) => (
                        <Flex key={y.year_id} justify="space-between" align="center" gap="8px" py="6px" borderTop="1px dashed #E2E8F0" fontSize="13px" flexWrap="wrap">
                            <Text color="#1C2833"><Text as="span" fontWeight="semibold">Tahun {y.year_no}</Text> · {fmtDate(y.period_start)} – {fmtDate(y.period_end)}</Text>
                            <Flex gap="10px" align="center">
                                <Text color="#64748B">TSI {fmtIDR(y.sum_insured)} · premi {fmtIDR(y.premium_amount)}</Text>
                                {y.year_no === 1
                                    ? <Badge fontSize="13px" bg="#F1F5F9" color="#475569">Nota polis</Badge>
                                    : <Button size="2xs" variant={y.is_paid ? "subtle" : "outline"} fontSize="13px" disabled={cancelled} onClick={() => pay(y)}>
                                        {y.is_paid ? <><LuCheck size={12} /> Dibayar {fmtDate(y.paid_date)}</> : "Tandai dibayar"}</Button>}
                            </Flex>
                        </Flex>
                    ))}
                    <Flex justify="space-between" mt="6px" fontSize="13px">
                        <Text color="#0D1B3E" fontWeight="semibold">Total {fmtIDR(data.total_premium)} · belum dibayar {fmtIDR(data.unpaid_premium)}</Text>
                        {!cancelled && <Button size="2xs" variant="ghost" color="#DC2626" fontSize="13px" onClick={clear}>Hapus jadwal</Button>}
                    </Flex>
                </>
            )}
            {dialog}
        </Box>
    )
}

/** "Bank, Leasing & Multi-Tahun": interested parties (printed as QQ, renewal proof tracking) and the long-term schedule. */
export function PartiesPanel({ policyId, cancelled, onChanged }: { policyId: string; cancelled: boolean; onChanged?: () => void }) {
    const [data, setData] = useState<{ items: PolicyParty[]; qq_name: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<{ editing: PolicyParty | null } | null>(null)
    const { confirm, dialog: confirmDialog } = useConfirm()
    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getParties(token, policyId).then(setData).catch((err) => setError(errorMessage(err, "Data bank / leasing belum bisa dimuat.")))
    }, [policyId])
    useEffect(() => { load() }, [load])
    const saved = () => { setDialog(null); load(); onChanged?.() }

    async function markSent(p: PolicyParty) {
        const token = getAccessToken()
        if (!token) return
        try { await saveParty(token, policyId, p.party_id, { proof_sent_date: localISODate() }); saved() } catch (err) { setError(errorMessage(err, "Gagal menyimpan")) }
    }
    async function remove(p: PolicyParty) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: `Hapus ${p.name}?`, danger: true, confirmLabel: "Hapus" }))) return
        try { await deleteParty(token, policyId, p.party_id); saved() } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="12px" gap="8px">
                <Flex align="center" gap="8px"><LuBuilding2 size={16} color="#0D1B3E" /><Text color="#1C2833" fontSize="15px" fontWeight="semibold">Bank, Leasing & Multi-Tahun</Text></Flex>
                {!cancelled && <Button size="xs" variant="outline" fontSize="13px" onClick={() => setDialog({ editing: null })}><LuPlus size={12} /> Tambah Pihak</Button>}
            </Flex>
            {error && <Text color="#DC2626" fontSize="13px" mb="8px" role="alert">{error}</Text>}
            {!data ? <Skeleton h="40px" /> : (
                <>
                    {data.items.length === 0
                        ? <Text color="#64748B" fontSize="14px">Tidak ada bank / leasing. Polis KPR dan kendaraan kredit perlu dicatat agar bukti perpanjangan terkirim sebelum bank menutup asuransi sendiri.</Text>
                        : <Text fontSize="13px" color="#64748B" mb="6px">Nama di polis / invoice: <Text as="span" color="#1C2833" fontWeight="semibold">{data.qq_name}</Text></Text>}
                    {data.items.map((p) => (
                        <Flex key={p.party_id} justify="space-between" gap="10px" py="8px" borderTop="1px solid #E2E8F0">
                            <Box minW="0">
                                <Flex gap="6px" align="center" flexWrap="wrap">
                                    <Text fontWeight="semibold" fontSize="14px" color="#1C2833">{p.name}</Text>
                                    <Badge fontSize="13px" bg="#EDE9FE" color="#6D28D9">{p.party_type_label}</Badge>
                                    {p.on_insurer_panel === false && <Badge fontSize="13px" bg="#FEE2E2" color="#B91C1C">Penanggung bukan rekanan</Badge>}
                                </Flex>
                                <Text fontSize="13px" color="#64748B">{[p.branch, p.reference_number && `No. ${p.reference_number}`, p.tenor_end && `tenor s/d ${fmtDate(p.tenor_end)}`].filter(Boolean).join(" · ")}</Text>
                                <Text fontSize="13px" color={p.proof_sent_date ? "#16A34A" : "#B45309"}>{p.proof_sent_date ? `Bukti polis dikirim ${fmtDate(p.proof_sent_date)}` : "Bukti polis belum dikirim"}</Text>
                            </Box>
                            {!cancelled && (
                                <Flex flexShrink={0}>
                                    <IconButton size="2xs" variant="ghost" aria-label="Tandai bukti dikirim hari ini" title="Tandai bukti dikirim hari ini" onClick={() => markSent(p)}><LuSend size={13} /></IconButton>
                                    <IconButton size="2xs" variant="ghost" aria-label="Ubah" onClick={() => setDialog({ editing: p })}><LuPencil size={13} /></IconButton>
                                    <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus" onClick={() => remove(p)}><LuTrash2 size={13} /></IconButton>
                                </Flex>
                            )}
                        </Flex>
                    ))}
                </>
            )}
            <YearsSection policyId={policyId} cancelled={cancelled} />
            {dialog && <PartyDialog policyId={policyId} editing={dialog.editing} onClose={() => setDialog(null)} onSaved={saved} />}
            {confirmDialog}
        </Box>
    )
}
