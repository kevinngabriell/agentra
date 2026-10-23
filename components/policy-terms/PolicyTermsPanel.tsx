"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge, Box, Button, Flex, IconButton, Input, Skeleton, Text, Textarea } from "@chakra-ui/react"
import { LuPencil, LuPlus, LuSearch, LuShieldCheck, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    DEDUCTIBLE_TYPE_LABELS, TERM_TYPE_LABELS, addPolicyTerm, deletePolicyTerm, getPolicyTerms, updatePolicyTerm,
    type DeductibleType, type PolicyTerm, type PolicyTermPayload, type TermType,
} from "@/lib/api/policy-terms"
import { COVERAGE_TYPE_LABELS, type ApiCoverageItem } from "@/lib/api/policies"
import { SearchSelect } from "@/components/ui/search-select"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { ChangeKindFields } from "@/components/policy-change/ChangeKindFields"
import { changeFields, newChange, validateChange } from "@/lib/api/policy-change"
import { CATALOG_BY_CODE, catalogFor, deductibleText } from "./catalog"

export interface PolicyTermsPanelProps {
    policyId: string
    /** Coverage items, to attach a term to one item instead of the whole policy. */
    coverages: Pick<ApiCoverageItem, "coverage_id" | "coverage_type" | "coverage_label">[]
    /** Called after any change so the page can refresh its timeline. */
    onChanged?: () => void
}

const FREE_TEXT = "__free__"
const WHOLE_POLICY = "__policy__"

function coverageName(c: { coverage_type: string | null; coverage_label: string | null }) {
    const base = COVERAGE_TYPE_LABELS[c.coverage_type as keyof typeof COVERAGE_TYPE_LABELS] ?? c.coverage_type ?? ""
    return c.coverage_label ? `${base} · ${c.coverage_label}` : base
}

interface TermForm {
    type: TermType
    pick: string
    title: string
    description: string
    coverage: string
    dType: DeductibleType
    amount: string
    percent: string
}

function formFrom(type: TermType, t: PolicyTerm | null): TermForm {
    return {
        type,
        pick: t ? (t.clause_code && CATALOG_BY_CODE.has(t.clause_code) ? t.clause_code : FREE_TEXT) : "",
        title: t?.title ?? "",
        description: t?.description ?? "",
        coverage: t?.coverage_id ?? WHOLE_POLICY,
        dType: t?.deductible_type ?? "fixed",
        amount: t?.deductible_amount != null ? String(t.deductible_amount) : "",
        percent: t?.deductible_percent != null ? String(t.deductible_percent) : "",
    }
}

