"use client"

import { useEffect, useState } from "react"
import { Badge, Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuCircleAlert, LuCircleCheck, LuFolderOpen, LuUpload } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    getCustomerKyc, getDocuments,
    type ApiCustomerKyc, type ApiDocument, type ApiDocumentType,
} from "@/lib/api/documents"
import { DocumentsTable } from "./DocumentsTable"
import { UploadDocumentDialog } from "./UploadDocumentDialog"

const KYC_LABELS: Partial<Record<ApiDocumentType, string>> = {
    ktp: "KTP",
    npwp: "NPWP",
    nib: "NIB",
    akta_pendirian: "Akta Pendirian",
}

export interface DocumentsPanelProps {
    /** Customer context: all of the customer's documents plus their KYC checklist. */
    customer?: { id: string; name: string; type: "individual" | "company" }
    /** Policy context: only this policy's documents. */
    policy?: { id: string; number: string }
    /** Called after any upload / archive / delete (e.g. to refresh a policy timeline). */
    onChanged?: () => void
    /** Bump to reload, e.g. after the page uploaded a document through its own dialog. */
    refreshKey?: number
}

/** "Dokumen" card for the customer and policy detail pages. Shows archived documents too. */
export function DocumentsPanel({ customer, policy, onChanged, refreshKey = 0 }: DocumentsPanelProps) {
    const [reloadKey, setReloadKey] = useState(0)
    const [uploadType, setUploadType] = useState<ApiDocumentType | null>(null)
    const customerId = customer?.id
    const policyId   = policy?.id
    const scopeKey = `${customerId ?? ""}|${policyId ?? ""}|${reloadKey}|${refreshKey}`
    const [result, setResult] = useState<{ key: string; docs: ApiDocument[]; kyc: ApiCustomerKyc | null; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        const key = `${customerId ?? ""}|${policyId ?? ""}|${reloadKey}|${refreshKey}`
        let cancelled = false
        Promise.all([
            getDocuments(token, { customer_id: policyId ? undefined : customerId, policy_id: policyId, status: "all", limit: 50 }),
            customerId && !policyId ? getCustomerKyc(token, customerId) : Promise.resolve(null),
        ])
            .then(([docs, kyc]) => { if (!cancelled) setResult({ key, docs: docs.data ?? [], kyc, error: null }) })
            .catch((err: unknown) => { if (!cancelled) setResult({ key, docs: [], kyc: null, error: errorMessage(err, "Dokumen belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [customerId, policyId, reloadKey, refreshKey])

    // Links such as /agentra/customer/detail?id=…#dokumen land here; the browser can't
    // scroll to the anchor itself because the panel renders after the data loads.
    const loaded = result !== null
    useEffect(() => {
        if (loaded && window.location.hash === "#dokumen") {
            document.getElementById("dokumen")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [loaded])

    const loading = result?.key !== scopeKey
    const docs    = loading ? [] : result?.docs ?? []
    const kyc     = result?.kyc ?? null
    const error   = loading ? null : result?.error ?? null

    function changed() {
        setReloadKey((k) => k + 1)
        onChanged?.()
    }

    return (
        <Box id="dokumen" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" scrollMarginTop="80px">
            <Flex justify="space-between" align="center" px="24px" pt="20px" pb="16px" gap="12px" flexWrap="wrap">
                <Flex gap="10px" align="center">
                    <Box p="8px" bg="#EFF6FF" borderRadius="8px" color="#1A3557"><LuFolderOpen size={18} /></Box>
                    <Flex flexDir="column">
                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">
                            {policy ? "Dokumen Polis" : "Dokumen Nasabah"}
                        </Text>
                        <Text color="#5D6D7E" fontSize="14px">
                            {loading ? "Memuat..." : `${docs.length} dokumen${policy ? "" : " (termasuk dokumen polis)"}`}
                        </Text>
                    </Flex>
                </Flex>
                <Button size="sm" bg="#1A3557" color="white" gap="6px" fontSize="15px" _hover={{ bg: "#162C47" }}
                    onClick={() => setUploadType(policy ? "policy" : "other")}>
                    <LuUpload size={14} /> Unggah Dokumen
                </Button>
            </Flex>

            {kyc && (
                <Flex mx="24px" mb="16px" px="14px" py="12px" gap="10px" align="center" flexWrap="wrap" borderRadius="10px"
                    bg={kyc.complete ? "#F0FDF4" : "#FFFBEB"} border="1px solid" borderColor={kyc.complete ? "#BBF7D0" : "#FDE68A"}>
                    <Flex align="center" gap="6px" color={kyc.complete ? "#16A34A" : "#B45309"} mr="4px">
                        {kyc.complete ? <LuCircleCheck size={16} /> : <LuCircleAlert size={16} />}
                        <Text fontSize="15px" fontWeight="semibold">{kyc.complete ? "KYC lengkap" : "KYC belum lengkap"}</Text>
                    </Flex>
                    {kyc.required.map((t) => {
                        const ok = kyc.present.includes(t)
                        return ok ? (
                            <Badge key={t} px="8px" py="2px" borderRadius="full" fontSize="14px" bg="#DCFCE7" color="#16A34A" gap="4px">
                                <LuCircleCheck size={11} /> {KYC_LABELS[t] ?? t}
                            </Badge>
                        ) : (
                            <Button key={t} size="2xs" variant="outline" borderRadius="full" borderColor="#F59E0B" color="#B45309"
                                bg="white" fontSize="14px" gap="4px" px="8px" onClick={() => setUploadType(t)}>
                                <LuUpload size={10} /> {KYC_LABELS[t] ?? t}
                            </Button>
                        )
                    })}
                    {customer?.type === "company" && !kyc.complete && (
                        <Text color="#92400E" fontSize="14px" flexBasis="100%">KTP untuk nasabah perusahaan adalah KTP direktur / pengurus.</Text>
                    )}
                </Flex>
            )}

            {error && <Text px="24px" pb="20px" fontSize="15px" color="#DC2626">{error}</Text>}

            {!error && loading && (
                <Flex flexDir="column" gap="8px" px="24px" pb="20px">
                    {[1, 2].map((i) => <Skeleton key={i} h="44px" borderRadius="8px" />)}
                </Flex>
            )}

            {!error && !loading && docs.length === 0 && (
                <Text px="24px" pb="20px" color="#64748B" fontSize="15px">Belum ada dokumen.</Text>
            )}

            {!error && !loading && docs.length > 0 && (
                <Box borderTop="1px solid" borderColor="#F1F5F9">
                    <DocumentsTable documents={docs} onChanged={changed} showCustomer={false} showPolicy={!policy} />
                </Box>
            )}

            <UploadDocumentDialog
                open={uploadType !== null}
                onClose={() => setUploadType(null)}
                onUploaded={changed}
                customer={customer && !policy ? { id: customer.id, name: customer.name } : undefined}
                policy={policy}
                defaultType={uploadType ?? undefined}
            />
        </Box>
    )
}

