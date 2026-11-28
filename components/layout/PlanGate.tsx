"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Dialog, Flex, IconButton, Text } from "@chakra-ui/react"
import { LuCrown, LuTriangleAlert, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { PLAN_LIMIT_EVENT, errorMessage, type PlanLimitDetail } from "@/lib/api/client"
import { checkoutPlan, getCurrentSubscription, type ApiSubscription } from "@/lib/api/subscription"
import { useAgentMode } from "./AgentMode"

const SETTINGS_SUBSCRIPTION = "/agentra/settings?tab=subscription"
// Show the usage nudge once a Starter company has used this share of its policy cap.
const NEAR_LIMIT_RATIO = 0.8
const DISMISS_KEY = "agentra:plan-banner-dismissed"

function readDismissed(): string | null {
  try { return window.sessionStorage.getItem(DISMISS_KEY) } catch { return null }
}
function writeDismissed(value: string) {
  try { window.sessionStorage.setItem(DISMISS_KEY, value) } catch { /* private mode: dismiss for this render only */ }
}

/** Opens the SumoPod payment page for a paid plan, reusing a pending payment if there is one. */
export async function startPlanPayment(token: string, sub: ApiSubscription | null, serviceId: string): Promise<void> {
  const pending = sub?.pending_payment
  if (pending?.payment_link_url && pending.service_id === serviceId) {
    window.location.assign(pending.payment_link_url)
    return
  }
  const checkout = await checkoutPlan(token, serviceId)
  window.location.assign(checkout.payment_link_url)
}

/**
 * Plan awareness for the whole signed-in app:
 *  - a bar when the chosen paid plan has not been paid for (the account runs on Starter limits until it is),
 *  - a nudge when a Starter account is close to its policy cap,
 *  - a dialog whenever the API refuses an action because of the plan (see announcePlanLimit in lib/api/client).
 */
export function PlanGate() {
  const router = useRouter()
  const isSubAgent = useAgentMode() === "sub-agent"
  const [sub, setSub] = useState<ApiSubscription | null>(null)
  const [limit, setLimit] = useState<PlanLimitDetail | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  // The banner kind ("unpaid:<plan>" / "near-limit") the user closed this session; a different state shows again.
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => { setDismissed(readDismissed()) }, [])

  useEffect(() => {
    if (isSubAgent) return
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    getCurrentSubscription(token).then((s) => { if (!cancelled) setSub(s) }).catch(() => {})
    return () => { cancelled = true }
  }, [isSubAgent])

  useEffect(() => {
    const onLimit = (e: Event) => setLimit((e as CustomEvent<PlanLimitDetail>).detail)
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit)
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit)
  }, [])

  const pay = useCallback(async () => {
    const token = getAccessToken()
    if (!token || !sub) return
    setPaying(true)
    setPayError(null)
    try {
      await startPlanPayment(token, sub, sub.plan.plan_id)
    } catch (err) {
      setPayError(errorMessage(err, "Gagal membuat pembayaran. Silakan coba lagi."))
      setPaying(false)
    }
  }, [sub])

  if (isSubAgent) return null

  const unpaid = sub && !sub.effective.in_effect
  const cap = sub?.effective.policy_limit ?? null
  const used = sub?.usage.active_policy_count ?? 0
  const nearLimit = !!sub && !unpaid && cap !== null && used >= cap * NEAR_LIMIT_RATIO

  let bar: { key: string; tone: "warn" | "info"; title: string; text: string; action: string; onAction: () => void } | null = null
  if (unpaid && sub) {
    bar = {
      key: `unpaid:${sub.plan.plan_id}`,
      tone: "warn",
      title: `Paket ${sub.plan.name} belum aktif`,
      text: "Selesaikan pembayaran untuk membuka semua fitur paket. Sementara itu akun memakai batas Starter.",
      action: paying ? "Memproses…" : "Bayar Sekarang",
      onAction: pay,
    }
  } else if (nearLimit && cap !== null) {
    bar = {
      key: "near-limit",
      tone: "info",
      title: used >= cap ? "Batas polis aktif tercapai" : "Kuota polis hampir penuh",
      text: used >= cap
        ? `Batas ${cap} polis aktif paket Starter tercapai. Upgrade untuk polis tidak terbatas.`
        : `${used} dari ${cap} polis aktif paket Starter terpakai.`,
      action: "Upgrade Paket",
      onAction: () => router.push(SETTINGS_SUBSCRIPTION),
    }
  }

  const visible = bar && dismissed !== bar.key ? bar : null
  const tones = {
    warn: { bg: "#FFFBEB", border: "#FCD34D", accent: "#D97706", iconBg: "#FEF3C7", icon: "#B45309", title: "#78350F", text: "#92400E" },
    info: { bg: "#EFF6FF", border: "#93C5FD", accent: "#2563EB", iconBg: "#DBEAFE", icon: "#1D4ED8", title: "#1E3A8A", text: "#1E40AF" },
  }
  const t = visible ? tones[visible.tone] : null

  return (
    <>
      {visible && t && (
        <Box
          position="fixed" zIndex={30}
          // Bottom-right toast stacked above the help button (52px tall at bottom 24px / 84px on mobile).
          left={{ base: "12px", md: "auto" }} right={{ base: "12px", md: "16px" }}
          bottom={{ base: "148px", md: "88px" }}
          w={{ md: "400px" }} maxW="calc(100vw - 24px)"
          bg={t.bg} border="1px solid" borderColor={t.border} borderLeft="4px solid" borderLeftColor={t.accent}
          borderRadius="12px" boxShadow="0 10px 30px rgba(15,23,42,0.14)"
          p="16px" pr="44px"
          role={visible.tone === "warn" ? "alert" : "status"}
        >
          <IconButton
            aria-label="Tutup pemberitahuan" variant="ghost" size="sm"
            position="absolute" top="8px" right="8px" color={t.text}
            _hover={{ bg: t.iconBg }}
            onClick={() => { writeDismissed(visible.key); setDismissed(visible.key) }}
          >
            <LuX size={18} aria-hidden="true" />
          </IconButton>
          <Flex gap="12px" align="flex-start">
            <Flex flexShrink={0} w="36px" h="36px" borderRadius="10px" bg={t.iconBg} align="center" justify="center">
              {visible.tone === "warn" ? <LuTriangleAlert size={20} color={t.icon} aria-hidden="true" /> : <LuCrown size={20} color={t.icon} aria-hidden="true" />}
            </Flex>
            <Box minW={0}>
              <Text fontSize="15px" fontWeight="bold" lineHeight="1.3" color={t.title}>{visible.title}</Text>
              <Text mt="4px" fontSize="15px" lineHeight="1.45" color={t.text}>{visible.text}</Text>
              {payError && <Text mt="6px" fontSize="15px" fontWeight="medium" color="#B91C1C">{payError}</Text>}
              <Button
                mt="12px" size="sm" bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }}
                onClick={visible.onAction} disabled={paying} loading={paying && visible.tone === "warn"}
              >
                {visible.action}
              </Button>
            </Box>
          </Flex>
        </Box>
      )}

      <Dialog.Root open={limit !== null} onOpenChange={({ open }) => { if (!open) setLimit(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="420px" mx="16px">
            <Dialog.Header>
              <Flex align="center" gap="8px">
                <LuCrown size={18} color="#1D4ED8" />
                <Dialog.Title fontSize="15px">Upgrade paket diperlukan</Dialog.Title>
              </Flex>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="15px" color="#475569">{limit?.message}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" borderColor="#E2E8F0" onClick={() => setLimit(null)}>Nanti</Button>
              <Button bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }} onClick={() => { setLimit(null); router.push(SETTINGS_SUBSCRIPTION) }}>
                Lihat Paket
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
