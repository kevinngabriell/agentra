import { Box, Flex, HStack, Button, Text } from "@chakra-ui/react"
import Link from "next/link"

export function Header() {
  return (
    <Box backgroundColor={"white"}
      as="header"
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
        <Link href="/" aria-label="Agentra – Beranda" style={{ textDecoration: "none" }}>
          <Text fontWeight="bold" fontSize="xl" color="#0D1B3E" letterSpacing="tight">
            Agentra
          </Text>
        </Link>

        {/* Nav Links: absolute "/#..." so they also work where the header is reused (e.g. /register). */}
        <HStack as="nav" aria-label="Navigasi utama" gap={8} display={{ base: "none", md: "flex" }}>
          <Link href="/#features">
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="gray.600"
              _hover={{ color: "gray.900" }}
            >
              Fitur
            </Text>
          </Link>
          <Link href="/#pricing">
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
          {/* Real links (not router.push buttons) so they can be opened in a new tab and crawled. */}
          <Button asChild variant={"ghost"} size={"sm"} color={"gray.700"} _hover={{ bg: "gray.100" }} minH={"40px"} px={4}>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild backgroundColor={"#0D1B3E"} size={"sm"} color={"white"} _hover={{ bg: "#1a2f5c" }} minH={"40px"} px={5}>
            <Link href="/register">Coba Gratis</Link>
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
