"use client"

import { useEffect, useState } from "react"
import { Button, Dialog, Flex, Input, Text, Textarea } from "@chakra-ui/react"
import { SearchSelect } from "@/components/ui/search-select"
import { CustomerPicker } from "@/components/documents/UploadDocumentDialog"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { createClaim, type ApiClaim } from "@/lib/api/claims"
import { getCustomerPolicies, type ApiCustomerPolicy } from "@/lib/api/customers"
import { localISODate } from "@/lib/format"
import { CLAIM_INPUT, CLAIM_LABEL, MoneyInput, Required } from "./fields"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

const OTHER_CAUSE = "__other__"
const CAUSE_SUGGESTIONS = ["Tabrakan", "Kehilangan / pencurian", "Kebakaran", "Banjir", "Gempa bumi", "Kerusakan", "Kecelakaan diri", "Rawat inap"]

export interface RegisterClaimDialogProps {
    open: boolean
    onClose: () => void
    onRegistered: (claim: ApiClaim) => void
    /** Fixed policy — hides the customer and policy pickers. */
    policy?: { id: string; number: string; coverage_start: string; coverage_end: string }
    /** Fixed customer — hides the customer picker. */
    customer?: { id: string; name: string }
}

export function RegisterClaimDialog(props: RegisterClaimDialogProps) {
    // Remount on every open so the form always starts clean.
    if (!props.open) return null
    return <RegisterClaimForm {...props} />
}

