"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, Box, Button, Card, Field, Flex, Grid, Heading, Input, InputGroup, NativeSelect, SimpleGrid, Steps, Text } from "@chakra-ui/react"
import { Header } from "../../components/Header"
import { FaShieldAlt } from "react-icons/fa"
import { FiAlertCircle, FiAward, FiCheck, FiCreditCard, FiEye, FiEyeOff, FiLock, FiShield, FiSmartphone, FiZap, FiMessageCircle } from "react-icons/fi"
import { MdAccountBalance, MdSupportAgent } from "react-icons/md"
import { RegisterAgent } from "@/lib/auth/auth"

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Akun" },
    { label: "Profil" },
    { label: "Paket" },
    { label: "Bayar" },
  ]

  return (
    <Steps.Root
      count={steps.length}
      step={currentStep}
      mb="32px"
      size="sm"
      colorPalette="blue"
      css={{
        "--chakra-colors-color-palette-solid": "#0D1B3E",
        "--chakra-colors-color-palette-contrast": "#FFFFFF",
        "--chakra-colors-color-palette-fg": "#0D1B3E",
        "--chakra-colors-color-palette-muted": "#F3F4F6",
      } as React.CSSProperties}
    >
      <Steps.List>
        {steps.map((step, index) => (
          <Steps.Item key={index} index={index}>
            <Steps.Trigger>
              <Steps.Indicator />
              <Steps.Title fontSize="12px">{step.label}</Steps.Title>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
        ))}
      </Steps.List>
    </Steps.Root>
  )
}

function TrustIndicators() {
  return (
    <Flex justify="space-between" px="8px" mt="24px">
      <Flex gap="12px" align="center">
        <Flex
          w="36px"
          h="36px"
          borderRadius="full"
          bg="#ECFDF5"
          align="center"
          justify="center"
        >
          <FaShieldAlt size={16} color="#10B981" />
        </Flex>
        <Flex flexDir="column">
          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Terverifikasi</Text>
          <Text color="#5D6D7E" fontSize="12px">Sistem aman &amp; terpercaya</Text>
        </Flex>
      </Flex>

      <Flex gap="12px" align="center">
        <Flex
          w="36px"
          h="36px"
          borderRadius="full"
          bg="#FFF7ED"
          align="center"
          justify="center"
        >
          <MdSupportAgent size={18} color="#F97316" />
        </Flex>
        <Flex flexDir="column">
          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Bantuan 24/7</Text>
          <Text color="#5D6D7E" fontSize="12px">Siap membantu pendaftaran</Text>
        </Flex>
      </Flex>

      <Flex gap="12px" align="center">
        <Flex
          w="36px"
          h="36px"
          borderRadius="full"
          bg="#EFF6FF"
          align="center"
          justify="center"
        >
          <FiZap size={16} color="#3B82F6" />
        </Flex>
        <Flex flexDir="column">
          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">Proses Cepat</Text>
          <Text color="#5D6D7E" fontSize="12px">Akun aktif dalam 5 menit</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}

function FeatureCards() {
  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="16px" mt="32px">
      {/* Dashboard card */}
      <Box
        borderRadius="16px"
        overflow="hidden"
        position="relative"
        minH="200px"
        bg="linear-gradient(135deg, #0D1B3E 0%, #1a3060 50%, #0f2448 100%)"
        p="24px"
        display="flex"
        flexDir="column"
        justifyContent="flex-end"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity={0.15}
          bgImage="repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.05) 30px, rgba(255,255,255,0.05) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.05) 30px, rgba(255,255,255,0.05) 31px)"
        />
        <Box position="absolute" top="20px" left="20px" right="20px">
          <Flex gap="8px" mb="8px">
            {[1, 2, 3].map((i) => (
              <Box key={i} h="8px" flex="1" bg="rgba(255,255,255,0.2)" borderRadius="4px" />
            ))}
          </Flex>
          <Flex gap="8px">
            <Box flex="2" h="40px" bg="rgba(59,130,246,0.4)" borderRadius="6px" />
            <Box flex="1" h="40px" bg="rgba(255,255,255,0.15)" borderRadius="6px" />
          </Flex>
        </Box>
        <Box position="relative" zIndex={1}>
          <Text fontWeight="bold" fontSize="16px" color="white" mb="4px">
            Dashboard Canggih
          </Text>
          <Text fontSize="12px" color="rgba(255,255,255,0.75)">
            Kelola semua polis dan nasabah dalam satu tampilan intuitif.
          </Text>
        </Box>
      </Box>

      {/* Komisi card */}
      <Box
        borderRadius="16px"
        bg="white"
        p="24px"
        border="1px solid"
        borderColor="#E5E7EB"
        display="flex"
        flexDir="column"
        gap="12px"
      >
        <Flex
          w="44px"
          h="44px"
          borderRadius="12px"
          bg="#ECFDF5"
          align="center"
          justify="center"
        >
          <FiZap size={20} color="#10B981" />
        </Flex>
        <Box>
          <Text fontWeight="bold" fontSize="15px" color="#0D1B3E" mb="6px">
            Komisi Cepat
          </Text>
          <Text fontSize="13px" color="#5D6D7E" lineHeight="1.6">
            Pantau pendapatan real-time setiap transaksi berhasil.
          </Text>
        </Box>
      </Box>

      {/* Integrasi WA card */}
      <Box
        borderRadius="16px"
        bg="white"
        p="24px"
        border="1px solid"
        borderColor="#E5E7EB"
        display="flex"
        flexDir="column"
        gap="12px"
      >
        <Flex
          w="44px"
          h="44px"
          borderRadius="12px"
          bg="#EFF6FF"
          align="center"
          justify="center"
        >
          <FiMessageCircle size={20} color="#3B82F6" />
        </Flex>
        <Box>
          <Text fontWeight="bold" fontSize="15px" color="#0D1B3E" mb="6px">
            Integrasi WA
          </Text>
          <Text fontSize="13px" color="#5D6D7E" lineHeight="1.6">
            Follow-up otomatis ke nasabah via WhatsApp resmi.
          </Text>
        </Box>
      </Box>
    </Grid>
  )
}

