"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Dialog, Flex, Skeleton, Text } from "@chakra-ui/react"
import {
    LuArrowLeft, LuCircleAlert, LuCircleCheck, LuCircleDashed, LuFileText, LuMessageSquare, LuPencil,
    LuRefreshCw, LuShieldAlert, LuTrash2, LuUpload,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage, errorStatus } from "@/lib/api/client"
import {
    CLAIM_CHANNEL_LABELS, CLAIM_TRANSITIONS, deleteClaim, getClaimDetail,
    type ApiClaimChecklistItem, type ApiClaimDetail, type ApiClaimEvent,
} from "@/lib/api/claims"
import { getDocuments, type ApiDocument } from "@/lib/api/documents"
import { fmtIDR } from "@/lib/format"
import { DocumentsTable, UploadDocumentDialog } from "@/components/documents"
import { ClaimStatusBadge } from "@/components/claims"
import { TasksPanel } from "@/components/tasks"
import { ClaimEditDialog, ClaimFollowUpDialog, ClaimStatusDialog } from "@/components/claims/ClaimDialogs"

const EVENT_STYLE: Record<ApiClaimEvent["event_type"], { label: string; bg: string; color: string }> = {
    registered:        { label: "Klaim Didaftarkan", bg: "#DCFCE7", color: "#16A34A" },
    status_changed:    { label: "Status Berubah",    bg: "#DBEAFE", color: "#1D4ED8" },
    followup:          { label: "Hubungi Lagi",         bg: "#FEF3C7", color: "#B45309" },
    note:              { label: "Catatan",           bg: "#F1F5F9", color: "#64748B" },
    updated:           { label: "Data Diperbarui",   bg: "#EDE9FE", color: "#7C3AED" },
    document_uploaded: { label: "Dokumen Diunggah",  bg: "#E0F2FE", color: "#0369A1" },
    document_deleted:  { label: "Dokumen Dihapus",   bg: "#FEE2E2", color: "#DC2626" },
}

function fmtDate(iso: string | null) {
    return iso ? new Date(iso.replace(" ", "T")).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}

const CARD = { bg: "white", borderRadius: "12px", border: "1px solid", borderColor: "#E2E8F0" } as const

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Flex justify="space-between" gap="16px" py="8px" borderBottom="1px solid" borderColor="#F1F5F9" fontSize="16px">
            <Text color="#64748B" flexShrink={0}>{label}</Text>
            <Box color="#1C2833" textAlign="right" minW="0" wordBreak="break-word">{children}</Box>
        </Flex>
    )
}

