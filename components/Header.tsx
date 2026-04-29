"use client"

import { Box, Flex, HStack, Button, Text } from "@chakra-ui/react"
import Link from "next/link"

export function Header() {
  return (
    <Box
      as="header"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={{ base: 6, md: 12 }}
      py={4}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <Flex maxW="1200px" mx="auto" align="center" justify="space-between">
        {/* Logo */}
        <Text fontWeight="bold" fontSize="xl" color="#0D1B3E" letterSpacing="tight">
          Agentra
        </Text>

        {/* Nav Links */}
        <HStack gap={8} display={{ base: "none", md: "flex" }}>
          <Link href="#features">
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="#3B82F6"
              borderBottom="2px solid"
              borderColor="#3B82F6"
              pb="2px"
              _hover={{ color: "#2563EB" }}
            >
              Fitur
            </Text>
          </Link>
          <Link href="#pricing">
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="gray.600"
              _hover={{ color: "gray.900" }}
            >
              Harga
            </Text>
          </Link>
        </HStack>

        {/* CTA Buttons */}
        <HStack gap={3}>
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              color="gray.700"
              _hover={{ bg: "gray.100" }}
              minH="40px"
              px={4}
            >
              Masuk
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              bg="#0D1B3E"
              color="white"
              _hover={{ bg: "#1a2f5c" }}
              minH="40px"
              px={5}
            >
              Coba Gratis
            </Button>
          </Link>
        </HStack>
      </Flex>
    </Box>
  )
}
