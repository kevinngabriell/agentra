"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Dialog, Flex, Text } from "@chakra-ui/react"
import { LuCrown, LuTriangleAlert } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { PLAN_LIMIT_EVENT, errorMessage, type PlanLimitDetail } from "@/lib/api/client"
import { checkoutPlan, getCurrentSubscription, type ApiSubscription } from "@/lib/api/subscription"
import { useAgentMode } from "./AgentMode"

const SETTINGS_SUBSCRIPTION = "/agentra/settings?tab=subscription"
// Show the usage nudge once a Starter company has used this share of its policy cap.
const NEAR_LIMIT_RATIO = 0.8

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

  let bar: { tone: "warn" | "info"; text: string; action: string; onAction: () => void } | null = null
  if (unpaid && sub) {
    bar = {
      tone: "warn",
      text: `Paket ${sub.plan.name} belum aktif. Selesaikan pembayaran untuk membuka fitur paket; sementara itu akun memakai batas Starter.`,
      action: paying ? "Memproses…" : "Bayar Sekarang",
      onAction: pay,
    }
  } else if (nearLimit && cap !== null) {
    bar = {
      tone: "info",
      text: used >= cap
        ? `Batas ${cap} polis aktif paket Starter tercapai. Upgrade untuk polis tidak terbatas.`
        : `${used} dari ${cap} polis aktif paket Starter terpakai.`,
      action: "Upgrade Paket",
      onAction: () => router.push(SETTINGS_SUBSCRIPTION),
    }
  }

  return (
    <>
      {bar && (
        <Flex
          position="fixed" zIndex={30} left={{ base: 0, md: "200px" }} right={0} bottom={{ base: "64px", md: 0 }}
          align="center" justify="space-between" gap="12px" px="16px" py="10px" flexWrap="wrap"
          bg={bar.tone === "warn" ? "#FFFBEB" : "#EFF6FF"} borderTop="1px solid"
          borderColor={bar.tone === "warn" ? "#FDE68A" : "#BFDBFE"}
          role="status"
        >
          <Flex align="center" gap="8px" flex="1" minW="240px">
            {bar.tone === "warn" ? <LuTriangleAlert size={16} color="#B45309" /> : <LuCrown size={16} color="#1D4ED8" />}
            <Text fontSize="16px" color={bar.tone === "warn" ? "#92400E" : "#1E3A8A"}>
              {bar.text}{payError ? ` ${payError}` : ""}
            </Text>
          </Flex>
          <Button size="sm" bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }} onClick={bar.onAction} disabled={paying}>
            {bar.action}
          </Button>
        </Flex>
      )}

      <Dialog.Root open={limit !== null} onOpenChange={({ open }) => { if (!open) setLimit(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="420px" mx="16px">
            <Dialog.Header>
              <Flex align="center" gap="8px">
                <LuCrown size={18} color="#1D4ED8" />
                <Dialog.Title fontSize="16px">Upgrade paket diperlukan</Dialog.Title>
              </Flex>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="16px" color="#475569">{limit?.message}</Text>
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
