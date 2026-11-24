"use client"

import { Box, Flex, IconButton } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { FiBell, FiLogOut } from "react-icons/fi"
import { Logo } from "@/components/Logo"
import { logout } from "@/lib/auth/logout"

export function MobileHeader() {
  const router = useRouter()

  // The Sidebar (and its logout) is hidden below md, so mobile needs its own way out.
  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  return (
    <Flex
      display={{ base: "flex", md: "none" }}
      align="center"
      justify="space-between"
      px="16px"
      py="12px"
      bg="#FFFFFF"
      borderBottom="1px solid"
      borderColor="#E2E8F0"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={15}
    >
      <Flex align="center">
        <Logo height={28} />
      </Flex>
      <Flex gap="10px" align="center">
        <Box color="#64748B" aria-hidden="true"><FiBell size={22} /></Box>
        <IconButton
          aria-label="Keluar"
          size="md"
          variant="ghost"
          borderRadius="full"
          color="#EF4444"
          _hover={{ bg: "#FEE2E2" }}
          onClick={handleLogout}
        >
          <FiLogOut size={22} />
        </IconButton>
      </Flex>
    </Flex>
  )
}