export default function ClaimDetailPage() {
    const router = useRouter()
    const { id } = useParams<{ id: string }>()
    const [claim, setClaim]     = useState<ApiClaimDetail | null>(null)
    const [loadedFor, setLoadedFor] = useState<{ id: string; error: string | null } | null>(null)
    const [docs, setDocs]       = useState<ApiDocument[]>([])
    const [reloadKey, setReload] = useState(0)
    const [dialog, setDialog]   = useState<"status" | "followup" | "edit" | "delete" | null>(null)
    const [upload, setUpload]   = useState<{ requirement?: ApiClaimChecklistItem } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const loading = loadedFor?.id !== id
    const error   = loading ? null : loadedFor?.error ?? null
    const refresh = useCallback(() => setReload((k) => k + 1), [])

    useEffect(() => {
        const token = getAccessToken()
        if (!token) { router.replace("/login"); return }
        let cancelled = false
        Promise.all([
            getClaimDetail(token, id),
            getDocuments(token, { claim_id: id, status: "all", limit: 50 }),
        ])
            .then(([detail, documents]) => {
                if (cancelled) return
                setClaim(detail)
                setDocs(documents.data ?? [])
                setLoadedFor({ id, error: null })
            })
            .catch((err: unknown) => {
                if (cancelled) return
                setLoadedFor({ id, error: errorStatus(err) === 404 ? "Klaim tidak ditemukan." : errorMessage(err, "Data klaim belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
            })
        return () => { cancelled = true }
    }, [id, reloadKey, router])

    async function handleDelete() {
        const token = getAccessToken()
        if (!token) return
        setDeleting(true)
        setDeleteError(null)
        try {
            await deleteClaim(token, id)
            router.replace("/agentra/claims")
        } catch (err) {
            setDeleteError(errorMessage(err, "Gagal menghapus klaim"))
            setDeleting(false)
        }
    }

    const c = loading || loadedFor?.error ? null : claim
    const missingRequired = c ? c.checklist.filter((i) => i.required && !i.provided).length : 0
    const canChangeStatus = !!c && CLAIM_TRANSITIONS[c.status].length > 0
    const canDelete = !!c && c.status === "reported" && docs.length === 0

    return (
        <Box bg="#F4F6F9" minH="100vh">
            <Sidebar />
            <MobileHeader />

            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}>
                    <TopBar title="Claims" />
                </Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column" maxW="1200px">
                    <Link href="/agentra/claims" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "16px", width: "fit-content" }}>
                        <LuArrowLeft size={14} /> Semua klaim
                    </Link>

                    {error && (
                        <Flex {...CARD} p="32px" direction="column" align="center" gap="8px">
                            <LuShieldAlert size={36} color="#CBD5E1" />
                            <Text color="#64748B" fontSize="16px">{error}</Text>
                        </Flex>
                    )}

                    {loading && !error && (
                        <Flex flexDir="column" gap="12px">
                            <Skeleton h="64px" borderRadius="12px" />
                            <Skeleton h="220px" borderRadius="12px" />
                        </Flex>
                    )}

                    {c && (
                        <>
                            <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
                                <Flex flexDir="column" gap="6px">
                                    <Flex align="center" gap="10px" flexWrap="wrap">
                                        <Text color="#1C2833" fontSize="24px" fontWeight="bold">{c.claim_number}</Text>
                                        <ClaimStatusBadge status={c.status} />
                                    </Flex>
                                    <Text color="#5D6D7E" fontSize="16px">
                                        {c.cause} · {fmtDate(c.date_of_loss)}
                                        {c.insurer_claim_number ? ` · No. asuransi ${c.insurer_claim_number}` : ""}
                                    </Text>
                                </Flex>
                                <Flex gap="8px" flexWrap="wrap">
                                    {canChangeStatus && (
                                        <Button size="sm" bg="#1A3557" color="white" gap="6px" fontSize="16px" _hover={{ bg: "#162C47" }} onClick={() => setDialog("status")}>
                                            <LuRefreshCw size={14} /> Ubah Status
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="16px" onClick={() => setDialog("followup")}>
                                        <LuMessageSquare size={14} /> Catat Hubungan dengan Nasabah
                                    </Button>
                                    {c.status !== "paid" && (
                                        <Button size="sm" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="16px" onClick={() => setDialog("edit")}>
                                            <LuPencil size={14} /> Ubah
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button size="sm" variant="outline" bg="white" borderColor="#FCA5A5" color="#DC2626" gap="6px" fontSize="16px"
                                            onClick={() => { setDeleteError(null); setDialog("delete") }}>
                                            <LuTrash2 size={14} /> Hapus
                                        </Button>
                                    )}
                                </Flex>
                            </Flex>

                            {c.status === "rejected" && c.rejection_reason && (
                                <Flex px="16px" py="12px" gap="10px" borderRadius="10px" bg="#FEF2F2" border="1px solid #FECACA" align="flex-start">
                                    <Box color="#DC2626" mt="2px"><LuCircleAlert size={16} /></Box>
                                    <Flex flexDir="column">
                                        <Text color="#991B1B" fontSize="16px" fontWeight="semibold">Klaim ditolak</Text>
                                        <Text color="#991B1B" fontSize="16px">{c.rejection_reason}</Text>
                                    </Flex>
                                </Flex>
                            )}

                            <Flex gap="20px" flexDir={{ base: "column", lg: "row" }} align="flex-start">
                                <Flex flexDir="column" gap="20px" flex="1" minW="0" w="100%">
                                    <Box {...CARD} p="20px">
                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="8px">Detail Klaim</Text>
                                        <Row label="Nasabah">
                                            <Link href={`/agentra/customer/detail?id=${encodeURIComponent(c.customer_id)}`} style={{ color: "#1D4ED8" }}>{c.customer_name}</Link>
                                        </Row>
                                        <Row label="Polis">
                                            <Link href={`/agentra/policies/${encodeURIComponent(c.policy_id)}`} style={{ color: "#1D4ED8" }}>{c.policy_number}</Link>
                                            {c.insurer_short_name ? ` · ${c.insurer_short_name}` : ""}
                                        </Row>
                                        {c.object_insured && <Row label="Objek Pertanggungan">{c.object_insured}</Row>}
                                        <Row label="Masa Pertanggungan">{fmtDate(c.coverage_start)} – {fmtDate(c.coverage_end)}</Row>
                                        <Row label="Tanggal Kejadian">{fmtDate(c.date_of_loss)}</Row>
                                        <Row label="Tanggal Lapor">{fmtDate(c.reported_date)}</Row>
                                        <Row label="Lokasi Kejadian">{c.loss_location || "—"}</Row>
                                        {(c.surveyor_name || c.survey_date) && (
                                            <Row label="Survei">{c.surveyor_name ?? "—"}{c.survey_date ? ` · ${fmtDate(c.survey_date)}` : ""}</Row>
                                        )}
                                        {c.description && (
                                            <Box pt="10px">
                                                <Text color="#64748B" fontSize="16px" mb="4px">Kronologi</Text>
                                                <Text color="#1C2833" fontSize="16px" whiteSpace="pre-wrap">{c.description}</Text>
                                            </Box>
                                        )}
                                    </Box>

                                    <Box {...CARD} overflow="hidden">
                                        <Flex justify="space-between" align="center" px="20px" pt="18px" pb="12px" gap="12px" flexWrap="wrap">
                                            <Flex flexDir="column">
                                                <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Dokumen Klaim</Text>
                                                <Text color="#5D6D7E" fontSize="16px">
                                                    {c.docs_required === 0 ? "Tanpa dokumen wajib" : `${c.docs_provided}/${c.docs_required} dokumen wajib terkumpul`}
                                                </Text>
                                            </Flex>
                                            <Button size="sm" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="16px"
                                                onClick={() => setUpload({})}>
                                                <LuUpload size={14} /> Dokumen Lain
                                            </Button>
                                        </Flex>

                                        <Flex flexDir="column" px="20px" pb="16px">
                                            {c.checklist.map((item) => (
                                                <Flex key={item.key} align="center" gap="10px" py="8px" borderTop="1px solid" borderColor="#F1F5F9">
                                                    <Box color={item.provided ? "#16A34A" : item.required ? "#B45309" : "#94A3B8"} flexShrink={0}>
                                                        {item.provided ? <LuCircleCheck size={16} /> : item.required ? <LuCircleAlert size={16} /> : <LuCircleDashed size={16} />}
                                                    </Box>
                                                    <Text flex="1" minW="0" color="#1C2833" fontSize="16px">{item.label}</Text>
                                                    {!item.required && <Badge px="6px" py="0" borderRadius="full" fontSize="16px" bg="#F1F5F9" color="#64748B">Opsional</Badge>}
                                                    <Button size="2xs" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px" gap="4px"
                                                        onClick={() => setUpload({ requirement: item })}>
                                                        <LuUpload size={10} /> {item.provided ? "Tambah" : "Unggah"}
                                                    </Button>
                                                </Flex>
                                            ))}
                                        </Flex>

                                        {docs.length > 0 ? (
                                            <Box borderTop="1px solid" borderColor="#F1F5F9">
                                                <DocumentsTable documents={docs} onChanged={refresh} showCustomer={false} showPolicy={false} />
                                            </Box>
                                        ) : (
                                            <Flex align="center" gap="8px" px="20px" py="14px" borderTop="1px solid" borderColor="#F1F5F9" color="#64748B">
                                                <LuFileText size={14} /> <Text fontSize="16px">Belum ada dokumen yang diunggah.</Text>
                                            </Flex>
                                        )}
                                    </Box>
                                </Flex>

                                <Flex flexDir="column" gap="20px" w={{ base: "100%", lg: "380px" }} flexShrink={0}>
                                    <Box {...CARD} p="20px">
                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="8px">Nilai Klaim</Text>
                                        <Row label="Estimasi Kerugian">{fmtIDR(c.estimated_loss)}</Row>
                                        <Row label="Risiko Sendiri">{fmtIDR(c.deductible)}</Row>
                                        <Row label="Jumlah Disetujui">{c.approved_amount === null ? "—" : fmtIDR(c.approved_amount)}</Row>
                                        <Row label="Jumlah Dibayar">
                                            <Text as="span" fontWeight="bold">{c.settlement_amount === null ? "—" : fmtIDR(c.settlement_amount)}</Text>
                                        </Row>
                                        <Row label="Tanggal Pembayaran">{fmtDate(c.payment_date)}</Row>
                                    </Box>

                                    <TasksPanel link={{ claim_id: c.claim_id, label: c.claim_number }} />

                                    <Box {...CARD} p="20px">
                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold" mb="14px">Riwayat Aktivitas</Text>
                                        <Flex flexDir="column" gap="14px">
                                            {c.events.map((e) => {
                                                const st = EVENT_STYLE[e.event_type] ?? EVENT_STYLE.note
                                                return (
                                                    <Flex key={e.event_id} flexDir="column" gap="4px" pl="12px" borderLeft="2px solid" borderColor={st.bg}>
                                                        <Flex align="center" gap="6px" flexWrap="wrap">
                                                            <Badge px="8px" py="1px" borderRadius="full" fontSize="16px" bg={st.bg} color={st.color}>{st.label}</Badge>
                                                            {e.channel && <Text color="#64748B" fontSize="16px">via {CLAIM_CHANNEL_LABELS[e.channel] ?? e.channel}</Text>}
                                                        </Flex>
                                                        {e.description && <Text color="#1C2833" fontSize="16px" whiteSpace="pre-wrap">{e.description}</Text>}
                                                        <Text color="#64748B" fontSize="16px">
                                                            {fmtDate(e.event_date)}{e.created_by_name ? ` · ${e.created_by_name}` : ""}
                                                        </Text>
                                                    </Flex>
                                                )
                                            })}
                                        </Flex>
                                    </Box>
                                </Flex>
                            </Flex>

                            {dialog === "status" && <ClaimStatusDialog claim={c} missingDocs={missingRequired} onClose={() => setDialog(null)} onChanged={refresh} />}
                            {dialog === "followup" && <ClaimFollowUpDialog claim={c} onClose={() => setDialog(null)} onChanged={refresh} />}
                            {dialog === "edit" && <ClaimEditDialog claim={c} onClose={() => setDialog(null)} onChanged={refresh} />}

                            <UploadDocumentDialog
                                open={upload !== null}
                                onClose={() => setUpload(null)}
                                onUploaded={refresh}
                                claim={{
                                    id: c.claim_id, number: c.claim_number,
                                    requirement: upload?.requirement ? { key: upload.requirement.key, label: upload.requirement.label } : undefined,
                                }}
                            />

                            <Dialog.Root open={dialog === "delete"} onOpenChange={(d) => { if (!d.open && !deleting) setDialog(null) }}>
                                <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                                <Dialog.Positioner zIndex={1501}>
                                    <Dialog.Content bg="white" borderRadius="12px" maxW="420px" w="92vw" shadow="xl">
                                        <Dialog.Header px="24px" pt="24px" pb="0">
                                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Hapus klaim?</Dialog.Title>
                                        </Dialog.Header>
                                        <Dialog.Body px="24px" py="16px">
                                            <Text color="#475569" fontSize="16px">Klaim {c.claim_number} akan dihapus. Hanya klaim yang baru dilaporkan dan belum memiliki dokumen yang dapat dihapus.</Text>
                                            {deleteError && <Text mt="8px" fontSize="16px" color="#DC2626">{deleteError}</Text>}
                                        </Dialog.Body>
                                        <Dialog.Footer px="24px" pb="24px" gap="8px">
                                            <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" disabled={deleting} onClick={() => setDialog(null)}>Batal</Button>
                                            <Button flex="1" bg="#DC2626" color="white" _hover={{ bg: "#B91C1C" }} loading={deleting} onClick={handleDelete}>Hapus</Button>
                                        </Dialog.Footer>
                                    </Dialog.Content>
                                </Dialog.Positioner>
                            </Dialog.Root>
                        </>
                    )}
                </Flex>
            </Box>
            <MobileBottomNav />
        </Box>
    )
}