function TermDialog({ policyId, coverages, type, editing, onClose, onSaved, onDraft }: {
    /** Unused in draft mode (new policy form). */
    policyId: string
    coverages: { coverage_id: string; coverage_type: string | null; coverage_label: string | null }[]
    type: TermType
    editing: PolicyTerm | null
    onClose: () => void
    onSaved: () => void
    /** Draft mode: hand the validated payload back instead of calling the API (the policy does not exist yet). */
    onDraft?: (body: PolicyTermPayload) => void
}) {
    const [form, setForm] = useState<TermForm>(() => formFrom(type, editing))
    const [change, setChange] = useState(() => newChange())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const set = (p: Partial<TermForm>) => setForm(f => ({ ...f, ...p }))
    const isDeductible = type === "deductible"

    function pickCatalog(code: string) {
        const entry = CATALOG_BY_CODE.get(code)
        set(entry
            ? { pick: code, title: entry.label, description: form.description || entry.hint }
            : { pick: FREE_TEXT })
    }

    async function submit() {
        const token = getAccessToken()
        if (!token && !onDraft) return
        const body: PolicyTermPayload = {
            term_type: type,
            coverage_id: form.coverage === WHOLE_POLICY ? null : form.coverage,
            description: form.description.trim() || null,
        }
        if (isDeductible) {
            if (form.dType === "fixed" && !form.amount) { setError("Nominal risiko sendiri wajib diisi"); return }
            const percent = Number(form.percent.replace(",", "."))
            if (form.dType !== "fixed" && !(percent > 0 && percent <= 100)) { setError("Persentase harus lebih dari 0 dan paling banyak 100"); return }
            body.title = form.title.trim() || null
            body.deductible_type = form.dType
            body.deductible_amount = form.amount ? Number(form.amount) : null
            body.deductible_percent = form.dType === "fixed" ? null : percent
        } else {
            if (!form.title.trim()) { setError(`Nama ${TERM_TYPE_LABELS[type].toLowerCase()} wajib diisi`); return }
            body.title = form.title.trim()
            body.clause_code = form.pick && form.pick !== FREE_TEXT ? form.pick : null
        }
        if (onDraft) { onDraft(body); return }
        const changeProblem = validateChange(change)
        if (changeProblem) { setError(changeProblem); return }
        setSaving(true); setError(null)
        try {
            if (!token) return
            if (editing) await updatePolicyTerm(token, policyId, editing.term_id, body, changeFields(change))
            else await addPolicyTerm(token, policyId, body, changeFields(change))
            onSaved()
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
            setSaving(false)
        }
    }

    const targets = [
        { value: WHOLE_POLICY, label: "Seluruh polis" },
        ...coverages.map(c => ({ value: c.coverage_id, label: coverageName(c) })),
    ]

    return (
        <FormDialog title={`${editing ? "Ubah" : "Tambah"} ${TERM_TYPE_LABELS[type]}`} saving={saving} error={error} onClose={onClose} onSubmit={submit}>
            {isDeductible ? (
                <>
                    <FormField label="Jenis risiko sendiri">
                        <SearchSelect value={form.dType} onChange={(v) => set({ dType: v as DeductibleType })}
                            options={(Object.entries(DEDUCTIBLE_TYPE_LABELS) as [DeductibleType, string][]).map(([value, label]) => ({ value, label }))} />
                    </FormField>
                    {form.dType !== "fixed" && (
                        <FormField label="Persentase (%)">
                            <Input {...CLAIM_INPUT} inputMode="decimal" placeholder="10" maxLength={7} value={form.percent}
                                onChange={(e) => set({ percent: e.target.value.replace(/[^\d.,]/g, "") })} />
                        </FormField>
                    )}
                    <FormField label={form.dType === "fixed" ? "Nominal (Rp)" : "Minimum (Rp, opsional)"}>
                        <MoneyInput value={form.amount} onChange={(v) => set({ amount: v })} />
                    </FormField>
                    <FormField label="Judul (opsional)" hint="Contoh: Risiko sendiri kendaraan, Risiko sendiri banjir. Kosong = Risiko Sendiri.">
                        <Input {...CLAIM_INPUT} maxLength={200} value={form.title} onChange={(e) => set({ title: e.target.value })} />
                    </FormField>
                </>
            ) : (
                <>
                    <FormField label={`Pilih dari daftar`} hint={CATALOG_BY_CODE.get(form.pick)?.hint}>
                        <SearchSelect value={form.pick} onChange={pickCatalog} placeholder="Pilih atau tulis sendiri"
                            options={[...catalogFor(type).map(e => ({ value: e.code, label: e.label })), { value: FREE_TEXT, label: "Lainnya (tulis sendiri)" }]} />
                    </FormField>
                    <FormField label="Nama">
                        <Input {...CLAIM_INPUT} maxLength={200} value={form.title}
                            onChange={(e) => set({ title: e.target.value, pick: form.pick && form.pick !== FREE_TEXT && e.target.value !== CATALOG_BY_CODE.get(form.pick)?.label ? FREE_TEXT : form.pick })} />
                    </FormField>
                </>
            )}
            <FormField label="Keterangan / bunyi klausula (opsional)">
                <Textarea {...CLAIM_INPUT} rows={3} maxLength={4000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
            </FormField>
            {coverages.length > 0 && (
                <FormField label="Berlaku untuk">
                    <SearchSelect value={form.coverage} onChange={(v) => set({ coverage: v })} options={targets} />
                </FormField>
            )}
            {!onDraft && <ChangeKindFields value={change} onChange={setChange} />}
        </FormDialog>
    )
}

function DeleteTermDialog({ policyId, term, onClose, onDeleted }: { policyId: string; term: PolicyTerm; onClose: () => void; onDeleted: () => void }) {
    const [change, setChange] = useState(() => newChange())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        const problem = validateChange(change)
        if (problem) { setError(problem); return }
        setSaving(true); setError(null)
        try {
            await deletePolicyTerm(token, policyId, term.term_id, changeFields(change))
            onDeleted()
        } catch (err) {
            setError(errorMessage(err, "Gagal menghapus"))
            setSaving(false)
        }
    }

    return (
        <FormDialog title={`Hapus "${term.title}"?`} saving={saving} error={error} submitLabel="Hapus" onClose={onClose} onSubmit={submit}>
            <ChangeKindFields value={change} onChange={setChange} />
        </FormDialog>
    )
}

