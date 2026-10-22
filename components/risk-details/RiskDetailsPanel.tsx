"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Badge, Box, Button, Dialog, Flex, Grid, IconButton, Input, Skeleton, Text, Textarea } from "@chakra-ui/react"
import { LuCar, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    RISK_GROUP_LABELS, addDeclaration, deleteDeclaration, getDeclarations, getRiskDetails, saveRiskDetails, updateDeclaration,
    type CargoDeclaration, type CargoDeclarations, type PolicyRiskDetails, type RiskDetails, type RiskGroup, type RiskMember,
} from "@/lib/api/risk-details"
import { fmtIDR, localISODate } from "@/lib/format"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput } from "@/components/claims/fields"
import { RiskDetailsFields } from "./RiskDetailsFields"
import {
    EXTENSION_LABELS, ICC_OPTIONS, LABEL_OF, MOTOR_COVERAGE_OPTIONS, SURVEY_OPTIONS, TARIFF_REGION_OPTIONS, USAGE_OPTIONS,
    membersFormFrom, membersToPayload, riskFormFrom, riskFormToPayload, validateRisk,
    type MemberForm, type RiskForm,
} from "./model"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"
import { useConfirm } from "@/components/ui/confirm-dialog"

export interface RiskDetailsPanelProps {
    policy: { id: string; number: string; coverage_start: string; coverage_end: string }
    /** Called after any change so the page can refresh its timeline. */
    onChanged?: () => void
}

function fmtDate(iso: string | null | undefined) {
    return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : ""
}

function Shell({ title, wide, saving, error, submitLabel, onClose, onSubmit, children }: {
    title: string; wide?: boolean; saving: boolean; error: string | null; submitLabel: string
    onClose: () => void; onSubmit: () => void; children: ReactNode
}) {
    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW={wide ? "720px" : "520px"} w="94vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{title}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="12px">
                            {children}
                            {error && <Text color="#DC2626" fontSize="14px" role="alert">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button variant="outline" size="sm" fontSize="15px" disabled={saving} onClick={onClose}>Batal</Button>
                        <Button size="sm" bg="#1A3557" color="white" fontSize="15px" _hover={{ bg: "#162C47" }} loading={saving} onClick={onSubmit}>{submitLabel}</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="4px">
            <Text {...CLAIM_LABEL}>{label}</Text>
            {children}
        </Flex>
    )
}

// ── Read-only view ───────────────────────────────────────────────────────────

type Row = [label: string, value: string]

function rowsFor(group: RiskGroup, d: RiskDetails): Row[] {
    const rp = (n: number | null | undefined) => (n === null || n === undefined ? "" : fmtIDR(n))
    const rows: Row[] = []
    if (group === "motor") {
        rows.push(
            ["Nomor Polisi", d.plate_number ?? ""], ["Nomor Rangka", d.chassis_number ?? ""], ["Nomor Mesin", d.engine_number ?? ""],
            ["Merek", d.vehicle_make ?? ""], ["Model / Tipe", d.vehicle_model ?? ""], ["Tahun", d.vehicle_year ? String(d.vehicle_year) : ""],
            ["Warna", d.vehicle_color ?? ""], ["Penggunaan", LABEL_OF(USAGE_OPTIONS, d.vehicle_usage)],
            ["Jenis Pertanggungan", LABEL_OF(MOTOR_COVERAGE_OPTIONS, d.motor_coverage_type)], ["Nilai Kendaraan", rp(d.vehicle_value)],
            ["Wilayah Tarif OJK", LABEL_OF(TARIFF_REGION_OPTIONS, d.tariff_region ? String(d.tariff_region) : "")],
            ["TJH Pihak Ketiga", rp(d.tpl_limit)], ["PA Pengemudi", rp(d.pa_driver_limit)],
            ["PA Penumpang / orang", d.pa_passenger_limit ? `${rp(d.pa_passenger_limit)} × ${d.pa_passenger_seats ?? "?"} kursi` : ""],
        )
    } else if (group === "cargo") {
        rows.push(
            ["Alat Angkut", d.conveyance_name ?? ""],
            ["Rute", d.voyage_from || d.voyage_to ? `${d.voyage_from || "?"} → ${d.voyage_to || "?"}` : ""],
            ["No. B/L / AWB", d.bl_awb_number ?? ""], ["Keberangkatan", fmtDate(d.departure_date)],
            ["Klausul ICC", LABEL_OF(ICC_OPTIONS, d.icc_clause)], ["Deskripsi Barang", d.goods_description ?? ""],
        )
    } else if (group === "travel") {
        rows.push(["Negara Tujuan", d.destinations ?? ""], ["No. Sertifikat Schengen", d.schengen_certificate_no ?? ""])
    } else if (group === "fire") {
        rows.push(
            ["Kode Okupasi", d.occupation_code ?? ""], ["Okupasi", d.occupation_description ?? ""],
            ["Status Survei", LABEL_OF(SURVEY_OPTIONS, d.survey_status)], ["Tanggal Survei", fmtDate(d.survey_date)],
        )
    }
    return rows.filter(([, v]) => v !== "")
}