const PROVINCES = [
  "Aceh", "Bali", "Banten", "Bengkulu", "DI Yogyakarta", "DKI Jakarta",
  "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
  "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah",
  "Kalimantan Timur", "Kalimantan Utara", "Kepulauan Bangka Belitung",
  "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara",
  "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat",
  "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah",
  "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat",
  "Sumatera Selatan", "Sumatera Utara",
]

function Step2Form({
  onBack,
  onNext,
  businessName,
  onBusinessNameChange,
  city,
  onCityChange,
  errors,
}: {
  onBack: () => void
  onNext: () => void
  businessName: string
  onBusinessNameChange: (v: string) => void
  city: string
  onCityChange: (v: string) => void
  errors: Record<string, string>
}) {
  return (
    <Card.Root boxShadow="sm" border="1px solid" borderColor="#E5E7EB">
      <Card.Body gap="0" p="32px">
        <Flex gap="8px" flexDir="column" mb="28px">
          <Heading color="#001F40" fontWeight="bold" fontSize="22px">
            Lengkapi Profil Agen
          </Heading>
          <Text color="#5D6D7E" fontSize="14px">
            Mohon masukkan rincian profesional Anda untuk proses validasi kemitraan.
          </Text>
        </Flex>

        <Flex flexDir="column" gap="16px" mb="28px">
          <Field.Root invalid={!!errors.business_name}>
            <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
              Nama Bisnis / Agen
            </Field.Label>
            <Input
              placeholder="Masukkan nama bisnis atau agensi Anda"
              fontSize="14px"
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
            />
            {errors.business_name && (
              <Field.ErrorText fontSize="12px">{errors.business_name}</Field.ErrorText>
            )}
          </Field.Root>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap="16px">
            <Field.Root>
              <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                Provinsi{" "}
                <Box as="span" fontWeight="normal" color="#9CA3AF">(Opsional)</Box>
              </Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field fontSize="14px" color="#1C2833">
                  <option value="">Pilih Provinsi</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root invalid={!!errors.city}>
              <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                Kota / Kabupaten
              </Field.Label>
              <Input
                placeholder="Masukkan nama kota"
                fontSize="14px"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              />
              {errors.city && (
                <Field.ErrorText fontSize="12px">{errors.city}</Field.ErrorText>
              )}
            </Field.Root>
          </SimpleGrid>
        </Flex>

        <Flex justify="space-between" gap="12px">
          <Button
            variant="outline"
            color="#5D6D7E"
            borderColor="#D1D5DB"
            _hover={{ bg: "#F9FAFB" }}
            fontSize="14px"
            px="24px"
            onClick={onBack}
          >
            ← Kembali
          </Button>
          <Button
            backgroundColor="#0D1B3E"
            color="white"
            _hover={{ bg: "#1a2f5c" }}
            fontSize="14px"
            px="24px"
            onClick={onNext}
          >
            Lanjutkan →
          </Button>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function Step2TrustIndicators() {
  return (
    <Flex justify="center" gap="32px" mt="24px">
      <Flex gap="8px" align="center">
        <FiLock size={14} color="#5D6D7E" />
        <Text fontSize="12px" color="#5D6D7E">Data Terenkripsi</Text>
      </Flex>
      <Flex gap="8px" align="center">
        <FiAward size={14} color="#5D6D7E" />
        <Text fontSize="12px" color="#5D6D7E">Berlisensi AAJI/AAUI</Text>
      </Flex>
    </Flex>
  )
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Untuk agen pemula yang baru",
    price: "Rp 99k",
    period: "/bln",
    badge: null,
    features: [
      "Hingga 500 Nasabah",
      "Dashboard Dasar",
      "WhatsApp Digest",
      "Dukungan Sub-agen",
    ],
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Solusi lengkap produktivitas",
    price: "Rp 249k",
    period: "/bln",
    badge: "TERPOPULER",
    features: [
      "Nasabah Tak Terbatas",
      "WhatsApp Digest Harian",
      "Hingga 3 Sub-agen",
      "Laporan Analitik Lanjut",
    ],
    featured: true,
  },
  {
    id: "scale",
    name: "Agensi",
    tagline: "Untuk tim & kantor cabang",
    price: "Rp 499k",
    period: "/bln",
    badge: null,
    features: [
      "Nasabah Tak Terbatas",
      "WhatsApp Digest & API",
      "Sub-agen Tak Terbatas",
      "Dukungan Prioritas 24/7",
    ],
    featured: false,
  },
]

function Step3Form({ onBack, onNext }: { onBack: () => void; onNext: (planId: string) => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  return (
    <>
      <Flex flexDir="column" align="center" textAlign="center" mb="32px">
        <Heading color="#001F40" fontWeight="bold" fontSize="26px" mb="8px">
          Pilih Paket Langganan Anda
        </Heading>
        <Text color="#5D6D7E" fontSize="14px">
          Tingkatkan efisiensi pengelolaan nasabah dengan paket yang tepat
        </Text>
      </Flex>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="20px" mb="32px">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id
          return (
            <Box
              key={plan.id}
              position="relative"
              border="2px solid"
              borderColor={plan.featured || isSelected ? "#0D1B3E" : "#E5E7EB"}
              borderRadius="16px"
              p="24px"
              bg="white"
              cursor="pointer"
              onClick={() => setSelectedPlan(plan.id)}
              _hover={{ borderColor: "#0D1B3E", boxShadow: "sm" }}
              transition="all 0.2s"
            >
              {plan.badge && (
                <Box
                  position="absolute"
                  top="-13px"
                  left="50%"
                  transform="translateX(-50%)"
                  bg="#0D1B3E"
                  color="white"
                  px="14px"
                  py="3px"
                  borderRadius="full"
                  fontSize="10px"
                  fontWeight="bold"
                  letterSpacing="0.06em"
                  whiteSpace="nowrap"
                >
                  {plan.badge}
                </Box>
              )}

              <Text fontWeight="bold" fontSize="16px" color="#0D1B3E" mb="2px">
                {plan.name}
              </Text>
              <Text fontSize="12px" color="#5D6D7E" mb="16px">
                {plan.tagline}
              </Text>

              <Flex align="baseline" gap="4px" mb="20px">
                <Text fontWeight="bold" fontSize="28px" color="#0D1B3E">
                  {plan.price}
                </Text>
                <Text fontSize="13px" color="#5D6D7E">{plan.period}</Text>
              </Flex>

              <Flex flexDir="column" gap="10px" mb="24px">
                {plan.features.map((f) => (
                  <Flex key={f} gap="8px" align="center">
                    <Box color="#10B981" flexShrink={0}>
                      <FiCheck size={14} />
                    </Box>
                    <Text fontSize="13px" color="#374151">{f}</Text>
                  </Flex>
                ))}
              </Flex>

              <Button
                w="100%"
                bg={plan.featured ? "#0D1B3E" : "transparent"}
                color={plan.featured ? "white" : "#0D1B3E"}
                border="1px solid"
                borderColor="#0D1B3E"
                _hover={{ bg: plan.featured ? "#1a2f5c" : "#EFF6FF" }}
                fontSize="14px"
                onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.id); onNext(plan.id) }}
              >
                Pilih Paket
              </Button>
            </Box>
          )
        })}
      </Grid>

      <Flex justify="center">
        <Button
          variant="outline"
          color="#5D6D7E"
          borderColor="#D1D5DB"
          _hover={{ bg: "#F9FAFB" }}
          fontSize="14px"
          px="24px"
          onClick={onBack}
        >
          ← Kembali
        </Button>
      </Flex>
    </>
  )
}

