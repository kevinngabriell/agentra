"use client"

import { Box, Flex, HStack, VStack, Text, Button } from "@chakra-ui/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Absolute "/#..." anchors so the links also resolve when the footer is rendered off the landing page.
const footerLinks = [
  { label: "Fitur", href: "/#features" },
  { label: "Harga", href: "/#pricing" },
  { label: "Bantuan", href: "/help" },
  { label: "Kontak", href: "/contact" },
  { label: "Kebijakan Privasi", href: "/privacy" },
  { label: "Syarat & Ketentuan", href: "/terms" },
]

const mobileFooterLinks = [
  { label: "Privasi", href: "/privacy" },
  { label: "Syarat & Ketentuan", href: "/terms" },
  { label: "Kontak", href: "/contact" },
]

const mobileNavItems = [
  {
    label: "Beranda",
    href: "/",
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    label: "Fitur",
    href: "/#features",
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Harga",
    href: "/#pricing",
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Bantuan",
    href: "/help",
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth="3" />
      </svg>
    ),
  },
]

export function Footer() {
  const pathname = usePathname()
  return (
    <>
      {/* Main footer */}
      <Box
        as="footer"
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        px={{ base: 6, md: 12 }}
        py={{ base: 8, md: 6 }}
        pb={{ base: "80px", md: 6 }}
      >
        {/* Desktop layout */}
        <Flex
          maxW="1200px"
          mx="auto"
          align="center"
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap={{ base: 6, md: 0 }}
        >
          {/* Brand + copyright */}
          <VStack align={{ base: "center", md: "flex-start" }} gap={1}>
            <Text fontWeight="bold" fontSize="lg" color="#0D1B3E">
              Agentra
            </Text>
            <Text fontSize="sm" color="gray.400">
              © {new Date().getFullYear()} Agentra. Solusi CRM Asuransi Terpercaya.
            </Text>
          </VStack>

          {/* Nav links — desktop only */}
          <HStack
            gap={6}
            display={{ base: "none", md: "flex" }}
            flexWrap="wrap"
            justify="center"
          >
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href}>
                <Text
                  fontSize="sm"
                  color="gray.500"
                  _hover={{ color: "#0D1B3E" }}
                  transition="color 0.15s"
                >
                  {link.label}
                </Text>
              </Link>
            ))}
          </HStack>

          {/* Mobile footer links */}
          <HStack
            gap={5}
            display={{ base: "flex", md: "none" }}
            flexWrap="wrap"
            justify="center"
          >
            {mobileFooterLinks.map((link) => (
              <Link key={link.label} href={link.href}>
                <Text fontSize="sm" color="gray.500" _hover={{ color: "#0D1B3E" }}>
                  {link.label}
                </Text>
              </Link>
            ))}
          </HStack>

          {/* Icon buttons */}
          <HStack gap={2} display={{ base: "none", md: "flex" }}>
            <Button
              asChild
              variant="outline"
              size="sm"
              w="36px"
              h="36px"
              p={0}
              borderRadius="full"
              borderColor="gray.300"
              color="gray.500"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
            >
              <a href="https://agentra.id" target="_blank" rel="noopener noreferrer" aria-label="Website Agentra (agentra.id)">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              w="36px"
              h="36px"
              p={0}
              borderRadius="full"
              borderColor="gray.300"
              color="gray.500"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
            >
              <a href="mailto:halo@agentra.id" aria-label="Kirim email ke halo@agentra.id">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Mobile bottom navigation bar */}
      <Box
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        zIndex={200}
        px={2}
        py={2}
        as="nav"
        aria-label="Navigasi bawah"
      >
        <Flex w="100%" justify="space-around">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
            return (
            <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined}>
              <VStack
                gap={1}
                px={4}
                py={1}
                color={active ? "#0D1B3E" : "gray.400"}
                _hover={{ color: "#0D1B3E" }}
                transition="color 0.15s"
                minW="44px"
                align="center"
              >
                {item.icon}
                <Text fontSize="14px" fontWeight={active ? "semibold" : "normal"}>
                  {item.label}
                </Text>
              </VStack>
            </Link>
            )
          })}
        </Flex>
      </Box>
    </>
  )
}
