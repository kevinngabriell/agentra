"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, Box, Button, Card, Field, Flex, Grid, Heading, Input, InputGroup, SimpleGrid, Steps, Text } from "@chakra-ui/react"
import { Header } from "../../components/Header"
import { ErrorAlert } from "@/components/ui/error-alert"
import { SearchSelect } from "@/components/ui/search-select"
import { FaShieldAlt } from "react-icons/fa"
import { FiAward, FiCheck, FiEye, FiEyeOff, FiLock, FiShield, FiZap, FiMessageCircle } from "react-icons/fi"
import { MdSupportAgent } from "react-icons/md"
import { RegisterAgent } from "@/lib/auth/auth"
import { getWilayahProvinces, getWilayahCities, type ApiWilayahProvince, type ApiWilayahCity } from "@/lib/api/master-wilayah"
import { getPlans, formatPlanPrice, formatBillingCycle, type Plan } from "@/lib/plans/plans"

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Akun" },
    { label: "Profil" },
    { label: "Paket" },
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
  const [provinces, setProvinces] = useState<ApiWilayahProvince[]>([])
  const [provinceCode, setProvinceCode] = useState("")
  const [cityLevel, setCityLevel] = useState<{ parent: string; list: ApiWilayahCity[] } | null>(null)

  useEffect(() => {
    let active = true
    getWilayahProvinces().then((l) => { if (active) setProvinces(l) }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!provinceCode) return
    let active = true
    getWilayahCities(undefined, provinceCode)
      .then((list) => { if (active) setCityLevel({ parent: provinceCode, list }) })
      .catch(() => { if (active) setCityLevel({ parent: provinceCode, list: [] }) })
    return () => { active = false }
  }, [provinceCode])

  const cityReady = !!provinceCode && cityLevel?.parent === provinceCode
  const cities = cityReady ? cityLevel.list : []
  const cityLoading = !!provinceCode && !cityReady
  // No province picked, or no city data synced for it: keep a free-text field.
  const cityManual = !provinceCode || (cityReady && cities.length === 0)

  function handleProvince(code: string) {
    setProvinceCode(code)
    onCityChange("")
  }

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
              <SearchSelect
                fontSize="14px"
                value={provinceCode}
                onChange={handleProvince}
                placeholder="Pilih Provinsi"
                options={provinces.map((p) => ({ value: p.province_code, label: p.province_name }))}
                clearable
              />
            </Field.Root>

            <Field.Root invalid={!!errors.city}>
              <Field.Label color="#1C2833" fontWeight="semibold" fontSize="14px">
                Kota / Kabupaten{" "}
                <Box as="span" fontWeight="normal" color="#9CA3AF">(Opsional)</Box>
              </Field.Label>
              {cityManual ? (
                <Input
                  placeholder="Masukkan nama kota"
                  fontSize="14px"
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                />
              ) : (
                <SearchSelect
                  fontSize="14px"
                  value={cities.find((c) => c.city_name === city)?.city_code ?? ""}
                  onChange={(code) => onCityChange(cities.find((c) => c.city_code === code)?.city_name ?? "")}
                  placeholder="Pilih Kota / Kabupaten"
                  options={cities.map((c) => ({ value: c.city_code, label: c.city_name }))}
                  loading={cityLoading}
                  clearable
                />
              )}
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

