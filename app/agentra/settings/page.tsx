"use client"

import { TariffsTab } from "@/components/tariffs/TariffsTab"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Box, Button, Dialog, Field, Flex, Grid, Input, InputGroup, Skeleton, Switch, Table, Text, Textarea,
} from "@chakra-ui/react"
import { Fragment, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuUser, LuLock, LuBell, LuCheck, LuBuilding2, LuChevronDown, LuChevronUp, LuPencil, LuTrash2, LuPlus, LuX, LuCircle, LuPackage, LuCrown } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { SearchSelect } from "@/components/ui/search-select"
import { formatLocalPhone, localPhoneDigits, toApiPhone } from "@/lib/format"
import { PhoneInput } from "@/components/ui/phone-input"
import { getMyProfile, updateProfile, changePassword, updateNotificationSettings, getNotificationSettings, type UserProfile } from "@/lib/api/user"
import {
  getInsurers, createInsurer, updateInsurer, deleteInsurer,
  getInsurerProducts, upsertInsurerProduct,
  type ApiInsurer, type ApiInsurerProductType,
} from "@/lib/api/insurers"
import { getCurrentSubscription, type ApiSubscription } from "@/lib/api/subscription"
import { getPlans, formatPlanPrice, formatBillingCycle, type Plan } from "@/lib/plans/plans"
import { startPlanPayment } from "@/components/layout/PlanGate"
import {
  getMasterProducts, createMasterProduct, updateMasterProduct, deleteMasterProduct, getProductTypes,
  type ApiMasterProduct, type ApiProductTypeInfo, type ApiProductTypeCode,
} from "@/lib/api/master-products"

const lbl = { color: "#111827", fontSize: "15px", fontWeight: "bold" } as const

// Shared table look: light header row, 16px cells, horizontal scroll on narrow screens.
const TH = { px: "16px", py: "12px", fontSize: "14px", fontWeight: "bold", color: "#374151", bg: "#F1F5F9", textAlign: "start" } as const
const TD = { px: "16px", py: "12px", fontSize: "15px", color: "#111827", borderColor: "#E2E8F0", verticalAlign: "middle" } as const
const BTN_OUT = { variant: "outline", h: "40px", px: "12px", fontSize: "14px", color: "#111827", borderColor: "#94A3B8", gap: "6px" } as const
const BTN_DEL = { variant: "outline", h: "40px", px: "12px", fontSize: "14px", color: "#B91C1C", borderColor: "#FCA5A5", gap: "6px" } as const

// Two equal columns on desktop, one on phone. `minmax(0, 1fr)` stops long content from stretching a column.
const TWO_COL = { base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } as const

function DataTable({ minW = "760px", children }: { minW?: string; children: React.ReactNode }) {
  return (
    <Box bg="white" border="1px solid" borderColor="#CBD5E1" borderRadius="12px" overflowX="auto">
      <Table.Root minW={minW} size="md">{children}</Table.Root>
    </Box>
  )
}

