"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Switch, Text } from "@chakra-ui/react"
import { LuPencil, LuPlus, LuShieldAlert, LuShieldCheck, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import {
    RISK_RATING_LABELS, SCREENING_STATUS_LABELS, deleteBeneficialOwner, getCompliance, saveBeneficialOwner, updateCompliance,
    type BeneficialOwner, type CustomerCompliance, type RiskRating, type ScreeningStatus,
} from "@/lib/api/compliance"
import { FormDialog, FormField, FormRow } from "@/components/ui/form-dialog"
import { SearchSelect } from "@/components/ui/search-select"
import { CLAIM_INPUT } from "@/components/claims/fields"
import { useConfirm } from "@/components/ui/confirm-dialog"

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const RATING_COLOR: Record<RiskRating, [string, string]> = { low: ["#DCFCE7", "#15803D"], medium: ["#FEF3C7", "#B45309"], high: ["#FEE2E2", "#B91C1C"] }

function ScreeningDialog({ customerId, data, onClose, onSaved }: { customerId: string; data: CustomerCompliance; onClose: () => void; onSaved: (d: CustomerCompliance) => void }) {
    const [f, setF] = useState({
        rating: data.risk_rating ?? "", pep: data.is_pep, status: data.screening_status as ScreeningStatus,
        at: data.screened_at ?? localISODate(), lists: data.screening_lists ?? "DTTOT, daftar PEP", note: data.screening_note ?? "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        setSaving(true); setError(null)
        try {
            onSaved(await updateCompliance(token, customerId, {
                risk_rating: (f.rating || null) as RiskRating | null, is_pep: f.pep, screening_status: f.status,
                screened_at: f.status === "not_screened" ? null : f.at || null, screening_lists: f.lists.trim() || null, screening_note: f.note.trim() || null,
            }))
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title="Profil risiko & screening APU-PPT" saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <Text fontSize="13px" color="#64748B">Catat hasil pengecekan nama nasabah dan pemilik manfaat terhadap daftar terduga teroris (DTTOT) dan PEP. Aplikasi tidak mengecek daftar tersebut secara otomatis.</Text>
            <FormRow>
                <FormField label="Profil risiko nasabah"><SearchSelect value={f.rating} onChange={(v) => set({ rating: v })} clearable placeholder="Belum dinilai"
                    options={(Object.entries(RISK_RATING_LABELS) as [RiskRating, string][]).map(([value, label]) => ({ value, label }))} /></FormField>
                <FormField label="Hasil screening"><SearchSelect value={f.status} onChange={(v) => set({ status: v as ScreeningStatus })}
                    options={(Object.entries(SCREENING_STATUS_LABELS) as [ScreeningStatus, string][]).map(([value, label]) => ({ value, label }))} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Tanggal screening"><Input {...CLAIM_INPUT} type="date" value={f.at} onChange={(e) => set({ at: e.target.value })} /></FormField>
                <FormField label="Daftar yang dicek"><Input {...CLAIM_INPUT} maxLength={200} value={f.lists} onChange={(e) => set({ lists: e.target.value })} /></FormField>
            </FormRow>
            <Switch.Root checked={f.pep} onCheckedChange={(e) => set({ pep: e.checked })} colorPalette="red" size="sm">
                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">Nasabah adalah PEP (pejabat publik / keluarga / rekan dekat)</Switch.Label>
            </Switch.Root>
            <FormField label="Catatan"><Input {...CLAIM_INPUT} maxLength={500} value={f.note} onChange={(e) => set({ note: e.target.value })} /></FormField>
        </FormDialog>
    )
}

function OwnerDialog({ customerId, editing, onClose, onSaved }: { customerId: string; editing: BeneficialOwner | null; onClose: () => void; onSaved: (d: CustomerCompliance) => void }) {
    const [f, setF] = useState({
        name: editing?.full_name ?? "", id: editing?.id_number ?? "", nat: editing?.nationality ?? "Indonesia",
        pct: editing?.ownership_percent != null ? String(editing.ownership_percent) : "", role: editing?.role ?? "", pep: editing?.is_pep ?? false,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!f.name.trim()) { setError("Isi nama pemilik manfaat"); return }
        setSaving(true); setError(null)
        try {
            onSaved(await saveBeneficialOwner(token, customerId, editing?.owner_id ?? null, {
                full_name: f.name.trim(), id_number: f.id.trim() || null, nationality: f.nat.trim() || null,
                ownership_percent: f.pct ? Number(f.pct.replace(",", ".")) : null, role: f.role.trim() || null, is_pep: f.pep,
            }))
        } catch (err) { setError(errorMessage(err, "Gagal menyimpan")); setSaving(false) }
    }
    return (
        <FormDialog title={editing ? "Ubah pemilik manfaat" : "Tambah pemilik manfaat"} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            <FormRow>
                <FormField label="Nama lengkap"><Input {...CLAIM_INPUT} maxLength={200} value={f.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
                <FormField label="NIK / paspor"><Input {...CLAIM_INPUT} maxLength={40} value={f.id} onChange={(e) => set({ id: e.target.value })} /></FormField>
            </FormRow>
            <FormRow>
                <FormField label="Kepemilikan (%)" hint="Pemilik manfaat: ≥ 25% saham atau pengendali"><Input {...CLAIM_INPUT} inputMode="decimal" maxLength={6} value={f.pct} onChange={(e) => set({ pct: e.target.value.replace(/[^\d.,]/g, "") })} /></FormField>
                <FormField label="Jabatan / peran"><Input {...CLAIM_INPUT} maxLength={100} placeholder="Direktur Utama / pemegang saham" value={f.role} onChange={(e) => set({ role: e.target.value })} /></FormField>
            </FormRow>
            <FormField label="Kewarganegaraan"><Input {...CLAIM_INPUT} maxLength={60} value={f.nat} onChange={(e) => set({ nat: e.target.value })} /></FormField>
            <Switch.Root checked={f.pep} onCheckedChange={(e) => set({ pep: e.checked })} colorPalette="red" size="sm">
                <Switch.HiddenInput /><Switch.Control /><Switch.Label fontSize="14px">PEP</Switch.Label>
            </Switch.Root>
        </FormDialog>
    )
}

/** "Kepatuhan APU-PPT": risk rating, PEP, DTTOT / PEP screening result and beneficial owners, with the EDD flag. */
export function CompliancePanel({ customerId, isCompany }: { customerId: string; isCompany: boolean }) {
    const [data, setData] = useState<CustomerCompliance | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<null | "screening" | { owner: BeneficialOwner | null }>(null)
    const { confirm, dialog: confirmDialog } = useConfirm()
    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getCompliance(token, customerId).then(setData).catch((err) => setError(errorMessage(err, "Data kepatuhan belum bisa dimuat.")))
    }, [customerId])
    useEffect(() => { load() }, [load])
    const done = (d: CustomerCompliance) => { setDialog(null); setData(d) }

    async function removeOwner(o: BeneficialOwner) {
        const token = getAccessToken()
        if (!token || !(await confirm({ title: `Hapus ${o.full_name}?`, danger: true, confirmLabel: "Hapus" }))) return
        try { setData(await deleteBeneficialOwner(token, customerId, o.owner_id)) } catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" mb="12px" gap="8px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    {data?.edd_required ? <LuShieldAlert size={16} color="#B91C1C" /> : <LuShieldCheck size={16} color="#0D1B3E" />}
                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Kepatuhan APU-PPT</Text>
                    {data?.edd_required && <Badge fontSize="13px" bg="#FEE2E2" color="#B91C1C">Perlu EDD</Badge>}
                </Flex>
                <Button size="xs" variant="outline" fontSize="13px" onClick={() => setDialog("screening")}><LuPencil size={12} /> Screening & profil risiko</Button>
            </Flex>
            {error && <Text color="#DC2626" fontSize="13px" role="alert">{error}</Text>}
            {!data ? <Skeleton h="60px" /> : (
                <Flex flexDir="column" gap="10px">
                    <Flex gap="8px" flexWrap="wrap" fontSize="13px">
                        {data.risk_rating
                            ? <Badge fontSize="13px" bg={RATING_COLOR[data.risk_rating][0]} color={RATING_COLOR[data.risk_rating][1]}>Risiko {RISK_RATING_LABELS[data.risk_rating].toLowerCase()}</Badge>
                            : <Badge fontSize="13px" bg="#F1F5F9" color="#64748B">Profil risiko belum dinilai</Badge>}
                        <Badge fontSize="13px" bg={data.screening_status === "clear" ? "#DCFCE7" : data.screening_status === "not_screened" ? "#F1F5F9" : "#FEE2E2"}
                            color={data.screening_status === "clear" ? "#15803D" : data.screening_status === "not_screened" ? "#64748B" : "#B91C1C"}>
                            {SCREENING_STATUS_LABELS[data.screening_status]}{data.screened_at ? ` · ${fmtDate(data.screened_at)}` : ""}
                        </Badge>
                        {data.is_pep && <Badge fontSize="13px" bg="#FEE2E2" color="#B91C1C">PEP</Badge>}
                        {data.screening_stale && <Badge fontSize="13px" bg="#FEF3C7" color="#B45309">Screening lebih dari 12 bulan</Badge>}
                        <Text color="#64748B">Premi aktif {fmtIDR(data.in_force_premium)}</Text>
                    </Flex>
                    {data.edd_reasons.length > 0 && (
                        <Box p="10px 12px" bg={data.edd_required ? "#FEF2F2" : "#F8FAFC"} borderRadius="8px" fontSize="13px">
                            {data.edd_reasons.map((r) => <Text key={r} color={data.edd_required ? "#991B1B" : "#475569"}>• {r}</Text>)}
                        </Box>
                    )}
                    {isCompany && (
                        <Box>
                            <Flex justify="space-between" align="center" mb="4px">
                                <Text fontSize="13px" fontWeight="semibold" color="#0D1B3E">PEMILIK MANFAAT ({data.beneficial_owners.length})</Text>
                                <Button size="2xs" variant="outline" fontSize="13px" onClick={() => setDialog({ owner: null })}><LuPlus size={11} /> Tambah</Button>
                            </Flex>
                            {data.beneficial_owners.length === 0
                                ? <Text fontSize="13px" color="#64748B">Belum dicatat. Untuk badan usaha, catat pemilik manfaat (≥ 25% atau pengendali).</Text>
                                : data.beneficial_owners.map((o) => (
                                    <Flex key={o.owner_id} justify="space-between" align="center" py="5px" borderTop="1px solid #F1F5F9" fontSize="13px" gap="8px">
                                        <Box><Text color="#1C2833" fontWeight="semibold">{o.full_name}{o.is_pep && <Badge ml="6px" fontSize="13px" bg="#FEE2E2" color="#B91C1C">PEP</Badge>}</Text>
                                            <Text color="#64748B">{[o.ownership_percent != null && `${o.ownership_percent}%`, o.role, o.nationality].filter(Boolean).join(" · ")}</Text></Box>
                                        <Flex>
                                            <IconButton size="2xs" variant="ghost" aria-label="Ubah" onClick={() => setDialog({ owner: o })}><LuPencil size={12} /></IconButton>
                                            <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus" onClick={() => removeOwner(o)}><LuTrash2 size={12} /></IconButton>
                                        </Flex>
                                    </Flex>
                                ))}
                        </Box>
                    )}
                </Flex>
            )}
            {dialog === "screening" && data && <ScreeningDialog customerId={customerId} data={data} onClose={() => setDialog(null)} onSaved={done} />}
            {dialog && typeof dialog === "object" && <OwnerDialog customerId={customerId} editing={dialog.owner} onClose={() => setDialog(null)} onSaved={done} />}
            {confirmDialog}
        </Box>
    )
}
