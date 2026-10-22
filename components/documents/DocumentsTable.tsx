"use client"

import { useState } from "react"
import { Badge, Box, Button, Dialog, Flex, IconButton, Input, Table, Text } from "@chakra-ui/react"
import { LuArchive, LuArchiveRestore, LuDownload, LuEye, LuFileText, LuImage, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    DOCUMENT_TYPE_LABELS, archiveDocument, deleteDocument, unarchiveDocument,
    type ApiDocument,
} from "@/lib/api/documents"
import { fmtFileSize } from "@/lib/format"
import { DocumentPreviewDialog, downloadDocument } from "./DocumentPreviewDialog"

export const DOCUMENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    policy:         { bg: "#DBEAFE", color: "#1D4ED8" },
    endorsement:    { bg: "#FEF3C7", color: "#D97706" },
    sppa:           { bg: "#E0E7FF", color: "#4338CA" },
    ktp:            { bg: "#DCFCE7", color: "#16A34A" },
    npwp:           { bg: "#DCFCE7", color: "#16A34A" },
    nib:            { bg: "#DCFCE7", color: "#16A34A" },
    akta_pendirian: { bg: "#DCFCE7", color: "#16A34A" },
    survey_photo:   { bg: "#CFFAFE", color: "#0891B2" },
    claim:          { bg: "#FEE2E2", color: "#DC2626" },
    payment_proof:  { bg: "#F3E8FF", color: "#7C3AED" },
    other:          { bg: "#F1F5F9", color: "#64748B" },
}