function Toast({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <Flex
      align="center" gap="8px" px="14px" py="10px" borderRadius="8px" border="1px solid"
      bg={type === "success" ? "#F0FDF4" : "#FEF2F2"}
      borderColor={type === "success" ? "#BBF7D0" : "#FECACA"}
    >
      {type === "success"
        ? <LuCheck size={14} color="#16A34A" />
        : <LuCircle size={14} color="#DC2626" />
      }
      <Text fontSize="15px" color={type === "success" ? "#16A34A" : "#DC2626"}>{message}</Text>
    </Flex>
  )
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, onUpdate }: { user: UserProfile; onUpdate: (u: UserProfile) => void }) {
  const [firstName, setFirstName]   = useState(user.first_name ?? "")
  // Shown without the country code ("811-4411-307"); the API gets "628114411307".
  const [phone, setPhone]           = useState(formatLocalPhone(user.phone_number))
  const [errors, setErrors]         = useState<{ name?: string; phone?: string }>({})
  const [language, setLanguage]     = useState(user.language ?? "id")
  const [saving, setSaving]         = useState(false)
  const [feedback, setFeedback]     = useState<{ type: "success" | "error"; msg: string } | null>(null)
  // The form is initialised from `user` once; after a save the API's response is what the
  // user just typed, so there is nothing to re-sync (the old effect only caused a re-render).

  function validate() {
    const errs: { name?: string; phone?: string } = {}
    if (!firstName.trim()) errs.name = "Nama lengkap wajib diisi"
    const digits = localPhoneDigits(phone)
    if (!digits) errs.phone = "Nomor telepon wajib diisi"
    else if (!/^8\d{8,11}$/.test(digits)) errs.phone = "Nomor telepon tidak valid. Contoh: 811-4411-307"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    const token = getAccessToken()
    if (!token) return
    setFeedback(null)
    if (!validate()) return

    setSaving(true)
    const name = firstName.trim()
    const apiPhone = toApiPhone(phone)
    try {
      const updated = await updateProfile(token, {
        first_name: name,
        phone_number: apiPhone,
        language,
      })
      // Some deployments answer the PUT without echoing the profile; never replace the user with undefined.
      onUpdate(updated ?? { ...user, first_name: name, phone_number: apiPhone, language })
      setFeedback({ type: "success", msg: "Profil berhasil diperbarui." })
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Profil belum bisa disimpan") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid templateColumns={TWO_COL} gap="16px" alignItems="start">
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex borderLeft="4px solid" borderColor="#0D1B3E" pl="12px" mb="24px">
          <Text color="#0D1B3E" fontSize="15px" fontWeight="semibold">Data Diri Anda</Text>
        </Flex>

        <Flex flexDir="column" gap="16px">
          <Field.Root required invalid={!!errors.name}>
            <Field.Label {...lbl}>Nama lengkap <Field.RequiredIndicator /></Field.Label>
            <Input
              value={firstName} placeholder="Contoh: Budi Santoso"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFirstName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
              }}
              fontSize="15px"
            />
            {errors.name && <Field.ErrorText fontSize="14px">{errors.name}</Field.ErrorText>}
          </Field.Root>

          <Field.Root required invalid={!!errors.phone}>
            <Field.Label {...lbl}>Nomor telepon <Field.RequiredIndicator /></Field.Label>
            <InputGroup width="100%" startAddon="+62">
              <Input
                type="tel" inputMode="numeric" autoComplete="tel-national"
                value={phone} placeholder="811-4411-307"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPhone(formatLocalPhone(e.target.value))
                  if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
                }}
                fontSize="15px"
              />
            </InputGroup>
            {errors.phone
              ? <Field.ErrorText fontSize="14px">{errors.phone}</Field.ErrorText>
              : <Field.HelperText fontSize="14px" color="#475569">Tanpa angka 0 di depan. Nomor ini dipakai untuk WhatsApp.</Field.HelperText>}
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>Bahasa tampilan</Field.Label>
            <SearchSelect
              fontSize="15px"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "id", label: "Bahasa Indonesia" },
                { value: "en", label: "English" },
              ]}
            />
          </Field.Root>

          {feedback && <Toast type={feedback.type} message={feedback.msg} />}

          <Button
            bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" borderRadius="10px" h="44px"
            px="28px" w="max-content"
            loading={saving}
            onClick={handleSave}
          >
            Simpan Perubahan
          </Button>
        </Flex>
      </Box>

      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex borderLeft="4px solid" borderColor="#64748B" pl="12px" mb="24px">
          <Text color="#0D1B3E" fontSize="15px" fontWeight="semibold">Akun Masuk</Text>
        </Flex>

        <Flex flexDir="column" gap="16px">
          <Field.Root>
            <Field.Label {...lbl}>Alamat email</Field.Label>
            <Input value={user.email} disabled bg="#F8FAFC" fontSize="15px" h="44px" />
            <Field.HelperText fontSize="15px" color="#475569">Alamat email tidak bisa diubah di sini</Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>Nama pengguna</Field.Label>
            <Input value={user.username} disabled bg="#F8FAFC" fontSize="15px" h="44px" />
          </Field.Root>
        </Flex>
      </Box>
    </Grid>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd]         = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [saving, setSaving]         = useState(false)
  const [feedback, setFeedback]     = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function handleChange() {
    if (!currentPwd) {
      setFeedback({ type: "error", msg: "Kata sandi saat ini belum diisi" })
      return
    }
    if (!newPwd || newPwd.length < 8) {
      setFeedback({ type: "error", msg: "Kata sandi baru minimal 8 karakter" })
      return
    }
    // Same rule as registration and password reset.
    if (!/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      setFeedback({ type: "error", msg: "Kata sandi baru harus berisi huruf dan angka" })
      return
    }
    if (newPwd !== confirmPwd) {
      setFeedback({ type: "error", msg: "Kata sandi baru dan ketikan ulangnya tidak sama" })
      return
    }

    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setFeedback(null)
    try {
      await changePassword(token, currentPwd, newPwd)
      setFeedback({ type: "success", msg: "Kata sandi berhasil diganti." })
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Kata sandi belum bisa diganti") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid templateColumns={TWO_COL} gap="16px" alignItems="start">
    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
      <Flex borderLeft="4px solid" borderColor="#0D1B3E" pl="12px" mb="24px">
        <Text color="#0D1B3E" fontSize="15px" fontWeight="semibold">Ganti Kata Sandi</Text>
      </Flex>

      <Flex flexDir="column" gap="16px">
        <Field.Root>
          <Field.Label {...lbl}>Kata sandi saat ini</Field.Label>
          <Input type="password" autoComplete="current-password" value={currentPwd} placeholder="••••••••"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPwd(e.target.value)}
            fontSize="15px" h="44px" />
        </Field.Root>

        <Field.Root>
          <Field.Label {...lbl}>Kata sandi baru</Field.Label>
          <Input type="password" autoComplete="new-password" value={newPwd} placeholder="Minimal 8 karakter, berisi huruf dan angka"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPwd(e.target.value)}
            fontSize="15px" h="44px" />
        </Field.Root>

        <Field.Root>
          <Field.Label {...lbl}>Ketik ulang kata sandi baru</Field.Label>
          <Input type="password" autoComplete="new-password" value={confirmPwd} placeholder="Ketik ulang kata sandi baru"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPwd(e.target.value)}
            fontSize="15px" h="44px" />
        </Field.Root>

        {feedback && <Toast type={feedback.type} message={feedback.msg} />}

        <Button
          bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" borderRadius="8px"
          px="24px" w="max-content"
          loading={saving}
          onClick={handleChange}
        >
          Ubah Password
        </Button>
      </Flex>
    </Box>

    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
      <Flex borderLeft="4px solid" borderColor="#16A34A" pl="12px" mb="20px">
        <Text color="#0D1B3E" fontSize="15px" fontWeight="semibold">Tips Kata Sandi yang Aman</Text>
      </Flex>
      <Flex flexDir="column" gap="12px">
        {[
          "Minimal 8 karakter.",
          "Berisi huruf dan angka.",
          "Jangan memakai tanggal lahir atau nomor telepon.",
          "Jangan berikan kata sandi kepada siapa pun, termasuk orang yang mengaku dari Agentra.",
        ].map((t) => (
          <Flex key={t} gap="10px" align="flex-start">
            <Box mt="3px" flexShrink={0}><LuCheck size={16} color="#16A34A" /></Box>
            <Text fontSize="15px" color="#334155" lineHeight="1.5">{t}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
    </Grid>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [waNumber, setWaNumber]           = useState("")
  const [dailyEnabled, setDailyEnabled]   = useState(false)
  const [dailyTime, setDailyTime]         = useState("08:00")
  const [dailyDays, setDailyDays]         = useState("1,2,3,4,5")
  const [monthlyEnabled, setMonthlyEnabled] = useState(false)
  const [monthlyDay, setMonthlyDay]       = useState(1)
  const [monthlyTime, setMonthlyTime]     = useState("09:00")
  const [renewalReminderEnabled, setRenewalReminderEnabled] = useState(true)
  const [renewalReminderDays, setRenewalReminderDays] = useState(30)
  const [renewalWaTemplate, setRenewalWaTemplate]     = useState("")
  // "error": the current settings could not be read. Saving then would overwrite the
  // user's real settings with these defaults, so saving is blocked until a reload works.
  const [loadState, setLoadState]         = useState<"loading" | "ready" | "error">("loading")
  const loading = loadState === "loading"
  const [saving, setSaving]               = useState(false)
  const [feedback, setFeedback]           = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    getNotificationSettings(token)
      .then((s) => {
        if (cancelled) return
        setLoadState("ready")
        if (!s) return
        setWaNumber(formatLocalPhone(s.whatsapp_target_number))
        setDailyEnabled(s.daily_digest_enabled)
        setDailyTime((s.daily_digest_time ?? "08:00").slice(0, 5))
        setDailyDays(s.daily_days_of_week ?? "1,2,3,4,5")
        setMonthlyEnabled(s.monthly_digest_enabled)
        setMonthlyDay(s.monthly_digest_day ?? 1)
        setMonthlyTime((s.monthly_digest_time ?? "09:00").slice(0, 5))
        setRenewalReminderEnabled(s.renewal_reminder_enabled ?? true)
        setRenewalReminderDays(s.renewal_reminder_days ?? 30)
        setRenewalWaTemplate(s.renewal_wa_message_template ?? "")
      })
      .catch(() => { if (!cancelled) setLoadState("error") })
    return () => { cancelled = true }
  }, [])

  async function handleSave() {
    const token = getAccessToken()
    if (!token || loadState !== "ready") return
    if (dailyEnabled && activeDays.length === 0) {
      setFeedback({ type: "error", msg: "Pilih paling sedikit satu hari untuk ringkasan setiap hari" })
      return
    }
    if (!Number.isInteger(monthlyDay) || monthlyDay < 1 || monthlyDay > 28) {
      setFeedback({ type: "error", msg: "Tanggal ringkasan bulanan harus antara 1 sampai 28" })
      return
    }
    if (renewalReminderEnabled && (!Number.isInteger(renewalReminderDays) || renewalReminderDays < 1 || renewalReminderDays > 90)) {
      setFeedback({ type: "error", msg: "Pengingat harus antara 1 sampai 90 hari" })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      await updateNotificationSettings(token, {
        whatsapp_target_number: toApiPhone(waNumber) || undefined,
        daily_digest_enabled: dailyEnabled,
        daily_digest_time: dailyTime,
        daily_days_of_week: dailyDays,
        monthly_digest_enabled: monthlyEnabled,
        monthly_digest_day: monthlyDay,
        monthly_digest_time: monthlyTime,
        renewal_reminder_enabled: renewalReminderEnabled,
        renewal_reminder_days: renewalReminderDays,
        renewal_wa_message_template: renewalWaTemplate,
      })
      setFeedback({ type: "success", msg: "Pengaturan pesan berhasil disimpan." })
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Pengaturan belum bisa disimpan") })
    } finally {
      setSaving(false)
    }
  }

  const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

  function toggleDay(dayNum: number) {
    const current = dailyDays.split(",").filter(Boolean).map(Number)
    const updated = current.includes(dayNum)
      ? current.filter((d) => d !== dayNum)
      : [...current, dayNum].sort()
    setDailyDays(updated.join(","))
  }

  const activeDays = dailyDays.split(",").filter(Boolean).map(Number)

  if (loading) {
    return (
      <Flex flexDir="column" gap="16px">
        <Skeleton h="140px" borderRadius="12px" />
        <Skeleton h="200px" borderRadius="12px" />
      </Flex>
    )
  }

  return (
    <Flex flexDir="column" gap="16px">
    <Grid templateColumns={TWO_COL} gap="16px" alignItems="start">
    <Flex flexDir="column" gap="16px" minW={0}>
      {/* WhatsApp */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex borderLeft="4px solid" borderColor="#25D366" pl="12px" mb="20px">
          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Nomor WhatsApp untuk Menerima Pesan</Text>
        </Flex>
        <Field.Root maxW="360px">
          <Field.Label {...lbl}>Nomor WhatsApp Anda</Field.Label>
          <PhoneInput value={waNumber} onChange={setWaNumber} fontSize="15px" h="44px" />
          <Field.HelperText fontSize="15px" color="#475569">
            Pesan ringkasan akan dikirim ke nomor ini. Tanpa angka 0 di depan, contoh: 811-4411-307
          </Field.HelperText>
        </Field.Root>
      </Box>

      {/* Daily digest */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex justify="space-between" align="center" mb={dailyEnabled ? "20px" : "0"}>
          <Flex borderLeft="4px solid" borderColor="#1D4ED8" pl="12px">
            <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Ringkasan Setiap Hari</Text>
          </Flex>
          <Switch.Root
            checked={dailyEnabled}
            onCheckedChange={(e) => setDailyEnabled(e.checked)}
            colorPalette="blue"
          >
            <Switch.HiddenInput aria-label="Aktifkan ringkasan setiap hari" />
            <Switch.Control />
          </Switch.Root>
        </Flex>

        {dailyEnabled && (
          <Flex flexDir="column" gap="16px">
            <Flex gap="16px" flexWrap="wrap">
              <Field.Root maxW="160px">
                <Field.Label {...lbl}>Dikirim pukul</Field.Label>
                <Input type="time" value={dailyTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyTime(e.target.value)}
                  fontSize="15px" h="44px" />
              </Field.Root>
            </Flex>

            <Flex flexDir="column" gap="8px">
              <Text {...lbl}>Dikirim pada hari</Text>
              <Flex gap="6px" flexWrap="wrap">
                {DAY_LABELS.map((day, i) => {
                  const num = i + 1
                  const active = activeDays.includes(num)
                  return (
                    <Box
                      key={num} as="button" aria-pressed={active} w="40px" h="40px" borderRadius="full" fontSize="15px"
                      fontWeight={active ? "bold" : "normal"} border="1px solid" cursor="pointer"
                      bg={active ? "#1D4ED8" : "white"}
                      color={active ? "white" : "#374151"}
                      borderColor={active ? "#1D4ED8" : "#CBD5E1"}
                      onClick={() => toggleDay(num)}
                    >
                      {day}
                    </Box>
                  )
                })}
              </Flex>
            </Flex>
          </Flex>
        )}
      </Box>

      {/* Monthly digest */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex justify="space-between" align="center" mb={monthlyEnabled ? "20px" : "0"}>
          <Flex borderLeft="4px solid" borderColor="#7C3AED" pl="12px">
            <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Ringkasan Setiap Bulan</Text>
          </Flex>
          <Switch.Root
            checked={monthlyEnabled}
            onCheckedChange={(e) => setMonthlyEnabled(e.checked)}
            colorPalette="purple"
          >
            <Switch.HiddenInput aria-label="Aktifkan ringkasan bulanan" />
            <Switch.Control />
          </Switch.Root>
        </Flex>

        {monthlyEnabled && (
          <Flex gap="16px" flexWrap="wrap">
            <Field.Root maxW="160px">
              <Field.Label {...lbl}>Dikirim pada tanggal</Field.Label>
              <Input type="number" min={1} max={28} value={monthlyDay}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyDay(Number(e.target.value))}
                fontSize="15px" h="44px" />
              <Field.HelperText fontSize="15px" color="#475569">1–28</Field.HelperText>
            </Field.Root>
            <Field.Root maxW="160px">
              <Field.Label {...lbl}>Dikirim pukul</Field.Label>
              <Input type="time" value={monthlyTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyTime(e.target.value)}
                fontSize="15px" h="44px" />
            </Field.Root>
          </Flex>
        )}
      </Box>

    </Flex>
    <Flex flexDir="column" gap="16px" minW={0}>
      {/* Renewal reminder */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="24px">
        <Flex justify="space-between" align="center" mb={renewalReminderEnabled ? "20px" : "0"}>
          <Flex borderLeft="4px solid" borderColor="#F59E0B" pl="12px">
            <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Pengingat Polis Akan Habis</Text>
          </Flex>
          <Switch.Root
            checked={renewalReminderEnabled}
            onCheckedChange={(e) => setRenewalReminderEnabled(e.checked)}
            colorPalette="orange"
          >
            <Switch.HiddenInput aria-label="Aktifkan pengingat perpanjangan" />
            <Switch.Control />
          </Switch.Root>
        </Flex>
        {renewalReminderEnabled && <Flex flexDir="column" gap="16px">
          <Field.Root maxW="200px">
            <Field.Label {...lbl}>Ingatkan berapa hari sebelum polis habis?</Field.Label>
            <Input type="number" min={1} max={90} value={renewalReminderDays}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenewalReminderDays(Number(e.target.value))}
              fontSize="15px" h="44px" />
            <Field.HelperText fontSize="15px" color="#475569">
              Anda akan menerima pesan WhatsApp berisi polis yang akan habis dalam jumlah hari ini. Isi angka 1 sampai 90 (disarankan 30).
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>Isi pesan WhatsApp untuk nasabah</Field.Label>
            <Textarea
              rows={4} fontSize="15px"
              placeholder="Halo {customer_name}, polis Anda {policy_number} akan berakhir {days_until_expiry} hari lagi. Konfirmasi perpanjangan ya!"
              value={renewalWaTemplate}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRenewalWaTemplate(e.target.value)}
            />
            <Field.HelperText fontSize="15px" color="#475569">
              Pesan ini dipakai saat Anda menekan &ldquo;Kirim WhatsApp&rdquo; di halaman Perpanjangan Polis. Bagian dalam kurung kurawal akan diganti otomatis dengan data nasabah: {"{customer_name}"} = nama nasabah, {"{policy_number}"} = nomor polis, {"{product_type}"} = jenis asuransi, {"{insurer_name}"} = perusahaan asuransi, {"{coverage_end}"} = tanggal habis, {"{days_until_expiry}"} = sisa hari. Kosongkan jika ingin memakai pesan bawaan.
            </Field.HelperText>
          </Field.Root>
        </Flex>}
      </Box>
    </Flex>
    </Grid>

      {loadState === "error" && (
        <Toast type="error" message="Pengaturan belum bisa dibuka. Muat ulang halaman sebelum menyimpan, agar pengaturan lama Anda tidak terhapus." />
      )}
      {feedback && <Toast type={feedback.type} message={feedback.msg} />}

      <Button
        bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" borderRadius="8px"
        px="24px" w="max-content"
        loading={saving}
        disabled={loadState !== "ready"}
        onClick={handleSave}
      >
        Simpan Pengaturan Pesan
      </Button>
    </Flex>
  )
}

// ─── Insurers Tab ─────────────────────────────────────────────────────────────

// One row per product line (GET /insurers/{id}/products answers every line of /master-products/types).
// An active rate is used for new policies of that line at this insurer, ahead of the master product's rate.
type ProductDraft = { insurer_product_id?: string | null; product_type: ApiInsurerProductType; label: string; commission_rate: string; is_active: boolean }

function ProductConfig({ insurerId, onClose }: { insurerId: string; onClose: () => void }) {
  const [drafts, setDrafts] = useState<ProductDraft[]>([])
  // Which insurer the drafts were loaded for (or failed for). Saving defaults after a failed
  // load would reset every product of this insurer to 0% / inactive, so it is blocked.
  const [loadedFor, setLoadedFor] = useState<{ insurerId: string; ok: boolean } | null>(null)
  const loading    = loadedFor?.insurerId !== insurerId
  const loadFailed = !loading && loadedFor?.ok === false
  const [saving, setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    getInsurerProducts(token, insurerId)
      .then((products) => {
        if (cancelled) return
        setDrafts(products.map((p) => ({
          insurer_product_id: p.insurer_product_id, product_type: p.product_type, label: p.label ?? p.product_type,
          commission_rate: String(p.commission_rate ?? "0"), is_active: p.is_active,
        })))
        setLoadedFor({ insurerId, ok: true })
      })
      .catch(() => {
        if (cancelled) return
        setLoadedFor({ insurerId, ok: false })
        setFeedback({ type: "error", msg: "Daftar komisi belum bisa dibuka. Tekan Tutup, lalu buka lagi." })
      })
    return () => { cancelled = true }
  }, [insurerId])

  function setDraft(pt: ApiInsurerProductType, field: "commission_rate" | "is_active", value: string | boolean) {
    setDrafts((prev) => prev.map((d) => d.product_type === pt ? { ...d, [field]: value } : d))
  }

  async function save() {
    const token = getAccessToken()
    if (!token || loading || loadFailed) return
    const invalid = drafts.find((d) => {
      const r = parseFloat(d.commission_rate)
      return d.commission_rate !== "" && (Number.isNaN(r) || r < 0 || r > 100)
    })
    if (invalid) {
      setFeedback({ type: "error", msg: `Komisi ${invalid.label} harus antara 0 dan 100%` })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      // Only lines that are active or already have a saved rate; untouched inactive lines are not written.
      await Promise.all(
        drafts.filter((d) => d.is_active || d.insurer_product_id).map((d) => upsertInsurerProduct(token, insurerId, {
          product_type: d.product_type,
          commission_rate: parseFloat(d.commission_rate) || 0,
          is_active: d.is_active,
        }))
      )
      setFeedback({ type: "success", msg: "Komisi berhasil disimpan." })
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Belum bisa disimpan") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="#F8FAFC" borderRadius="10px" border="1px solid" borderColor="#CBD5E1" overflow="hidden">
      <Flex px="16px" py="10px" borderBottom="1px solid" borderColor="#CBD5E1" bg="#F1F5F9" align="center">
        <Text flex="1" color="#475569" fontSize="14px" fontWeight="bold">Jenis asuransi</Text>
        <Text w="140px" textAlign="center" color="#475569" fontSize="14px" fontWeight="bold">Komisi (%)</Text>
        <Text w="72px" textAlign="center" color="#475569" fontSize="14px" fontWeight="bold">Dipakai</Text>
      </Flex>

      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <Flex key={i} px="16px" py="12px" borderBottom="1px solid" borderColor="#F1F5F9" gap="12px">
              <Skeleton flex="1" h="20px" borderRadius="4px" />
              <Skeleton w="140px" h="20px" borderRadius="4px" />
              <Skeleton w="72px" h="20px" borderRadius="4px" />
            </Flex>
          ))
        : drafts.map((d) => (
            <Flex key={d.product_type} align="center" px="16px" py="10px" borderBottom="1px solid" borderColor="#F1F5F9" gap="12px">
              <Text flex="1" fontSize="15px" color="#1C2833">{d.label}</Text>
              <Input
                w="140px" h="40px" fontSize="15px" textAlign="center" type="number" min={0} max={100} step="0.1"
                bg="white" border="1px solid" borderColor="#CBD5E1" borderRadius="6px" px="8px"
                aria-label={`Komisi default ${d.label} (%)`}
                value={d.commission_rate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(d.product_type, "commission_rate", e.target.value)}
              />
              <Flex w="72px" justify="center">
                <Switch.Root checked={d.is_active} onCheckedChange={(e) => setDraft(d.product_type, "is_active", e.checked)} colorPalette="blue" size="lg">
                  <Switch.HiddenInput aria-label={`${d.label} dipakai`} /><Switch.Control />
                </Switch.Root>
              </Flex>
            </Flex>
          ))
      }

      <Text px="16px" pt="10px" fontSize="15px" color="#475569">
        Komisi yang dipakai (saklar menyala) akan otomatis terisi saat Anda mencatat polis baru jenis tersebut di perusahaan asuransi ini.
      </Text>
      <Flex px="16px" py="12px" justify="space-between" align="center">
        {feedback
          ? <Toast type={feedback.type} message={feedback.msg} />
          : <Box />
        }
        <Flex gap="8px">
          <Button variant="ghost" color="#475569" fontSize="15px" onClick={onClose}>Tutup</Button>
          <Button h="44px" px="28px" bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" loading={saving} disabled={loading || loadFailed} onClick={save}>
            Simpan Komisi
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

