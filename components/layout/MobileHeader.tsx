"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import { FiBell, FiShield } from "react-icons/fi"

export function MobileHeader() {
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
      <Flex align="center" gap="8px">
        <Flex w="28px" h="28px" borderRadius="6px" bg="#0D1826" align="center" justify="center">
          <FiShield size={14} color="white" />
        </Flex>
        <Text color="#0D1826" fontSize="13px" fontWeight="bold">InsureAgent CRM</Text>
      </Flex>
      <Flex gap="10px" align="center">
        <Box color="#64748B" cursor="pointer"><FiBell size={18} /></Box>
        <Flex w="30px" h="30px" borderRadius="full" bg="#0D1826" align="center" justify="center">
          <Text color="white" fontSize="11px" fontWeight="bold">AD</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
