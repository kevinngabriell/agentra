"use client"

import { useEffect, useState } from "react"
import { Button, Dialog, Flex, Spinner, Text } from "@chakra-ui/react"
import { LuDownload, LuExternalLink, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { DOCUMENT_TYPE_LABELS, getDocumentUrl, type ApiDocument } from "@/lib/api/documents"

/** "Login modal popup.png" -> "Login_modal_popup_20261022-145501.png": no spaces, unique per download. */
export function downloadFileName(fileName: string, now = new Date()): string {
    const dot = fileName.lastIndexOf(".")
    const base = dot > 0 ? fileName.slice(0, dot) : fileName
    const ext = dot > 0 ? fileName.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "").toLowerCase() : ""
    const clean = base.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "") || "dokumen"
    const p = (n: number) => String(n).padStart(2, "0")
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
    return `${clean}_${stamp}${ext ? `.${ext}` : ""}`
}

function triggerDownload(href: string, name?: string) {
    const a = document.createElement("a")
    a.href = href
    a.rel = "noopener"
    if (name) a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
}

/**
 * Downloads a document under a timestamped, space-free name. The browser ignores `download` on
 * cross-origin links, so the file is fetched as a blob first. If the bucket blocks that (CORS),
 * it falls back to the signed link, which keeps the stored file name.
 */
export async function downloadDocument(doc: ApiDocument) {
    const token = getAccessToken()
    if (!token) return
    const { url } = await getDocumentUrl(token, doc.document_id, "attachment")
    const name = downloadFileName(doc.file_name)
    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const objectUrl = URL.createObjectURL(await res.blob())
        triggerDownload(objectUrl, name)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
    } catch {
        triggerDownload(url)
    }
}

/** In-browser preview: PDFs in an iframe, images inline. Links are signed for 5 minutes. */
export function DocumentPreviewDialog({ doc, onClose }: { doc: ApiDocument | null; onClose: () => void }) {
    // Tagged with the document it answers so a slow response for a previous document is ignored.
    const [state, setState] = useState<{ id: string; url: string | null; error: string | null } | null>(null)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        if (!doc) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getDocumentUrl(token, doc.document_id, "inline")
            .then((res) => { if (!cancelled) setState({ id: doc.document_id, url: res.url, error: null }) })
            .catch((err: unknown) => { if (!cancelled) setState({ id: doc.document_id, url: null, error: errorMessage(err, "Dokumen belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [doc])

    const current = doc && state?.id === doc.document_id ? state : null
    const isPdf = doc?.mime_type === "application/pdf"

    async function handleDownload() {
        if (!doc) return
        setDownloading(true)
        try { await downloadDocument(doc) }
        catch (err) { setState({ id: doc.document_id, url: current?.url ?? null, error: errorMessage(err, "Gagal mengunduh dokumen") }) }
        finally { setDownloading(false) }
    }

    return (
        <Dialog.Root open={!!doc} onOpenChange={(d) => { if (!d.open) onClose() }} size="xl">
            <Dialog.Backdrop bg="rgba(0,0,0,0.45)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" w="min(960px, 94vw)" maxW="94vw" shadow="xl">
                    <Dialog.Header px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0">
                        <Flex justify="space-between" align="center" w="100%" gap="12px">
                            <Flex flexDir="column" minW="0">
                                <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold" truncate>
                                    {doc?.title || doc?.file_name}
                                </Dialog.Title>
                                {doc && (
                                    <Text color="#64748B" fontSize="14px" truncate>
                                        {DOCUMENT_TYPE_LABELS[doc.document_type]} · {doc.customer_name}
                                        {doc.policy_number ? ` · ${doc.policy_number}` : ""}
                                    </Text>
                                )}
                            </Flex>
                            <Flex gap="6px" flexShrink={0}>
                                <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="14px"
                                    loading={downloading} onClick={handleDownload}>
                                    <LuDownload size={14} /> Unduh
                                </Button>
                                {current?.url && (
                                    <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" gap="6px" fontSize="14px"
                                        display={{ base: "none", md: "inline-flex" }}
                                        onClick={() => window.open(current.url!, "_blank", "noopener")}>
                                        <LuExternalLink size={14} /> Tab Baru
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" color="#64748B" aria-label="Tutup" onClick={onClose}>
                                    <LuX size={16} />
                                </Button>
                            </Flex>
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body p="0" bg="#F1F5F9" borderBottomRadius="12px">
                        <Flex h="min(75vh, 820px)" align="center" justify="center">
                            {!current && <Spinner color="#1A3557" />}
                            {current?.error && <Text color="#DC2626" fontSize="15px" px="24px" textAlign="center">{current.error}</Text>}
                            {current?.url && isPdf && (
                                <iframe src={current.url} title={doc?.file_name}
                                    style={{ width: "100%", height: "100%", border: 0, borderRadius: "0 0 12px 12px" }} />
                            )}
                            {current?.url && !isPdf && (
                                // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL; next/image can't optimise it
                                <img src={current.url} alt={doc?.title || doc?.file_name || "Dokumen"}
                                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                            )}
                        </Flex>
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
