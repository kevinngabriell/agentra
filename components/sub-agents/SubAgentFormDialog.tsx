"use client"

import { useEffect, useState } from "react"
import { Button, Dialog, Flex, IconButton, Input, Text, Textarea } from "@chakra-ui/react"
import { LuPlus, LuTrash2 } from "react-icons/lu"
import { SearchSelect } from "@/components/ui/search-select"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { createSubAgent, updateSubAgent, type ApiSubAgentDetail, type SubAgentStatus } from "@/lib/api/sub-agents"
import { CLAIM_INPUT, CLAIM_LABEL, Required } from "@/components/claims/fields"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

interface RateRow { insurer_id: string; split_rate: string }

export interface SubAgentFormDialogProps {
    open: boolean
    onClose: () => void
    onSaved: (agent: ApiSubAgentDetail) => void
    /** Present = edit this sub-agent; absent = register a new one. */
    agent?: ApiSubAgentDetail
}

export function SubAgentFormDialog(props: SubAgentFormDialogProps) {
    // Remount on every open so the form always starts from the current record.
    if (!props.open) return null
    return <SubAgentForm {...props} />
}

const STATUS_OPTIONS = [{ value: "active", label: "Aktif" }, { value: "inactive", label: "Nonaktif" }]

/** Percent input: digits with one optional decimal separator, kept as text while typing. */
function cleanRate(raw: string): string {
    const v = raw.replace(",", ".").replace(/[^\d.]/g, "")
    const [int, ...rest] = v.split(".")
    return rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int.slice(0, 3)
}

function validRate(s: string): boolean {
    if (s === "" || s === ".") return false
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 && n <= 100
}

