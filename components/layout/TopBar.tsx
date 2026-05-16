"use client"

import { Box, Flex, Separator, Text } from "@chakra-ui/react"
import { FiBell, FiSettings } from "react-icons/fi"

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <Flex align="center" justify="space-between" paddingX="24px" paddingY="9px" borderBottom="1px solid" borderColor="#E2E8F0" bgColor="#FFFFFF">
      <Text color="#0F172A" fontSize="20px" fontWeight="bold">{title}</Text>
      <Flex align="center" gap="12px">
        <Flex
          w="36px" h="36px" borderRadius="full"
          align="center" justify="center"
          cursor="pointer" _hover={{ bg: "#243547" }}
        >
          <FiBell size={16} color="#64748B" />
        </Flex>
        <Flex
          w="36px" h="36px" borderRadius="full"
          align="center" justify="center"
          cursor="pointer" _hover={{ bg: "#243547" }}
        >
          <FiSettings size={16} color="#64748B" />
        </Flex>
        <Separator />
        <Box display={{ base: "none", md: "block" }}>
          <Text color="#0F172A" fontSize="13px" fontWeight="semibold" lineHeight="1.2">Agent Budi</Text>
          <Text color="#64748B" fontSize="11px">Senior Agent</Text>
        </Box>
        <Flex w="36px" h="36px" borderRadius="full" bg="#1D4ED8" align="center" justify="center" cursor="pointer">
          <Text color="white" fontSize="13px" fontWeight="bold">AB</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