function Section({ title, count, onAdd, children }: { title: string; count: number; onAdd: () => void; children: React.ReactNode }) {
    return (
        <Flex flexDir="column" gap="8px">
            <Flex justify="space-between" align="center" gap="8px">
                <Text color="#1A3557" fontSize="14px" fontWeight="semibold" letterSpacing="0.04em">{title.toUpperCase()} ({count})</Text>
                <Button size="xs" variant="outline" fontSize="14px" onClick={onAdd}><LuPlus size={12} /> Tambah</Button>
            </Flex>
            {children}
        </Flex>
    )
}

function TermRow({ term, onEdit, onDelete }: { term: PolicyTerm; onEdit: () => void; onDelete: () => void }) {
    const isDeductible = term.term_type === "deductible"
    return (
        <Flex justify="space-between" align="flex-start" gap="12px" p="10px 12px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
            <Flex flexDir="column" gap="3px" minW="0">
                <Flex align="center" gap="8px" flexWrap="wrap">
                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{term.title}</Text>
                    <Badge px="8px" py="1px" borderRadius="full" fontSize="14px" bg={term.coverage_id ? "#FEF3C7" : "#E0F2FE"} color={term.coverage_id ? "#B45309" : "#0369A1"}>
                        {term.coverage_id ? coverageName(term) : "Seluruh polis"}
                    </Badge>
                </Flex>
                {isDeductible && <Text color="#1C2833" fontSize="15px">{deductibleText(term)}</Text>}
                {term.description && <Text color="#64748B" fontSize="14px" whiteSpace="pre-wrap">{term.description}</Text>}
            </Flex>
            <Flex flexShrink={0}>
                <IconButton size="2xs" variant="ghost" aria-label={`Ubah ${term.title}`} onClick={onEdit}><LuPencil size={13} /></IconButton>
                <IconButton size="2xs" variant="ghost" color="#DC2626" aria-label={`Hapus ${term.title}`} onClick={onDelete}><LuTrash2 size={13} /></IconButton>
            </Flex>
        </Flex>
    )
}

