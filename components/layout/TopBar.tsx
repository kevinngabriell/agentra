"use client"

import { Box, Flex, Separator, Text, IconButton } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { FiSettings } from "react-icons/fi"
import { NotificationBell } from "./NotificationBell"
import { getAccessToken } from "@/lib/auth/session"
import { getMyProfile } from "@/lib/api/user"
import { getInitials } from "@/lib/format"
import { PAGE_INFO } from "@/lib/glossary"

interface TopBarProps {
  title: string
  userName?: string
  userRole?: string
}

export function TopBar({ title, userName: userNameProp, userRole = "Agen" }: TopBarProps) {
  const info = PAGE_INFO[title]
  const [fetchedName, setFetchedName] = useState("")

  useEffect(() => {
    if (userNameProp) return
    const token = getAccessToken()
    if (!token) return
    let active = true
    // An expired session is handled centrally by lib/api/client (redirect to /login);
    // any other failure just leaves the generic name in place.
    getMyProfile(token)
      .then((u) => { if (active) setFetchedName(u.first_name || u.username || "Agent") })
      .catch(() => {})
    return () => { active = false }
  }, [userNameProp])

  const displayName = userNameProp || fetchedName || "Agent"
  const initials = getInitials(displayName)

  return (
    <Flex align="center" justify="space-between" paddingX="24px" paddingY="12px" borderBottom="1px solid" borderColor="#E2E8F0" bgColor="#FFFFFF">
      <Box minW={0}>
        <Text as="h1" color="#0F172A" fontSize="24px" fontWeight="bold" lineHeight="1.2">{info?.title ?? title}</Text>
        {info && <Text color="#475569" fontSize="15px" mt="2px">{info.hint}</Text>}
      </Box>
      <Flex align="center" gap="12px">
        <NotificationBell />
        <IconButton
          asChild
          aria-label="Pengaturan"
          title="Pengaturan"
          variant="ghost"
          borderRadius="full"
          w="44px" h="44px"
          _hover={{ bg: "#F1F5F9" }}
        >
          <Link href="/agentra/settings">
            <FiSettings size={22} color="#64748B" />
          </Link>
        </IconButton>
        <Separator orientation="vertical" h="24px" />
        <Box display={{ base: "none", md: "block" }}>
          <Text color="#0F172A" fontSize="15px" fontWeight="semibold" lineHeight="1.2">{displayName}</Text>
          <Text color="#64748B" fontSize="14px">{userRole}</Text>
        </Box>
        <Flex w="36px" h="36px" borderRadius="full" bg="#1D4ED8" align="center" justify="center" aria-hidden="true">
          <Text color="white" fontSize="15px" fontWeight="bold">{initials}</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
