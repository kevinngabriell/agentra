"use client"

import { Box, Flex, Input, Text, Textarea } from "@chakra-ui/react"
import type { ChangeInfo, ChangeKind } from "@/lib/api/policy-change"
import { FormField, FormRow } from "@/components/ui/form-dialog"
import { CLAIM_INPUT } from "@/components/claims/fields"

const KINDS: { kind: ChangeKind; title: string; hint: string }[] = [
    { kind: "correction",  title: "Koreksi kesalahan input", hint: "Agen salah mengisi. Tanpa nomor endorsemen, tidak perlu persetujuan nasabah." },
    { kind: "endorsement", title: "Endorsemen dari penanggung", hint: "Penanggung mengubah kontrak. Catat nomor endorsemen dan tanggal efektifnya." },
]

/** "Kenapa diubah?" — picks correction or endorsement and collects what each one needs. */
export function ChangeKindFields({ value, onChange }: { value: ChangeInfo; onChange: (v: ChangeInfo) => void }) {
    const set = (p: Partial<ChangeInfo>) => onChange({ ...value, ...p })
    return (
        <Flex flexDir="column" gap="10px" p="12px" bg="#F8FAFC" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
            <Text fontSize="14px" fontWeight="semibold" color="#1C2833">Kenapa diubah?</Text>
            <Flex gap="8px" flexDir={{ base: "column", sm: "row" }}>
                {KINDS.map(k => {
                    const active = value.change_kind === k.kind
                    return (
                        <Box key={k.kind} as="button" flex="1" textAlign="left" p="10px" borderRadius="8px"
                            border="1px solid" borderColor={active ? "#1A3557" : "#E2E8F0"} bg={active ? "#EFF6FF" : "white"}
                            aria-pressed={active} onClick={() => set({ change_kind: k.kind })}>
                            <Text fontSize="14px" fontWeight="semibold" color={active ? "#1A3557" : "#1C2833"}>{k.title}</Text>
                            <Text fontSize="14px" color="#64748B">{k.hint}</Text>
                        </Box>
                    )
                })}
            </Flex>
            {value.change_kind === "correction" ? (
                <FormField label="Alasan koreksi *" hint="Contoh: salah pilih nasabah, salah ketik uang pertanggungan.">
                    <Textarea {...CLAIM_INPUT} rows={2} maxLength={500} value={value.reason} onChange={(e) => set({ reason: e.target.value })} />
                </FormField>
            ) : (
                <FormRow>
                    <FormField label="Nomor endorsemen">
                        <Input {...CLAIM_INPUT} maxLength={60} value={value.endorsement_number} onChange={(e) => set({ endorsement_number: e.target.value })} />
                    </FormField>
                    <FormField label="Tanggal efektif">
                        <Input {...CLAIM_INPUT} type="date" value={value.effective_date} onChange={(e) => set({ effective_date: e.target.value })} />
                    </FormField>
                </FormRow>
            )}
        </Flex>
    )
}
