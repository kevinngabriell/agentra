"use client"

import { useEffect, useState } from "react"
import { Box, Flex, VStack, HStack, Grid, Button, Text, Heading, Badge, Skeleton, SkeletonText } from "@chakra-ui/react"
import Link from "next/link"
import { getPlans, formatPlanPrice, formatBillingCycle, type Plan } from "@/lib/plans/plans"

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box
      as="section"
      id="pricing"
      bg="#F8FAFC"
      px={{ base: 6, md: 12 }}
      py={{ base: 16, md: 24 }}
    >
      <VStack maxW="1200px" mx="auto" gap={12}>
        {/* Section header */}
        <VStack gap={4} textAlign="center" maxW="560px">
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color="#3B82F6"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Harga
          </Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="#0D1B3E">
            Pilih Paket yang Tepat untuk Anda
          </Heading>
          <Text fontSize="md" color="gray.500" lineHeight="1.75">
            Mulai gratis, upgrade kapan saja. Tidak ada biaya tersembunyi.
          </Text>
        </VStack>

        {/* Pricing cards */}
        {loading ? (
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} w="100%">
            {[0, 1, 2].map((i) => (
              <Box key={i} bg="white" borderRadius="2xl" p={8} border="2px solid" borderColor="gray.200">
                <VStack align="flex-start" gap={6}>
                  <VStack align="flex-start" gap={3} w="100%">
                    <Skeleton w="35%" h="14px" borderRadius="md" />
                    <Skeleton w="55%" h="36px" borderRadius="md" />
                    <SkeletonText noOfLines={2} w="100%" />
                  </VStack>
                  <Skeleton w="100%" h="48px" borderRadius="lg" />
                  <Box w="100%" h="1px" bg="gray.100" />
                  <VStack align="flex-start" gap={3} w="100%">
                    {[0, 1, 2, 3].map((j) => (
                      <HStack key={j} gap={3} w="100%">
                        <Skeleton w={5} h={5} borderRadius="full" flexShrink={0} />
                        <Skeleton w={`${65 + j * 7}%`} h="14px" borderRadius="md" />
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </Box>
            ))}
          </Grid>
        ) : plans.length === 0 ? (
          <Text color="gray.400" fontSize="md">Paket tidak tersedia saat ini.</Text>
        ) : (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
            gap={6}
            w="100%"
            alignItems="start"
          >
            {plans.map((plan, index) => {
              const highlighted = index === 1
              const price = formatPlanPrice(plan.price_idr)
              const period = plan.price_idr ? formatBillingCycle(plan.billing_cycle) : ""
              const isFree = !plan.price_idr
              const ctaLabel = isFree ? "Daftar Gratis" : "Pilih Paket"

              return (
                <Box
                  key={plan.plan_id}
                  bg={highlighted ? "#0D1B3E" : "white"}
                  borderRadius="2xl"
                  p={8}
                  border="2px solid"
                  borderColor={highlighted ? "#3B82F6" : "gray.200"}
                  position="relative"
                  boxShadow={highlighted ? "0 20px 60px rgba(13,27,62,0.3)" : "none"}
                >
                  {highlighted && (
                    <Badge
                      position="absolute"
                      top="-14px"
                      left="50%"
                      transform="translateX(-50%)"
                      bg="#3B82F6"
                      color="white"
                      px={4}
                      py={1.5}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="semibold"
                      whiteSpace="nowrap"
                    >
                      Paling Populer
                    </Badge>
                  )}

                  <VStack align="flex-start" gap={6}>
                    {/* Plan name & description */}
                    <VStack align="flex-start" gap={2}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color={highlighted ? "blue.300" : "#3B82F6"}
                      >
                        {plan.name}
                      </Text>
                      <HStack align="baseline" gap={1}>
                        <Text
                          fontSize="3xl"
                          fontWeight="bold"
                          color={highlighted ? "white" : "#0D1B3E"}
                        >
                          {price}
                        </Text>
                        {period && (
                          <Text fontSize="sm" color={highlighted ? "gray.400" : "gray.500"}>
                            {period}
                          </Text>
                        )}
                      </HStack>
                      <Text
                        fontSize="sm"
                        color={highlighted ? "gray.400" : "gray.500"}
                        lineHeight="1.6"
                      >
                        {plan.tagline}
                      </Text>
                    </VStack>

                    {/* CTA */}
                    <Link href={`/register?plan=${plan.plan_id}`} style={{ width: "100%" }}>
                      <Button
                        w="100%"
                        size="lg"
                        minH="48px"
                        bg={highlighted ? "#3B82F6" : "transparent"}
                        color={highlighted ? "white" : "#0D1B3E"}
                        border={highlighted ? "none" : "2px solid"}
                        borderColor={highlighted ? "transparent" : "#0D1B3E"}
                        _hover={{
                          bg: highlighted ? "#2563EB" : "gray.50",
                        }}
                        fontWeight="semibold"
                      >
                        {ctaLabel}
                      </Button>
                    </Link>

                    {/* Divider */}
                    <Box w="100%" h="1px" bg={highlighted ? "rgba(255,255,255,0.1)" : "gray.100"} />

                    {/* Feature list */}
                    <VStack align="flex-start" gap={3} w="100%">
                      {plan.features.map((feature) => (
                        <HStack key={feature.label} gap={3}>
                          <Flex
                            w={5}
                            h={5}
                            borderRadius="full"
                            bg={highlighted ? "rgba(59,130,246,0.2)" : "#EFF6FF"}
                            align="center"
                            justify="center"
                            flexShrink={0}
                          >
                            <Text fontSize="10px" color="#3B82F6">✓</Text>
                          </Flex>
                          <Text
                            fontSize="sm"
                            color={highlighted ? "gray.300" : "gray.600"}
                            lineHeight="1.5"
                          >
                            {feature.label}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                </Box>
              )
            })}
          </Grid>
        )}

        {/* Bottom note */}
        <Text fontSize="sm" color="gray.400" textAlign="center">
          Semua paket sudah termasuk enkripsi data & kepatuhan regulasi OJK. Pertanyaan?{" "}
          <Link href="/contact">
            <Text as="span" color="#3B82F6" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Hubungi tim kami.
            </Text>
          </Link>
        </Text>
      </VStack>
    </Box>
  )
}
