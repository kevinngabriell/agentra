"use client"

import { useEffect, useState } from "react"
import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuListChecks, LuPlus } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { deleteTask, getTasks, setTaskDone, type ApiTask } from "@/lib/api/tasks"
import { errorMessage } from "@/lib/api/client"
import { TaskDialog, type TaskLink } from "./TaskDialog"
import { TaskRow } from "./TaskRow"
import { useConfirm } from "@/components/ui/confirm-dialog"

/** "Tugas" card for the customer, policy and claim detail pages: open tasks tied to that record. */
export function TasksPanel({ link }: { link: TaskLink }) {
    const { confirm, dialog: confirmDialog } = useConfirm()
    const [reloadKey, setReloadKey] = useState(0)
    const [dialog, setDialog] = useState<{ task?: ApiTask } | null>(null)
    const [showDone, setShowDone] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const scope = { customer_id: link.customer_id, policy_id: link.policy_id, claim_id: link.claim_id }
    const key = `${JSON.stringify(scope)}|${reloadKey}`
    const [result, setResult] = useState<{ key: string; open: ApiTask[]; done: ApiTask[]; error: string | null } | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        Promise.all([
            getTasks(token, { ...scope, status: "open", limit: 100 }),
            getTasks(token, { ...scope, status: "done", limit: 10 }),
        ])
            .then(([open, done]) => { if (!cancelled) setResult({ key, open: open.items, done: done.items, error: null }) })
            .catch((err: unknown) => { if (!cancelled) setResult({ key, open: [], done: [], error: errorMessage(err, "Data tugas belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    const loading = result?.key !== key
    const open = loading ? [] : result?.open ?? []
    const done = loading ? [] : result?.done ?? []

    async function toggle(t: ApiTask) {
        const token = getAccessToken()
        if (!token) return
        setActionError(null)
        try { await setTaskDone(token, t.task_id, t.status === "open"); setReloadKey((k) => k + 1) }
        catch (err: unknown) { setActionError(errorMessage(err, "Gagal memperbarui tugas")) }
    }

    async function remove(t: ApiTask) {
        const token = getAccessToken()
        if (!token) return
        if (!(await confirm({ title: `Hapus tugas "${t.title}"?`, confirmLabel: "Hapus", danger: true }))) return
        setActionError(null)
        try { await deleteTask(token, t.task_id); setReloadKey((k) => k + 1) }
        catch (err: unknown) { setActionError(errorMessage(err, "Gagal menghapus tugas")) }
    }

    return (
        <Box id="tugas" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden" scrollMarginTop="80px">
      {confirmDialog}
            <Flex justify="space-between" align="center" px="24px" pt="20px" pb="8px" gap="12px" flexWrap="wrap">
                <Flex gap="10px" align="center">
                    <Box p="8px" bg="#EFF6FF" borderRadius="8px" color="#1D4ED8"><LuListChecks size={18} /></Box>
                    <Flex flexDir="column">
                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Tugas</Text>
                        <Text color="#5D6D7E" fontSize="16px">{loading ? "Memuat..." : `${open.length} tugas terbuka`}</Text>
                    </Flex>
                </Flex>
                <Button size="sm" bg="#1A3557" color="white" gap="6px" fontSize="16px" _hover={{ bg: "#162C47" }} onClick={() => setDialog({})}>
                    <LuPlus size={14} /> Tambah Tugas
                </Button>
            </Flex>

            <Box px="24px" pb="16px">
                {(result?.error || actionError) && <Text color="#DC2626" fontSize="16px" role="alert" py="8px">{actionError ?? result?.error}</Text>}
                {loading ? <Skeleton h="60px" borderRadius="8px" /> : open.length === 0 ? (
                    <Text color="#64748B" fontSize="16px" py="12px">Belum ada tugas terbuka.</Text>
                ) : open.map((t) => (
                    <TaskRow key={t.task_id} task={t} showLink={false} onToggle={toggle} onEdit={(x) => setDialog({ task: x })} onDelete={remove} />
                ))}
                {done.length > 0 && (
                    <>
                        <Box as="button" fontSize="16px" color="#1D4ED8" mt="8px" onClick={() => setShowDone((v) => !v)}>
                            {showDone ? "Sembunyikan" : "Tampilkan"} tugas selesai ({done.length})
                        </Box>
                        {showDone && done.map((t) => <TaskRow key={t.task_id} task={t} showLink={false} onToggle={toggle} onDelete={remove} />)}
                    </>
                )}
            </Box>

            {dialog && (
                <TaskDialog task={dialog.task} link={link} onClose={() => setDialog(null)}
                    onSaved={() => { setDialog(null); setReloadKey((k) => k + 1) }} />
            )}
        </Box>
    )
}
