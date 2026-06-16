"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import { FiHome, FiUsers, FiRefreshCw, FiDollarSign, FiUserCheck, FiFolder, FiBarChart2, FiLogOut, FiShield } from "react-icons/fi"
import { MdOutlinePolicy } from "react-icons/md"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { clearTokens } from "@/lib/auth/session"

const mainMenuItems = [
  { icon: <FiHome size={18} />, label: "Dashboard", href: "/agentra/dashboard" },
  { icon: <FiUsers size={18} />, label: "Customers", href: "/agentra/customer" },
  { icon: <FiRefreshCw size={18} />, label: "Renewals", href: "/agentra/renewals" },
  { icon: <MdOutlinePolicy size={18} />, label: "Policies", href: "/agentra/policies" },
  { icon: <FiDollarSign size={18} />, label: "Commissions", href: "/agentra/commisions" },
]

const agencyItems = [
  { icon: <FiUserCheck size={18} />, label: "Sub-Agents", href: "/agentra/sub-agents" },
  { icon: <FiFolder size={18} />, label: "Documents", href: "/agentra/documents" },
  { icon: <FiBarChart2 size={18} />, label: "Reports", href: "/agentra/reports" },
]

function NavItem({ icon, label, href, active }: { icon: React.ReactNode; label: string; href: string; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Flex
        align="center"
        gap="10px"
        px="10px"
        py="9px"
        borderRadius="8px"
        cursor="pointer"
        bg={active ? "#EFF6FF" : "transparent"}
        borderRight={active ? "3px solid #1D4ED8" : "3px solid transparent"}
        _hover={{ bg: "#EFF6FF" }}
        transition="background 0.15s"
      >
        <Box color={active ? "#1D4ED8" : "#64748B"}>{icon}</Box>
        <Text fontSize="13px" fontWeight={active ? "semibold" : "normal"} color={active ? "#1D4ED8" : "#334155"}>
          {label}
        </Text>
      </Flex>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    clearTokens()
    router.push("/login")
  }

  return (
    <Flex display={{ base: "none", md: "flex" }} flexDir="column" w="200px" minH="100vh" bg="#F8FAFC" borderRight="1px solid" borderColor="#E2E8F0" py="24px" px="16px" position="fixed" top={0} left={0} zIndex={10}>
      <Flex align="center" gap="8px" mb="32px" px="4px">
        <Flex
          w="32px" h="32px" borderRadius="8px"
          bg="#1D4ED8" align="center" justify="center"
          flexShrink={0}
        >
          <FiShield size={16} color="white" />
        </Flex>
        <Text color="#0C4A6E" fontSize="13px" fontWeight="bold" lineHeight="1.2">Agentra CRM</Text>
      </Flex>

      <Flex flexDir="column" gap="2px" flex={1}>
        <Text fontSize="10px" fontWeight="semibold" color="#94A3B8" letterSpacing="0.08em" px="10px" mb="6px">
          MAIN MENU
        </Text>
        {mainMenuItems.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <Text fontSize="10px" fontWeight="semibold" color="#94A3B8" letterSpacing="0.08em" px="10px" mt="20px" mb="6px">
          AGENCY
        </Text>
        {agencyItems.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
      </Flex>

      <Flex align="center" gap="10px" px="10px" py="9px" borderRadius="8px" cursor="pointer" _hover={{ bg: "#FEE2E2" }} mt="8px" onClick={handleLogout}>
        <Box color="#EF4444"><FiLogOut size={18} /></Box>
        <Text fontSize="13px" color="#EF4444">Logout</Text>
      </Flex>
    </Flex>
  )
}