const INSURER_COLORS = ["#0369A1", "#047857", "#1D4ED8", "#7C3AED", "#B45309", "#BE123C"]
// Light background tint of a brand colour; works for any CSS colour, unlike appending a hex alpha.
function tint(color: string) {
  return `color-mix(in srgb, ${color} 10%, white)`
}

function insurerColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return INSURER_COLORS[hash % INSURER_COLORS.length]
}

function InsurersTab() {
  const [insurers, setInsurers]   = useState<ApiInsurer[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState({ name: "", short_name: "", agent_code: "", is_primary: false, notes: "" })
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm]   = useState<Partial<ApiInsurer>>({})
  const [savingId, setSavingId]   = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [feedback, setFeedback]   = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getInsurers(token)
      .then(setInsurers)
      .catch((err: unknown) => setFeedback({ type: "error", msg: errorMessage(err, "Daftar perusahaan asuransi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const token = getAccessToken()
    if (!token || !addForm.name || !addForm.short_name) {
      setFeedback({ type: "error", msg: "Nama lengkap dan singkatan wajib diisi" })
      return
    }
    setAdding(true)
    setFeedback(null)
    try {
      const { insurer_id } = await createInsurer(token, {
        name: addForm.name,
        short_name: addForm.short_name,
        agent_code: addForm.agent_code || undefined,
        is_primary: addForm.is_primary,
        notes: addForm.notes || undefined,
      })
      const newInsurer: ApiInsurer = { insurer_id, name: addForm.name, short_name: addForm.short_name, agent_code: addForm.agent_code || null, is_primary: addForm.is_primary, is_active: true }
      setInsurers((prev) => [newInsurer, ...prev])
      setAddForm({ name: "", short_name: "", agent_code: "", is_primary: false, notes: "" })
      setShowAdd(false)
      setFeedback({ type: "success", msg: `${addForm.name} berhasil ditambahkan.` })
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Perusahaan asuransi belum bisa ditambahkan") })
    } finally {
      setAdding(false)
    }
  }

  function startEdit(ins: ApiInsurer) {
    setEditingId(ins.insurer_id)
    setEditForm({ name: ins.name, short_name: ins.short_name, agent_code: ins.agent_code ?? "", is_primary: ins.is_primary, is_active: ins.is_active, notes: ins.notes ?? "", assistance_phone: formatLocalPhone(ins.assistance_phone) })
  }

  async function saveEdit(insurerId: string) {
    const token = getAccessToken()
    if (!token) return
    setSavingId(insurerId)
    try {
      await updateInsurer(token, insurerId, {
        name: editForm.name,
        short_name: editForm.short_name,
        agent_code: editForm.agent_code || undefined,
        is_primary: editForm.is_primary,
        is_active: editForm.is_active,
        notes: (editForm as Partial<ApiInsurer> & { notes?: string }).notes || undefined,
        assistance_phone: toApiPhone(editForm.assistance_phone ?? "") || null,
      })
      setInsurers((prev) => prev.map((ins) => ins.insurer_id === insurerId ? { ...ins, ...editForm } as ApiInsurer : ins))
      setEditingId(null)
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Belum bisa disimpan") })
    } finally {
      setSavingId(null)
    }
  }

  async function toggleActive(ins: ApiInsurer) {
    const token = getAccessToken()
    if (!token) return
    const next = !ins.is_active
    setInsurers((prev) => prev.map((i) => i.insurer_id === ins.insurer_id ? { ...i, is_active: next } : i))
    try {
      await updateInsurer(token, ins.insurer_id, { is_active: next })
    } catch (err: unknown) {
      setInsurers((prev) => prev.map((i) => i.insurer_id === ins.insurer_id ? { ...i, is_active: ins.is_active } : i))
      setFeedback({ type: "error", msg: errorMessage(err, "Status belum bisa diubah") })
    }
  }

  async function handleDelete(insurerId: string) {
    const token = getAccessToken()
    if (!token) return
    setDeletingId(insurerId)
    try {
      await deleteInsurer(token, insurerId)
      setInsurers((prev) => prev.filter((i) => i.insurer_id !== insurerId))
      if (expandedId === insurerId) setExpandedId(null)
      setConfirmDeleteId(null)
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Belum bisa dihapus") })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Flex flexDir="column" gap="16px">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Flex flexDir="column" gap="2px">
          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Perusahaan Asuransi Saya</Text>
          <Text color="#475569" fontSize="15px">Daftar perusahaan asuransi tempat Anda menjual polis, beserta komisinya</Text>
        </Flex>
        <Button
          bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" gap="6px"
          onClick={() => { setShowAdd(true); setFeedback(null) }}
        >
          <LuPlus size={16} /> Tambah Perusahaan Asuransi
        </Button>
      </Flex>

      {feedback && !(showAdd && feedback.type === "error") && <Toast type={feedback.type} message={feedback.msg} />}

      {/* Insurer table */}
      {loading
        ? <Skeleton h="240px" borderRadius="12px" />
        : insurers.length === 0
          ? (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="40px" textAlign="center">
              <Text color="#374151" fontSize="15px">Belum ada perusahaan asuransi. Tekan tombol &quot;Tambah Perusahaan Asuransi&quot; di atas untuk memulai.</Text>
            </Box>
          )
          : (
            <DataTable minW="720px">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader {...TH}>Perusahaan Asuransi</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Kode Agen Anda</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Nomor Darurat 24 Jam</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Status</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH} textAlign="end">Tindakan</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {insurers.map((ins) => {
                  const isEditing  = editingId === ins.insurer_id
                  const isExpanded = expandedId === ins.insurer_id
                  const color      = insurerColor(ins.name)
                  const phoneField = (label: string) => (
                    <PhoneInput h="40px" fontSize="15px" aria-label={label} value={editForm.assistance_phone ?? ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, assistance_phone: v }))} />
                  )
                  const field = (key: "name" | "short_name" | "agent_code" | "assistance_phone", label: string, w?: string) => (
                    <Input h="40px" fontSize="15px" w={w} aria-label={label} placeholder={label} value={(editForm[key] as string | undefined) ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
                  )
                  return (
                    <Fragment key={ins.insurer_id}>
                      <Table.Row bg={isExpanded ? "#F8FAFC" : "white"}>
                        <Table.Cell {...TD}>
                          {isEditing ? (
                            <Flex flexDir="column" gap="8px">{field("name", "Nama perusahaan", "220px")}{field("short_name", "Singkatan", "120px")}</Flex>
                          ) : (
                            <Flex align="center" gap="10px">
                              <Flex w="36px" h="36px" borderRadius="8px" align="center" justify="center" flexShrink={0} bg={tint(color)} color={color}>
                                <Text fontWeight="bold" fontSize="13px">{ins.short_name.slice(0, 2).toUpperCase()}</Text>
                              </Flex>
                              <Box>
                                <Text fontWeight="semibold">{ins.name} <Text as="span" fontWeight="normal" color="#475569">({ins.short_name})</Text></Text>
                                {ins.is_primary && <Text fontSize="13px" color="#92400E" fontWeight="semibold">Perusahaan utama</Text>}
                              </Box>
                            </Flex>
                          )}
                        </Table.Cell>
                        <Table.Cell {...TD}>{isEditing ? field("agent_code", "Kode agen", "120px") : (ins.agent_code || "—")}</Table.Cell>
                        <Table.Cell {...TD}>{isEditing ? phoneField("Nomor darurat") : (ins.assistance_phone ? `+62 ${formatLocalPhone(ins.assistance_phone)}` : "—")}</Table.Cell>
                        <Table.Cell {...TD}>
                          {isEditing ? (
                            <Switch.Root checked={editForm.is_primary ?? false} onCheckedChange={(e) => setEditForm((f) => ({ ...f, is_primary: e.checked }))} colorPalette="blue">
                              <Switch.HiddenInput /><Switch.Control />
                              <Text fontSize="14px" ml="8px">Utama</Text>
                            </Switch.Root>
                          ) : (
                            <Flex align="center" gap="8px">
                              <Switch.Root checked={ins.is_active} onCheckedChange={() => toggleActive(ins)} colorPalette="blue">
                                <Switch.HiddenInput aria-label={`${ins.name} dipakai`} /><Switch.Control />
                              </Switch.Root>
                              <Text fontSize="14px" fontWeight="semibold" color={ins.is_active ? "#166534" : "#475569"}>{ins.is_active ? "Dipakai" : "Tidak dipakai"}</Text>
                            </Flex>
                          )}
                        </Table.Cell>
                        <Table.Cell {...TD}>
                          <Flex gap="8px" justify="flex-end" flexWrap="wrap">
                            {isEditing ? (
                              <>
                                <Button {...BTN_OUT} onClick={() => setEditingId(null)}>Batal</Button>
                                <Button h="40px" px="16px" fontSize="14px" bg="#0D1B3E" color="white" loading={savingId === ins.insurer_id} onClick={() => saveEdit(ins.insurer_id)}>Simpan</Button>
                              </>
                            ) : (
                              <>
                                <Button {...BTN_OUT} onClick={() => startEdit(ins)}><LuPencil size={16} /> Ubah</Button>
                                <Button {...BTN_OUT} bg={isExpanded ? "#DBEAFE" : "transparent"} onClick={() => setExpandedId(isExpanded ? null : ins.insurer_id)}>
                                  {isExpanded ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />} Komisi
                                </Button>
                                <Button {...BTN_DEL} loading={deletingId === ins.insurer_id} onClick={() => setConfirmDeleteId(ins.insurer_id)}><LuTrash2 size={16} /> Hapus</Button>
                              </>
                            )}
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                      {isExpanded && (
                        <Table.Row bg="#F8FAFC">
                          <Table.Cell {...TD} colSpan={5}>
                            <Text color="#111827" fontSize="15px" fontWeight="bold" mb="8px">Komisi {ins.name} per jenis asuransi</Text>
                            <ProductConfig insurerId={ins.insurer_id} onClose={() => setExpandedId(null)} />
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Fragment>
                  )
                })}
              </Table.Body>
            </DataTable>
          )
      }

      <Dialog.Root open={showAdd} onOpenChange={({ open }) => { if (!open) setShowAdd(false) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="480px" mx="16px">
            <Dialog.Header borderBottom="1px solid" borderColor="#CBD5E1" pb="16px">
              <Dialog.Title fontSize="18px" fontWeight="bold" color="#0D1B3E">Tambah Perusahaan Asuransi</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py="20px">
              <Flex flexDir="column" gap="16px">
                <Flex flexDir="column" gap="4px">
                  <Text {...lbl}>Nama lengkap perusahaan (wajib)</Text>
                  <Input fontSize="15px" placeholder="PT Asuransi XYZ" value={addForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                </Flex>
                <Flex gap="12px" flexDir={{ base: "column", sm: "row" }}>
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>Singkatan nama (wajib)</Text>
                    <Input fontSize="15px" placeholder="XYZ" value={addForm.short_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, short_name: e.target.value }))} />
                  </Flex>
                  <Flex flexDir="column" gap="4px" flex="1">
                    <Text {...lbl}>Kode agen Anda</Text>
                    <Input fontSize="15px" placeholder="AG-001" value={addForm.agent_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, agent_code: e.target.value }))} />
                  </Flex>
                </Flex>
                <Switch.Root checked={addForm.is_primary} onCheckedChange={(e) => setAddForm((f) => ({ ...f, is_primary: e.checked }))} colorPalette="blue" size="md">
                  <Switch.HiddenInput /><Switch.Control />
                  <Text fontSize="15px" color="#374151" ml="8px">Perusahaan asuransi utama saya</Text>
                </Switch.Root>
                {feedback?.type === "error" && <Toast type="error" message={feedback.msg} />}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#CBD5E1" pt="16px" gap="8px">
              <Button variant="outline" h="44px" px="24px" fontSize="15px" color="#111827" borderColor="#94A3B8" onClick={() => setShowAdd(false)} disabled={adding}>Batal</Button>
              <Button h="44px" px="28px" fontSize="15px" fontWeight="semibold" bg="#0D1B3E" color="white" loading={adding} onClick={handleAdd}>Simpan</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root open={confirmDeleteId !== null} onOpenChange={({ open }) => { if (!open) setConfirmDeleteId(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="400px" mx="16px">
            <Dialog.Header borderBottom="1px solid" borderColor="#CBD5E1" pb="16px">
              <Dialog.Title fontSize="18px" fontWeight="bold" color="#0D1B3E">Hapus Perusahaan Asuransi?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py="20px">
              <Text fontSize="15px" color="#1F2937">Data yang dihapus tidak bisa dikembalikan. Apakah Anda yakin ingin menghapusnya?</Text>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#CBD5E1" pt="16px" gap="8px">
              <Button variant="outline" h="44px" px="24px" fontSize="15px" color="#111827" borderColor="#94A3B8" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button h="44px" px="28px" fontSize="15px" fontWeight="semibold" bg="#B91C1C" color="white" _hover={{ bg: "#991B1B" }} loading={deletingId === confirmDeleteId} onClick={() => { if (confirmDeleteId) handleDelete(confirmDeleteId) }}>
                Hapus
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  )
}

// ─── Master Products Tab ──────────────────────────────────────────────────────

const EMPTY_PRODUCT_FORM = { product_code: "", product_name: "", product_type: "" as ApiProductTypeCode | "", commission_rate: "", default_tax_rate: "2.5", policy_prefixes: "" }

type ProductForm = typeof EMPTY_PRODUCT_FORM
type ProductFormErrors = Partial<Record<keyof ProductForm, string>>

function validateProductForm(form: ProductForm): ProductFormErrors {
  const errors: ProductFormErrors = {}
  const code = form.product_code.trim()
  if (!code) errors.product_code = "Kode produk wajib diisi"
  else if (!/^[a-z0-9_-]+$/.test(code)) errors.product_code = "Hanya huruf kecil, angka, - dan _ tanpa spasi"
  if (!form.product_name.trim()) errors.product_name = "Nama produk wajib diisi"
  if (!form.product_type) errors.product_type = "Jenis produk wajib dipilih"
  const commission = form.commission_rate.trim()
  if (!commission) errors.commission_rate = "Komisi wajib diisi"
  else if (isNaN(Number(commission)) || Number(commission) < 0 || Number(commission) > 100) errors.commission_rate = "Harus 0 - 100"
  const tax = form.default_tax_rate.trim()
  if (tax && (isNaN(Number(tax)) || Number(tax) < 0 || Number(tax) > 100)) errors.default_tax_rate = "Harus 0 - 100"
  const prefixes = form.policy_prefixes.trim()
  if (prefixes && !/^[^,\s]+(\s*,\s*[^,\s]+)*$/.test(prefixes)) errors.policy_prefixes = "Pisahkan dengan koma, contoh: 01,08,88"
  return errors
}

function ProductFormFields({
  form,
  errors,
  types,
  onChange,
}: {
  form: ProductForm
  errors: ProductFormErrors
  types: ApiProductTypeInfo[]
  onChange: (f: ProductForm) => void
}) {
  return (
    <Flex flexDir="column" gap="16px">
      <Field.Root invalid={!!errors.product_type}>
        <Field.Label {...lbl}>Jenis asuransi (wajib)</Field.Label>
        <SearchSelect
          value={form.product_type}
          onChange={(v) => onChange({ ...form, product_type: v as ApiProductTypeCode | "" })}
          placeholder="Pilih jenis asuransi"
          invalid={!!errors.product_type}
          options={types.map((t) => ({ value: t.product_type, label: t.label }))}
        />
        {errors.product_type
          ? <Field.ErrorText fontSize="15px">{errors.product_type}</Field.ErrorText>
          : <Field.HelperText fontSize="15px" color="#475569">Menentukan isian yang muncul pada polis, misalnya kelas bangunan untuk asuransi kebakaran</Field.HelperText>}
      </Field.Root>
      <Flex gap="12px">
        <Field.Root flex="1" invalid={!!errors.product_code}>
          <Field.Label {...lbl}>Kode produk (wajib)</Field.Label>
          <Input fontSize="15px" color="#1C2833" placeholder="kebakaran" value={form.product_code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, product_code: e.target.value.toLowerCase() })} />
          {errors.product_code
            ? <Field.ErrorText fontSize="15px">{errors.product_code}</Field.ErrorText>
            : <Field.HelperText fontSize="15px" color="#475569">Huruf kecil, tanpa spasi. Contoh: kebakaran</Field.HelperText>}
        </Field.Root>
        <Field.Root w="120px" invalid={!!errors.commission_rate}>
          <Field.Label {...lbl}>Komisi % (wajib)</Field.Label>
          <Input fontSize="15px" color="#1C2833" type="number" min={0} max={100} step="0.5" placeholder="15" value={form.commission_rate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, commission_rate: e.target.value })} />
          {errors.commission_rate && <Field.ErrorText fontSize="15px">{errors.commission_rate}</Field.ErrorText>}
        </Field.Root>
        <Field.Root w="120px" invalid={!!errors.default_tax_rate}>
          <Field.Label {...lbl}>Pajak PPh %</Field.Label>
          <Input fontSize="15px" color="#1C2833" type="number" min={0} max={100} step="0.5" placeholder="2.5" value={form.default_tax_rate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, default_tax_rate: e.target.value })} />
          {errors.default_tax_rate
            ? <Field.ErrorText fontSize="15px">{errors.default_tax_rate}</Field.ErrorText>
            : <Field.HelperText fontSize="15px" color="#475569">Otomatis terisi di polis baru</Field.HelperText>}
        </Field.Root>
      </Flex>
      <Field.Root invalid={!!errors.product_name}>
        <Field.Label {...lbl}>Nama produk (wajib)</Field.Label>
        <Input fontSize="15px" color="#1C2833" placeholder="Asuransi Kebakaran" value={form.product_name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, product_name: e.target.value })} />
        {errors.product_name && <Field.ErrorText fontSize="15px">{errors.product_name}</Field.ErrorText>}
      </Field.Root>
      <Field.Root invalid={!!errors.policy_prefixes}>
        <Field.Label {...lbl}>Awalan nomor polis</Field.Label>
        <Input fontSize="15px" color="#1C2833" placeholder="01,08,88" value={form.policy_prefixes}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, policy_prefixes: e.target.value })} />
        {errors.policy_prefixes
          ? <Field.ErrorText fontSize="15px">{errors.policy_prefixes}</Field.ErrorText>
          : <Field.HelperText fontSize="15px" color="#475569">Pisahkan dengan koma. Dipakai agar komisi terisi otomatis saat mencatat polis</Field.HelperText>}
      </Field.Root>
    </Flex>
  )
}

