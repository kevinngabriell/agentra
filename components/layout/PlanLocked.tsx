"use client"

import { useRouter } from "next/navigation"
import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { LuCheck, LuCrown, LuLock } from "react-icons/lu"

const SETTINGS_SUBSCRIPTION = "/agentra/settings?tab=subscription"

/**
 * Full-card replacement for a page whose feature isn't in the company's plan (API ERR_PLAN_005).
 * `message` is the API's own text; `benefits` sells what the upgrade unlocks.
 */
export function PlanLocked({ title, message, requiredPlan, benefits = [] }: {
  title: string
  message?: string
  requiredPlan?: string
  benefits?: string[]
}) {
  const router = useRouter()
  const plan = requiredPlan ? `Paket ${requiredPlan}` : "paket yang lebih tinggi"

  return (
    <Flex
      bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="16px"
      flexDir="column" align="center" textAlign="center" gap="16px" px="24px" py={{ base: "36px", md: "56px" }}
      role="status"
    >
      <Box position="relative">
        <Flex w="72px" h="72px" borderRadius="full" bg="#EFF6FF" color="#1D4ED8" align="center" justify="center">
          <LuLock size={32} />
        </Flex>
        <Flex
          position="absolute" bottom="-4px" right="-8px" w="28px" h="28px" borderRadius="full"
          bg="#FEF3C7" color="#B45309" border="2px solid white" align="center" justify="center"
        >
          <LuCrown size={14} />
        </Flex>
      </Box>

      <Flex flexDir="column" gap="6px" maxW="460px">
        <Text color="#1C2833" fontSize="20px" fontWeight="bold">{title}</Text>
        <Text color="#5D6D7E" fontSize="16px">
          {message || `Fitur ini tersedia di ${plan}. Upgrade paket Anda untuk menggunakannya.`}
        </Text>
      </Flex>

      {benefits.length > 0 && (
        <Flex as="ul" flexDir="column" gap="8px" textAlign="left" maxW="420px" w="100%" listStyleType="none" m={0} p="16px" bg="#F8FAFC" borderRadius="12px">
          {benefits.map((b) => (
            <Flex as="li" key={b} align="flex-start" gap="8px">
              <Box color="#16A34A" mt="2px" flexShrink={0}><LuCheck size={15} /></Box>
              <Text color="#374151" fontSize="16px">{b}</Text>
            </Flex>
          ))}
        </Flex>
      )}

      <Flex gap="10px" flexWrap="wrap" justify="center">
        <Button bg="#1A3557" color="white" gap="6px" h="42px" px="20px" fontSize="16px" _hover={{ bg: "#162C47" }} onClick={() => router.push(SETTINGS_SUBSCRIPTION)}>
          <LuCrown size={15} /> Upgrade ke {plan}
        </Button>
        <Button variant="outline" borderColor="#E2E8F0" color="#374151" h="42px" px="20px" fontSize="16px" onClick={() => router.push("/agentra/dashboard")}>
          Kembali ke Dashboard
        </Button>
      </Flex>
    </Flex>
  )
}
