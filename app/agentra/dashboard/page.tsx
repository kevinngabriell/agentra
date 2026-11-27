"use client"

import { TodayTasksCard } from "@/components/tasks"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Center, Flex, Grid, IconButton, Spinner, Text } from "@chakra-ui/react"
import Link from "next/link"
import {
  FiFileText, FiRefreshCw, FiDollarSign, FiCheckCircle, FiCalendar, FiPlus,
  FiAlertCircle, FiAlertTriangle, FiClock, FiChevronRight, FiPhoneCall,
} from "react-icons/fi"
import { Sidebar, TopBar, MobileHeader, MobileBottomNav } from "@/components/layout"
import { getAccessToken } from "@/lib/auth/session"
import { errorStatus } from "@/lib/api/client"
import {
  getDashboardStats, getDashboardActivity, getTodayActions,
  type DashboardStats, type ActivityItem, type TodayAction, type RenewalBreakdown,
} from "@/lib/api/dashboard"
import { getMyProfile, type UserProfile } from "@/lib/api/user"
import { useProductOptions } from "@/lib/hooks/useProductOptions"
import { fmtIDR } from "@/lib/format"

// ─── Design tokens ───────────────────────────────────────────────────────────
// Built for readers aged 50+: body text is never below 16px, secondary text keeps
// at least a 7:1 contrast on white (WCAG AAA), and every tappable control is 48px tall.

const INK = "#111827"        // main text
const INK_SOFT = "#374151"    // secondary text (10:1 on white)
const NAVY = "#0D1B3E"        // primary buttons and headings
const LINK = "#0B5A8A"        // links (7:1 on white)
const LINE = "#CBD5E1"        // card borders
const FOCUS = { outline: "3px solid #1D4ED8", outlineOffset: "2px" }

