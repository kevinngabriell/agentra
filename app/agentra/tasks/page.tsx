"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuPlus } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { deleteTask, getTasks, setTaskDone, type ApiTask, type TaskListParams, type TaskListResponse } from "@/lib/api/tasks"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { TaskDialog, TaskRow } from "@/components/tasks"
import { useConfirm } from "@/components/ui/confirm-dialog"

const TABS: { key: string; label: string; params: TaskListParams }[] = [
  { key: "today",   label: "Hari ini & terlambat", params: { status: "open", due: "today_overdue" } },
  { key: "week",    label: "7 hari ke depan",      params: { status: "open", due: "week" } },
  { key: "open",    label: "Semua terbuka",        params: { status: "open" } },
  { key: "done",    label: "Selesai",              params: { status: "done" } },
]

export default function Tasks() {
  const { confirm, dialog: confirmDialog } = useConfirm()
  const router = useRouter()
  const [tab, setTab] = useState("today")
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<{ task?: ApiTask } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const key = `${tab}|${reloadKey}`
  const [result, setResult] = useState<{ key: string; data: TaskListResponse | null; error: string | null } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    let cancelled = false
    getTasks(token, { ...TABS.find((t) => t.key === tab)!.params, limit: 100 })
      .then((data) => { if (!cancelled) setResult({ key, data, error: null }) })
      .catch((err: unknown) => {
        if (!cancelled && errorStatus(err) !== 401) setResult({ key, data: null, error: errorMessage(err, "Data tugas belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => { cancelled = true }
  }, [tab, key, router])

  const loading = result?.key !== key
  const data  = loading ? null : result?.data ?? null
  const error = loading ? null : result?.error ?? null

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
    <Box bg="#F4F6F9" minH="100vh">
    {confirmDialog}
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Tasks" />
        </Box>

        <Flex flexDir="column" gap="20px" p={{ base: "16px", md: "32px" }}>
          <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="16px">
            <Flex flexDir="column" gap="4px">
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Tugas & Pengingat</Text>
              <Text color="#5D6D7E" fontSize="16px">Catat hal yang harus dikerjakan dan kaitkan dengan customer, polis, atau klaim.</Text>
            </Flex>
            <Button bg="#1A3557" color="white" gap="6px" fontSize="16px" _hover={{ bg: "#162C47" }} onClick={() => setDialog({})}>
              <LuPlus size={14} /> Tugas Baru
            </Button>
          </Flex>

          <Flex gap="6px" flexWrap="wrap" role="tablist" aria-label="Filter tugas">
            {TABS.map((t) => (
              <Box key={t.key} as="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                px="14px" py="7px" borderRadius="full" fontSize="16px" fontWeight="medium" border="1px solid"
                bg={tab === t.key ? "#1A3557" : "white"} color={tab === t.key ? "white" : "#475569"}
                borderColor={tab === t.key ? "#1A3557" : "#E2E8F0"}>
                {t.label}
                {t.key === "today" && data && (data.overdue_count + data.today_count) > 0 && (
                  <Badge ml="6px" px="6px" borderRadius="full" bg="#DC2626" color="white" fontSize="16px">{data.overdue_count + data.today_count}</Badge>
                )}
              </Box>
            ))}
          </Flex>

          {(error || actionError) && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px" role="alert">
              <Text color="#DC2626" fontSize="16px">{actionError ?? error}</Text>
            </Box>
          )}

          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" px="20px" py="8px">
            {loading ? <Skeleton h="120px" my="12px" borderRadius="8px" /> : !data || data.items.length === 0 ? (
              <Text color="#64748B" fontSize="16px" py="32px" textAlign="center">Belum ada tugas. Tekan Tambah Tugas untuk membuat pengingat, misalnya menelepon nasabah.</Text>
            ) : data.items.map((t) => (
              <TaskRow key={t.task_id} task={t} onToggle={toggle} onEdit={t.status === "open" ? (x) => setDialog({ task: x }) : undefined} onDelete={remove} />
            ))}
          </Box>
        </Flex>
      </Box>

      <MobileBottomNav />

      {dialog && (
        <TaskDialog task={dialog.task} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setReloadKey((k) => k + 1) }} />
      )}
    </Box>
  )
}
