"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Box, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuListChecks } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { getTasks, setTaskDone, type ApiTask } from "@/lib/api/tasks"
import { errorMessage } from "@/lib/api/client"
import { TaskRow } from "./TaskRow"

/** Dashboard widget: open tasks due today or overdue. */
export function TodayTasksCard() {
    const [reloadKey, setReloadKey] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ key: number; items: ApiTask[]; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getTasks(token, { status: "open", due: "today_overdue", limit: 8 })
            .then((r) => { if (!cancelled) setResult({ key: reloadKey, items: r.items, error: null }) })
            .catch((err: unknown) => { if (!cancelled) setResult({ key: reloadKey, items: [], error: errorMessage(err, "Data tugas belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
    }, [reloadKey])

    const loading = result?.key !== reloadKey
    const items = loading ? [] : result?.items ?? []

    async function complete(t: ApiTask) {
        const token = getAccessToken()
        if (!token) return
        setError(null)
        try { await setTaskDone(token, t.task_id, true); setReloadKey((k) => k + 1) }
        catch (err: unknown) { setError(errorMessage(err, "Gagal memperbarui tugas")) }
    }

    return (
        <Box bg="white" borderRadius="16px" border="1px solid" borderColor="#CBD5E1" overflow="hidden">
            <Flex px="24px" py="20px" align="center" gap="12px" flexWrap="wrap" borderBottom="1px solid" borderColor="#E2E8F0">
                <LuListChecks size={24} color="#1E3A8A" aria-hidden="true" />
                <Text as="h2" color="#0D1B3E" fontSize="18px" fontWeight="bold" flex="1">Tugas Saya Hari Ini</Text>
                {!loading && <Badge px="12px" py="2px" borderRadius="full" fontSize="16px" fontWeight="bold" bg="#DBEAFE" color="#1E3A8A">{items.length}</Badge>}
                <Link href="/agentra/tasks" style={{ fontSize: "16px", color: "#0B5A8A", fontWeight: 700, textDecoration: "underline" }}>Lihat semua</Link>
            </Flex>
            <Box px="24px" pb="8px">
                {(error || result?.error) && <Text color="#B91C1C" fontSize="16px" role="alert" py="8px">{error ?? result?.error}</Text>}
                {loading ? <Skeleton h="60px" mt="12px" borderRadius="8px" /> : items.length === 0 ? (
                    <Text color="#374151" fontSize="16px" py="20px">Tidak ada tugas untuk hari ini. 🎉</Text>
                ) : items.map((t) => <TaskRow key={t.task_id} task={t} onToggle={complete} />)}
            </Box>
        </Box>
    )
}
