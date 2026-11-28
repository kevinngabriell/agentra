"use client"

import { Box, Flex, Input, Text, Textarea } from "@chakra-ui/react"
import { CALC_METHOD_LABELS, type ChangeInfo, type ChangeKind, type EndorsementCalcMethod } from "@/lib/api/policy-change"
import { FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT, MoneyInput } from "@/components/claims/fields"
import { SearchSelect } from "@/components/ui/search-select"

const KINDS: { kind: ChangeKind; title: string; hint: string }[] = [
    { kind: "correction",  title: "Koreksi kesalahan input", hint: "Agen salah mengisi. Tanpa nomor endorsemen, tidak perlu persetujuan nasabah." },
    { kind: "endorsement", title: "Endorsemen dari penanggung", hint: "Penanggung mengubah kontrak. Catat nomor endorsemen dan tanggal efektifnya." },
]

/**
 * "Kenapa diubah?" — picks correction or endorsement and collects what each one needs.
 * `billing`: the change moves premium, so an endorsement also asks how the difference is billed
 * (its own debit / credit note, helpers/endorsements.php). A correction folds into the original note.
 */
export function ChangeKindFields({ value, onChange, billing = false }: { value: ChangeInfo; onChange: (v: ChangeInfo) => void; billing?: boolean }) {
    const set = (p: Partial<ChangeInfo>) => onChange({ ...value, ...p })
    return (
        <Flex flexDir="column" gap="10px" p="12px" bg="#F8FAFC" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
            <Text fontSize="13px" fontWeight="semibold" color="#1C2833">Kenapa diubah?</Text>
            <Flex gap="8px" flexDir={{ base: "column", sm: "row" }}>
                {KINDS.map(k => {
                    const active = value.change_kind === k.kind
                    return (
                        <Box key={k.kind} as="button" flex="1" textAlign="left" p="10px" borderRadius="8px"
                            border="1px solid" borderColor={active ? "#0D1B3E" : "#E2E8F0"} bg={active ? "#EFF6FF" : "white"}
                            aria-pressed={active} onClick={() => set({ change_kind: k.kind })}>
                            <Text fontSize="13px" fontWeight="semibold" color={active ? "#0D1B3E" : "#1C2833"}>{k.title}</Text>
                            <Text fontSize="13px" color="#64748B">{k.hint}</Text>
                        </Box>
                    )
                })}
            </Flex>
            {value.change_kind === "correction" ? (
                <FormField label="Alasan koreksi *" hint="Contoh: salah pilih nasabah, salah ketik uang pertanggungan.">
                    <Textarea {...CLAIM_INPUT} rows={2} maxLength={500} value={value.reason} onChange={(e) => set({ reason: e.target.value })} />
                </FormField>
            ) : (
                <>
                <FormRow>
                    <FormField label="Nomor endorsemen">
                        <Input {...CLAIM_INPUT} maxLength={60} value={value.endorsement_number} onChange={(e) => set({ endorsement_number: e.target.value })} />
                    </FormField>
                    <FormField label="Tanggal efektif">
                        <Input {...CLAIM_INPUT} type="date" value={value.effective_date} onChange={(e) => set({ effective_date: e.target.value })} />
                    </FormField>
                </FormRow>
                {billing && (
                    <>
                        <FormField label="Perhitungan premi endorsemen"
                            hint="Selisih premi ditagih / dikembalikan lewat nota debit / kredit sendiri. Nota polis awal tidak berubah.">
                            <SearchSelect value={value.calc_method ?? "pro_rata"} onChange={(v) => set({ calc_method: v as EndorsementCalcMethod })}
                                options={(Object.entries(CALC_METHOD_LABELS) as [EndorsementCalcMethod, string][])
                                    .filter(([k]) => k !== "manual").map(([v, label]) => ({ value: v, label }))} />
                        </FormField>
                        <FormRow>
                            <FormField label="Materai nota (Rp)">
                                <MoneyInput value={value.endorsement_materai ?? ""} onChange={(v) => set({ endorsement_materai: v })} />
                            </FormField>
                            <FormField label="Biaya endorsemen (Rp)">
                                <MoneyInput value={value.endorsement_biaya_polis ?? ""} onChange={(v) => set({ endorsement_biaya_polis: v })} />
                            </FormField>
                        </FormRow>
                    </>
                )}
                </>
            )}
        </Flex>
    )
}