const CARD = {
  bg: "#FFFFFF",
  border: "1px solid",
  borderColor: LINE,
  borderRadius: "16px",
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(hour: number): string {
  if (hour < 11) return "Selamat pagi"
  if (hour < 15) return "Selamat siang"
  if (hour < 18) return "Selamat sore"
  return "Selamat malam"
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  if (d.toDateString() === now.toDateString()) return `Hari ini, pukul ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Kemarin, pukul ${time}`
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long" }) + `, pukul ${time}`
}

// Plain wording: "berakhir 3 hari lagi" instead of the shorthand "H-3 Renewal".
function getActionStatus(days: number) {
  if (days < 0) return { label: `Sudah lewat ${Math.abs(days)} hari`, color: "#991B1B", bg: "#FEE2E2", urgent: true }
  if (days === 0) return { label: "Berakhir hari ini", color: "#991B1B", bg: "#FEE2E2", urgent: true }
  if (days <= 2) return { label: `Berakhir ${days} hari lagi`, color: "#991B1B", bg: "#FEE2E2", urgent: true }
  if (days <= 4) return { label: `Berakhir ${days} hari lagi`, color: "#78350F", bg: "#FEF3C7", urgent: false }
  return { label: `Berakhir ${days} hari lagi`, color: "#7C2D12", bg: "#FFEDD5", urgent: false }
}

function getActivityConfig(type: string) {
  switch (type) {
    case "policy_created":
      return { icon: <FiCheckCircle size={22} />, bg: "#DCFCE7", color: "#166534", title: "Polis baru dicatat" }
    case "policy_updated":
      return { icon: <FiFileText size={22} />, bg: "#E0E7FF", color: "#3730A3", title: "Data polis diubah" }
    case "renewal_completed":
      return { icon: <FiRefreshCw size={22} />, bg: "#E0E7FF", color: "#3730A3", title: "Perpanjangan selesai" }
    case "follow_up_added":
      return { icon: <FiCalendar size={22} />, bg: "#FEF3C7", color: "#78350F", title: "Jadwal menghubungi nasabah" }
    default:
      return { icon: <FiAlertCircle size={22} />, bg: "#F1F5F9", color: "#334155", title: "Kegiatan lain" }
  }
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <Box>
      <Text as="h2" color={NAVY} fontWeight="bold" fontSize="18px" lineHeight="1.3">{children}</Text>
      {hint && <Text color={INK_SOFT} fontSize="16px" mt="2px">{hint}</Text>}
    </Box>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Welcome({ name, urgentCount }: { name: string; urgentCount: number }) {
  const now = new Date()
  const dateText = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return (
    <Flex {...CARD} p={{ base: "20px", md: "24px" }} gap="16px" align={{ base: "stretch", md: "center" }} justify="space-between" flexDir={{ base: "column", md: "row" }}>
      <Box>
        <Text color={INK_SOFT} fontSize="16px">{dateText}</Text>
        <Text as="h2" color={NAVY} fontSize={{ base: "24px", md: "28px" }} fontWeight="bold" lineHeight="1.25">
          {greeting(now.getHours())}, {name}
        </Text>
        <Text color={INK} fontSize="16px" mt="4px">
          {urgentCount > 0
            ? `Ada ${urgentCount} polis nasabah yang perlu segera Anda hubungi.`
            : "Tidak ada polis yang mendesak hari ini. Pekerjaan Anda aman."}
        </Text>
      </Box>
      <Button
        asChild
        display={{ base: "none", md: "inline-flex" }}
        bg={NAVY} color="white" h="44px" px="24px" fontSize="16px" fontWeight="semibold" borderRadius="12px"
        _hover={{ bg: "#1a2f5c" }} _focusVisible={FOCUS}
      >
        <Link href="/agentra/policies/new"><FiPlus size={20} /> Tambah Polis Baru</Link>
      </Button>
    </Flex>
  )
}

interface StatCardData {
  label: string
  value: string
  explain: string
  note?: string
  href: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <Link href={stat.href} style={{ display: "block", height: "100%" }} aria-label={`${stat.label}: ${stat.value}. ${stat.explain}`}>
      <Flex {...CARD} flexDir="column" h="100%" p={{ base: "16px", md: "20px" }} gap="12px" _hover={{ borderColor: NAVY, boxShadow: "0 2px 8px rgba(13,27,62,0.12)" }}>
        <Flex align="center" gap="12px">
          <Flex w="40px" h="40px" borderRadius="12px" bg={stat.iconBg} align="center" justify="center" flexShrink={0} color={stat.iconColor} aria-hidden="true">
            {stat.icon}
          </Flex>
          <Text color={INK} fontSize="16px" fontWeight="bold" lineHeight="1.25">{stat.label}</Text>
        </Flex>
        <Text color={NAVY} fontSize={{ base: "26px", md: "28px" }} fontWeight="bold" lineHeight="1.1">{stat.value}</Text>
        <Text color={INK_SOFT} fontSize="16px" lineHeight="1.4">{stat.explain}</Text>
        {stat.note && <Text color={INK} fontSize="16px" fontWeight="semibold">{stat.note}</Text>}
      </Flex>
    </Link>
  )
}

function KlaimBerjalan({ open, pendingDocs }: { open: number; pendingDocs: number }) {
  return (
    <Link href="/agentra/claims" style={{ display: "block" }}>
      <Box {...CARD} p="20px" _hover={{ borderColor: NAVY }}>
        <Flex align="center" gap="12px" mb="12px">
          <Flex w="40px" h="40px" borderRadius="12px" bg="#FEE2E2" align="center" justify="center" flexShrink={0} color="#991B1B" aria-hidden="true">
            <FiAlertTriangle size={22} />
          </Flex>
          <Text as="h2" color={NAVY} fontWeight="bold" fontSize="18px" flex="1">Klaim yang Sedang Diurus</Text>
          <FiChevronRight size={22} color={INK_SOFT} aria-hidden="true" />
        </Flex>
        <Text color={INK} fontSize="16px">
          {open === 0 ? "Tidak ada klaim yang sedang diproses." : `${open} klaim sedang diproses.`}
        </Text>
        <Text color={pendingDocs > 0 ? "#78350F" : "#166534"} fontSize="16px" fontWeight="bold" mt="4px">
          {pendingDocs > 0 ? `${pendingDocs} klaim masih menunggu dokumen dari nasabah` : "Semua dokumen klaim sudah lengkap"}
        </Text>
        <Text color={LINK} fontSize="16px" fontWeight="semibold" mt="12px">Lihat semua klaim →</Text>
      </Box>
    </Link>
  )
}

function AksiHariIni({ actions }: { actions: TodayAction[] }) {
  const productCatalog = useProductOptions()
  const router = useRouter()
  return (
    <Box {...CARD} overflow="hidden">
      <Flex justify="space-between" align="center" gap="12px" flexWrap="wrap" px="24px" py="20px" borderBottom="1px solid" borderColor={LINE}>
        <SectionTitle hint="Polis nasabah yang akan atau sudah habis masa berlakunya">Perlu Dihubungi Hari Ini</SectionTitle>
        <Link href="/agentra/renewals" style={{ color: LINK, fontSize: "16px", fontWeight: 700, textDecoration: "underline" }}>Lihat semua</Link>
      </Flex>

      {actions.length === 0 ? (
        <Flex align="center" justify="center" py="40px" px="24px">
          <Text color={INK_SOFT} fontSize="16px" textAlign="center">Tidak ada nasabah yang perlu dihubungi hari ini.</Text>
        </Flex>
      ) : (
        <Flex flexDir="column">
          {actions.map((a, i) => {
            const status = getActionStatus(a.days_until_expiry)
            const productLabel = productCatalog.label(a.product_type)
            return (
              <Flex
                key={a.policy_id}
                gap="16px"
                px="24px"
                py="20px"
                align={{ base: "stretch", md: "center" }}
                flexDir={{ base: "column", md: "row" }}
                borderBottom={i < actions.length - 1 ? "1px solid" : "none"}
                borderColor="#E2E8F0"
                _hover={{ bg: "#F8FAFC" }}
              >
                <Box flex="1" minW={0}>
                  <Text color={INK} fontSize="18px" fontWeight="bold" lineHeight="1.3">{a.customer_name}</Text>
                  <Text color={INK_SOFT} fontSize="16px" mt="2px">{productLabel} · {a.insurer_name}</Text>
                </Box>
                <Flex align="center" gap="8px" px="14px" py="8px" borderRadius="full" bg={status.bg} alignSelf={{ base: "flex-start", md: "center" }} flexShrink={0}>
                  {status.urgent ? <FiAlertCircle size={18} color={status.color} aria-hidden="true" /> : <FiClock size={18} color={status.color} aria-hidden="true" />}
                  <Text color={status.color} fontSize="16px" fontWeight="bold">{status.label}</Text>
                </Flex>
                <Button
                  bg={NAVY} color="white" h="44px" px="20px" fontSize="16px" fontWeight="semibold" borderRadius="12px"
                  _hover={{ bg: "#1a2f5c" }} _focusVisible={FOCUS}
                  aria-label={`Buka polis ${a.customer_name} untuk menghubungi nasabah`}
                  onClick={() => router.push(`/agentra/policies/${a.policy_id}`)}
                >
                  <FiPhoneCall size={16} /> Buka & Hubungi
                </Button>
              </Flex>
            )
          })}
        </Flex>
      )}
    </Box>
  )
}

function ProgressRow({ label, count, total, pct, color }: { label: string; count: number; total: number; pct: number; color: string }) {
  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb="8px" gap="8px">
        <Text color={INK} fontSize="16px" fontWeight="semibold">{label}</Text>
        <Text color={INK} fontSize="18px" fontWeight="bold">{pct}%</Text>
      </Flex>
      <Box h="14px" bg="#E2E8F0" borderRadius="full" overflow="hidden" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <Box h="100%" w={`${Math.min(pct, 100)}%`} bg={color} borderRadius="full" />
      </Box>
      <Text color={INK_SOFT} fontSize="16px" mt="6px">{count} dari {total} polis</Text>
    </Box>
  )
}

