"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import { FiHome, FiUsers, FiRefreshCw, FiBarChart2 } from "react-icons/fi"
import { MdOutlinePolicy } from "react-icons/md"
import Link from "next/link"
import { usePathname } from "next/navigation"

const mobileNav = [
  { icon: <FiHome size={20} />, label: "Beranda", href: "/agentra/dashboard" },
  { icon: <FiRefreshCw size={20} />, label: "Renewals", href: "/agentra/renewals" },
  { icon: <FiUsers size={20} />, label: "Nasabah", href: "/agentra/customer" },
  { icon: <MdOutlinePolicy size={20} />, label: "Polis", href: "/agentra/policies" },
  { icon: <FiBarChart2 size={20} />, label: "Laporan", href: "/agentra/reports" },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <Flex
      display={{ base: "flex", md: "none" }}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="#FFFFFF"
      borderTop="1px solid"
      borderColor="#E2E8F0"
      zIndex={20}
      py="8px"
      px="4px"
    >
      {mobileNav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Flex
            key={item.label}
            as={Link}
            href={item.href}
            flex={1}
            flexDir="column"
            align="center"
            gap="4px"
            py="4px"
            cursor="pointer"
            textDecoration="none"
          >
            <Box
              px="16px"
              py="6px"
              borderRadius="full"
              bg={active ? "#EFF6FF" : "transparent"}
              color={active ? "#1D4ED8" : "#64748B"}
            >
              {item.icon}
            </Box>
            <Text
              fontSize="10px"
              color={active ? "#1D4ED8" : "#64748B"}
              fontWeight={active ? "semibold" : "normal"}
            >
              {item.label}
            </Text>
          </Flex>
        )
      })}
    </Flex>
  )
}
