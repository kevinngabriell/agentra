"use client"

import { TodayTasksCard } from "@/components/tasks"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Center, Flex, Grid, IconButton, Spinner, Text } from "@chakra-ui/react"
import Link from "next/link"
import {
  FiBell, FiFileText, FiRefreshCw, FiDollarSign,
  FiMessageSquare, FiCheckCircle, FiCalendar, FiFilter, FiPlus, FiAlertCircle, FiAlertTriangle,
} from "react-icons/fi"
import { Sidebar, TopBar, MobileHeader, MobileBottomNav } from "@/components/layout"
import { getAccessToken } from "@/lib/auth/session"
import { errorStatus } from "@/lib/api/client"
import {
  getDashboardStats, getDashboardActivity, getTodayActions,
  type DashboardStats, type ActivityItem, type TodayAction, type RenewalBreakdown,
} from "@/lib/api/dashboard"
import { getMyProfile, type UserProfile } from "@/lib/api/user"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRODUCT_LABELS: Record<string, string> = {
  fire: "Asuransi Kebakaran",
  motorcycle: "Asuransi Motor",
  car: "Asuransi Kendaraan",
  travel: "Asuransi Perjalanan",
  cargo: "Asuransi Kargo",
  other: "Asuransi Lainnya",
  kecelakaan: "Asuransi Kecelakaan",
  aep: "AEP",
}

function formatCommission(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}jt`
  }
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  if (d.toDateString() === now.toDateString()) return `${time} WIB`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Kemarin, ${time}`
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + `, ${time}`
}

function getActionStatus(days: number) {
  if (days < 0) return { label: `Lewat ${Math.abs(days)} hari`, color: "#991B1B", bg: "#FEE2E2" }
  if (days === 0) return { label: "Berakhir Hari Ini", color: "#991B1B", bg: "#FEE2E2" }
  if (days <= 2) return { label: `H-${days} Expired`, color: "#991B1B", bg: "#FEE2E2" }
  if (days <= 4) return { label: `H-${days} Renewal`, color: "#92400E", bg: "#FEF3C7" }
  return { label: `H-${days} Renewal`, color: "#C2410C", bg: "#FFF7ED" }
}

