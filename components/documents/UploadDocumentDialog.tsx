"use client"

import { useEffect, useRef, useState } from "react"
import { Box, Button, Dialog, Flex, Input, Spinner, Text, Textarea } from "@chakra-ui/react"
import { LuFileText, LuImage, LuUpload, LuX } from "react-icons/lu"
import { SearchSelect } from "@/components/ui/search-select"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getCustomers, getCustomerPolicies, type ApiCustomer, type ApiCustomerPolicy } from "@/lib/api/customers"
import {
    DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, DOCUMENT_TYPE_LABELS, uploadDocument,
    type ApiDocument, type ApiDocumentType,
} from "@/lib/api/documents"
import { fmtFileSize } from "@/lib/format"
import { useOpenOnMount } from "@/components/ui/use-open-on-mount"

const LABEL = { fontSize: "14px", color: "#5D6D7E", fontWeight: "medium" } as const
const ACCEPTED_TYPES = DOCUMENT_ACCEPT.split(",")
const TYPE_OPTIONS = (Object.entries(DOCUMENT_TYPE_LABELS) as [ApiDocumentType, string][]).map(([value, label]) => ({ value, label }))

export interface UploadDocumentDialogProps {
    open: boolean
    onClose: () => void
    onUploaded: (doc: ApiDocument) => void
    /** Fixed customer — hides the customer picker. */
    customer?: { id: string; name: string }
    /** Fixed policy — hides the customer and policy pickers (the API takes the customer from the policy). */
    policy?: { id: string; number: string }
    /** Fixed claim — the API takes the policy and customer from it. `requirement` is the checklist item being filled. */
    claim?: { id: string; number: string; requirement?: { key: string; label: string } }
    defaultType?: ApiDocumentType
}

export function UploadDocumentDialog(props: UploadDocumentDialogProps) {
    // Remount on every open so the form always starts clean.
    if (!props.open) return null
    return <UploadDocumentForm {...props} />
}