function Step3Form({
  onBack,
  onNext,
  plans,
  loadingPlans,
  submitting,
  initialPlanId,
}: {
  onBack: () => void
  onNext: (plan: Plan) => void
  plans: Plan[]
  loadingPlans: boolean
  submitting?: boolean
  /** Plan picked on the landing page's pricing section (?plan=…), preselected here. */
  initialPlanId?: string | null
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId ?? null)

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

      {loadingPlans ? (
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="20px" mb="32px">
          {[0, 1, 2].map((i) => (
            <Box key={i} border="2px solid" borderColor="#E5E7EB" borderRadius="16px" p="24px" bg="white" minH="300px">
              <Box w="40%" h="16px" bg="gray.100" borderRadius="md" mb={3} />
              <Box w="60%" h="28px" bg="gray.100" borderRadius="md" mb={4} />
              {[0, 1, 2, 3].map((j) => (
                <Box key={j} w="80%" h="12px" bg="gray.100" borderRadius="md" mb={3} />
              ))}
            </Box>
          ))}
        </Grid>
      ) : plans.length === 0 ? (
        <Text color="gray.400" fontSize="md" mb="32px">Paket tidak tersedia saat ini.</Text>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="20px" mb="32px">
          {plans.map((plan, index) => {
            const isSelected = selectedPlanId === plan.plan_id
            const isFeatured = index === 1
            const price = formatPlanPrice(plan.price_idr)
            const period = plan.price_idr ? formatBillingCycle(plan.billing_cycle) : ""

            return (
              <Box
                key={plan.plan_id}
                position="relative"
                border="2px solid"
                borderColor={isFeatured || isSelected ? "#0D1B3E" : "#E5E7EB"}
                borderRadius="16px"
                p="24px"
                bg="white"
                cursor="pointer"
                onClick={() => setSelectedPlanId(plan.plan_id)}
                _hover={{ borderColor: "#0D1B3E", boxShadow: "sm" }}
                transition="all 0.2s"
              >
                {isFeatured && (
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
                    TERPOPULER
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
                    {price}
                  </Text>
                  {period && <Text fontSize="13px" color="#5D6D7E">{period}</Text>}
                </Flex>

                <Flex flexDir="column" gap="10px" mb="24px">
                  {plan.features.map((f) => (
                    <Flex key={f.label} gap="8px" align="center">
                      <Box color="#10B981" flexShrink={0}>
                        <FiCheck size={14} />
                      </Box>
                      <Text fontSize="13px" color="#374151">{f.label}</Text>
                    </Flex>
                  ))}
                </Flex>

                <Button
                  w="100%"
                  bg={isFeatured ? "#0D1B3E" : "transparent"}
                  color={isFeatured ? "white" : "#0D1B3E"}
                  border="1px solid"
                  borderColor="#0D1B3E"
                  _hover={{ bg: isFeatured ? "#1a2f5c" : "#EFF6FF" }}
                  fontSize="14px"
                  disabled={submitting}
                  loading={submitting && selectedPlanId === plan.plan_id}
                  loadingText="Mendaftarkan..."
                  onClick={(e) => { e.stopPropagation(); setSelectedPlanId(plan.plan_id); onNext(plan) }}
                >
                  Pilih Paket
                </Button>
              </Box>
            )
          })}
        </Grid>
      )}

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
            Agentra
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
            <Text key={item} fontSize="13px" color="#5D6D7E" mb="10px">
              {item}
            </Text>
          ))}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="13px" color="#0D1B3E" mb="16px">
            Layanan
          </Text>
          {["Manajemen Polis", "CRM Nasabah", "Laporan Penjualan"].map((item) => (
            <Text key={item} fontSize="13px" color="#5D6D7E" mb="10px">
              {item}
            </Text>
          ))}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="13px" color="#0D1B3E" mb="16px">
            Hubungi Kami
          </Text>
          <Text fontSize="13px" color="#5D6D7E" mb="16px">
            halo@agentra.id
          </Text>
          <Flex gap="8px">
            <Button
              asChild
              variant="outline"
              size="sm"
              w="36px"
              h="36px"
              p={0}
              borderRadius="full"
              borderColor="#D1D5DB"
              color="#5D6D7E"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
            >
              <a href="https://agentra.id" target="_blank" rel="noopener noreferrer" aria-label="Website">
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
              borderColor="#D1D5DB"
              color="#5D6D7E"
              _hover={{ borderColor: "#0D1B3E", color: "#0D1B3E" }}
            >
              <a href="mailto:halo@agentra.id" aria-label="Email">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              </a>
            </Button>
          </Flex>
        </Box>
      </Grid>

      <Box borderTop="1px solid" borderColor="#F3F4F6" py="16px">
        <Text textAlign="center" fontSize="12px" color="#9CA3AF">
          © {new Date().getFullYear()} Agentra. Seluruh Hak Cipta Dilindungi.
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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ status: "success" | "error"; message: string; requestId?: string } | null>(null)
  // Read once on mount (window, not useSearchParams, so the page needs no Suspense boundary).
  const [initialPlanId] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("plan"),
  )

  useEffect(() => {
    let active = true
    getPlans()
      .then((p) => { if (active) setPlans(p) })
      .finally(() => { if (active) setLoadingPlans(false) })
    return () => { active = false }
  }, [])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
    business_name: "",
    city: "",
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
    } else if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      errs.password = "Harus mengandung huruf dan angka"
    }
    if (!formData.password_confirmation) {
      errs.password_confirmation = "Konfirmasi password wajib diisi"
    } else if (formData.password !== formData.password_confirmation) {
      errs.password_confirmation = "Konfirmasi password tidak cocok"
    }
    if (!formData.phone.trim()) {
      errs.phone = "Nomor telepon wajib diisi"
    } else {
      const digits = formData.phone.replace(/\D/g, "")
      if (digits.length < 8 || digits.length > 15) {
        errs.phone = "Nomor telepon tidak valid (8-15 digit)"
      }
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!formData.business_name.trim()) errs.business_name = "Nama bisnis wajib diisi"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onRegister = async (planOverride?: Plan) => {
    const planToUse = planOverride ?? selectedPlan
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
        plan: planToUse?.plan_id ?? "",
      })
      setAlert({
        status: "success",
        message: (planToUse?.price_idr ?? 0) > 0
          ? "Akun berhasil dibuat! Setelah login, selesaikan pembayaran paket untuk mengaktifkan fitur. Anda akan diarahkan ke halaman login..."
          : "Akun berhasil dibuat! Anda akan diarahkan ke halaman login...",
      })
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: unknown) {
      const errors = (err as { errors?: Record<string, string> })?.errors
      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setCurrentStep(0)
      }
      setAlert({
        status: "error",
        message: err instanceof Error && err.message ? err.message : "Pendaftaran gagal. Silakan coba lagi.",
        requestId: (err as { requestId?: string })?.requestId,
      })
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
            <ErrorAlert status={alert.status} message={alert.message} requestId={alert.requestId} />
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
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword((v) => !v)}
                            style={{ color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        }
                      >
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
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
                            aria-label={showPasswordConfirm ? "Sembunyikan password" : "Tampilkan password"}
                            aria-pressed={showPasswordConfirm}
                            onClick={() => setShowPasswordConfirm((v) => !v)}
                            style={{ color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {showPasswordConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        }
                      >
                        <Input
                          type={showPasswordConfirm ? "text" : "password"}
                          autoComplete="new-password"
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
                        Data Anda dilindungi dengan enkripsi standar industri dan hanya digunakan untuk keperluan verifikasi akun Agentra.
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
                      onClick={() => router.push("/login")}
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
              onNext={(plan) => {
                setSelectedPlan(plan)
                onRegister(plan)
              }}
              plans={plans}
              loadingPlans={loadingPlans}
              submitting={loading}
              initialPlanId={initialPlanId}
            />
          )}
        </Flex>
      </Box>
      <PageFooter />
    </Box>
  )
}