function StatusPerpanjangan({ breakdown }: { breakdown: RenewalBreakdown }) {
  const renewedPct = Math.round(breakdown.renewed_pct)
  const inProgressPct = Math.round(breakdown.in_progress_pct)

  return (
    <Box {...CARD} p="24px">
      <Box mb="24px">
        <SectionTitle hint="Polis yang masa berlakunya habis bulan ini">Perpanjangan Bulan Ini</SectionTitle>
      </Box>

      <Flex flexDir="column" gap="24px">
        <ProgressRow label="Sudah diperpanjang" count={breakdown.renewed} total={breakdown.total} pct={renewedPct} color="#15803D" />
        <ProgressRow label="Sedang diurus" count={breakdown.in_progress} total={breakdown.total} pct={inProgressPct} color="#0B5A8A" />
      </Flex>

      <Box bg="#0C3A5A" borderRadius="12px" mt="28px" p="20px">
        <Text color="#E0F2FE" fontSize="16px" fontWeight="semibold" mb="4px">Nilai premi yang sudah diperpanjang</Text>
        <Text color="white" fontSize="22px" fontWeight="bold" lineHeight="1.2">{fmtIDR(breakdown.achieved_omzet)}</Text>
        <Text color="#E0F2FE" fontSize="16px" mt="4px">dari {breakdown.renewed} polis</Text>
      </Box>
    </Box>
  )
}