function UploadDocumentForm({ onClose, onUploaded, customer, policy, claim, defaultType }: UploadDocumentDialogProps) {
    const [file, setFile]                 = useState<File | null>(null)
    const [dragging, setDragging]         = useState(false)
    const [documentType, setDocumentType] = useState<ApiDocumentType>(defaultType ?? (claim ? "claim" : policy ? "policy" : "other"))
    const [pickedCustomer, setPickedCustomer] = useState<{ id: string; name: string } | null>(customer ?? null)
    const [policyId, setPolicyId]         = useState("")
    const [title, setTitle]               = useState("")
    const [year, setYear]                 = useState("")
    const [notes, setNotes]               = useState("")
    const [saving, setSaving]             = useState(false)
    const [error, setError]               = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    function pickFile(f: File | undefined) {
        if (!f) return
        if (!ACCEPTED_TYPES.includes(f.type)) { setError("Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG."); return }
        if (f.size > DOCUMENT_MAX_BYTES) { setError("File terlalu besar. Maksimal 10MB."); return }
        setError(null)
        setFile(f)
    }

    async function handleSubmit() {
        if (!file) { setError("Pilih file yang akan diunggah."); return }
        if (!policy && !claim && !pickedCustomer) { setError("Pilih nasabah pemilik dokumen."); return }
        const yearNum = year ? Number(year) : undefined
        if (yearNum !== undefined && (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 5)) {
            setError("Tahun tidak valid."); return
        }
        const token = getAccessToken()
        if (!token) return
        setSaving(true)
        setError(null)
        try {
            const doc = await uploadDocument(token, {
                file,
                document_type: documentType,
                claim_id: claim?.id,
                claim_requirement: claim?.requirement?.key,
                policy_id: claim ? undefined : policy?.id ?? (policyId || undefined),
                customer_id: policy || claim ? undefined : pickedCustomer?.id,
                title: title.trim() || claim?.requirement?.label || undefined,
                notes: notes.trim() || undefined,
                document_year: yearNum,
            })
            onUploaded(doc)
            onClose()
        } catch (err) {
            setError(errorMessage(err, "Gagal mengunggah dokumen"))
        } finally {
            setSaving(false)
        }
    }

    const { open: shown } = useOpenOnMount()

    return (
        <Dialog.Root open={shown} onOpenChange={(d) => { if (!d.open && !saving) onClose() }}>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW="480px" w="92vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Flex flexDir="column" gap="2px">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Unggah Dokumen</Dialog.Title>
                            {(policy || customer || claim) && (
                                <Text color="#64748B" fontSize="14px">
                                    {claim ? `Klaim ${claim.number}${claim.requirement ? ` · ${claim.requirement.label}` : ""}` : policy ? `Polis ${policy.number}` : customer?.name}
                                </Text>
                            )}
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="14px">
                            {/* File */}
                            <input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} hidden
                                onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = "" }} />
                            {file ? (
                                <Flex align="center" gap="10px" px="12px" py="10px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
                                    <Box color="#1A3557" flexShrink={0}>{file.type === "application/pdf" ? <LuFileText size={20} /> : <LuImage size={20} />}</Box>
                                    <Flex flexDir="column" minW="0" flex="1">
                                        <Text color="#1C2833" fontSize="15px" fontWeight="medium" truncate>{file.name}</Text>
                                        <Text color="#64748B" fontSize="14px">{fmtFileSize(file.size)}</Text>
                                    </Flex>
                                    <Button size="xs" variant="ghost" color="#64748B" aria-label="Hapus file" disabled={saving} onClick={() => setFile(null)}>
                                        <LuX size={14} />
                                    </Button>
                                </Flex>
                            ) : (
                                <Flex
                                    as="button" flexDir="column" align="center" gap="6px" py="22px" px="16px"
                                    border="2px dashed" borderColor={dragging ? "#3B82F6" : "#CBD5E1"} borderRadius="10px"
                                    bg={dragging ? "#EFF6FF" : "#F8FAFC"} cursor="pointer" textAlign="center"
                                    _hover={{ borderColor: "#3B82F6" }}
                                    onClick={() => inputRef.current?.click()}
                                    onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true) }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
                                >
                                    <Box color="#1A3557"><LuUpload size={22} /></Box>
                                    <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Klik atau seret file ke sini</Text>
                                    <Text color="#64748B" fontSize="14px">PDF, JPG, atau PNG · Maks. 10MB</Text>
                                </Flex>
                            )}

                            <Flex flexDir="column" gap="4px">
                                <Text {...LABEL}>Jenis Dokumen <Text as="span" color="#DC2626">*</Text></Text>
                                <SearchSelect value={documentType} onChange={(v) => v && setDocumentType(v as ApiDocumentType)}
                                    options={TYPE_OPTIONS} ariaLabel="Jenis dokumen" />
                            </Flex>

                            {!policy && !customer && !claim && (
                                <Flex flexDir="column" gap="4px">
                                    <Text {...LABEL}>Nasabah <Text as="span" color="#DC2626">*</Text></Text>
                                    <CustomerPicker value={pickedCustomer} onChange={(c) => { setPickedCustomer(c); setPolicyId("") }} disabled={saving} />
                                </Flex>
                            )}

                            {!policy && !claim && pickedCustomer && (
                                <Flex flexDir="column" gap="4px">
                                    <Text {...LABEL}>Polis (opsional)</Text>
                                    <PolicyPicker customerId={pickedCustomer.id} value={policyId} onChange={setPolicyId} disabled={saving} />
                                </Flex>
                            )}

                            <Flex gap="12px">
                                <Flex flexDir="column" gap="4px" flex="2">
                                    <Text {...LABEL}>Judul (opsional)</Text>
                                    <Input fontSize="15px" borderColor="#E2E8F0" borderRadius="8px" placeholder={claim?.requirement?.label ?? "Contoh: KTP Direktur"}
                                        maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
                                </Flex>
                                <Flex flexDir="column" gap="4px" flex="1">
                                    <Text {...LABEL}>Tahun</Text>
                                    <Input fontSize="15px" borderColor="#E2E8F0" borderRadius="8px" placeholder="Otomatis"
                                        inputMode="numeric" maxLength={4} value={year}
                                        onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} />
                                </Flex>
                            </Flex>

                            <Flex flexDir="column" gap="4px">
                                <Text {...LABEL}>Catatan (opsional)</Text>
                                <Textarea fontSize="15px" borderColor="#E2E8F0" borderRadius="8px" rows={2}
                                    value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                            loading={saving} loadingText="Mengunggah..." onClick={handleSubmit}>
                            Unggah
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

