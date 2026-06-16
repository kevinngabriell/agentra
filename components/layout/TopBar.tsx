"use client"

import { Box, Flex, Separator, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FiBell, FiSettings } from "react-icons/fi"
import { getAccessToken } from "@/lib/auth/session"
import { getMyProfile } from "@/lib/api/user"

interface TopBarProps {
  title: string
  userName?: string
  userRole?: string
}

export function TopBar({ title, userName: userNameProp, userRole = "Agen" }: TopBarProps) {
  const [userName, setUserName] = useState(userNameProp ?? "")
  const router = useRouter()

  useEffect(() => {
    if (userNameProp) { setUserName(userNameProp); return }
    const token = getAccessToken()
    if (!token) return
    getMyProfile(token)
      .then((u) => setUserName(u.first_name || u.username || "Agent"))
      .catch(() => {})
  }, [userNameProp])

  const displayName = userName || "Agent"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <Flex align="center" justify="space-between" paddingX="24px" paddingY="9px" borderBottom="1px solid" borderColor="#E2E8F0" bgColor="#FFFFFF">
      <Text color="#0F172A" fontSize="20px" fontWeight="bold">{title}</Text>
      <Flex align="center" gap="12px">
        <Flex
          w="36px" h="36px" borderRadius="full"
          align="center" justify="center"
          cursor="pointer" _hover={{ bg: "#F1F5F9" }}
        >
          <FiBell size={16} color="#64748B" />
        </Flex>
        <Flex
          w="36px" h="36px" borderRadius="full"
          align="center" justify="center"
          cursor="pointer" _hover={{ bg: "#F1F5F9" }}
          onClick={() => router.push("/agentra/settings")}
        >
          <FiSettings size={16} color="#64748B" />
        </Flex>
        <Separator orientation="vertical" h="24px" />
        <Box display={{ base: "none", md: "block" }}>
          <Text color="#0F172A" fontSize="13px" fontWeight="semibold" lineHeight="1.2">{displayName}</Text>
          <Text color="#64748B" fontSize="11px">{userRole}</Text>
        </Box>
        <Flex w="36px" h="36px" borderRadius="full" bg="#1D4ED8" align="center" justify="center" cursor="pointer">
          <Text color="white" fontSize="13px" fontWeight="bold">{initials}</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