function getActivityConfig(type: string) {
  switch (type) {
    case "policy_created":
      return { icon: <FiCheckCircle size={18} />, bg: "#DCFCE7", color: "#16A34A", title: "Polis Baru Diterbitkan" }
    case "policy_updated":
      return { icon: <FiFileText size={18} />, bg: "#EEF2FF", color: "#4F46E5", title: "Polis Diperbarui" }
    case "renewal_completed":
      return { icon: <FiRefreshCw size={18} />, bg: "#EEF2FF", color: "#4F46E5", title: "Perpanjangan Berhasil" }
    case "follow_up_added":
      return { icon: <FiCalendar size={18} />, bg: "#FEF3C7", color: "#D97706", title: "Jadwal Hubungi Lagi" }
    default:
      return { icon: <FiAlertCircle size={18} />, bg: "#F1F5F9", color: "#64748B", title: "Aktivitas" }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardData {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  subColor?: string
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <Flex flexDir="column" w="100%" bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" padding="24px" align="center" gap="16px">
      <Flex justifyContent="space-between" w="100%">
        <Flex w="32px" h="36px" borderRadius="8px" bg={stat.iconBg} align="center" justify="center" flexShrink={0} padding="8px">
          <Box color={stat.iconColor}>{stat.icon}</Box>
        </Flex>
        <Text fontSize="14px" fontWeight="semibold" color={stat.subColor ?? "#8B9BB4"}>{stat.sub}</Text>
      </Flex>
      <Box w="100%">
        <Text color="#5D6D7E" fontSize="14px">{stat.label}</Text>
        <Text color="#1C2833" fontSize="24px" fontWeight="bold">{stat.value}</Text>
      </Box>
    </Flex>
  )
}

function KlaimBerjalan({ open, pendingDocs }: { open: number; pendingDocs: number }) {
  return (
    <Link href="/agentra/claims" style={{ display: "block" }}>
      <Flex bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" paddingX="24px" paddingY="16px" align="center" gap="16px" flexWrap="wrap">
        <Flex w="36px" h="36px" borderRadius="8px" bg="#FEE2E2" align="center" justify="center" flexShrink={0} color="#DC2626">
          <FiAlertTriangle size={18} />
        </Flex>
        <Box flex="1" minW="160px">
          <Text color="#001F40" fontWeight="semibold" fontSize="16px">Klaim Berjalan</Text>
          <Text color="#5D6D7E" fontSize="15px">
            {open === 0 ? "Tidak ada klaim yang sedang diproses" : `${open} klaim sedang diproses`}
          </Text>
        </Box>
        <Box textAlign="right">
          <Text color={pendingDocs > 0 ? "#B45309" : "#16A34A"} fontSize="20px" fontWeight="bold">{pendingDocs}</Text>
          <Text color="#5D6D7E" fontSize="14px">menunggu dokumen</Text>
        </Box>
      </Flex>
    </Link>
  )
}

function AksiHariIni({ actions }: { actions: TodayAction[] }) {
  const router = useRouter()
  return (
    <Box bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" overflow="hidden">
      <Flex justify="space-between" align="center" paddingX="24px" paddingY="16px" borderBottom="1px solid" borderColor="#DDE1E7">
        <Text color="#001F40" fontWeight="semibold" fontSize="18px">Aksi Hari Ini</Text>
        <Link href="/agentra/renewals" style={{ color: "#006397", fontSize: "16px" }}>Lihat Semua</Link>
      </Flex>

      <Grid templateColumns="1fr 160px 140px" borderBottom="1px solid" borderColor="#DDE1E7">
        <Text color="#5D6D7E" fontSize="15px" fontWeight="medium" paddingX="24px" paddingY="12px">Nama Nasabah</Text>
        <Text color="#5D6D7E" fontSize="15px" fontWeight="medium" paddingX="16px" paddingY="12px">Status</Text>
        <Text color="#5D6D7E" fontSize="15px" fontWeight="medium" paddingX="16px" paddingY="12px" textAlign="right">Aksi</Text>
      </Grid>

      {actions.length === 0 ? (
        <Flex align="center" justify="center" py="40px">
          <Text color="#8B9BB4" fontSize="16px">Tidak ada aksi mendesak hari ini</Text>
        </Flex>
      ) : (
        <Flex flexDir="column">
          {actions.map((a, i) => {
            const status = getActionStatus(a.days_until_expiry)
            const productLabel = PRODUCT_LABELS[a.product_type] ?? "Asuransi"
            return (
              <Grid
                key={a.policy_id}
                templateColumns="1fr 160px 140px"
                alignItems="center"
                borderBottom={i < actions.length - 1 ? "1px solid" : "none"}
                borderColor="#DDE1E7"
                _hover={{ bg: "#F8FAFC" }}
              >
                <Box paddingX="24px" paddingY="20px">
                  <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{a.customer_name}</Text>
                  <Text color="#5D6D7E" fontSize="14px" mt="2px">{productLabel} — {a.insurer_name}</Text>
                </Box>
                <Box paddingX="16px" paddingY="20px">
                  <Flex display="inline-flex" px="12px" py="5px" borderRadius="full" bg={status.bg} align="center">
                    <Text color={status.color} fontSize="14px" fontWeight="semibold">{status.label}</Text>
                  </Flex>
                </Box>
                <Flex paddingX="16px" paddingY="20px" justify="flex-end">
                  <Button
                    size="sm"
                    bg="#001F40"
                    color="white"
                    fontSize="15px"
                    fontWeight="medium"
                    borderRadius="8px"
                    px="16px"
                    py="10px"
                    _hover={{ bg: "#0a3060" }}
                    onClick={() => router.push(`/agentra/policies/${a.policy_id}`)}
                  >
                    <Flex align="center" gap="6px">
                      <FiMessageSquare size={14} />
                      Follow Up
                    </Flex>
                  </Button>
                </Flex>
              </Grid>
            )
          })}
        </Flex>
      )}
    </Box>
  )
}

function StatusPerpanjangan({ breakdown }: { breakdown: RenewalBreakdown }) {
  const renewedPct = Math.round(breakdown.renewed_pct)
  const inProgressPct = Math.round(breakdown.in_progress_pct)

  return (
    <Box bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" p="24px">
      <Text color="#001F40" fontWeight="semibold" fontSize="18px" paddingBottom="24px">
        Status Perpanjangan Bln Ini
      </Text>

      <Flex flexDir="column" gap="24px">
        <Box>
          <Flex justify="space-between" mb="8px">
            <Text color="#1C2833" fontSize="15px" fontWeight="medium">Berhasil Diperbarui</Text>
            <Text color="#27AE60" fontSize="15px" fontWeight="bold">{renewedPct}%</Text>
          </Flex>
          <Box h="8px" bg="#F1F5F9" borderRadius="full" overflow="hidden">
            <Box h="100%" w={`${renewedPct}%`} bg="#27AE60" borderRadius="full" />
          </Box>
          <Text color="#8B9BB4" fontSize="14px" mt="6px">{breakdown.renewed} dari {breakdown.total} Polis</Text>
        </Box>

        <Box>
          <Flex justify="space-between" mb="8px">
            <Text color="#1C2833" fontSize="15px" fontWeight="medium">Sedang Proses</Text>
            <Text color="#006397" fontSize="15px" fontWeight="bold">{inProgressPct}%</Text>
          </Flex>
          <Box h="8px" bg="#F1F5F9" borderRadius="full" overflow="hidden">
            <Box h="100%" w={`${inProgressPct}%`} bg="#006397" borderRadius="full" />
          </Box>
          <Text color="#8B9BB4" fontSize="14px" mt="6px">{breakdown.in_progress} dari {breakdown.total} Polis</Text>
        </Box>
      </Flex>

      <Box bg="#0C4A6E" borderRadius="12px" mt="32px" padding="16px">
        <Text color="#7DD3FC" fontSize="14px" textTransform="uppercase" fontWeight="semibold" letterSpacing="0.05em" mb="8px">
          Omzet Perpanjangan Tercapai
        </Text>
        <Flex justify="space-between" align="center" mb="12px">
          <Text color="white" fontSize="18px" fontWeight="bold">Rp {Math.round(breakdown.achieved_omzet).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</Text>
          <Text color="#BAE6FD" fontSize="14px">{breakdown.renewed} Polis</Text>
        </Flex>
        <Box h="4px" bg="rgba(255,255,255,0.2)" borderRadius="full" overflow="hidden">
          <Box h="100%" w={`${Math.min(renewedPct, 100)}%`} bg="white" borderRadius="full" />
        </Box>
      </Box>
    </Box>
  )
}

function AktivitasTerbaru({ activities }: { activities: ActivityItem[] }) {
  return (
    <Box bg="#FFFFFF" border="1px solid" borderColor="#DDE1E7" borderRadius="12px" p="24px">
      <Flex justify="space-between" align="center" mb="20px">
        <Text color="#001F40" fontWeight="semibold" fontSize="18px">Aktivitas Terbaru</Text>
        <Box color="#8B9BB4" aria-hidden="true"><FiFilter size={18} /></Box>
      </Flex>

      {activities.length === 0 ? (
        <Flex align="center" justify="center" py="24px">
          <Text color="#8B9BB4" fontSize="16px">Belum ada aktivitas</Text>
        </Flex>
      ) : (
        <Flex flexDir="column">
          {activities.map((a, i) => {
            const cfg = getActivityConfig(a.type)
            return (
              <Flex
                key={a.id}
                gap="16px"
                py="16px"
                borderBottom={i < activities.length - 1 ? "1px solid" : "none"}
                borderColor="#F1F5F9"
                align="flex-start"
              >
                <Flex w="40px" h="40px" borderRadius="full" bg={cfg.bg} align="center" justify="center" flexShrink={0}>
                  <Box color={cfg.color}>{cfg.icon}</Box>
                </Flex>
                <Box flex={1} minW={0}>
                  <Text color="#1C2833" fontSize="16px" fontWeight="bold" mb="4px">{cfg.title}</Text>
                  <Text color="#5D6D7E" fontSize="15px" lineHeight="1.6">
                    {a.description}
                    {a.actor?.name && (
                      <Text as="span" color="#1C2833" fontWeight="bold"> ({a.actor.name})</Text>
                    )}
                  </Text>
                </Box>
                <Text color="#8B9BB4" fontSize="14px" flexShrink={0} whiteSpace="nowrap" pt="2px">
                  {formatActivityTime(a.created_at)}
                </Text>
              </Flex>
            )
          })}
        </Flex>
      )}
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageData {
  stats: DashboardStats
  actions: TodayAction[]
  activities: ActivityItem[]
  user: UserProfile
}

export default function DashboardPage() {
  const router = useRouter()
  const [pageStatus, setPageStatus] = useState<"loading" | "ready" | "error">("loading")
  const [data, setData] = useState<PageData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const token = getAccessToken()
      if (!token) {
        if (!cancelled) router.replace("/login")
        return
      }

      // Token refresh and an unrecoverable 401 (→ /login) are handled by lib/api/client.
      try {
        const [stats, activityRes, todayRes, user] = await Promise.all([
          getDashboardStats(token),
          getDashboardActivity(token, 5),
          getTodayActions(token, 10),
          getMyProfile(token),
        ])
        if (cancelled) return
        setData({ stats, actions: todayRes.items, activities: activityRes.items, user })
        setPageStatus("ready")
      } catch (err: unknown) {
        if (cancelled || errorStatus(err) === 401) return
        setPageStatus("error")
      }
    }
    init()
    return () => { cancelled = true }
  }, [router])

  const shell = (children: React.ReactNode) => (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />
      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: 0 }}>
        {children}
      </Box>
      <MobileBottomNav />
    </Box>
  )

  if (pageStatus === "loading") {
    return shell(
      <Center h="calc(100vh - 56px)">
        <Spinner size="xl" color="#006397" />
      </Center>
    )
  }

  if (pageStatus === "error") {
    return shell(
      <Center h="calc(100vh - 56px)" flexDir="column" gap="16px">
        <Text color="#E74C3C" fontSize="18px" fontWeight="semibold">Data dashboard belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.</Text>
        <Button onClick={() => window.location.reload()} bg="#006397" color="white" borderRadius="8px" px="20px">
          Coba Lagi
        </Button>
      </Center>
    )
  }

  const { stats, actions, activities, user } = data!

  const statsCards: StatCardData[] = [
    {
      label: "TOTAL POLIS",
      value: stats.total_active_policies.toLocaleString("id-ID"),
      sub: stats.trends.policies_vs_last_month,
      icon: <FiFileText size={20} />,
      iconBg: "#E5EFF5",
      iconColor: "#006397",
    },
    {
      label: "Pembaruan",
      value: stats.renewals_this_month.toString(),
      sub: stats.trends.renewals_vs_last_month,
      icon: <FiRefreshCw size={20} />,
      iconBg: "#FEF5E7",
      iconColor: "#F39C12",
      subColor: "#F59E0B",
    },
    {
      label: "Jatuh Tempo",
      value: stats.expiring_this_week.toString(),
      sub: stats.expiring_this_week > 0 ? "CRITICAL" : "",
      icon: <FiBell size={20} />,
      iconBg: "#FDEDEB",
      iconColor: "#E74C3C",
      subColor: "#F87171",
    },
    {
      label: "Komisi",
      value: formatCommission(stats.pending_commissions_amount),
      sub: "Bulan Ini",
      icon: <FiDollarSign size={20} />,
      iconBg: "#E9F7EF",
      iconColor: "#58C083",
      subColor: "#34D399",
    },
  ]

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Dashboard" userName={user.first_name} />
        </Box>

        <Flex p="24px" gap="24px" flexDir="column">
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={{ base: "12px", md: "16px" }}>
            {statsCards.map((s) => (
              <StatCard key={s.label} stat={s} />
            ))}
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 340px" }} gap="16px">
            <AksiHariIni actions={actions} />
            <StatusPerpanjangan breakdown={stats.renewal_breakdown} />
          </Grid>

          <TodayTasksCard />

          <KlaimBerjalan open={stats.open_claims ?? 0} pendingDocs={stats.claims_pending_documents ?? 0} />

          <AktivitasTerbaru activities={activities} />
        </Flex>
      </Box>

      <IconButton
        asChild
        aria-label="Tambah polis baru"
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom="80px"
        right="20px"
        w="52px"
        h="52px"
        borderRadius="full"
        bg="#0D1826"
        zIndex={19}
        boxShadow="0 4px 12px rgba(0,0,0,0.25)"
        _hover={{ bg: "#1a2f4a" }}
      >
        <Link href="/agentra/policies/new">
          <FiPlus size={22} color="white" />
        </Link>
      </IconButton>

      <MobileBottomNav />
    </Box>
  )
}