function SubAgentForm({ onClose, onSaved, agent }: SubAgentFormDialogProps) {
    const [fullName, setFullName]   = useState(agent?.full_name ?? "")
    const [code, setCode]           = useState(agent?.agent_code ?? "")
    const [phone, setPhone]         = useState(agent?.phone_number ?? "")
    const [whatsapp, setWhatsapp]   = useState(agent?.whatsapp_number ?? "")
    const [email, setEmail]         = useState(agent?.email ?? "")
    const [joined, setJoined]       = useState(agent?.joined_date ?? "")
    const [status, setStatus]       = useState<SubAgentStatus>(agent?.status ?? "active")
    const [split, setSplit]         = useState(agent ? String(agent.default_split_rate) : "")
    const [notes, setNotes]         = useState(agent?.notes ?? "")
    const [waDigest, setWaDigest]   = useState(agent?.wa_digest_enabled ?? true)
    const [rates, setRates]         = useState<RateRow[]>(
        (agent?.insurer_rates ?? []).map((r) => ({ insurer_id: r.insurer_id, split_rate: String(r.split_rate) })),
    )
    const [insurers, setInsurers]   = useState<ApiInsurer[]>([])
    const [saving, setSaving]       = useState(false)
    const [error, setError]         = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getInsurers(token).then((l) => { if (!cancelled) setInsurers(l) }).catch(() => {})
        return () => { cancelled = true }
    }, [])

    const usedInsurers = new Set(rates.map((r) => r.insurer_id))
    const insurerOptions = (current: string) => insurers
        .filter((i) => i.insurer_id === current || !usedInsurers.has(i.insurer_id))
        .map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))
    const canAddRate = insurers.some((i) => !usedInsurers.has(i.insurer_id))

    const setRate = (idx: number, patch: Partial<RateRow>) => setRates((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

    async function submit() {
        const token = getAccessToken()
        if (!token) return
        if (!fullName.trim() || !code.trim()) { setError("Nama dan kode agen wajib diisi."); return }
        if (split !== "" && !validRate(split)) { setError("Bagi hasil default harus antara 0 dan 100."); return }
        if (rates.some((r) => !r.insurer_id || !validRate(r.split_rate))) { setError("Lengkapi asuransi dan persentase (0–100) pada setiap bagi hasil khusus."); return }

        setSaving(true); setError(null)
        try {
            const payload = {
                full_name: fullName.trim(),
                agent_code: code.trim(),
                phone_number: phone.trim(),
                whatsapp_number: whatsapp.trim(),
                email: email.trim(),
                joined_date: joined,
                status,
                default_split_rate: split === "" ? 0 : Number(split),
                wa_digest_enabled: waDigest,
                notes: notes.trim(),
                insurer_rates: rates.map((r) => ({ insurer_id: r.insurer_id, split_rate: Number(r.split_rate) })),
            }
            const saved = agent ? await updateSubAgent(token, agent.sub_agent_id, payload) : await createSubAgent(token, payload)
            onSaved(saved)
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan sub-agen"))
            setSaving(false)
        }
    }

    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="560px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{agent ? "Ubah Sub-Agen" : "Tambah Sub-Agen"}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="14px">
                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="2" minW="200px">
                                    <Text {...CLAIM_LABEL}>Nama lengkap <Required /></Text>
                                    <Input {...CLAIM_INPUT} value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="120px">
                                    <Text {...CLAIM_LABEL}>Kode agen <Required /></Text>
                                    <Input {...CLAIM_INPUT} value={code} maxLength={50} onChange={(e) => setCode(e.target.value)} />
                                </Flex>
                            </Flex>
                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>No. telepon</Text>
                                    <Input {...CLAIM_INPUT} inputMode="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>WhatsApp</Text>
                                    <Input {...CLAIM_INPUT} inputMode="tel" value={whatsapp} maxLength={30} onChange={(e) => setWhatsapp(e.target.value)} />
                                </Flex>
                            </Flex>
                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Email</Text>
                                    <Input {...CLAIM_INPUT} type="email" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Tanggal bergabung</Text>
                                    <Input {...CLAIM_INPUT} type="date" value={joined} onChange={(e) => setJoined(e.target.value)} />
                                </Flex>
                            </Flex>
                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Status</Text>
                                    <SearchSelect value={status} onChange={(v) => setStatus(v as SubAgentStatus)} options={STATUS_OPTIONS} ariaLabel="Status sub-agen" />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Bagi hasil komisi default (%)</Text>
                                    <Input {...CLAIM_INPUT} inputMode="decimal" placeholder="0" value={split} onChange={(e) => setSplit(cleanRate(e.target.value))} />
                                </Flex>
                            </Flex>
                            <Text color="#64748B" fontSize="14px" mt="-6px">
                                Bagian dari komisi kotor yang diteruskan ke sub-agen. Berlaku untuk polis baru; komisi yang sudah tercatat tidak berubah.
                            </Text>

                            <Flex flexDir="column" gap="8px">
                                <Flex justify="space-between" align="center">
                                    <Text {...CLAIM_LABEL}>Bagi hasil khusus per asuransi</Text>
                                    <Button size="xs" variant="outline" borderColor="#E2E8F0" color="#374151" gap="4px" disabled={!canAddRate}
                                        onClick={() => setRates((rs) => [...rs, { insurer_id: "", split_rate: "" }])}>
                                        <LuPlus size={12} /> Tambah
                                    </Button>
                                </Flex>
                                {rates.length === 0 && <Text color="#64748B" fontSize="14px">Tidak ada. Semua asuransi memakai bagi hasil default.</Text>}
                                {rates.map((r, idx) => (
                                    <Flex key={idx} gap="8px" align="center">
                                        <Flex flex="1" minW="0">
                                            <SearchSelect value={r.insurer_id} onChange={(v) => setRate(idx, { insurer_id: v })}
                                                options={insurerOptions(r.insurer_id)} placeholder="Pilih asuransi" ariaLabel="Asuransi" />
                                        </Flex>
                                        <Input {...CLAIM_INPUT} w="90px" inputMode="decimal" placeholder="%" aria-label="Persentase bagi hasil"
                                            value={r.split_rate} onChange={(e) => setRate(idx, { split_rate: cleanRate(e.target.value) })} />
                                        <IconButton size="sm" variant="ghost" color="#DC2626" aria-label="Hapus bagi hasil khusus"
                                            onClick={() => setRates((rs) => rs.filter((_, i) => i !== idx))}>
                                            <LuTrash2 size={14} />
                                        </IconButton>
                                    </Flex>
                                ))}
                            </Flex>

                            <Flex as="label" align="center" gap="8px" cursor="pointer">
                                <input type="checkbox" checked={waDigest} onChange={(e) => setWaDigest(e.target.checked)} />
                                <Text color="#374151" fontSize="15px">Kirim pengingat perpanjangan polis ke WhatsApp sub-agen</Text>
                            </Flex>

                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Catatan</Text>
                                <Textarea {...CLAIM_INPUT} rows={2} value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} />
                            </Flex>
                            {error && <Text fontSize="14px" color="#DC2626">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                            _hover={{ bg: "#F1F5F9" }} disabled={saving} onClick={onClose}>Batal</Button>
                        <Button flex="1" bg="#1A3557" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#162C47" }}
                            loading={saving} loadingText="Menyimpan..." onClick={submit}>Simpan</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