function Step4Form({
  onBack,
  planId,
  onSubmit,
  loading,
}: {
  onBack: () => void
  planId: string
  onSubmit: () => void
  loading: boolean
}) {
  const [paymentMethod, setPaymentMethod] = useState<"va" | "card" | "ewallet">("va")

  const planInfo: Record<string, { name: string; price: string }> = {
    starter: { name: "Starter", price: "Rp 99.000" },
    pro:     { name: "Pro",     price: "Rp 249.000" },
    scale:   { name: "Agensi",  price: "Rp 499.000" },
  }
  const plan = planInfo[planId] ?? planInfo.pro

  const instructions = [
    "Pilih bank yang ingin Anda gunakan untuk transfer Virtual Account.",
    'Klik tombol "Konfirmasi & Bayar" untuk mendapatkan Nomor Virtual Account.',
    "Lakukan pembayaran melalui ATM, Mobile Banking, atau Internet Banking sebelum 24 jam.",
  ]

  function RadioDot({ active }: { active: boolean }) {
    return (
      <Flex
        w="18px" h="18px" borderRadius="full"
        border="2px solid" borderColor={active ? "#0D1B3E" : "#D1D5DB"}
        align="center" justify="center" flexShrink={0}
      >
        {active && <Box w="8px" h="8px" borderRadius="full" bg="#0D1B3E" />}
      </Flex>
    )
  }

  return (
    <>
      <Box mb="28px">
        <Heading color="#001F40" fontWeight="bold" fontSize="22px" mb="6px">
          Pembayaran
        </Heading>
        <Text color="#5D6D7E" fontSize="14px">
          Selesaikan pembayaran Anda untuk mengaktifkan polis asuransi.
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "3fr 2fr" }} gap="24px" mb="28px">
        {/* Left column */}
        <Flex flexDir="column" gap="20px">
          {/* Order summary */}
          <Box bg="white" border="1px solid" borderColor="#E5E7EB" borderRadius="12px" p="24px">
            <Text fontWeight="semibold" color="#0D1B3E" fontSize="15px" mb="16px">
              Ringkasan Pesanan
            </Text>
            <Flex justify="space-between" mb="10px">
              <Text fontSize="14px" color="#5D6D7E">Paket Terpilih</Text>
              <Text fontSize="14px" color="#1C2833" fontWeight="medium">{plan.name}</Text>
            </Flex>
            <Flex justify="space-between" mb="16px">
              <Text fontSize="14px" color="#5D6D7E">Premi Bulanan</Text>
              <Text fontSize="14px" color="#1C2833">{plan.price}</Text>
            </Flex>
            <Box borderTop="1px solid" borderColor="#E5E7EB" pt="16px">
              <Flex justify="space-between" align="center">
                <Text fontWeight="bold" color="#0D1B3E">Total Bayar</Text>
                <Text fontWeight="bold" color="#0D1B3E" fontSize="18px">{plan.price}</Text>
              </Flex>
            </Box>
          </Box>

          {/* Payment methods */}
          <Box bg="white" border="1px solid" borderColor="#E5E7EB" borderRadius="12px" p="24px">
            <Text fontWeight="semibold" color="#0D1B3E" fontSize="15px" mb="16px">
              Pilih Metode Pembayaran
            </Text>
            <Flex flexDir="column" gap="12px">
              {/* VA */}
              <Box
                border="2px solid" borderColor={paymentMethod === "va" ? "#0D1B3E" : "#E5E7EB"}
                borderRadius="10px" p="14px" cursor="pointer"
                onClick={() => setPaymentMethod("va")}
                transition="border-color 0.15s"
              >
                <Flex justify="space-between" align="center">
                  <Flex gap="10px" align="center">
                    <Box color="#0D1B3E"><MdAccountBalance size={18} /></Box>
                    <Text fontWeight="medium" fontSize="14px" color="#1C2833">
                      Transfer Bank (Virtual Account)
                    </Text>
                  </Flex>
                  <RadioDot active={paymentMethod === "va"} />
                </Flex>
                {paymentMethod === "va" && (
                  <Flex gap="8px" mt="12px" pl="28px">
                    <Box px="10px" py="4px" bg="#EFF6FF" borderRadius="6px" fontSize="11px" fontWeight="bold" color="#1D4ED8">BCA</Box>
                    <Box px="10px" py="4px" bg="#FFF7ED" borderRadius="6px" fontSize="11px" fontWeight="bold" color="#C2410C">Mandiri</Box>
                    <Box px="10px" py="4px" bg="#F0FDF4" borderRadius="6px" fontSize="11px" fontWeight="bold" color="#166534">BRI</Box>
                  </Flex>
                )}
              </Box>

              {/* Credit card */}
              <Box
                border="2px solid" borderColor={paymentMethod === "card" ? "#0D1B3E" : "#E5E7EB"}
                borderRadius="10px" p="14px" cursor="pointer"
                onClick={() => setPaymentMethod("card")}
                transition="border-color 0.15s"
              >
                <Flex justify="space-between" align="center">
                  <Flex gap="10px" align="center">
                    <Box color="#0D1B3E"><FiCreditCard size={18} /></Box>
                    <Text fontWeight="medium" fontSize="14px" color="#1C2833">Kartu Kredit</Text>
                  </Flex>
                  <RadioDot active={paymentMethod === "card"} />
                </Flex>
              </Box>

              {/* E-wallet */}
              <Box
                border="2px solid" borderColor={paymentMethod === "ewallet" ? "#0D1B3E" : "#E5E7EB"}
                borderRadius="10px" p="14px" cursor="pointer"
                onClick={() => setPaymentMethod("ewallet")}
                transition="border-color 0.15s"
              >
                <Flex justify="space-between" align="center">
                  <Flex gap="10px" align="center">
                    <Box color="#0D1B3E"><FiSmartphone size={18} /></Box>
                    <Text fontWeight="medium" fontSize="14px" color="#1C2833">E-Wallet (OVO / GoPay)</Text>
                  </Flex>
                  <RadioDot active={paymentMethod === "ewallet"} />
                </Flex>
              </Box>
            </Flex>
          </Box>
        </Flex>

        {/* Right column */}
        <Flex flexDir="column" gap="16px">
          {/* Instructions */}
          <Box bg="white" border="1px solid" borderColor="#E5E7EB" borderRadius="12px" p="24px">
            <Text fontWeight="semibold" color="#0D1B3E" fontSize="15px" mb="16px">
              Instruksi Pembayaran
            </Text>
            <Flex flexDir="column" gap="14px">
              {instructions.map((inst, i) => (
                <Flex key={i} gap="12px" align="flex-start">
                  <Flex
                    w="24px" h="24px" minW="24px"
                    bg="#0D1B3E" color="white"
                    borderRadius="full"
                    align="center" justify="center"
                    fontSize="11px" fontWeight="bold"
                    flexShrink={0} mt="1px"
                  >
                    {i + 1}
                  </Flex>
                  <Text fontSize="13px" color="#5D6D7E" lineHeight="1.6">{inst}</Text>
                </Flex>
              ))}
            </Flex>
          </Box>

          {/* Important info */}
          <Box bg="#FFFBEB" border="1px solid" borderColor="#FDE68A" borderRadius="10px" p="16px">
            <Flex gap="10px" align="flex-start">
              <Box color="#D97706" flexShrink={0} mt="1px">
                <FiAlertCircle size={16} />
              </Box>
              <Box>
                <Text fontWeight="semibold" fontSize="13px" color="#92400E" mb="4px">
                  Informasi Penting
                </Text>
                <Text fontSize="13px" color="#78350F" lineHeight="1.6">
                  Polis akan aktif secara otomatis setelah sistem kami menerima konfirmasi pembayaran Anda (biasanya kurang dari 5 menit).
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Security badge */}
          <Box bg="#0D1B3E" borderRadius="12px" p="20px" textAlign="center">
            <Flex justify="center" mb="8px">
              <FiShield size={28} color="white" />
            </Flex>
            <Text color="white" fontWeight="bold" fontSize="15px" mb="4px">
              Pembayaran Aman
            </Text>
            <Text color="rgba(255,255,255,0.7)" fontSize="12px">
              Enkripsi SSL 256-bit standar industri
            </Text>
          </Box>
        </Flex>
      </Grid>

      {/* Navigation */}
      <Flex justify="space-between" mb="24px">
        <Button
          variant="outline"
          color="#5D6D7E"
          borderColor="#D1D5DB"
          _hover={{ bg: "#F9FAFB" }}
          fontSize="14px"
          px="24px"
          onClick={onBack}
          disabled={loading}
        >
          Kembali
        </Button>
        <Button
          backgroundColor="#0D1B3E"
          color="white"
          _hover={{ bg: "#1a2f5c" }}
          fontSize="14px"
          px="28px"
          onClick={onSubmit}
          loading={loading}
          loadingText="Memproses..."
        >
          Konfirmasi &amp; Bayar
        </Button>
      </Flex>

      {/* Trust indicators */}
      <Flex justify="center" gap={{ base: "16px", md: "32px" }} flexWrap="wrap">
        {[
          { icon: <FiLock size={12} />, label: "SECURE PAYMENT" },
          { icon: <FiAward size={12} />, label: "OJK LICENSED" },
          { icon: <FiShield size={12} />, label: "DATA ENCRYPTION" },
          { icon: <MdSupportAgent size={14} />, label: "24/7 SUPPORT" },
        ].map(({ icon, label }) => (
          <Flex key={label} gap="6px" align="center" color="#9CA3AF">
            {icon}
            <Text fontSize="11px" fontWeight="medium">{label}</Text>
          </Flex>
        ))}
      </Flex>
    </>
  )
}

