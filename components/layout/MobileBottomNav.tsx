"use client"

import { Box, Flex, Text } from "@chakra-ui/react"
import { FiHome, FiUsers, FiRefreshCw, FiBarChart2 } from "react-icons/fi"
import { MdOutlinePolicy } from "react-icons/md"

const mobileNav = [
  { icon: <FiHome size={20} />, label: "Beranda", active: true },
  { icon: <FiRefreshCw size={20} />, label: "Renewals" },
  { icon: <FiUsers size={20} />, label: "Nasabah" },
  { icon: <MdOutlinePolicy size={20} />, label: "Polis" },
  { icon: <FiBarChart2 size={20} />, label: "Laporan" },
]

export function MobileBottomNav() {
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
      {mobileNav.map((item) => (
        <Flex
          key={item.label}
          flex={1}
          flexDir="column"
          align="center"
          gap="4px"
          py="4px"
          cursor="pointer"
        >
          <Box
            px="16px"
            py="6px"
            borderRadius="full"
            bg={item.active ? "#EFF6FF" : "transparent"}
            color={item.active ? "#1D4ED8" : "#64748B"}
          >
            {item.icon}
          </Box>
          <Text
            fontSize="10px"
            color={item.active ? "#1D4ED8" : "#64748B"}
            fontWeight={item.active ? "semibold" : "normal"}
          >
            {item.label}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}