function MasterProductsTab() {
  const [products, setProducts]     = useState<ApiMasterProduct[]>([])
  const [productTypes, setProductTypes] = useState<ApiProductTypeInfo[]>([])
  const [loading, setLoading]       = useState(true)
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState(EMPTY_PRODUCT_FORM)
  const [adding, setAdding]         = useState(false)
  const [editTarget, setEditTarget] = useState<ApiMasterProduct | null>(null)
  const [editForm, setEditForm]     = useState(EMPTY_PRODUCT_FORM)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [feedback, setFeedback]     = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [addErrors, setAddErrors]   = useState<ProductFormErrors>({})
  const [editErrors, setEditErrors] = useState<ProductFormErrors>({})
  const [addError, setAddError]     = useState<string | null>(null)
  const [editError, setEditError]   = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getProductTypes(token).then(setProductTypes).catch(() => {})
    getMasterProducts(token)
      .then(setProducts)
      .catch((err: unknown) => setFeedback({ type: "error", msg: errorMessage(err, "Daftar produk belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") }))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const errors = validateProductForm(addForm)
    setAddErrors(errors)
    if (Object.keys(errors).length > 0) return
    const token = getAccessToken()
    if (!token) {
      setAddError("Waktu penggunaan Anda habis. Silakan masuk kembali.")
      return
    }
    setAdding(true)
    setAddError(null)
    setFeedback(null)
    try {
      const taxRate = parseFloat(addForm.default_tax_rate) || 0
      const { product_id } = await createMasterProduct(token, {
        product_code: addForm.product_code,
        product_name: addForm.product_name,
        product_type: addForm.product_type as ApiProductTypeCode,
        commission_rate: parseFloat(addForm.commission_rate) || 0,
        default_tax_rate: taxRate / 100,
        policy_prefixes: addForm.policy_prefixes || undefined,
      })
      setProducts((prev) => [{
        product_id,
        product_code:     addForm.product_code,
        product_name:     addForm.product_name,
        product_type:     addForm.product_type as ApiProductTypeCode,
        commission_rate:  addForm.commission_rate,
        default_tax_rate: taxRate / 100,
        policy_prefixes:  addForm.policy_prefixes || null,
        is_active:        1,
      } as import("@/lib/api/master-products").ApiMasterProduct, ...prev])
      setAddForm(EMPTY_PRODUCT_FORM)
      setAddOpen(false)
      setFeedback({ type: "success", msg: `${addForm.product_name} berhasil ditambahkan.` })
    } catch (err: unknown) {
      setAddError(errorMessage(err, "Produk belum bisa ditambahkan"))
    } finally {
      setAdding(false)
    }
  }

  function openEdit(p: ApiMasterProduct) {
    setEditTarget(p)
    setEditErrors({})
    setEditError(null)
    setEditForm({
      product_code: p.product_code,
      product_name: p.product_name,
      product_type: p.product_type ?? "",
      commission_rate: p.commission_rate,
      default_tax_rate: p.default_tax_rate != null ? String(p.default_tax_rate * 100) : "2.5",
      policy_prefixes: p.policy_prefixes ?? "",
    })
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    const errors = validateProductForm(editForm)
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return
    const token = getAccessToken()
    if (!token) {
      setEditError("Waktu penggunaan Anda habis. Silakan masuk kembali.")
      return
    }
    setSaving(true)
    setEditError(null)
    try {
      const taxRate = parseFloat(editForm.default_tax_rate) || 0
      await updateMasterProduct(token, editTarget.product_id, {
        product_code: editForm.product_code,
        product_name: editForm.product_name,
        product_type: editForm.product_type as ApiProductTypeCode,
        commission_rate: parseFloat(editForm.commission_rate) || 0,
        default_tax_rate: taxRate / 100,
        policy_prefixes: editForm.policy_prefixes || "",
      })
      setProducts((prev) => prev.map((p) =>
        p.product_id === editTarget.product_id
          ? {
              ...p,
              product_code:     editForm.product_code,
              product_name:     editForm.product_name,
              product_type:     editForm.product_type as ApiProductTypeCode,
              commission_rate:  editForm.commission_rate,
              default_tax_rate: taxRate / 100,
              policy_prefixes:  editForm.policy_prefixes || null,
            }
          : p
      ))
      setEditTarget(null)
    } catch (err: unknown) {
      setEditError(errorMessage(err, "Belum bisa disimpan"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: ApiMasterProduct) {
    const token = getAccessToken()
    if (!token) return
    const next = p.is_active ? 0 : 1
    setProducts((prev) => prev.map((prod) => prod.product_id === p.product_id ? { ...prod, is_active: next } : prod))
    try {
      await updateMasterProduct(token, p.product_id, { is_active: Boolean(next) })
    } catch (err: unknown) {
      setProducts((prev) => prev.map((prod) => prod.product_id === p.product_id ? { ...prod, is_active: p.is_active } : prod))
      setFeedback({ type: "error", msg: errorMessage(err, "Status belum bisa diubah") })
    }
  }

  async function handleDelete(productId: string) {
    const token = getAccessToken()
    if (!token) return
    setDeletingId(productId)
    try {
      await deleteMasterProduct(token, productId)
      setProducts((prev) => prev.filter((p) => p.product_id !== productId))
      setConfirmDeleteId(null)
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: errorMessage(err, "Produk belum bisa dihapus") })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Flex flexDir="column" gap="16px">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Flex flexDir="column" gap="2px">
          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">Daftar Produk Asuransi</Text>
          <Text color="#475569" fontSize="15px">Produk asuransi yang Anda jual, beserta persentase komisinya</Text>
        </Flex>
        <Button
          bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" gap="6px"
          onClick={() => { setAddForm(EMPTY_PRODUCT_FORM); setAddErrors({}); setAddError(null); setAddOpen(true); setFeedback(null) }}
        >
          <LuPlus size={16} /> Tambah Produk
        </Button>
      </Flex>

      {feedback && <Toast type={feedback.type} message={feedback.msg} />}

      {/* Product table */}
      {loading
        ? <Skeleton h="240px" borderRadius="12px" />
        : products.length === 0
          ? (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#CBD5E1" p="40px" textAlign="center">
              <Text color="#374151" fontSize="15px">Belum ada produk. Tekan tombol &quot;Tambah Produk&quot; di atas untuk memulai.</Text>
            </Box>
          )
          : (
            <DataTable minW="760px">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader {...TH}>Nama Produk</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Jenis Asuransi</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH} textAlign="end">Komisi</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH} textAlign="end">Pajak PPh</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Awalan No. Polis</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH}>Status</Table.ColumnHeader>
                  <Table.ColumnHeader {...TH} textAlign="end">Tindakan</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((p) => {
                  const isActive = Boolean(p.is_active)
                  return (
                    <Table.Row key={p.product_id}>
                      <Table.Cell {...TD}>
                        <Text fontWeight="semibold">{p.product_name}</Text>
                        <Text fontSize="13px" color="#475569">Kode: {p.product_code}</Text>
                      </Table.Cell>
                      <Table.Cell {...TD}>
                        {p.product_type
                          ? (productTypes.find((t) => t.product_type === p.product_type)?.label ?? p.product_type)
                          : <Text as="span" color="#B91C1C" fontWeight="semibold">Belum dipilih</Text>}
                      </Table.Cell>
                      <Table.Cell {...TD} textAlign="end" fontWeight="bold">{parseFloat(p.commission_rate).toFixed(1)}%</Table.Cell>
                      <Table.Cell {...TD} textAlign="end">{p.default_tax_rate != null ? `${(p.default_tax_rate * 100).toFixed(1)}%` : "—"}</Table.Cell>
                      <Table.Cell {...TD}>{p.policy_prefixes || "—"}</Table.Cell>
                      <Table.Cell {...TD}>
                        <Flex align="center" gap="8px">
                          <Switch.Root checked={isActive} onCheckedChange={() => toggleActive(p)} colorPalette="blue">
                            <Switch.HiddenInput aria-label={`${p.product_name} dipakai`} /><Switch.Control />
                          </Switch.Root>
                          <Text fontSize="14px" fontWeight="semibold" color={isActive ? "#166534" : "#475569"}>{isActive ? "Dipakai" : "Tidak dipakai"}</Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell {...TD}>
                        <Flex gap="8px" justify="flex-end" flexWrap="wrap">
                          <Button {...BTN_OUT} onClick={() => openEdit(p)}><LuPencil size={16} /> Ubah</Button>
                          <Button {...BTN_DEL} loading={deletingId === p.product_id} onClick={() => setConfirmDeleteId(p.product_id)}><LuTrash2 size={16} /> Hapus</Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </DataTable>
          )
      }

      {/* Delete confirmation dialog */}
      <Dialog.Root open={confirmDeleteId !== null} onOpenChange={({ open }) => { if (!open) setConfirmDeleteId(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="400px" mx="16px">
            <Dialog.Header borderBottom="1px solid" borderColor="#CBD5E1" pb="16px">
              <Dialog.Title fontSize="18px" fontWeight="bold" color="#0D1B3E">Hapus Produk?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py="20px">
              <Text fontSize="15px" color="#1F2937">Data yang dihapus tidak bisa dikembalikan. Apakah Anda yakin ingin menghapusnya?</Text>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#CBD5E1" pt="16px" gap="8px">
              <Button variant="outline" h="44px" px="24px" fontSize="15px" color="#111827" borderColor="#94A3B8" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
              <Button h="44px" px="28px" fontSize="15px" fontWeight="semibold" bg="#B91C1C" color="white" _hover={{ bg: "#991B1B" }} loading={deletingId === confirmDeleteId} onClick={() => { if (confirmDeleteId) handleDelete(confirmDeleteId) }}>
                Hapus
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Add dialog */}
      <Dialog.Root open={addOpen} onOpenChange={({ open }) => { setAddOpen(open); if (!open) { setAddForm(EMPTY_PRODUCT_FORM); setAddErrors({}); setAddError(null) } }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="480px" mx="16px">
            <Dialog.Header borderBottom="1px solid" borderColor="#CBD5E1" pb="16px">
              <Dialog.Title fontSize="18px" fontWeight="bold" color="#0D1B3E">Tambah Produk Baru</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py="20px">
              <Flex flexDir="column" gap="16px">
                <ProductFormFields form={addForm} errors={addErrors} types={productTypes} onChange={setAddForm} />
                {addError && <Toast type="error" message={addError} />}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#CBD5E1" pt="16px" gap="8px">
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost" h="44px" px="24px" color="#111827" fontSize="15px">Batal</Button>
              </Dialog.ActionTrigger>
              <Button h="44px" px="28px" bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" loading={adding} onClick={handleAdd}>
                Simpan
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit dialog */}
      <Dialog.Root open={!!editTarget} onOpenChange={({ open }) => { if (!open) setEditTarget(null) }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="16px" maxW="480px" mx="16px">
            <Dialog.Header borderBottom="1px solid" borderColor="#CBD5E1" pb="16px">
              <Dialog.Title fontSize="18px" fontWeight="bold" color="#0D1B3E">Ubah Produk</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py="20px">
              <Flex flexDir="column" gap="16px">
                <ProductFormFields form={editForm} errors={editErrors} types={productTypes} onChange={setEditForm} />
                {editError && <Toast type="error" message={editError} />}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#CBD5E1" pt="16px" gap="8px">
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost" h="44px" px="24px" color="#111827" fontSize="15px">Batal</Button>
              </Dialog.ActionTrigger>
              <Button h="44px" px="28px" bg="#0D1B3E" color="white" fontSize="15px" fontWeight="semibold" loading={saving} onClick={handleSaveEdit}>
                Simpan Perubahan
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Two groups: what every new agent needs first, and what can wait.
const SECTION_GROUPS = [
  {
    title: "Mulai dari sini",
    note: "Cukup bagian ini untuk mulai memakai Agentra.",
    items: [
      { value: "profile", label: "Data Diri", hint: "Nama dan nomor telepon", Icon: LuUser,
        help: "Isi nama dan nomor telepon Anda. Nama ini akan tampil di halaman Beranda. Setelah selesai, tekan tombol Simpan." },
      { value: "notifications", label: "Pesan WhatsApp", hint: "Pengingat polis akan habis", Icon: LuBell,
        help: "Agentra bisa mengirim pengingat ke WhatsApp Anda, misalnya daftar polis nasabah yang akan habis. Bagian ini boleh dikosongkan dulu, dan bisa diisi kapan saja." },
      { value: "security", label: "Kata Sandi", hint: "Ganti kata sandi masuk", Icon: LuLock,
        help: "Ganti kata sandi jika perlu. Pakai minimal 8 karakter, berisi huruf dan angka. Jika tidak ingin menggantinya, tidak perlu mengisi apa pun." },
      { value: "subscription", label: "Paket Langganan", hint: "Paket dan pembayaran", Icon: LuCrown,
        help: "Lihat paket yang sedang Anda pakai dan berapa polis yang sudah tercatat. Anda bisa pindah ke paket lain kapan saja." },
    ],
  },
  {
    title: "Pengaturan lanjutan",
    note: "Boleh dilewati dulu. Isi nanti jika sudah terbiasa.",
    items: [
      { value: "insurers", label: "Perusahaan Asuransi", hint: "Tempat Anda menjual polis", Icon: LuBuilding2,
        help: "Daftar perusahaan asuransi tempat Anda menjual polis. Cukup ditambahkan satu kali, lalu tinggal dipilih saat Anda mencatat polis baru." },
      { value: "products", label: "Produk & Komisi", hint: "Jenis asuransi dan persen komisi", Icon: LuPackage,
        help: "Daftar produk asuransi yang Anda jual dan persen komisinya. Saat mencatat polis baru, komisi akan terisi otomatis dari sini." },
      { value: "tariffs", label: "Tarif & Jenis Usaha", hint: "Untuk pengguna berpengalaman", Icon: LuPackage,
        help: "Bagian ini untuk pengguna berpengalaman dan boleh dilewati. Isinya daftar tarif resmi, supaya Agentra memberi peringatan jika tarif polis terlalu rendah atau tinggi." },
    ],
  },
]
const ALL_SECTIONS = SECTION_GROUPS.flatMap((g) => g.items)

// ─── Subscription Tab ─────────────────────────────────────────────────────────

const planTier = (p: { name: string; price_idr: number }) =>
  p.price_idr <= 0 ? 0 : /\b(tim|team)\b/i.test(p.name) ? 2 : 1

function SubscriptionTab() {
  const [sub, setSub] = useState<ApiSubscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const refresh = () => {
    const token = getAccessToken()
    if (!token) return Promise.resolve()
    return getCurrentSubscription(token).then(setSub).catch((err: unknown) => setError(errorMessage(err, "Data langganan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
  }

  useEffect(() => {
    Promise.all([refresh(), getPlans().then(setPlans)]).finally(() => setLoading(false))
  }, [])

  // While a payment is open in another tab, keep checking until the webhook activates the plan.
  const waiting = !!sub?.pending_payment
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [waiting])

  async function pay(serviceId: string) {
    const token = getAccessToken()
    if (!token) return
    setPayingId(serviceId)
    setError(null)
    try {
      await startPlanPayment(token, sub, serviceId)
    } catch (err) {
      setError(errorMessage(err, "Pembayaran belum bisa dibuat"))
      setPayingId(null)
    }
  }

  if (loading) return <Skeleton h="320px" borderRadius="12px" />

  const eff = sub?.effective
  const used = sub?.usage.active_policy_count ?? 0
  const cap = eff?.policy_limit ?? null
  const currentRank = eff ? ({ starter: 0, pro: 1, team: 2 } as const)[eff.tier] : 0

  return (
    <Flex flexDir="column" gap="16px">
      {error && <Toast type="error" message={error} />}

      <Grid templateColumns={TWO_COL} gap="16px" alignItems="start">
      {sub && eff && (
        <Box bg="white" border="1px solid" borderColor="#CBD5E1" borderRadius="12px" p="20px">
          <Flex align="center" gap="8px" mb="4px">
            <LuCrown size={16} color="#1D4ED8" />
            <Text fontSize="15px" fontWeight="bold" color="#0F172A">Paket {eff.plan_name}</Text>
          </Flex>
          {!eff.in_effect ? (
            <Text fontSize="15px" color="#B45309">
              Paket {sub.plan.name} belum dibayar — akun memakai batas Starter sampai pembayaran selesai.
            </Text>
          ) : eff.tier === "starter" ? (
            <Text fontSize="15px" color="#374151">Gratis, tanpa biaya bulanan.</Text>
          ) : (
            <Text fontSize="15px" color="#374151">
              Aktif sampai {new Date(sub.next_billing_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
            </Text>
          )}
          <Flex mt="12px" align="center" gap="12px">
            <Text fontSize="15px" color="#334155">
              Polis aktif: <b>{used}</b>{cap !== null ? ` / ${cap}` : " (tanpa batas)"}
            </Text>
            {cap !== null && (
              <Box flex="1" maxW="240px" h="6px" bg="#CBD5E1" borderRadius="full" overflow="hidden">
                <Box h="100%" w={`${Math.min(100, (used / cap) * 100)}%`} bg={used >= cap ? "#DC2626" : "#1D4ED8"} />
              </Box>
            )}
          </Flex>
          {sub.pending_payment && (
            <Text mt="12px" fontSize="15px" color="#374151">
              Menunggu pembayaran Anda. Halaman ini akan berubah sendiri setelah pembayaran diterima.
            </Text>
          )}
        </Box>
      )}

      <Flex flexDir="column" gap="16px" gridColumn={sub && eff ? undefined : { lg: "1 / -1" }}>
        {plans.map((plan) => {
          const rank = planTier(plan)
          const isCurrent = eff?.in_effect ? plan.plan_id === sub?.plan.plan_id : rank === 0
          const isAwaiting = !eff?.in_effect && plan.plan_id === sub?.plan.plan_id
          const canBuy = rank > 0 && (isAwaiting || rank > currentRank || (rank === currentRank && !isCurrent))
          return (
            <Flex key={plan.plan_id} flexDir="column" bg="white" borderRadius="12px" p="20px" gap="8px"
              border="1px solid" borderColor={isCurrent ? "#1D4ED8" : "#CBD5E1"}>
              <Text fontSize="15px" fontWeight="bold" color="#0F172A">{plan.name}</Text>
              <Text fontSize="15px" color="#374151">{plan.tagline}</Text>
              <Text fontSize="18px" fontWeight="bold" color="#0F172A">
                {formatPlanPrice(plan.price_idr)} <Text as="span" fontSize="15px" fontWeight="normal" color="#475569">{formatBillingCycle(plan.billing_cycle)}</Text>
              </Text>
              <Flex flexDir="column" gap="4px" flex="1" my="4px">
                {plan.features.map((f) => (
                  <Flex key={f.label} gap="6px" align="center">
                    <LuCheck size={13} color="#16A34A" />
                    <Text fontSize="15px" color="#334155">{f.label}</Text>
                  </Flex>
                ))}
              </Flex>
              {isCurrent ? (
                <Button variant="outline" disabled>Paket yang sedang dipakai</Button>
              ) : canBuy ? (
                <Button bg="#0D1B3E" color="white" _hover={{ bg: "#1a2f5c" }}
                  disabled={payingId !== null} onClick={() => pay(plan.plan_id)}>
                  {payingId === plan.plan_id ? "Mohon tunggu…" : isAwaiting ? "Bayar Sekarang" : "Pindah ke Paket Ini"}
                </Button>
              ) : null}
            </Flex>
          )
        })}
      </Flex>
      </Grid>
    </Flex>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser]       = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // ?tab=subscription (from the plan bar / upgrade dialog) opens that tab directly.
  const [tab, setTab] = useState(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab")
    return ALL_SECTIONS.some((x) => x.value === t) ? (t as string) : "profile"
  })
  const current = ALL_SECTIONS.find((x) => x.value === tab) ?? ALL_SECTIONS[0]

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    // A 401 is handled by lib/api/client (redirect to /login); anything else is shown
    // here instead of logging the user out over e.g. a 500.
    getMyProfile(token)
      .then(setUser)
      .catch((err: unknown) => { if (errorStatus(err) !== 401) setLoadError(errorMessage(err, "Data profil belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
      .finally(() => setLoading(false))
  }, [router])

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Settings" />
        </Box>

        <Flex p={{ base: "16px", md: "32px" }} flexDir="column" gap="24px">
          <Flex flexDir="column" gap="4px" display={{ base: "flex", md: "none" }}>
            <Text color="#1C2833" fontSize="22px" fontWeight="bold">Pengaturan Akun</Text>
            <Text color="#374151" fontSize="15px">Atur data diri, kata sandi, pesan WhatsApp, dan paket langganan Anda</Text>
          </Flex>

          {loading ? (
            <Flex flexDir="column" gap="16px">
              <Skeleton h="44px" w="360px" borderRadius="8px" />
              <Skeleton h="320px" borderRadius="12px" />
            </Flex>
          ) : user ? (
            <Flex flexDir="column" gap="20px" minW={0}>
              {/* Phone: one simple dropdown. Desktop: horizontal tabs above the content. */}
              <Box display={{ base: "block", md: "none" }}>
                <label htmlFor="settings-section" style={{ display: "block", marginBottom: 8, fontSize: 16, fontWeight: 700, color: "#111827" }}>Pilih bagian pengaturan</label>
                <select
                  id="settings-section" value={tab} onChange={(e) => setTab(e.target.value)}
                  style={{ width: "100%", height: 44, fontSize: 15, padding: "0 12px", borderRadius: 10, border: "1px solid #94A3B8", background: "white", color: "#111827" }}
                >
                  {SECTION_GROUPS.map((g) => (
                    <optgroup key={g.title} label={g.title}>
                      {g.items.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Box>
              <Flex
                as="nav" role="tablist" aria-label="Bagian pengaturan" display={{ base: "none", md: "flex" }}
                gap="4px" overflowX="auto" borderBottom="2px solid" borderColor="#CBD5E1"
              >
                {ALL_SECTIONS.map(({ value, label, Icon }) => {
                  const active = tab === value
                  return (
                    <Flex
                      key={value} as="button" role="tab" aria-selected={active} onClick={() => setTab(value)}
                      align="center" gap="8px" px="16px" h="48px" flexShrink={0} whiteSpace="nowrap"
                      fontSize="15px" fontWeight="bold" cursor="pointer" mb="-2px"
                      color={active ? "#0D1B3E" : "#475569"} bg={active ? "white" : "transparent"}
                      borderTopRadius="10px" border="2px solid" borderBottom="none"
                      borderColor={active ? "#CBD5E1" : "transparent"}
                      borderBottomWidth="2px" borderBottomStyle="solid" borderBottomColor={active ? "#0D1B3E" : "transparent"}
                      _hover={{ color: "#0D1B3E", bg: active ? "white" : "#E2E8F0" }}
                      _focusVisible={{ outline: "3px solid #1D4ED8", outlineOffset: "-3px" }}
                    >
                      <Icon size={18} />
                      {label}
                    </Flex>
                  )
                })}
              </Flex>

              <Box bg="#EFF6FF" border="1px solid" borderColor="#93C5FD" borderRadius="12px" p="16px">
                <Text color="#1E3A8A" fontSize="17px" fontWeight="bold">{current.label}</Text>
                <Text color="#1F2937" fontSize="15px" mt="4px" lineHeight="1.5">{current.help}</Text>
              </Box>

              <Box minW={0}>
                {tab === "profile" && <ProfileTab user={user} onUpdate={setUser} />}
                {tab === "security" && <SecurityTab />}
                {tab === "notifications" && <NotificationsTab />}
                {tab === "insurers" && <InsurersTab />}
                {tab === "products" && <MasterProductsTab />}
                {tab === "tariffs" && <TariffsTab />}
                {tab === "subscription" && <SubscriptionTab />}
              </Box>
            </Flex>
          ) : loadError ? (
            <Flex flexDir="column" gap="12px" align="flex-start">
              <Text color="#DC2626" fontSize="15px">{loadError}</Text>
              <Button variant="outline" borderColor="#CBD5E1" onClick={() => window.location.reload()}>
                Coba Lagi
              </Button>
            </Flex>
          ) : null}
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