function PageFooter() {
  return (
    <Box as="footer" bg="white" borderTop="1px solid" borderColor="#E5E7EB" mt="48px">
      <Grid
        templateColumns={{ base: "1fr", md: "2fr 1fr 1fr 1fr" }}
        gap="32px"
        maxW="1200px"
        mx="auto"
        px={{ base: 6, md: 12 }}
        py="48px"
      >
        <Box>
          <Text fontWeight="bold" fontSize="16px" color="#0D1B3E" mb="12px">
            AgenAsuransi
          </Text>
          <Text fontSize="13px" color="#5D6D7E" lineHeight="1.75" maxW="240px">
            Platform digital terbaik untuk para agen asuransi profesional di Indonesia.
          </Text>
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="13px" color="#0D1B3E" mb="16px">
            Perusahaan
          </Text>
          {["Tentang Kami", "Karir", "Blog"].map((item) => (
            <Text key={item} fontSize="13px" color="#5D6D7E" mb="10px" cursor="pointer" _hover={{ color: "#0D1B3E" }}>
              {item}
            </Text>
          ))}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="13px" color="#0D1B3E" mb="16px">
            Layanan
          </Text>
          {["Manajemen Polis", "CRM Nasabah", "Laporan Penjualan"].map((item) => (
            <Text key={item} fontSize="13px" color="#5D6D7E" mb="10px" cursor="pointer" _hover={{ color: "#0D1B3E" }}>
              {item}
            </Text>
          ))}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="13px" color="#0D1B3E" mb="16px">
            Hubungi Kami
          </Text>
          <Text fontSize="13px" color="#5D6D7E" mb="16px">
            support@agenasuransi.id
          </Text>
          <Flex gap="8px">
            <Button
              variant="outline"
              size="sm"
              w="36px"
              h="36px"
              p={0}
              borderRadius="full"
              borderColor="#D1D5DB"
              color="#5D6D7E"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
              aria-label="Website"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              w="36px"
              h="36px"
              p={0}
              borderRadius="full"
              borderColor="#D1D5DB"
              color="#5D6D7E"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
              aria-label="Email"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </Button>
          </Flex>
        </Box>
      </Grid>

      <Box borderTop="1px solid" borderColor="#F3F4F6" py="16px">
        <Text textAlign="center" fontSize="12px" color="#9CA3AF">
          © 2024 AgenAsuransi (Agentra Group). Seluruh Hak Cipta Dilindungi.
        </Text>
      </Box>
    </Box>
  )
}