// Server-side search: the customers endpoint pages at 15 rows, so the list can't be loaded up front.
export function CustomerPicker({ value, onChange, disabled }: {
    value: { id: string; name: string } | null
    onChange: (c: { id: string; name: string } | null) => void
    disabled?: boolean
}) {
    const [query, setQuery]     = useState("")
    const [results, setResults] = useState<{ q: string; customers: ApiCustomer[] } | null>(null)

    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) return
        const token = getAccessToken()
        if (!token) return
        const controller = new AbortController()
        const t = setTimeout(() => {
            getCustomers(token, { params: q, limit: 10, signal: controller.signal })
                .then((res) => setResults({ q, customers: res.data ?? [] }))
                .catch(() => { if (!controller.signal.aborted) setResults({ q, customers: [] }) })
        }, 300)
        return () => { clearTimeout(t); controller.abort() }
    }, [query])

    if (value) {
        return (
            <Flex align="center" justify="space-between" px="12px" h="40px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px">
                <Text color="#1C2833" fontSize="15px" truncate>{value.name}</Text>
                <Button size="xs" variant="ghost" color="#64748B" aria-label="Ganti nasabah" disabled={disabled} onClick={() => onChange(null)}>
                    <LuX size={14} />
                </Button>
            </Flex>
        )
    }

    const q = query.trim()
    const searching = q.length >= 2 && results?.q !== q
    const list = q.length >= 2 && results?.q === q ? results.customers : []

    return (
        <Box position="relative">
            <Input fontSize="15px" borderColor="#E2E8F0" borderRadius="8px" placeholder="Ketik nama, NIK, atau NPWP..."
                aria-label="Cari nasabah" value={query} disabled={disabled} onChange={(e) => setQuery(e.target.value)} />
            {q.length >= 2 && (
                <Box mt="4px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" maxH="200px" overflowY="auto" bg="white">
                    {searching && <Flex justify="center" py="10px"><Spinner size="xs" color="#64748B" /></Flex>}
                    {!searching && list.length === 0 && <Text color="#64748B" fontSize="14px" px="12px" py="10px">Nasabah tidak ditemukan</Text>}
                    {list.map((c) => (
                        <Box key={c.customer_id} as="button" w="100%" textAlign="left" px="12px" py="8px" _hover={{ bg: "#F1F5F9" }}
                            onClick={() => onChange({ id: c.customer_id, name: c.display_name })}>
                            <Text color="#1C2833" fontSize="15px">{c.display_name}</Text>
                            <Text color="#64748B" fontSize="14px">
                                {c.customer_type === "company" ? "Perusahaan" : "Perorangan"}
                                {c.nik ? ` · ${c.nik}` : c.npwp_company ? ` · ${c.npwp_company}` : ""}
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    )
}

function PolicyPicker({ customerId, value, onChange, disabled }: {
    customerId: string
    value: string
    onChange: (v: string) => void
    disabled?: boolean
}) {
    const [loaded, setLoaded] = useState<{ customerId: string; policies: ApiCustomerPolicy[] } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getCustomerPolicies(token, customerId, { limit: 15 })
            .then((res) => { if (!cancelled) setLoaded({ customerId, policies: res.data ?? [] }) })
            .catch(() => { if (!cancelled) setLoaded({ customerId, policies: [] }) })
        return () => { cancelled = true }
    }, [customerId])

    const loading = loaded?.customerId !== customerId
    const options = [
        { value: "", label: "Tanpa polis (dokumen nasabah)" },
        ...(loaded?.policies ?? []).map((p) => ({
            value: p.policy_id,
            label: `${p.policy_number}${p.insurer_short_name ? ` · ${p.insurer_short_name}` : ""} · s/d ${new Date(p.coverage_end).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`,
        })),
    ]

    return <SearchSelect value={value} onChange={onChange} options={options} loading={loading} disabled={disabled} ariaLabel="Polis" />
}