function ViewGrid({ rows }: { rows: Row[] }) {
    return (
        <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap="14px 20px">
            {rows.map(([label, value]) => (
                <Flex key={label} flexDir="column" gap="2px" minW="0">
                    <Text color="#64748B" fontSize="14px" fontWeight="semibold">{label.toUpperCase()}</Text>
                    <Text color="#1C2833" fontSize="15px" wordBreak="break-word">{value}</Text>
                </Flex>
            ))}
        </Grid>
    )
}

function ExtensionBadges({ details }: { details: RiskDetails }) {
    const taken = (Object.keys(EXTENSION_LABELS) as (keyof typeof EXTENSION_LABELS)[]).filter(k => details[k])
    if (taken.length === 0) return null
    return (
        <Flex flexDir="column" gap="6px">
            <Text color="#64748B" fontSize="14px" fontWeight="semibold">PERLUASAN JAMINAN</Text>
            <Flex gap="6px" flexWrap="wrap">
                {taken.map(k => <Badge key={k} px="8px" py="2px" borderRadius="full" bg="#DCFCE7" color="#16A34A" fontSize="14px">{EXTENSION_LABELS[k]}</Badge>)}
            </Flex>
        </Flex>
    )
}

function MembersTable({ members, role, title }: { members: RiskMember[]; role: RiskMember["member_role"]; title: string }) {
    const rows = members.filter(m => m.member_role === role)
    if (rows.length === 0) return null
    const money = (n: number | null) => (n === null ? "—" : fmtIDR(n))
    return (
        <Flex flexDir="column" gap="6px">
            <Text color="#64748B" fontSize="14px" fontWeight="semibold">{title.toUpperCase()} ({rows.length})</Text>
            <Box overflowX="auto">
                <Box as="table" w="100%" fontSize="14px" style={{ borderCollapse: "collapse" }}>
                    <Box as="thead">
                        <Box as="tr" color="#64748B" textAlign="left">
                            <Box as="th" py="6px" pr="12px" fontWeight="semibold">Nama</Box>
                            <Box as="th" py="6px" pr="12px" fontWeight="semibold">{role === "traveller" ? "Paspor" : "Identitas"}</Box>
                            <Box as="th" py="6px" pr="12px" fontWeight="semibold">Tgl Lahir</Box>
                            <Box as="th" py="6px" pr="12px" fontWeight="semibold">Hubungan</Box>
                            {role === "beneficiary"
                                ? <Box as="th" py="6px" fontWeight="semibold" textAlign="right">Bagian</Box>
                                : <>
                                    <Box as="th" py="6px" pr="12px" fontWeight="semibold" textAlign="right">Meninggal</Box>
                                    <Box as="th" py="6px" pr="12px" fontWeight="semibold" textAlign="right">Cacat Tetap</Box>
                                    <Box as="th" py="6px" fontWeight="semibold" textAlign="right">Medis</Box>
                                </>}
                        </Box>
                    </Box>
                    <Box as="tbody">
                        {rows.map(m => (
                            <Box as="tr" key={m.member_id} borderTop="1px solid #E2E8F0" color="#1C2833">
                                <Box as="td" py="6px" pr="12px" fontWeight="medium">{m.full_name}</Box>
                                <Box as="td" py="6px" pr="12px">{m.id_number ?? "—"}</Box>
                                <Box as="td" py="6px" pr="12px">{fmtDate(m.birth_date) || "—"}</Box>
                                <Box as="td" py="6px" pr="12px">{m.relationship ?? "—"}</Box>
                                {role === "beneficiary"
                                    ? <Box as="td" py="6px" textAlign="right">{m.share_percent === null ? "—" : `${m.share_percent}%`}</Box>
                                    : <>
                                        <Box as="td" py="6px" pr="12px" textAlign="right">{money(m.benefit_death)}</Box>
                                        <Box as="td" py="6px" pr="12px" textAlign="right">{money(m.benefit_disability)}</Box>
                                        <Box as="td" py="6px" textAlign="right">{money(m.benefit_medical)}</Box>
                                    </>}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Flex>
    )
}

// ── Cargo open cover declarations ────────────────────────────────────────────

interface DeclarationForm {
    declaration_date: string; conveyance_name: string; voyage_from: string; voyage_to: string
    bl_awb_number: string; departure_date: string; goods_description: string
    sum_insured: string; premium_amount: string; notes: string
}

const EMPTY_DECLARATION = (): DeclarationForm => ({
    declaration_date: localISODate(), conveyance_name: "", voyage_from: "", voyage_to: "",
    bl_awb_number: "", departure_date: "", goods_description: "", sum_insured: "", premium_amount: "", notes: "",
})

function DeclarationDialog({ policyId, editing, onClose, onSaved }: {
    policyId: string; editing: CargoDeclaration | null; onClose: () => void; onSaved: () => void
}) {
    const [form, setForm] = useState<DeclarationForm>(() => editing ? {
        declaration_date: editing.declaration_date, conveyance_name: editing.conveyance_name ?? "",
        voyage_from: editing.voyage_from ?? "", voyage_to: editing.voyage_to ?? "", bl_awb_number: editing.bl_awb_number ?? "",
        departure_date: editing.departure_date ?? "", goods_description: editing.goods_description ?? "",
        sum_insured: String(editing.sum_insured), premium_amount: String(editing.premium_amount), notes: editing.notes ?? "",
    } : EMPTY_DECLARATION())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<DeclarationForm>) => setForm(f => ({ ...f, ...p }))

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!form.declaration_date) { setError("Tanggal deklarasi wajib diisi"); return }
        if (!form.sum_insured) { setError("Nilai pertanggungan wajib diisi"); return }
        setSaving(true); setError(null)
        const text = (v: string) => (v.trim() === "" ? null : v.trim())
        const body = {
            declaration_date: form.declaration_date,
            conveyance_name: text(form.conveyance_name), voyage_from: text(form.voyage_from), voyage_to: text(form.voyage_to),
            bl_awb_number: text(form.bl_awb_number), departure_date: text(form.departure_date),
            goods_description: text(form.goods_description), notes: text(form.notes),
            sum_insured: Number(form.sum_insured), premium_amount: Number(form.premium_amount || 0),
        }
        try {
            if (editing) await updateDeclaration(token, policyId, editing.declaration_id, body)
            else await addDeclaration(token, policyId, body)
            onSaved()
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan deklarasi"))
            setSaving(false)
        }
    }

    return (
        <Shell title={editing ? "Ubah Deklarasi" : "Tambah Deklarasi Pengiriman"} saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <Field label="Tanggal Deklarasi"><Input {...CLAIM_INPUT} type="date" value={form.declaration_date} onChange={(e) => set({ declaration_date: e.target.value })} /></Field>
            <Field label="No. B/L atau AWB"><Input {...CLAIM_INPUT} maxLength={60} value={form.bl_awb_number} onChange={(e) => set({ bl_awb_number: e.target.value.toUpperCase() })} /></Field>
            <Field label="Nama Kapal / Alat Angkut"><Input {...CLAIM_INPUT} maxLength={120} value={form.conveyance_name} onChange={(e) => set({ conveyance_name: e.target.value })} /></Field>
            <Flex gap="12px">
                <Box flex="1"><Field label="Asal"><Input {...CLAIM_INPUT} maxLength={120} value={form.voyage_from} onChange={(e) => set({ voyage_from: e.target.value })} /></Field></Box>
                <Box flex="1"><Field label="Tujuan"><Input {...CLAIM_INPUT} maxLength={120} value={form.voyage_to} onChange={(e) => set({ voyage_to: e.target.value })} /></Field></Box>
            </Flex>
            <Field label="Tanggal Keberangkatan"><Input {...CLAIM_INPUT} type="date" value={form.departure_date} onChange={(e) => set({ departure_date: e.target.value })} /></Field>
            <Field label="Deskripsi Barang"><Textarea {...CLAIM_INPUT} rows={2} maxLength={2000} value={form.goods_description} onChange={(e) => set({ goods_description: e.target.value })} /></Field>
            <Flex gap="12px">
                <Box flex="1"><Field label="Nilai Pertanggungan (Rp)"><MoneyInput value={form.sum_insured} onChange={(v) => set({ sum_insured: v })} /></Field></Box>
                <Box flex="1"><Field label="Premi (Rp)"><MoneyInput value={form.premium_amount} onChange={(v) => set({ premium_amount: v })} /></Field></Box>
            </Flex>
            <Field label="Catatan"><Input {...CLAIM_INPUT} maxLength={500} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        </Shell>
    )
}

