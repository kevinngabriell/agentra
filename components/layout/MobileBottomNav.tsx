"use client"

import { useState } from "react"
import { Box, Dialog, Flex, Text } from "@chakra-ui/react"
import { FiHome, FiUsers, FiRefreshCw, FiDollarSign, FiGrid, FiSettings, FiX } from "react-icons/fi"
import { MdOutlinePolicy } from "react-icons/md"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FiUserCheck } from "react-icons/fi"
import { SUB_AGENT_HOME, useAgentMode } from "./AgentMode"
import { moreItems, agencyItems } from "./Sidebar"

const mobileNav = [
  { icon: <FiHome size={24} />, label: "Beranda", href: "/agentra/dashboard" },
  { icon: <FiRefreshCw size={24} />, label: "Perpanjang", href: "/agentra/renewals" },
  { icon: <FiUsers size={24} />, label: "Nasabah", href: "/agentra/customer" },
  { icon: <MdOutlinePolicy size={24} />, label: "Polis", href: "/agentra/policies" },
]

// Komisi and settings live in the "Lainnya" sheet so the bar keeps five big, readable targets.
const sheetGroups = [
  {
    title: "Sering Dipakai",
    items: [
      { icon: <FiDollarSign size={26} />, label: "Komisi", hint: "Catat komisi dari penanggung", href: "/agentra/commissions" },
      { icon: <FiSettings size={26} />, label: "Pengaturan", hint: "Atur produk, asuransi, akun & langganan", href: "/agentra/settings" },
    ],
  },
  { title: "Menu Lainnya", items: moreItems.map((i) => ({ ...i, hint: "" })) },
  { title: "Kelola Agensi", items: agencyItems.map((i) => ({ ...i, hint: "" })) },
]
const sheetHrefs = sheetGroups.flatMap((g) => g.items.map((i) => i.href))

const subAgentNav = [
  { icon: <FiUserCheck size={24} />, label: "Portal Saya", href: SUB_AGENT_HOME },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const isSubAgent = useAgentMode() === "sub-agent"
  const items = isSubAgent ? subAgentNav : mobileNav
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = sheetHrefs.some((h) => pathname === h || pathname.startsWith(h + "/"))

  return (
    <Flex
      as="nav"
      aria-label="Navigasi utama"
      display={{ base: "flex", md: "none" }}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="#FFFFFF"
      borderTop="1px solid"
      borderColor="#E2E8F0"
      zIndex={20}
      py="6px"
      px="2px"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link key={item.label} href={item.href} style={{ flex: 1, textDecoration: "none" }} aria-current={active ? "page" : undefined}>
          <Flex
            flexDir="column"
            align="center"
            gap="2px"
            py="4px"
            minH="56px"
            cursor="pointer"
            width="100%"
          >
            <Box
              px="14px"
              py="6px"
              borderRadius="full"
              bg={active ? "#EFF6FF" : "transparent"}
              color={active ? "#1D4ED8" : "#64748B"}
            >
              {item.icon}
            </Box>
            <Text
              fontSize="13px"
              color={active ? "#1D4ED8" : "#64748B"}
              fontWeight={active ? "semibold" : "normal"}
            >
              {item.label}
            </Text>
          </Flex>
          </Link>
        )
      })}

      {!isSubAgent && (
        <Box
          as="button"
          flex={1}
          aria-label="Menu lainnya"
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
          bg="transparent"
          border="none"
        >
          <Flex flexDir="column" align="center" gap="2px" py="4px" minH="56px" cursor="pointer" width="100%">
            <Box px="14px" py="6px" borderRadius="full"
              bg={moreActive ? "#EFF6FF" : "transparent"} color={moreActive ? "#1D4ED8" : "#64748B"}>
              <FiGrid size={24} />
            </Box>
            <Text fontSize="13px" color={moreActive ? "#1D4ED8" : "#64748B"} fontWeight={moreActive ? "semibold" : "normal"}>
              Lainnya
            </Text>
          </Flex>
        </Box>
      )}

      <Dialog.Root open={moreOpen} onOpenChange={(d) => setMoreOpen(d.open)} placement="bottom" scrollBehavior="inside">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderTopRadius="20px" borderBottomRadius="0" maxH="85vh" m="0" w="100%">
            <Dialog.Header px="20px" py="16px" borderBottom="1px solid" borderColor="#E2E8F0">
              <Flex justify="space-between" align="center" w="100%">
                <Dialog.Title fontSize="20px" fontWeight="bold" color="#1C2833">Menu Lainnya</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <Box as="button" aria-label="Tutup" w="44px" h="44px" display="flex" alignItems="center" justifyContent="center" borderRadius="full" bg="#F1F5F9" color="#475569">
                    <FiX size={22} />
                  </Box>
                </Dialog.CloseTrigger>
              </Flex>
            </Dialog.Header>
            <Dialog.Body px="16px" py="12px" pb="32px">
              {sheetGroups.map((group) => (
                <Flex key={group.title} flexDir="column" gap="8px" mb="16px">
                  <Text fontSize="15px" fontWeight="semibold" color="#475569" px="4px">{group.title}</Text>
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} style={{ textDecoration: "none" }}
                        aria-current={active ? "page" : undefined}>
                        <Flex align="center" gap="14px" minH="64px" px="16px" py="10px" borderRadius="12px" border="1px solid"
                          borderColor={active ? "#1D4ED8" : "#E2E8F0"} bg={active ? "#EFF6FF" : "white"}>
                          <Box color={active ? "#1D4ED8" : "#1A3557"} flexShrink={0}>{item.icon}</Box>
                          <Flex flexDir="column" gap="2px" minW="0">
                            <Text fontSize="18px" fontWeight="semibold" color="#1C2833">{item.label}</Text>
                            {item.hint && <Text fontSize="15px" color="#64748B">{item.hint}</Text>}
                          </Flex>
                        </Flex>
                      </Link>
                    )
                  })}
                </Flex>
              ))}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  )
}