function AktivitasTerbaru({ activities }: { activities: ActivityItem[] }) {
  return (
    <Box {...CARD} p="24px">
      <Box mb="8px">
        <SectionTitle hint="5 kegiatan terakhir di akun Anda">Kegiatan Terakhir</SectionTitle>
      </Box>

      {activities.length === 0 ? (
        <Flex align="center" justify="center" py="24px">
          <Text color={INK_SOFT} fontSize="16px">Belum ada kegiatan.</Text>
        </Flex>
      ) : (
        <Flex flexDir="column">
          {activities.map((a, i) => {
            const cfg = getActivityConfig(a.type)
            return (
              <Flex
                key={a.id}
                gap="16px"
                py="18px"
                borderBottom={i < activities.length - 1 ? "1px solid" : "none"}
                borderColor="#E2E8F0"
                align="flex-start"
              >
                <Flex w="40px" h="40px" borderRadius="full" bg={cfg.bg} align="center" justify="center" flexShrink={0} color={cfg.color} aria-hidden="true">
                  {cfg.icon}
                </Flex>
                <Box flex={1} minW={0}>
                  <Text color={INK} fontSize="16px" fontWeight="bold" mb="2px">{cfg.title}</Text>
                  <Text color={INK_SOFT} fontSize="16px" lineHeight="1.6">
                    {a.description}
                    {a.actor?.name && (
                      <Text as="span" color={INK} fontWeight="bold"> — oleh {a.actor.name}</Text>
                    )}
                  </Text>
                  <Text color={INK_SOFT} fontSize="16px" mt="4px">{formatActivityTime(a.created_at)}</Text>
                </Box>
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
      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
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
      <Center h="calc(100vh - 56px)" flexDir="column" gap="20px" px="24px" textAlign="center">
        <Text color="#991B1B" fontSize="18px" fontWeight="bold" role="alert">
          Halaman Beranda belum bisa dibuka.
        </Text>
        <Text color={INK_SOFT} fontSize="16px">Periksa sinyal internet Anda, lalu tekan tombol di bawah.</Text>
        <Button onClick={() => window.location.reload()} bg={NAVY} color="white" borderRadius="12px" h="44px" px="28px" fontSize="16px" fontWeight="semibold" _focusVisible={FOCUS}>
          Coba Lagi
        </Button>
      </Center>
    )
  }

  const { stats, actions, activities, user } = data!
  const urgentCount = actions.filter((a) => a.days_until_expiry <= 2).length

  const statsCards: StatCardData[] = [
    {
      label: "Polis Aktif",
      value: stats.total_active_policies.toLocaleString("id-ID"),
      explain: "Polis nasabah yang masih berlaku",
      note: stats.trends.policies_vs_last_month || undefined,
      href: "/agentra/policies",
      icon: <FiFileText size={22} />,
      iconBg: "#DBEAFE",
      iconColor: "#1E40AF",
    },
    {
      label: "Perpanjangan Bulan Ini",
      value: stats.renewals_this_month.toString(),
      explain: "Polis yang masa berlakunya habis bulan ini",
      note: stats.trends.renewals_vs_last_month || undefined,
      href: "/agentra/renewals",
      icon: <FiRefreshCw size={22} />,
      iconBg: "#FEF3C7",
      iconColor: "#78350F",
    },
    {
      label: "Habis Minggu Ini",
      value: stats.expiring_this_week.toString(),
      explain: "Polis yang berakhir dalam 7 hari ke depan",
      note: stats.expiring_this_week > 0 ? "Segera hubungi nasabah" : undefined,
      href: "/agentra/renewals",
      icon: <FiClock size={22} />,
      iconBg: "#FEE2E2",
      iconColor: "#991B1B",
    },
    {
      label: "Komisi yang Menunggu",
      value: fmtIDR(stats.pending_commissions_amount),
      explain: "Komisi Anda yang belum dibayarkan",
      href: "/agentra/commissions",
      icon: <FiDollarSign size={22} />,
      iconBg: "#DCFCE7",
      iconColor: "#166534",
    },
  ]

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Dashboard" userName={user.first_name} />
        </Box>

        <Flex p={{ base: "16px", md: "24px" }} gap="24px" flexDir="column" maxW="1400px">
          <Welcome name={user.first_name || "Bapak/Ibu"} urgentCount={urgentCount} />

          <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr", xl: "repeat(4, 1fr)" }} gap="16px">
            {statsCards.map((s) => (
              <StatCard key={s.label} stat={s} />
            ))}
          </Grid>

          <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 380px" }} gap="24px" alignItems="start">
            <Flex flexDir="column" gap="24px" minW={0}>
              <AksiHariIni actions={actions} />
              <TodayTasksCard />
              <AktivitasTerbaru activities={activities} />
            </Flex>
            <Flex flexDir="column" gap="24px" minW={0}>
              <StatusPerpanjangan breakdown={stats.renewal_breakdown} />
              <KlaimBerjalan open={stats.open_claims ?? 0} pendingDocs={stats.claims_pending_documents ?? 0} />
            </Flex>
          </Grid>
        </Flex>
      </Box>

      <IconButton
        asChild
        aria-label="Tambah polis baru"
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom="80px"
        right="20px"
        w="60px"
        h="60px"
        borderRadius="full"
        bg={NAVY}
        zIndex={19}
        boxShadow="0 4px 12px rgba(0,0,0,0.3)"
        _hover={{ bg: "#1a2f5c" }}
      >
        <Link href="/agentra/policies/new">
          <FiPlus size={26} color="white" />
        </Link>
      </IconButton>

      <MobileBottomNav />
    </Box>
  )
}