function DeclarationsSection({ policyId, onChanged }: { policyId: string; onChanged?: () => void }) {
    const { confirm, dialog: confirmDialog } = useConfirm()
    const [data, setData] = useState<CargoDeclarations | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<{ editing: CargoDeclaration | null } | null>(null)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getDeclarations(token, policyId).then(setData).catch((err) => setError(errorMessage(err, "Deklarasi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [policyId])

    useEffect(() => { load() }, [load])

    async function remove(d: CargoDeclaration) {
        const token = getAccessToken()
        if (!token) return
        if (!(await confirm({ title: `Hapus deklarasi ${d.bl_awb_number ?? fmtDate(d.declaration_date)}?`, confirmLabel: "Hapus", danger: true }))) return
        try { await deleteDeclaration(token, policyId, d.declaration_id); load(); onChanged?.() }
        catch (err) { setError(errorMessage(err, "Gagal menghapus deklarasi")) }
    }

    return (
        <Flex flexDir="column" gap="10px" pt="16px" borderTop="1px solid" borderColor="#E2E8F0">
      {confirmDialog}
            <Flex justify="space-between" align="center" gap="8px" flexWrap="wrap">
                <Box>
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Deklarasi Pengiriman (Open Cover)</Text>
                    {data && data.items.length > 0 && (
                        <Text color="#64748B" fontSize="14px">
                            {data.items.length} pengiriman · nilai {fmtIDR(data.total_sum_insured)} · premi {fmtIDR(data.total_premium)}
                        </Text>
                    )}
                </Box>
                <Button size="xs" variant="outline" fontSize="14px" onClick={() => setDialog({ editing: null })}><LuPlus size={12} /> Tambah Deklarasi</Button>
            </Flex>
            {error && <Text color="#DC2626" fontSize="14px" role="alert">{error}</Text>}
            {!data ? <Skeleton h="48px" /> : data.items.length === 0 ? (
                <Text color="#64748B" fontSize="15px">Belum ada deklarasi pengiriman</Text>
            ) : (
                <Flex flexDir="column" gap="8px">
                    {data.items.map(d => (
                        <Flex key={d.declaration_id} justify="space-between" align="flex-start" gap="12px" p="10px 12px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
                            <Flex flexDir="column" gap="2px" minW="0">
                                <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{d.bl_awb_number ?? "Tanpa No. B/L"} · {fmtDate(d.declaration_date)}</Text>
                                <Text color="#64748B" fontSize="14px">
                                    {[d.conveyance_name, d.voyage_from || d.voyage_to ? `${d.voyage_from ?? "?"} → ${d.voyage_to ?? "?"}` : null, d.goods_description].filter(Boolean).join(" · ")}
                                </Text>
                                <Text color="#1C2833" fontSize="14px">Nilai {fmtIDR(d.sum_insured)} · Premi {fmtIDR(d.premium_amount)}</Text>
                            </Flex>
                            <Flex flexShrink={0}>
                                <IconButton size="2xs" variant="ghost" aria-label="Ubah deklarasi" onClick={() => setDialog({ editing: d })}><LuPencil size={13} /></IconButton>
                                <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label="Hapus deklarasi" onClick={() => remove(d)}><LuTrash2 size={13} /></IconButton>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            )}
            {dialog && (
                <DeclarationDialog
                    policyId={policyId} editing={dialog.editing}
                    onClose={() => setDialog(null)}
                    onSaved={() => { setDialog(null); load(); onChanged?.() }}
                />
            )}
        </Flex>
    )
}

// ── Panel ────────────────────────────────────────────────────────────────────

/** "Detail Risiko" card: product-specific data (vehicle, shipment, travellers, insured people, property). Hidden for products without any. */
export function RiskDetailsPanel({ policy, onChanged }: RiskDetailsPanelProps) {
    const [data, setData] = useState<PolicyRiskDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState(false)

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getRiskDetails(token, policy.id).then(setData).catch((err) => setError(errorMessage(err, "Detail risiko belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [policy.id])

    useEffect(() => { load() }, [load])

    if (error) return <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px"><Text color="#DC2626" fontSize="15px" role="alert">{error}</Text></Box>
    if (!data) return <Skeleton h="120px" borderRadius="12px" />
    const group = data.risk_group
    if (!group) return null

    const rows = data.details ? rowsFor(group, data.details) : []
    const isOpenCover = group === "cargo" && data.details?.is_open_cover === true
    const hasExtensions = (Object.keys(EXTENSION_LABELS) as (keyof typeof EXTENSION_LABELS)[]).some(k => data.details?.[k])
    const hasContent = rows.length > 0 || data.members.length > 0 || hasExtensions || isOpenCover

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" gap="8px" mb="16px">
                <Flex align="center" gap="8px">
                    <LuCar size={16} color="#1A3557" />
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{RISK_GROUP_LABELS[group]}</Text>
                    {isOpenCover && <Badge px="8px" py="2px" borderRadius="full" bg="#E0F2FE" color="#0369A1" fontSize="14px">Open Cover</Badge>}
                </Flex>
                <Button size="xs" variant="outline" fontSize="14px" onClick={() => setEditing(true)}>
                    <LuPencil size={12} /> {hasContent ? "Ubah" : "Isi Detail"}
                </Button>
            </Flex>

            {!hasContent ? (
                <Text color="#64748B" fontSize="15px">Belum ada detail risiko. Isi agar mudah dicari dan menjawab pertanyaan nasabah.</Text>
            ) : (
                <Flex flexDir="column" gap="18px">
                    {rows.length > 0 && <ViewGrid rows={rows} />}
                    {data.details && <ExtensionBadges details={data.details} />}
                    <MembersTable members={data.members} role="traveller" title="Peserta Perjalanan" />
                    <MembersTable members={data.members} role="insured" title="Tertanggung" />
                    <MembersTable members={data.members} role="beneficiary" title="Penerima Manfaat" />
                </Flex>
            )}

            {isOpenCover && <Box mt="18px"><DeclarationsSection policyId={policy.id} onChanged={onChanged} /></Box>}

            {editing && (
                <EditDialog
                    policy={policy} group={group} current={data}
                    onClose={() => setEditing(false)}
                    onSaved={(next) => { setData(next); setEditing(false); onChanged?.() }}
                />
            )}
        </Box>
    )
}

function EditDialog({ policy, group, current, onClose, onSaved }: {
    policy: RiskDetailsPanelProps["policy"]; group: RiskGroup; current: PolicyRiskDetails
    onClose: () => void; onSaved: (next: PolicyRiskDetails) => void
}) {
    const [form, setForm] = useState<RiskForm>(() => riskFormFrom(current.details))
    const [members, setMembers] = useState<MemberForm[]>(() => membersFormFrom(current.members))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        const problem = validateRisk(form, members, group)
        if (problem) { setError(problem); return }
        setSaving(true); setError(null)
        try {
            const hasMembers = group === "travel" || group === "pa"
            const next = await saveRiskDetails(token, policy.id, {
                ...(group !== "pa" ? { risk_details: riskFormToPayload(form, group) } : {}),
                ...(hasMembers ? { members: membersToPayload(members) } : {}),
            })
            onSaved(next)
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan detail risiko"))
            setSaving(false)
        }
    }

    return (
        <Shell title={`${RISK_GROUP_LABELS[group]} — ${policy.number}`} wide saving={saving} error={error} submitLabel="Simpan" onClose={onClose} onSubmit={submit}>
            <RiskDetailsFields
                group={group} form={form} onChange={(p) => setForm(f => ({ ...f, ...p }))}
                members={members} onMembersChange={setMembers}
                coverage={{ start: policy.coverage_start, end: policy.coverage_end }}
            />
        </Shell>
    )
}