function RegisterClaimForm({ onClose, onRegistered, policy, customer }: RegisterClaimDialogProps) {
    const today = localISODate()
    const [pickedCustomer, setPickedCustomer] = useState<{ id: string; name: string } | null>(customer ?? null)
    const [policyId, setPolicyId]   = useState("")
    const [policies, setPolicies]   = useState<{ customerId: string; list: ApiCustomerPolicy[] } | null>(null)
    const [dateOfLoss, setDateOfLoss] = useState("")
    const [reportedDate, setReportedDate] = useState(today)
    const [cause, setCause]         = useState("")
    // "Lainnya" shows a text box for a cause that is not in the list.
    const [otherCause, setOtherCause] = useState(false)
    const [location, setLocation]   = useState("")
    const [description, setDescription] = useState("")
    const [estimated, setEstimated] = useState("")
    const [deductible, setDeductible] = useState("")
    const [insurerRef, setInsurerRef] = useState("")
    const [saving, setSaving]       = useState(false)
    const [error, setError]         = useState<string | null>(null)

    const customerId = pickedCustomer?.id
    useEffect(() => {
        if (policy || !customerId) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getCustomerPolicies(token, customerId, { limit: 50 })
            .then((res) => { if (!cancelled) setPolicies({ customerId, list: res.data ?? [] }) })
            .catch(() => { if (!cancelled) setPolicies({ customerId, list: [] }) })
        return () => { cancelled = true }
    }, [policy, customerId])

    const policiesLoading = !policy && !!customerId && policies?.customerId !== customerId
    const chosen = policy
        ? { policy_id: policy.id, coverage_start: policy.coverage_start, coverage_end: policy.coverage_end }
        : policies?.customerId === customerId ? policies?.list.find((p) => p.policy_id === policyId) : undefined
    const maxLoss = chosen && chosen.coverage_end < today ? chosen.coverage_end : today

    const policyOptions = (policies?.customerId === customerId ? policies?.list ?? [] : []).map((p) => ({
        value: p.policy_id,
        disabled: p.renewal_status === "cancelled",
        label: `${p.policy_number}${p.insurer_short_name ? ` · ${p.insurer_short_name}` : ""} · ${fmtMonth(p.coverage_start)} – ${fmtMonth(p.coverage_end)}${p.renewal_status === "cancelled" ? " (dibatalkan)" : ""}`,
    }))

    async function handleSubmit() {
        if (!chosen) { setError("Pilih polis yang diklaim."); return }
        if (!dateOfLoss) { setError("Tanggal kejadian wajib diisi."); return }
        if (dateOfLoss < chosen.coverage_start || dateOfLoss > chosen.coverage_end) {
            setError(`Tanggal kejadian harus dalam masa pertanggungan (${chosen.coverage_start} s/d ${chosen.coverage_end}).`); return
        }
        if (dateOfLoss > today) { setError("Tanggal kejadian tidak boleh di masa depan."); return }
        if (!cause.trim()) { setError("Penyebab kerugian wajib diisi."); return }
        if (reportedDate < dateOfLoss) { setError("Tanggal lapor tidak boleh sebelum tanggal kejadian."); return }
        const token = getAccessToken()
        if (!token) return
        setSaving(true)
        setError(null)
        try {
            const claim = await createClaim(token, {
                policy_id: chosen.policy_id,
                date_of_loss: dateOfLoss,
                reported_date: reportedDate,
                cause: cause.trim(),
                loss_location: location.trim() || undefined,
                description: description.trim() || undefined,
                estimated_loss: estimated ? Number(estimated) : 0,
                deductible: deductible ? Number(deductible) : 0,
                insurer_claim_number: insurerRef.trim() || undefined,
            })
            onRegistered(claim)
            onClose()
        } catch (err) {
            setError(errorMessage(err, "Gagal mendaftarkan klaim"))
        } finally {
            setSaving(false)
        }
    }

    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} scrollBehavior="inside" onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="520px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Flex flexDir="column" gap="2px">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Daftarkan Klaim</Dialog.Title>
                            {(policy || customer) && (
                                <Text color="#64748B" fontSize="14px">{policy ? `Polis ${policy.number}` : customer?.name}</Text>
                            )}
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="14px">
                            {!policy && !customer && (
                                <Flex flexDir="column" gap="4px">
                                    <Text {...CLAIM_LABEL}>Nasabah <Required /></Text>
                                    <CustomerPicker value={pickedCustomer} onChange={(c) => { setPickedCustomer(c); setPolicyId("") }} disabled={saving} />
                                </Flex>
                            )}

                            {!policy && pickedCustomer && (
                                <Flex flexDir="column" gap="4px">
                                    <Text {...CLAIM_LABEL}>Polis <Required /></Text>
                                    <SearchSelect value={policyId} onChange={setPolicyId} options={policyOptions} loading={policiesLoading}
                                        disabled={saving} placeholder="Pilih polis" ariaLabel="Polis" />
                                    {!policiesLoading && policyOptions.length === 0 && (
                                        <Text color="#64748B" fontSize="14px">Nasabah ini belum memiliki polis.</Text>
                                    )}
                                </Flex>
                            )}

                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Tanggal Kejadian <Required /></Text>
                                    <Input {...CLAIM_INPUT} type="date" aria-label="Tanggal kejadian" value={dateOfLoss}
                                        min={chosen?.coverage_start} max={maxLoss} onChange={(e) => setDateOfLoss(e.target.value)} />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Tanggal Lapor</Text>
                                    <Input {...CLAIM_INPUT} type="date" aria-label="Tanggal lapor" value={reportedDate}
                                        min={dateOfLoss || undefined} max={today} onChange={(e) => setReportedDate(e.target.value)} />
                                </Flex>
                            </Flex>
                            {chosen && (
                                <Text color="#64748B" fontSize="14px" mt="-8px">
                                    Masa pertanggungan: {chosen.coverage_start} s/d {chosen.coverage_end}
                                </Text>
                            )}

                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Penyebab Kerugian <Required /></Text>
                                <SearchSelect
                                    value={otherCause ? OTHER_CAUSE : CAUSE_SUGGESTIONS.includes(cause) ? cause : ""}
                                    onChange={(v) => {
                                        if (v === OTHER_CAUSE) { setOtherCause(true); setCause("") }
                                        else { setOtherCause(false); setCause(v) }
                                    }}
                                    placeholder="Pilih penyebab"
                                    options={[...CAUSE_SUGGESTIONS.map((c) => ({ value: c, label: c })), { value: OTHER_CAUSE, label: "Lainnya (tulis sendiri)" }]}
                                />
                                {otherCause && (
                                    <Input {...CLAIM_INPUT} placeholder="Tulis penyebab kerugian" maxLength={200} aria-label="Penyebab kerugian"
                                        value={cause} onChange={(e) => setCause(e.target.value)} />
                                )}
                            </Flex>

                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Lokasi Kejadian</Text>
                                <Input {...CLAIM_INPUT} maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} />
                            </Flex>

                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>Kronologi Kejadian</Text>
                                <Textarea {...CLAIM_INPUT} rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
                            </Flex>

                            <Flex gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Estimasi Kerugian (Rp)</Text>
                                    <MoneyInput value={estimated} onChange={setEstimated} aria-label="Estimasi kerugian" />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1" minW="160px">
                                    <Text {...CLAIM_LABEL}>Risiko Sendiri / Deductible (Rp)</Text>
                                    <MoneyInput value={deductible} onChange={setDeductible} aria-label="Risiko sendiri" />
                                </Flex>
                            </Flex>

                            <Flex flexDir="column" gap="4px">
                                <Text {...CLAIM_LABEL}>No. Klaim dari Asuransi (jika sudah ada)</Text>
                                <Input {...CLAIM_INPUT} maxLength={100} value={insurerRef} onChange={(e) => setInsurerRef(e.target.value)} />
                            </Flex>

                            {error && <Text fontSize="14px" color="#DC2626">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                            _hover={{ bg: "#F1F5F9" }} disabled={saving} onClick={onClose}>
                            Batal
                        </Button>
                        <Button flex="1" bg="#1A3557" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#162C47" }}
                            loading={saving} loadingText="Menyimpan..." onClick={handleSubmit}>
                            Daftarkan
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

function fmtMonth(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", { month: "short", year: "numeric" })
}