export default function Register() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState("")
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ status: "success" | "error"; message: string } | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
    business_name: "",
    city: "",
    plan: "",
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const setField = (field: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  function validateStep0(): boolean {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = "Nama wajib diisi"
    if (!formData.email.trim()) {
      errs.email = "Email wajib diisi"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Format email tidak valid"
    }
    if (!formData.password) {
      errs.password = "Password wajib diisi"
    } else if (formData.password.length < 8) {
      errs.password = "Min 8 karakter"
    }
    if (!formData.password_confirmation) {
      errs.password_confirmation = "Konfirmasi password wajib diisi"
    } else if (formData.password !== formData.password_confirmation) {
      errs.password_confirmation = "Konfirmasi password tidak cocok"
    }
    if (!formData.phone.trim()) errs.phone = "Nomor telepon wajib diisi"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!formData.business_name.trim()) errs.business_name = "Nama bisnis wajib diisi"
    if (!formData.city.trim()) errs.city = "Kota wajib diisi"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onRegister = async () => {
    try {
      setLoading(true)
      setAlert(null)
      await RegisterAgent({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        phone: formData.phone,
        whatsapp_number: formData.phone,
        business_name: formData.business_name,
        city: formData.city,
        plan: formData.plan,
      })
      setAlert({ status: "success", message: "Akun berhasil dibuat! Anda akan diarahkan ke halaman login..." })
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: any) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setFieldErrors(err.errors)
      }
      setAlert({ status: "error", message: err.message || "Pendaftaran gagal. Silakan coba lagi." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box backgroundColor="#FAF9FC" minH="100vh">
      <Header />
      <Box py="48px">
        <Flex direction="column" maxW={currentStep >= 2 ? "960px" : "640px"} mx="auto" px="16px" transition="max-width 0.3s">
          <Stepper currentStep={currentStep} />

          {alert && (
            <Alert.Root status={alert.status} mb="16px" borderRadius="8px">
              <Alert.Indicator />
              <Alert.Description fontSize="14px">{alert.message}</Alert.Description>
            </Alert.Root>
          )}

          {currentStep === 0 && (
            <>
              <Card.Root boxShadow="sm" border="1px solid" borderColor="#E5E7EB">
                <Card.Body gap="0" p="32px">
                  <Flex gap="8px" flexDir="column" mb="28px">
                    <Heading color="#001F40" fontWeight="bold" fontSize="22px">
                      Detail Akun
                    </Heading>
                    <Text color="#5D6D7E" fontSize="14px">
                      Silakan lengkapi informasi dasar untuk memulai pendaftaran agen Anda.
                    </Text>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="16px" mb="20px">
                    <Field.Root invalid={!!fieldErrors.name}>
                      <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                        Nama Lengkap
                      </Field.Label>
                      <Input
                        placeholder="Masukkan nama sesuai KTP"
                        fontSize="14px"
                        value={formData.name}
                        onChange={(e) => setField("name")(e.target.value)}
                      />
                      {fieldErrors.name && (
                        <Field.ErrorText fontSize="12px">{fieldErrors.name}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root invalid={!!fieldErrors.email}>
                      <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                        Alamat Email
                      </Field.Label>
                      <Input
                        type="email"
                        placeholder="contoh@email.com"
                        fontSize="14px"
                        value={formData.email}
                        onChange={(e) => setField("email")(e.target.value)}
                      />
                      {fieldErrors.email && (
                        <Field.ErrorText fontSize="12px">{fieldErrors.email}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root invalid={!!fieldErrors.password}>
                      <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                        Kata Sandi
                      </Field.Label>
                      <InputGroup
                        width="100%"
                        endElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            style={{ color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        }
                      >
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 karakter"
                          fontSize="14px"
                          value={formData.password}
                          onChange={(e) => setField("password")(e.target.value)}
                        />
                      </InputGroup>
                      {fieldErrors.password && (
                        <Field.ErrorText fontSize="12px">{fieldErrors.password}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root invalid={!!fieldErrors.password_confirmation}>
                      <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                        Konfirmasi Kata Sandi
                      </Field.Label>
                      <InputGroup
                        width="100%"
                        endElement={
                          <button
                            type="button"
                            onClick={() => setShowPasswordConfirm((v) => !v)}
                            style={{ color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {showPasswordConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        }
                      >
                        <Input
                          type={showPasswordConfirm ? "text" : "password"}
                          placeholder="Ulangi kata sandi"
                          fontSize="14px"
                          value={formData.password_confirmation}
                          onChange={(e) => setField("password_confirmation")(e.target.value)}
                        />
                      </InputGroup>
                      {fieldErrors.password_confirmation && (
                        <Field.ErrorText fontSize="12px">{fieldErrors.password_confirmation}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root invalid={!!fieldErrors.phone} gridColumn={{ md: "span 2" }}>
                      <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                        Nomor WhatsApp / Telepon
                      </Field.Label>
                      <InputGroup width="100%" startAddon="+62">
                        <Input
                          placeholder="812xxxx"
                          fontSize="14px"
                          value={formData.phone}
                          onChange={(e) => setField("phone")(e.target.value)}
                        />
                      </InputGroup>
                      {fieldErrors.phone && (
                        <Field.ErrorText fontSize="12px">{fieldErrors.phone}</Field.ErrorText>
                      )}
                    </Field.Root>
                  </SimpleGrid>

                  <Flex
                    backgroundColor="#F0F7FF"
                    p="16px"
                    borderRadius="8px"
                    borderColor="#CCE5FF"
                    border="1px solid"
                    alignItems="flex-start"
                    gap="12px"
                    mb="28px"
                  >
                    <Box mt="2px" color="#3B82F6" flexShrink={0}>
                      <FiShield size={16} />
                    </Box>
                    <Flex flexDir="column" gap="4px">
                      <Text fontSize="13px" fontWeight="semibold" color="#004D77">
                        Keamanan Data
                      </Text>
                      <Text fontSize="13px" color="#004B73" lineHeight="1.6">
                        Data Anda dilindungi dengan enkripsi standar industri dan hanya digunakan untuk keperluan verifikasi akun AgenAsuransi.
                      </Text>
                    </Flex>
                  </Flex>

                  <Flex justify="flex-end" gap="12px">
                    <Button
                      variant="outline"
                      color="#5D6D7E"
                      borderColor="#D1D5DB"
                      _hover={{ bg: "#F9FAFB" }}
                      fontSize="14px"
                      px="24px"
                    >
                      Batal
                    </Button>
                    <Button
                      backgroundColor="#0D1B3E"
                      color="white"
                      _hover={{ bg: "#1a2f5c" }}
                      fontSize="14px"
                      px="24px"
                      onClick={() => { if (validateStep0()) setCurrentStep(1) }}
                    >
                      Lanjutkan →
                    </Button>
                  </Flex>
                </Card.Body>
              </Card.Root>

              <TrustIndicators />
              <FeatureCards />
            </>
          )}

          {currentStep === 1 && (
            <>
              <Step2Form
                onBack={() => setCurrentStep(0)}
                onNext={() => { if (validateStep1()) setCurrentStep(2) }}
                businessName={formData.business_name}
                onBusinessNameChange={setField("business_name")}
                city={formData.city}
                onCityChange={setField("city")}
                errors={fieldErrors}
              />
              <Step2TrustIndicators />
            </>
          )}

          {currentStep === 2 && (
            <Step3Form
              onBack={() => setCurrentStep(1)}
              onNext={(planId) => {
                setSelectedPlan(planId)
                setFormData((prev) => ({ ...prev, plan: planId }))
                setCurrentStep(3)
              }}
            />
          )}

          {currentStep === 3 && (
            <Step4Form
              onBack={() => setCurrentStep(2)}
              planId={selectedPlan}
              onSubmit={onRegister}
              loading={loading}
            />
          )}
        </Flex>
      </Box>
      <PageFooter />
    </Box>
  )
}
