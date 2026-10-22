"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FiBell } from "react-icons/fi"
import { getAccessToken } from "@/lib/auth/session"
import {
  getNotifications, markAllNotificationsRead, markNotificationRead,
  type AppNotification, type NotificationType,
} from "@/lib/api/notifications"

const POLL_MS = 60_000

const TYPE_STYLE: Record<NotificationType, { label: string; color: string }> = {
  expiring_today:      { label: "Berakhir hari ini", color: "#DC2626" },
  expiring_week:       { label: "Berakhir minggu ini", color: "#EA580C" },
  policy_lapsed:       { label: "Polis lapsed", color: "#7F1D1D" },
  premium_overdue:     { label: "Premi jatuh tempo", color: "#B45309" },
  commission_received: { label: "Komisi diterima", color: "#16A34A" },
  claim_status:        { label: "Status klaim", color: "#1D4ED8" },
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso.replace(" ", "T")).getTime()) / 60_000))
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins} mnt lalu`
  if (mins < 1440) return `${Math.round(mins / 60)} jam lalu`
  return `${Math.round(mins / 1440)} hari lalu`
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState<AppNotification[]>([])
  const [unread, setUnread]   = useState(0)
  const [failed, setFailed]   = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const feed = await getNotifications(token)
      setItems(feed.items)
      setUnread(feed.unread_count)
      setFailed(false)
    } catch {
      // A session problem is handled centrally; a transient failure just keeps the last feed.
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(() => { if (document.visibilityState === "visible") load() }, POLL_MS)
    return () => { clearTimeout(first); clearInterval(timer) }
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])

  async function openItem(n: AppNotification) {
    const token = getAccessToken()
    setOpen(false)
    if (token && !n.read_at) {
      setItems((prev) => prev.map((x) => x.notification_id === n.notification_id ? { ...x, read_at: new Date().toISOString() } : x))
      setUnread((c) => Math.max(0, c - 1))
      markNotificationRead(token, n.notification_id).catch(() => load())
    }
    if (n.link) router.push(n.link)
  }

  async function readAll() {
    const token = getAccessToken()
    if (!token) return
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
    setUnread(0)
    markAllNotificationsRead(token).catch(() => load())
  }

  return (
    <Box position="relative" ref={rootRef}>
      <Flex as="button" w="36px" h="36px" align="center" justify="center" borderRadius="full" position="relative"
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"} aria-expanded={open} aria-haspopup="true"
        _hover={{ bg: "#F1F5F9" }} onClick={() => { setOpen((o) => !o); if (!open) load() }}>
        <FiBell size={16} color="#64748B" />
        {unread > 0 && (
          <Flex position="absolute" top="2px" right="2px" minW="16px" h="16px" px="4px" borderRadius="full" bg="#DC2626"
            align="center" justify="center" aria-hidden="true">
            <Text color="white" fontSize="16px" fontWeight="bold" lineHeight="1">{unread > 99 ? "99+" : unread}</Text>
          </Flex>
        )}
      </Flex>

      {open && (
        <Box position="absolute" right={0} top="42px" w="360px" maxW="calc(100vw - 32px)" bg="white" border="1px solid" borderColor="#E2E8F0"
          borderRadius="12px" boxShadow="0 10px 30px rgba(15,23,42,0.12)" zIndex={50} overflow="hidden" role="dialog" aria-label="Notifikasi">
          <Flex px="16px" py="12px" justify="space-between" align="center" borderBottom="1px solid" borderColor="#E2E8F0">
            <Text fontSize="16px" fontWeight="bold" color="#0F172A">Notifikasi</Text>
            {unread > 0 && (
              <Box as="button" fontSize="16px" color="#1D4ED8" fontWeight="medium" onClick={readAll}>Tandai semua dibaca</Box>
            )}
          </Flex>
          <Box maxH="420px" overflowY="auto">
            {items.length === 0 ? (
              <Text px="16px" py="28px" textAlign="center" fontSize="16px" color="#64748B">
                {failed ? "Data notifikasi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi." : "Belum ada notifikasi"}
              </Text>
            ) : items.map((n) => {
              const style = TYPE_STYLE[n.type]
              return (
                <Flex as="button" key={n.notification_id} w="100%" textAlign="left" gap="10px" px="16px" py="10px"
                  borderBottom="1px solid" borderColor="#F1F5F9" bg={n.read_at ? "white" : "#F8FAFF"} _hover={{ bg: "#F1F5F9" }}
                  onClick={() => openItem(n)}>
                  <Box mt="5px" w="8px" h="8px" borderRadius="full" flexShrink={0} bg={n.read_at ? "transparent" : style.color} />
                  <Flex flexDir="column" gap="2px" minW={0} flex="1">
                    <Text fontSize="16px" fontWeight="bold" color={style.color}>{style.label.toUpperCase()}</Text>
                    <Text fontSize="16px" fontWeight={n.read_at ? "normal" : "semibold"} color="#1C2833">{n.title}</Text>
                    {n.body && <Text fontSize="16px" color="#64748B">{n.body}</Text>}
                    <Text fontSize="16px" color="#64748B">{timeAgo(n.created_at)}</Text>
                  </Flex>
                </Flex>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}
