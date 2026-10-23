"use client"

import { Flex, Text } from "@chakra-ui/react"
import { usePathname } from "next/navigation"
import { FiHelpCircle } from "react-icons/fi"
import { PAGE_INFO, helpUrl } from "@/lib/glossary"

// Always-visible help for agents who would rather ask than search: opens WhatsApp when
// NEXT_PUBLIC_SUPPORT_WHATSAPP is set (with the current page named in the message), else /help.
export function HelpButton() {
  const pathname = usePathname()
  const segment = pathname.split("/")[2] ?? ""
  const topic = Object.values(PAGE_INFO).find((p) => p.title.toLowerCase().startsWith(segment.toLowerCase()) && segment)?.title ?? ""
  const href = helpUrl(topic)

  return (
    <Flex
      asChild
      position="fixed"
      right="16px"
      bottom={{ base: "84px", md: "24px" }}
      zIndex={25}
      align="center"
      gap="8px"
      minH="52px"
      px="18px"
      borderRadius="full"
      bg="#16A34A"
      color="white"
      boxShadow="0 4px 14px rgba(0,0,0,0.2)"
      _hover={{ bg: "#15803D" }}
    >
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label="Butuh bantuan? Hubungi kami">
        <FiHelpCircle size={24} aria-hidden="true" />
        <Text fontSize="16px" fontWeight="semibold">Butuh Bantuan?</Text>
      </a>
    </Flex>
  )
}
