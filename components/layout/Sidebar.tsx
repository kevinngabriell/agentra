"use client"

import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { FiHome, FiUsers, FiRefreshCw, FiDollarSign, FiUserCheck, FiFolder, FiBarChart2, FiLogOut, FiAlertCircle, FiCreditCard, FiTarget, FiMessageSquare, FiCheckSquare, FiUpload } from "react-icons/fi"
import { MdOutlinePolicy } from "react-icons/md"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { logout } from "@/lib/auth/logout"
import { SUB_AGENT_HOME, useAgentMode } from "./AgentMode"

const mainMenuItems = [
  { icon: <FiHome size={22} />, label: "Beranda", href: "/agentra/dashboard" },
  { icon: <FiUsers size={22} />, label: "Nasabah", href: "/agentra/customer" },
  { icon: <MdOutlinePolicy size={22} />, label: "Polis", href: "/agentra/policies" },
  { icon: <FiRefreshCw size={22} />, label: "Perpanjangan Polis", href: "/agentra/renewals" },
  { icon: <FiDollarSign size={22} />, label: "Komisi", href: "/agentra/commissions" },
]

// Less-used pages sit under their own heading so the daily menu stays short.
export const moreItems = [
  { icon: <FiTarget size={22} />, label: "Calon Nasabah", href: "/agentra/prospects" },
  { icon: <FiAlertCircle size={22} />, label: "Klaim", href: "/agentra/claims" },
  { icon: <FiCreditCard size={22} />, label: "Tagihan Premi", href: "/agentra/payments" },
  { icon: <FiMessageSquare size={22} />, label: "Pesan ke Nasabah", href: "/agentra/communications" },
  { icon: <FiCheckSquare size={22} />, label: "Tugas & Pengingat", href: "/agentra/tasks" },
]

const subAgentItems = [
  { icon: <FiUserCheck size={22} />, label: "Portal Saya", href: SUB_AGENT_HOME },
]

export const agencyItems = [
  { icon: <FiUserCheck size={22} />, label: "Tim Saya", href: "/agentra/sub-agents" },
  { icon: <FiFolder size={22} />, label: "Dokumen", href: "/agentra/documents" },
  { icon: <FiBarChart2 size={22} />, label: "Laporan", href: "/agentra/reports" },
  { icon: <FiUpload size={22} />, label: "Pindahkan Data dari Excel", href: "/agentra/import" },
]

function NavItem({ icon, label, href, active }: { icon: React.ReactNode; label: string; href: string; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
      <Flex
        align="center"
        gap="12px"
        px="12px"
        py="12px"
        minH="48px"
        css={{ "@media (max-height: 900px)": { paddingTop: "7px", paddingBottom: "7px", minHeight: "38px" } }}
        borderRadius="8px"
        cursor="pointer"
        bg={active ? "#EFF6FF" : "transparent"}
        borderRight={active ? "3px solid #1D4ED8" : "3px solid transparent"}
        _hover={{ bg: "#EFF6FF" }}
        transition="background 0.15s"
      >
        <Box color={active ? "#1D4ED8" : "#64748B"}>{icon}</Box>
        <Text fontSize="16px" fontWeight={active ? "semibold" : "normal"} color={active ? "#1D4ED8" : "#1E293B"} lineHeight="1.3">
          {label}
        </Text>
      </Flex>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const isSubAgent = useAgentMode() === "sub-agent"

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  return (
    <Flex as="nav" aria-label="Menu utama" display={{ base: "none", md: "flex" }} flexDir="column" w="250px" h="100vh" bg="#F8FAFC" borderRight="1px solid" borderColor="#E2E8F0" py="16px" px="12px" position="fixed" top={0} left={0} zIndex={10}>
      <Flex align="center" mb="16px" px="4px" flexShrink={0}>
        <Link href="/agentra/dashboard" aria-label="Agentra CRM – Beranda"><Logo height={32} /></Link>
      </Flex>

      <Flex flexDir="column" gap="2px" flex={1} minH={0} overflowY="auto">
        {isSubAgent ? (
          subAgentItems.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))
        ) : (
          <>
          <Text fontSize="14px" fontWeight="semibold" color="#475569" px="12px" mb="6px">
            Menu Utama
          </Text>
          {mainMenuItems.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
          ))}

          <Text fontSize="14px" fontWeight="semibold" color="#475569" px="12px" mt="16px" mb="6px">
            Menu Lainnya
          </Text>
          {moreItems.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
          ))}

          <Text fontSize="14px" fontWeight="semibold" color="#475569" px="12px" mt="16px" mb="6px">
            Kelola Agensi
          </Text>
          {agencyItems.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
          ))}
          </>
        )}
      </Flex>

      <Button
        variant="ghost"
        alignItems="center"
        gap="12px"
        px="12px"
        py="12px"
        minH="48px"
        borderRadius="8px"
        _hover={{ bg: "#FEE2E2" }}
        mt="8px"
        flexShrink={0}
        onClick={handleLogout}
        color="#EF4444"
        fontWeight="normal"
        justifyContent="flex-start"
      >
        <Box color="#EF4444" aria-hidden="true"><FiLogOut size={22} /></Box>
        <Text fontSize="16px" color="#EF4444">Keluar</Text>
      </Button>
    </Flex>
  )
}