/** "Risiko Sendiri, Klausula & Perluasan" card: what the policy covers beyond the sum insured, searchable for "am I covered for X?". */
export function PolicyTermsPanel({ policyId, coverages, onChanged }: PolicyTermsPanelProps) {
    const [terms, setTerms] = useState<PolicyTerm[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [dialog, setDialog] = useState<{ type: TermType; editing: PolicyTerm | null } | null>(null)
    const [deleting, setDeleting] = useState<PolicyTerm | null>(null)

    // A deleted coverage item deletes its terms in the API, so reload when the item list changes.
    const coverageKey = coverages.map(c => c.coverage_id).join(",")

    const load = useCallback(() => {
        const token = getAccessToken()
        if (!token) return
        getPolicyTerms(token, policyId).then(setTerms).catch((err) => setError(errorMessage(err, "Data ketentuan polis belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [policyId])

    useEffect(() => { load() }, [load, coverageKey])

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!terms || !q) return terms ?? []
        return terms.filter(t => `${t.title} ${t.description ?? ""} ${t.coverage_label ?? ""}`.toLowerCase().includes(q))
    }, [terms, query])

    const sections: TermType[] = ["deductible", "clause", "extension"]

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
            <Flex align="center" justify="space-between" gap="8px" mb="16px" flexWrap="wrap">
                <Flex align="center" gap="8px">
                    <LuShieldCheck size={16} color="#1A3557" />
                    <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Risiko Sendiri, Klausula & Perluasan</Text>
                </Flex>
                {terms && terms.length > 0 && (
                    <Flex align="center" gap="6px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="10px" h="32px" minW={{ base: "100%", sm: "220px" }}>
                        <LuSearch size={13} color="#64748B" />
                        <Input variant="subtle" bg="transparent" border="0" outline="0" h="30px" px="0" fontSize="15px"
                            placeholder="Cari, mis. banjir" aria-label="Cari ketentuan polis" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </Flex>
                )}
            </Flex>

            {error && <Text color="#DC2626" fontSize="14px" role="alert" mb="8px">{error}</Text>}
            {!terms ? <Skeleton h="80px" /> : (
                <Flex flexDir="column" gap="18px">
                    {terms.length === 0 && (
                        <Text color="#64748B" fontSize="15px">Belum ada risiko sendiri, klausula, atau perluasan. Isi agar mudah menjawab &ldquo;apakah ini dijamin?&rdquo;.</Text>
                    )}
                    {query.trim() && shown.length === 0 && (
                        <Text color="#64748B" fontSize="15px">Tidak ada ketentuan yang cocok dengan &ldquo;{query.trim()}&rdquo;. Berarti belum tercatat sebagai dijamin pada polis ini.</Text>
                    )}
                    {sections.map(type => {
                        const rows = shown.filter(t => t.term_type === type)
                        if (query.trim() && rows.length === 0) return null
                        return (
                            <Section key={type} title={TERM_TYPE_LABELS[type]} count={rows.length} onAdd={() => setDialog({ type, editing: null })}>
                                {rows.length === 0
                                    ? <Text color="#64748B" fontSize="15px">Belum ada</Text>
                                    : rows.map(t => <TermRow key={t.term_id} term={t} onEdit={() => setDialog({ type, editing: t })} onDelete={() => setDeleting(t)} />)}
                            </Section>
                        )
                    })}
                </Flex>
            )}

            {dialog && (
                <TermDialog policyId={policyId} coverages={coverages} type={dialog.type} editing={dialog.editing}
                    onClose={() => setDialog(null)}
                    onSaved={() => { setDialog(null); load(); onChanged?.() }} />
            )}
            {deleting && (
                <DeleteTermDialog policyId={policyId} term={deleting} onClose={() => setDeleting(null)}
                    onDeleted={() => { setDeleting(null); load(); onChanged?.() }} />
            )}
        </Box>
    )
}

/** A term typed on the new-policy form; `term_id` is a local id and `coverage_id` the local coverage row's id. */
export type DraftTerm = PolicyTerm

export interface DraftTermsEditorProps {
    terms: DraftTerm[]
    onChange: (terms: DraftTerm[]) => void
    /** Coverage rows already added on the form, to attach a term to one item. */
    coverages: { coverage_id: string; coverage_type: string; coverage_label: string | null }[]
}

/** The same card as PolicyTermsPanel, but held in the form until the policy is created. */
export function DraftTermsEditor({ terms, onChange, coverages }: DraftTermsEditorProps) {
    const [dialog, setDialog] = useState<{ type: TermType; editing: DraftTerm | null } | null>(null)

    // A term attached to a coverage row that was removed falls back to the whole policy.
    const known = new Set(coverages.map(c => c.coverage_id))
    const items = terms.map(t => t.coverage_id && !known.has(t.coverage_id) ? { ...t, coverage_id: null, coverage_type: null, coverage_label: null } : t)

    function save(body: PolicyTermPayload) {
        if (!dialog) return
        const cov = coverages.find(c => c.coverage_id === body.coverage_id)
        const now = new Date().toISOString()
        const term: DraftTerm = {
            term_id: dialog.editing?.term_id ?? `draft_${crypto.randomUUID()}`,
            coverage_id: cov?.coverage_id ?? null,
            coverage_type: cov?.coverage_type ?? null,
            coverage_label: cov?.coverage_label ?? null,
            term_type: dialog.type,
            clause_code: body.clause_code ?? null,
            title: body.title || TERM_TYPE_LABELS[dialog.type],
            description: body.description ?? null,
            deductible_type: body.deductible_type ?? null,
            deductible_amount: body.deductible_amount ?? null,
            deductible_percent: body.deductible_percent ?? null,
            created_at: now,
            updated_at: now,
        }
        onChange(dialog.editing ? items.map(t => t.term_id === term.term_id ? term : t) : [...items, term])
        setDialog(null)
    }

    const sections: TermType[] = ["deductible", "clause", "extension"]

    return (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0" align="center" gap="8px">
                <Box borderLeft="3px solid #1A3557" pl="10px">
                    <Text color="#1A3557" fontSize="16px" fontWeight="semibold">Risiko Sendiri, Klausula & Perluasan Jaminan</Text>
                    <Text color="#64748B" fontSize="14px">Opsional. Bisa juga diisi nanti dari halaman detail polis.</Text>
                </Box>
            </Flex>
            <Flex flexDir="column" gap="18px" p="20px">
                {sections.map(type => {
                    const rows = items.filter(t => t.term_type === type)
                    return (
                        <Section key={type} title={TERM_TYPE_LABELS[type]} count={rows.length} onAdd={() => setDialog({ type, editing: null })}>
                            {rows.length === 0
                                ? <Text color="#64748B" fontSize="15px">Belum ada</Text>
                                : rows.map(t => (
                                    <TermRow key={t.term_id} term={t} onEdit={() => setDialog({ type, editing: t })}
                                        onDelete={() => onChange(items.filter(x => x.term_id !== t.term_id))} />
                                ))}
                        </Section>
                    )
                })}
            </Flex>
            {dialog && (
                <TermDialog policyId="" coverages={coverages} type={dialog.type} editing={dialog.editing}
                    onClose={() => setDialog(null)} onSaved={() => setDialog(null)} onDraft={save} />
            )}
        </Box>
    )
}