function fmtDate(iso: string) {
    return new Date(iso.replace(" ", "T")).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

type Pending = { kind: "archive" | "delete"; doc: ApiDocument } | null

export interface DocumentsTableProps {
    documents: ApiDocument[]
    /** Called after a document was archived, restored or deleted. */
    onChanged: () => void
    showCustomer?: boolean
    showPolicy?: boolean
}

export function DocumentsTable({ documents, onChanged, showCustomer = true, showPolicy = true }: DocumentsTableProps) {
    const [preview, setPreview]   = useState<ApiDocument | null>(null)
    const [pending, setPending]   = useState<Pending>(null)
    const [reason, setReason]     = useState("")
    const [busy, setBusy]         = useState(false)
    const [rowError, setRowError] = useState<string | null>(null)

    async function run(action: () => Promise<unknown>) {
        setBusy(true)
        setRowError(null)
        try {
            await action()
            setPending(null)
            onChanged()
        } catch (err) {
            setRowError(errorMessage(err, "Aksi gagal. Coba lagi."))
        } finally {
            setBusy(false)
        }
    }

    async function restore(doc: ApiDocument) {
        const token = getAccessToken()
        if (token) await run(() => unarchiveDocument(token, doc.document_id))
    }

    async function confirm() {
        const token = getAccessToken()
        if (!token || !pending) return
        const { kind, doc } = pending
        await run(() => kind === "archive"
            ? archiveDocument(token, doc.document_id, reason.trim())
            : deleteDocument(token, doc.document_id))
    }

    const headers = ["DOKUMEN", ...(showCustomer ? ["NASABAH"] : []), ...(showPolicy ? ["POLIS"] : []), "TAHUN", "DIUNGGAH", ""]

    return (
        <>
            {rowError && !pending && (
                <Box px="20px" py="10px" bg="#FEF2F2" borderBottom="1px solid" borderColor="#FECACA">
                    <Text color="#DC2626" fontSize="14px">{rowError}</Text>
                </Box>
            )}
            <Table.ScrollArea>
                <Table.Root size="sm">
                    <Table.Header>
                        <Table.Row bg="#F8FAFC">
                            {headers.map((h) => (
                                <Table.ColumnHeader key={h} color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px" whiteSpace="nowrap">
                                    {h}
                                </Table.ColumnHeader>
                            ))}
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {documents.map((d) => {
                            const typeCfg = DOCUMENT_TYPE_COLORS[d.document_type] ?? DOCUMENT_TYPE_COLORS.other
                            const archived = d.status === "archived"
                            const deleteBlocked = archived
                                ? "Dokumen arsip tidak dapat dihapus"
                                : d.policy_expired ? "Polis sudah berakhir — arsipkan dokumen ini" : null
                            return (
                                <Table.Row key={d.document_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}
                                    opacity={archived ? 0.75 : 1}>
                                    <Table.Cell px="16px" py="10px" minW="220px">
                                        <Flex gap="10px" align="center">
                                            <Box color="#64748B" flexShrink={0}>
                                                {d.mime_type === "application/pdf" ? <LuFileText size={18} /> : <LuImage size={18} />}
                                            </Box>
                                            <Flex flexDir="column" gap="3px" minW="0">
                                                <Text as="button" textAlign="left" color="#1C2833" fontSize="15px" fontWeight="medium"
                                                    _hover={{ color: "#1D4ED8", textDecoration: "underline" }} truncate maxW="280px"
                                                    onClick={() => setPreview(d)}>
                                                    {d.title || d.file_name}
                                                </Text>
                                                <Flex gap="6px" align="center" flexWrap="wrap">
                                                    <Badge px="6px" py="0" borderRadius="full" fontSize="14px" bg={typeCfg.bg} color={typeCfg.color}>
                                                        {DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}
                                                    </Badge>
                                                    {archived && (
                                                        <Badge px="6px" py="0" borderRadius="full" fontSize="14px" bg="#F1F5F9" color="#64748B"
                                                            title={d.archive_reason ?? undefined}>
                                                            Arsip
                                                        </Badge>
                                                    )}
                                                    <Text color="#64748B" fontSize="14px">{fmtFileSize(d.file_size)}</Text>
                                                </Flex>
                                            </Flex>
                                        </Flex>
                                    </Table.Cell>
                                    {showCustomer && (
                                        <Table.Cell px="16px" py="10px" color="#1C2833" fontSize="15px" whiteSpace="nowrap">{d.customer_name}</Table.Cell>
                                    )}
                                    {showPolicy && (
                                        <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                            {d.policy_number ? (
                                                <Flex flexDir="column">
                                                    <Text color="#1C2833" fontSize="14px" fontFamily="mono">{d.policy_number}</Text>
                                                    <Text color={d.policy_expired ? "#DC2626" : "#94A3B8"} fontSize="14px">
                                                        {d.insurer_short_name ?? ""}{d.policy_expired ? " · berakhir" : ""}
                                                    </Text>
                                                </Flex>
                                            ) : <Text color="#CBD5E1" fontSize="14px">—</Text>}
                                        </Table.Cell>
                                    )}
                                    <Table.Cell px="16px" py="10px" color="#64748B" fontSize="15px">{d.document_year}</Table.Cell>
                                    <Table.Cell px="16px" py="10px" whiteSpace="nowrap">
                                        <Text color="#64748B" fontSize="14px">{fmtDate(d.uploaded_at)}</Text>
                                        {d.uploaded_by_name && <Text color="#64748B" fontSize="14px">{d.uploaded_by_name}</Text>}
                                    </Table.Cell>
                                    <Table.Cell px="12px" py="10px" textAlign="end" whiteSpace="nowrap">
                                        <IconButton size="xs" variant="ghost" color="#3B82F6" aria-label="Lihat dokumen" title="Lihat" onClick={() => setPreview(d)}>
                                            <LuEye size={14} />
                                        </IconButton>
                                        <IconButton size="xs" variant="ghost" color="#64748B" aria-label="Unduh dokumen" title="Unduh"
                                            onClick={() => downloadDocument(d).catch((err) => setRowError(errorMessage(err, "Gagal mengunduh dokumen")))}>
                                            <LuDownload size={14} />
                                        </IconButton>
                                        {archived ? (
                                            <IconButton size="xs" variant="ghost" color="#64748B" aria-label="Pulihkan dari arsip" title="Pulihkan dari arsip"
                                                disabled={busy} onClick={() => restore(d)}>
                                                <LuArchiveRestore size={14} />
                                            </IconButton>
                                        ) : (
                                            <IconButton size="xs" variant="ghost" color="#64748B" aria-label="Arsipkan dokumen" title="Arsipkan"
                                                onClick={() => { setReason(""); setRowError(null); setPending({ kind: "archive", doc: d }) }}>
                                                <LuArchive size={14} />
                                            </IconButton>
                                        )}
                                        <IconButton size="xs" variant="ghost" color="#DC2626" aria-label="Hapus dokumen"
                                            title={deleteBlocked ?? "Hapus"} disabled={!!deleteBlocked}
                                            onClick={() => { setRowError(null); setPending({ kind: "delete", doc: d }) }}>
                                            <LuTrash2 size={14} />
                                        </IconButton>
                                    </Table.Cell>
                                </Table.Row>
                            )
                        })}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>

            <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />

            <Dialog.Root open={!!pending} onOpenChange={(d) => { if (!d.open && !busy) setPending(null) }}>
                <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                <Dialog.Positioner zIndex={1501}>
                    <Dialog.Content bg="white" borderRadius="12px" maxW="420px" w="90vw" shadow="xl">
                        <Dialog.Header px="24px" pt="24px" pb="0">
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                                {pending?.kind === "archive" ? "Arsipkan Dokumen" : "Hapus Dokumen"}
                            </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body px="24px" py="16px">
                            <Flex flexDir="column" gap="12px">
                                <Text color="#475569" fontSize="15px" lineHeight="1.6">
                                    {pending?.kind === "archive"
                                        ? <>Dokumen <b>{pending.doc.title || pending.doc.file_name}</b> akan dipindahkan ke arsip. Dokumen arsip tetap dapat dilihat dan tidak dapat dihapus.</>
                                        : <>Hapus dokumen <b>{pending?.doc.title || pending?.doc.file_name}</b>? Dokumen tidak lagi tampil, tetapi tetap tersimpan untuk jejak audit.</>}
                                </Text>
                                {pending?.kind === "archive" && (
                                    <Input fontSize="15px" borderColor="#E2E8F0" borderRadius="8px" placeholder="Alasan (opsional)"
                                        maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
                                )}
                                {rowError && <Text color="#DC2626" fontSize="14px">{rowError}</Text>}
                            </Flex>
                        </Dialog.Body>
                        <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                            <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                                disabled={busy} onClick={() => setPending(null)}>
                                Batal
                            </Button>
                            <Button flex="1" bg={pending?.kind === "delete" ? "#DC2626" : "#1A3557"} color="white" fontSize="16px" borderRadius="8px"
                                loading={busy} onClick={confirm}>
                                {pending?.kind === "archive" ? "Arsipkan" : "Hapus"}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </>
    )
}
