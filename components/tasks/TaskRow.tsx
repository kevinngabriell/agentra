"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import Link from "next/link"
import { LuPencil, LuTrash2 } from "react-icons/lu"
import type { ApiTask } from "@/lib/api/tasks"

export function dueLabel(t: ApiTask): { text: string; color: string } {
    if (t.status === "done") return { text: "Selesai", color: "#16A34A" }
    if (t.days_until_due < 0) return { text: `Terlambat ${Math.abs(t.days_until_due)} hari`, color: "#DC2626" }
    if (t.days_until_due === 0) return { text: "Hari ini", color: "#EA580C" }
    if (t.days_until_due === 1) return { text: "Besok", color: "#B45309" }
    return { text: new Date(t.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), color: "#64748B" }
}

/** Where the task points to; the most specific record wins. */
function taskTarget(t: ApiTask): { href: string; label: string } | null {
    if (t.claim_id) return { href: `/agentra/claims/${t.claim_id}`, label: `Klaim ${t.claim_number ?? ""}`.trim() }
    if (t.policy_id) return { href: `/agentra/policies/${t.policy_id}`, label: `Polis ${t.policy_number ?? ""}`.trim() }
    if (t.customer_id) return { href: `/agentra/customer/detail?id=${t.customer_id}`, label: t.customer_name ?? "Nasabah" }
    return null
}

export function TaskRow({ task, showLink = true, onToggle, onEdit, onDelete }: {
    task: ApiTask
    showLink?: boolean
    onToggle: (t: ApiTask) => void
    onEdit?: (t: ApiTask) => void
    onDelete?: (t: ApiTask) => void
}) {
    const due = dueLabel(task)
    const target = showLink ? taskTarget(task) : null
    const done = task.status === "done"
    return (
        <Flex align="flex-start" gap="10px" py="10px" borderBottom="1px solid" borderColor="#F1F5F9">
            <input type="checkbox" checked={done} onChange={() => onToggle(task)}
                aria-label={done ? `Buka kembali: ${task.title}` : `Selesaikan: ${task.title}`}
                style={{ marginTop: 3, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            <Flex flexDir="column" gap="2px" flex="1" minW={0}>
                <Text fontSize="16px" fontWeight="medium" color={done ? "#94A3B8" : "#1C2833"} textDecoration={done ? "line-through" : "none"}>{task.title}</Text>
                {task.notes && <Text fontSize="16px" color="#64748B">{task.notes}</Text>}
                <Flex gap="8px" align="center" flexWrap="wrap">
                    <Text fontSize="16px" fontWeight="semibold" color={due.color}>{due.text}</Text>
                    {target && (
                        <Link href={target.href} style={{ fontSize: "16px", color: "#1D4ED8" }}>{target.label}</Link>
                    )}
                </Flex>
            </Flex>
            {onEdit && (
                <Box as="button" aria-label={`Ubah tugas ${task.title}`} p="4px" color="#64748B" _hover={{ color: "#1C2833" }} onClick={() => onEdit(task)}><LuPencil size={14} /></Box>
            )}
            {onDelete && (
                <Box as="button" aria-label={`Hapus tugas ${task.title}`} p="4px" color="#64748B" _hover={{ color: "#DC2626" }} onClick={() => onDelete(task)}><LuTrash2 size={14} /></Box>
            )}
        </Flex>
    )
}
