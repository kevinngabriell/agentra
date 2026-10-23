"use client"

import { useEffect, useState } from "react"
import { Badge, Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { MESSAGE_TYPE_LABELS, getMessageLog, type MessageLogEntry, type MessageLogParams } from "@/lib/api/communications"

const PAGE_SIZE = 10
const SOURCE_LABELS = { manual: "Manual", broadcast: "Broadcast", auto: "Otomatis" } as const

function fmtDateTime(iso: string) {
    return new Date(iso.replace(" ", "T")).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Every WhatsApp message the API sent for the filter, newest first. `refreshKey` reloads after a send. */
export function MessageLog({ filter, refreshKey = 0, showCustomer = false }: { filter: Omit<MessageLogParams, "page" | "limit">; refreshKey?: number; showCustomer?: boolean }) {
    const filterKey = JSON.stringify(filter)
    // The page is tagged with the filter it belongs to, so changing the filter starts again at page 1.
    const [pageState, setPageState] = useState({ filterKey, page: 1 })
    const page = pageState.filterKey === filterKey ? pageState.page : 1
    const setPage = (update: (p: number) => number) => setPageState({ filterKey, page: update(page) })
    const [state, setState] = useState<{ key: string; rows: MessageLogEntry[]; total: number; error: string | null } | null>(null)
    const [open, setOpen] = useState<string | null>(null)
    const key = `${filterKey}|${page}|${refreshKey}`

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getMessageLog(token, { ...(JSON.parse(filterKey) as object), page, limit: PAGE_SIZE })
            .then((r) => { if (!cancelled) setState({ key, rows: r.data, total: r.pagination.total, error: null }) })
            .catch((err) => { if (!cancelled) setState({ key, rows: [], total: 0, error: errorMessage(err, "Data riwayat pesan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [filterKey, page, refreshKey, key])

    const loading = state?.key !== key
    const rows = loading ? [] : state?.rows ?? []
    const totalPages = Math.max(1, Math.ceil((state?.total ?? 0) / PAGE_SIZE))

    if (loading && !state) return <Skeleton h="80px" borderRadius="8px" />
    if (state?.error) return <Text color="#DC2626" fontSize="16px">{state.error}</Text>
    if (!loading && rows.length === 0) return <Text color="#64748B" fontSize="16px">Belum ada pesan yang dikirim.</Text>

    return (
        <Flex flexDir="column" gap="8px" opacity={loading ? 0.5 : 1}>
            {rows.map((m) => (
                <Box key={m.log_id} border="1px solid #F1F5F9" borderRadius="8px" px="12px" py="8px">
                    <Flex as="button" w="100%" textAlign="left" justify="space-between" align="center" gap="8px" flexWrap="wrap" aria-expanded={open === m.log_id}
                        onClick={() => setOpen(open === m.log_id ? null : m.log_id)}>
                        <Flex gap="8px" align="center" flexWrap="wrap">
                            <Badge px="8px" borderRadius="full" bg={m.status === "sent" ? "#DCFCE7" : "#FEE2E2"} color={m.status === "sent" ? "#15803D" : "#DC2626"} fontSize="16px">
                                {m.status === "sent" ? "Terkirim" : "Gagal"}
                            </Badge>
                            <Text fontSize="16px" fontWeight="semibold" color="#1C2833">{MESSAGE_TYPE_LABELS[m.message_type]}</Text>
                            {showCustomer && m.customer_name && <Text fontSize="16px" color="#475569">· {m.customer_name}</Text>}
                            {m.policy_number && <Text fontSize="16px" color="#64748B" fontFamily="mono">{m.policy_number}</Text>}
                            <Text fontSize="16px" color="#64748B">{SOURCE_LABELS[m.trigger_source]}</Text>
                        </Flex>
                        <Text fontSize="16px" color="#64748B">{fmtDateTime(m.created_at)}</Text>
                    </Flex>
                    {open === m.log_id ? (
                        <>
                            <Text mt="6px" fontSize="16px" color="#475569" whiteSpace="pre-wrap">{m.body}</Text>
                            {m.error && <Text mt="4px" fontSize="16px" color="#DC2626">Kesalahan: {m.error}</Text>}
                        </>
                    ) : (
                        <Text mt="2px" fontSize="16px" color="#64748B" lineClamp={1}>{m.body}</Text>
                    )}
                </Box>
            ))}
            {totalPages > 1 && (
                <Flex justify="space-between" align="center">
                    <Text fontSize="16px" color="#64748B">{state?.total} pesan</Text>
                    <Flex gap="6px" align="center">
                        <Button size="xs" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                        <Text fontSize="16px" color="#64748B">{page} / {totalPages}</Text>
                        <Button size="xs" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
                    </Flex>
                </Flex>
            )}
        </Flex>
    )
}
