"use client"

import { Box, Flex, VStack, HStack, Grid, Button, Text, Heading, Badge } from "@chakra-ui/react"
import Link from "next/link"

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    description: "Cocok untuk agen asuransi individual yang baru memulai.",
    cta: "Daftar Gratis",
    ctaHref: "/register",
    highlighted: false,
    features: [
      "Hingga 50 polis aktif",
      "Notifikasi renewal via email",
      "Laporan komisi dasar",
      "Dukungan komunitas",
    ],
  },
  {
    name: "Profesional",
    price: "Rp 299.000",
    period: "/bulan",
    description: "Untuk agen aktif yang ingin mengotomasi seluruh operasional bisnis.",
    cta: "Coba Gratis 14 Hari",
    ctaHref: "/register?plan=pro",
    highlighted: true,
    badge: "Paling Populer",
    features: [
      "Polis tidak terbatas",
      "Notifikasi WhatsApp otomatis",
      "Laporan komisi lengkap",
      "Dashboard renewal real-time",
      "Ekspor data Excel & PDF",
      "Dukungan prioritas via chat",
    ],
  },
  {
    name: "Tim",
    price: "Rp 799.000",
    period: "/bulan",
    description: "Untuk tim atau agen senior yang mengelola beberapa sub-agen.",
    cta: "Hubungi Kami",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Semua fitur Profesional",
      "Manajemen multi-agen",
      "Pembagian komisi otomatis",
      "Analitik tim & kinerja",
      "Integrasi API khusus",
      "Manajer akun dedikasi",
    ],
  },
]

export function PricingSection() {
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
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={6}
          w="100%"
          alignItems="start"
        >
          {plans.map((plan) => (
            <Box
              key={plan.name}
              bg={plan.highlighted ? "#0D1B3E" : "white"}
              borderRadius="2xl"
              p={8}
              border="2px solid"
              borderColor={plan.highlighted ? "#3B82F6" : "gray.200"}
              position="relative"
              boxShadow={plan.highlighted ? "0 20px 60px rgba(13,27,62,0.3)" : "none"}
            >
              {plan.badge && (
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
                  {plan.badge}
                </Badge>
              )}

              <VStack align="flex-start" gap={6}>
                {/* Plan name & description */}
                <VStack align="flex-start" gap={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color={plan.highlighted ? "blue.300" : "#3B82F6"}
                  >
                    {plan.name}
                  </Text>
                  <HStack align="baseline" gap={1}>
                    <Text
                      fontSize="3xl"
                      fontWeight="bold"
                      color={plan.highlighted ? "white" : "#0D1B3E"}
                    >
                      {plan.price}
                    </Text>
                    {plan.period && (
                      <Text fontSize="sm" color={plan.highlighted ? "gray.400" : "gray.500"}>
                        {plan.period}
                      </Text>
                    )}
                  </HStack>
                  <Text
                    fontSize="sm"
                    color={plan.highlighted ? "gray.400" : "gray.500"}
                    lineHeight="1.6"
                  >
                    {plan.description}
                  </Text>
                </VStack>

                {/* CTA */}
                <Link href={plan.ctaHref} style={{ width: "100%" }}>
                  <Button
                    w="100%"
                    size="lg"
                    minH="48px"
                    bg={plan.highlighted ? "#3B82F6" : "transparent"}
                    color={plan.highlighted ? "white" : "#0D1B3E"}
                    border={plan.highlighted ? "none" : "2px solid"}
                    borderColor={plan.highlighted ? "transparent" : "#0D1B3E"}
                    _hover={{
                      bg: plan.highlighted ? "#2563EB" : "gray.50",
                    }}
                    fontWeight="semibold"
                  >
                    {plan.cta}
                  </Button>
                </Link>

                {/* Divider */}
                <Box w="100%" h="1px" bg={plan.highlighted ? "rgba(255,255,255,0.1)" : "gray.100"} />

                {/* Feature list */}
                <VStack align="flex-start" gap={3} w="100%">
                  {plan.features.map((feature) => (
                    <HStack key={feature} gap={3}>
                      <Flex
                        w={5}
                        h={5}
                        borderRadius="full"
                        bg={plan.highlighted ? "rgba(59,130,246,0.2)" : "#EFF6FF"}
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Text fontSize="10px" color="#3B82F6">✓</Text>
                      </Flex>
                      <Text
                        fontSize="sm"
                        color={plan.highlighted ? "gray.300" : "gray.600"}
                        lineHeight="1.5"
                      >
                        {feature}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </Box>
          ))}
        </Grid>

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
