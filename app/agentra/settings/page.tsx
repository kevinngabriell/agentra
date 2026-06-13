"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Box, Button, Field, Flex, Input, NativeSelect, Skeleton, Switch, Tabs, Text,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuUser, LuLock, LuBell, LuCheck, LuBuilding2, LuChevronDown, LuChevronUp, LuPencil, LuTrash2, LuPlus, LuX, LuCircle } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { getMyProfile, updateProfile, changePassword, updateNotificationSettings, type UserProfile } from "@/lib/api/user"
import {
  getInsurers, createInsurer, updateInsurer, deleteInsurer,
  getInsurerProducts, upsertInsurerProduct,
  type ApiInsurer, type ApiInsurerProduct, type ApiInsurerProductType,
} from "@/lib/api/insurers"

const lbl = { color: "#5D6D7E", fontSize: "12px", fontWeight: "semibold" } as const

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
      <Text fontSize="13px" color={type === "success" ? "#16A34A" : "#DC2626"}>{message}</Text>
    </Flex>
  )
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, onUpdate }: { user: UserProfile; onUpdate: (u: UserProfile) => void }) {
  const [firstName, setFirstName]   = useState(user.first_name ?? "")
  const [phone, setPhone]           = useState(user.phone_number ?? "")
  const [language, setLanguage]     = useState(user.language ?? "id")
  const [saving, setSaving]         = useState(false)
  const [feedback, setFeedback]     = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    setFirstName(user.first_name ?? "")
    setPhone(user.phone_number ?? "")
    setLanguage(user.language ?? "id")
  }, [user])

  async function handleSave() {
    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setFeedback(null)
    try {
      const updated = await updateProfile(token, {
        first_name: firstName || undefined,
        phone_number: phone || undefined,
        language,
      })
      onUpdate(updated)
      setFeedback({ type: "success", msg: "Profil berhasil diperbarui." })
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal memperbarui profil" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Flex flexDir="column" gap="24px">
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
        <Flex borderLeft="4px solid" borderColor="#1A3557" pl="12px" mb="24px">
          <Text color="#1A3557" fontSize="16px" fontWeight="semibold">Informasi Akun</Text>
        </Flex>

        <Flex flexDir="column" gap="16px" maxW="480px">
          <Field.Root>
            <Field.Label {...lbl}>EMAIL</Field.Label>
            <Input value={user.email} disabled bg="#F8FAFC" fontSize="14px" />
            <Field.HelperText fontSize="11px" color="#94A3B8">Email tidak dapat diubah</Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>USERNAME</Field.Label>
            <Input value={user.username} disabled bg="#F8FAFC" fontSize="14px" />
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>NAMA LENGKAP</Field.Label>
            <Input
              value={firstName} placeholder="Nama lengkap Anda"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
              fontSize="14px"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>NO. TELEPON</Field.Label>
            <Input
              value={phone} placeholder="081234567890"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              fontSize="14px"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label {...lbl}>BAHASA</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)} fontSize="14px">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          {feedback && <Toast type={feedback.type} message={feedback.msg} />}

          <Button
            bg="#1A3557" color="white" fontSize="14px" fontWeight="semibold" borderRadius="8px"
            px="24px" w="max-content"
            loading={saving}
            onClick={handleSave}
          >
            Simpan Perubahan
          </Button>
        </Flex>
      </Box>
    </Flex>
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
    if (!newPwd || newPwd.length < 8) {
      setFeedback({ type: "error", msg: "Password baru minimal 8 karakter" })
      return
    }
    if (newPwd !== confirmPwd) {
      setFeedback({ type: "error", msg: "Konfirmasi password tidak cocok" })
      return
    }

    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setFeedback(null)
    try {
      await changePassword(token, currentPwd, newPwd)
      setFeedback({ type: "success", msg: "Password berhasil diubah." })
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal mengubah password" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
      <Flex borderLeft="4px solid" borderColor="#1A3557" pl="12px" mb="24px">
        <Text color="#1A3557" fontSize="16px" fontWeight="semibold">Ubah Password</Text>
      </Flex>

      <Flex flexDir="column" gap="16px" maxW="480px">
        <Field.Root>
          <Field.Label {...lbl}>PASSWORD SAAT INI</Field.Label>
          <Input type="password" value={currentPwd} placeholder="••••••••"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPwd(e.target.value)}
            fontSize="14px" />
        </Field.Root>

        <Field.Root>
          <Field.Label {...lbl}>PASSWORD BARU</Field.Label>
          <Input type="password" value={newPwd} placeholder="Minimal 8 karakter"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPwd(e.target.value)}
            fontSize="14px" />
        </Field.Root>

        <Field.Root>
          <Field.Label {...lbl}>KONFIRMASI PASSWORD BARU</Field.Label>
          <Input type="password" value={confirmPwd} placeholder="Ulangi password baru"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPwd(e.target.value)}
            fontSize="14px" />
        </Field.Root>

        {feedback && <Toast type={feedback.type} message={feedback.msg} />}

        <Button
          bg="#1A3557" color="white" fontSize="14px" fontWeight="semibold" borderRadius="8px"
          px="24px" w="max-content"
          loading={saving}
          onClick={handleChange}
        >
          Ubah Password
        </Button>
      </Flex>
    </Box>
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
  const [saving, setSaving]               = useState(false)
  const [feedback, setFeedback]           = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function handleSave() {
    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setFeedback(null)
    try {
      await updateNotificationSettings(token, {
        whatsapp_target_number: waNumber || undefined,
        daily_digest_enabled: dailyEnabled,
        daily_digest_time: dailyTime,
        daily_days_of_week: dailyDays,
        monthly_digest_enabled: monthlyEnabled,
        monthly_digest_day: monthlyDay,
        monthly_digest_time: monthlyTime,
      })
      setFeedback({ type: "success", msg: "Pengaturan notifikasi berhasil disimpan." })
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal menyimpan pengaturan" })
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

  return (
    <Flex flexDir="column" gap="16px">
      {/* WhatsApp */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
        <Flex borderLeft="4px solid" borderColor="#25D366" pl="12px" mb="20px">
          <Text color="#1C2833" fontSize="16px" fontWeight="semibold">WhatsApp Target</Text>
        </Flex>
        <Field.Root maxW="360px">
          <Field.Label {...lbl}>NOMOR WHATSAPP (dengan kode negara)</Field.Label>
          <Input value={waNumber} placeholder="628123456789"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaNumber(e.target.value)}
            fontSize="14px" />
          <Field.HelperText fontSize="11px" color="#94A3B8">
            Notifikasi digest akan dikirim ke nomor ini
          </Field.HelperText>
        </Field.Root>
      </Box>

      {/* Daily digest */}
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
        <Flex justify="space-between" align="center" mb={dailyEnabled ? "20px" : "0"}>
          <Flex borderLeft="4px solid" borderColor="#1D4ED8" pl="12px">
            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Ringkasan Harian</Text>
          </Flex>
          <Switch.Root
            checked={dailyEnabled}
            onCheckedChange={(e) => setDailyEnabled(e.checked)}
            colorPalette="blue"
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </Flex>

        {dailyEnabled && (
          <Flex flexDir="column" gap="16px">
            <Flex gap="16px" flexWrap="wrap">
              <Field.Root maxW="160px">
                <Field.Label {...lbl}>WAKTU PENGIRIMAN</Field.Label>
                <Input type="time" value={dailyTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyTime(e.target.value)}
                  fontSize="14px" />
              </Field.Root>
            </Flex>

            <Flex flexDir="column" gap="8px">
              <Text {...lbl}>HARI PENGIRIMAN</Text>
              <Flex gap="6px" flexWrap="wrap">
                {DAY_LABELS.map((day, i) => {
                  const num = i + 1
                  const active = activeDays.includes(num)
                  return (
                    <Box
                      key={num} as="button" w="40px" h="40px" borderRadius="full" fontSize="12px"
                      fontWeight={active ? "bold" : "normal"} border="1px solid" cursor="pointer"
                      bg={active ? "#1D4ED8" : "white"}
                      color={active ? "white" : "#374151"}
                      borderColor={active ? "#1D4ED8" : "#E2E8F0"}
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
      <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
        <Flex justify="space-between" align="center" mb={monthlyEnabled ? "20px" : "0"}>
          <Flex borderLeft="4px solid" borderColor="#7C3AED" pl="12px">
            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Ringkasan Bulanan</Text>
          </Flex>
          <Switch.Root
            checked={monthlyEnabled}
            onCheckedChange={(e) => setMonthlyEnabled(e.checked)}
            colorPalette="purple"
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </Flex>

        {monthlyEnabled && (
          <Flex gap="16px" flexWrap="wrap">
            <Field.Root maxW="160px">
              <Field.Label {...lbl}>TANGGAL PENGIRIMAN</Field.Label>
              <Input type="number" min={1} max={28} value={monthlyDay}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyDay(Number(e.target.value))}
                fontSize="14px" />
              <Field.HelperText fontSize="11px" color="#94A3B8">1–28</Field.HelperText>
            </Field.Root>
            <Field.Root maxW="160px">
              <Field.Label {...lbl}>WAKTU PENGIRIMAN</Field.Label>
              <Input type="time" value={monthlyTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyTime(e.target.value)}
                fontSize="14px" />
            </Field.Root>
          </Flex>
        )}
      </Box>

      {feedback && <Toast type={feedback.type} message={feedback.msg} />}

      <Button
        bg="#1A3557" color="white" fontSize="14px" fontWeight="semibold" borderRadius="8px"
        px="24px" w="max-content"
        loading={saving}
        onClick={handleSave}
      >
        Simpan Pengaturan Notifikasi
      </Button>
    </Flex>
  )
}

// ─── Insurers Tab ─────────────────────────────────────────────────────────────

const PRODUCT_TYPES: ApiInsurerProductType[] = ["fire", "motorcycle", "car", "travel", "cargo", "other"]
const PRODUCT_LABELS_INS: Record<ApiInsurerProductType, string> = {
  fire:       "Asuransi Kebakaran",
  motorcycle: "Asuransi Motor",
  car:        "Asuransi Kendaraan",
  travel:     "Asuransi Perjalanan",
  cargo:      "Asuransi Kargo",
  other:      "Asuransi Lainnya",
}

type ProductDraft = { insurer_product_id?: string; product_type: ApiInsurerProductType; commission_rate: string; is_active: boolean }

function ProductConfig({ insurerId, onClose }: { insurerId: string; onClose: () => void }) {
  const [drafts, setDrafts] = useState<ProductDraft[]>(
    PRODUCT_TYPES.map((pt) => ({ product_type: pt, commission_rate: "0", is_active: false }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    getInsurerProducts(token, insurerId)
      .then((products) => {
        const map = new Map(products.map((p) => [p.product_type, p]))
        setDrafts(PRODUCT_TYPES.map((pt) => {
          const ex = map.get(pt)
          return { insurer_product_id: ex?.insurer_product_id, product_type: pt, commission_rate: String(ex?.commission_rate ?? "0"), is_active: ex?.is_active ?? false }
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [insurerId])

  function setDraft(pt: ApiInsurerProductType, field: "commission_rate" | "is_active", value: string | boolean) {
    setDrafts((prev) => prev.map((d) => d.product_type === pt ? { ...d, [field]: value } : d))
  }

  async function save() {
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setFeedback(null)
    try {
      await Promise.all(
        drafts.map((d) => upsertInsurerProduct(token, insurerId, {
          product_type: d.product_type,
          commission_rate: parseFloat(d.commission_rate) || 0,
          is_active: d.is_active,
        }))
      )
      setFeedback({ type: "success", msg: "Konfigurasi produk berhasil disimpan." })
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal menyimpan" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="#F8FAFC" borderRadius="10px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
      <Flex px="16px" py="10px" borderBottom="1px solid" borderColor="#E2E8F0" bg="#F1F5F9" align="center">
        <Text flex="1" color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.05em">PRODUK ASURANSI</Text>
        <Text w="140px" textAlign="center" color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.05em">KOMISI DEFAULT (%)</Text>
        <Text w="72px" textAlign="center" color="#64748B" fontSize="11px" fontWeight="bold" letterSpacing="0.05em">AKTIF</Text>
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
              <Text flex="1" fontSize="13px" color="#1C2833">{PRODUCT_LABELS_INS[d.product_type]}</Text>
              <Input
                w="140px" h="32px" fontSize="13px" textAlign="center" type="number" min={0} max={100} step="0.1"
                bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="6px" px="8px"
                value={d.commission_rate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(d.product_type, "commission_rate", e.target.value)}
              />
              <Flex w="72px" justify="center">
                <Switch.Root checked={d.is_active} onCheckedChange={(e) => setDraft(d.product_type, "is_active", e.checked)} colorPalette="blue" size="sm">
                  <Switch.HiddenInput /><Switch.Control />
                </Switch.Root>
              </Flex>
            </Flex>
          ))
      }

      <Flex px="16px" py="12px" justify="space-between" align="center">
        {feedback
          ? <Toast type={feedback.type} message={feedback.msg} />
          : <Box />
        }
        <Flex gap="8px">
          <Button size="sm" variant="ghost" color="#64748B" fontSize="12px" onClick={onClose}>Tutup</Button>
          <Button size="sm" bg="#1A3557" color="white" fontSize="12px" loading={saving} onClick={save}>
            Simpan Konfigurasi
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

const INSURER_COLORS = ["#0369A1", "#047857", "#1D4ED8", "#7C3AED", "#B45309", "#BE123C"]
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
  const [feedback, setFeedback]   = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getInsurers(token)
      .then((res) => setInsurers(Array.isArray(res) ? res : (res as any)?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const token = getAccessToken()
    if (!token || !addForm.name || !addForm.short_name) {
      setFeedback({ type: "error", msg: "Nama dan kode singkat wajib diisi" })
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
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal menambahkan insurer" })
    } finally {
      setAdding(false)
    }
  }

  function startEdit(ins: ApiInsurer) {
    setEditingId(ins.insurer_id)
    setEditForm({ name: ins.name, short_name: ins.short_name, agent_code: ins.agent_code ?? "", is_primary: ins.is_primary, is_active: ins.is_active, notes: ins.notes ?? "" })
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
        notes: (editForm as any).notes || undefined,
      })
      setInsurers((prev) => prev.map((ins) => ins.insurer_id === insurerId ? { ...ins, ...editForm } as ApiInsurer : ins))
      setEditingId(null)
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal menyimpan" })
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
      await updateInsurer(token, ins.insurer_id, { is_active: next } as any)
    } catch {
      setInsurers((prev) => prev.map((i) => i.insurer_id === ins.insurer_id ? { ...i, is_active: ins.is_active } : i))
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
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message ?? "Gagal menghapus insurer" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Flex flexDir="column" gap="16px">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Flex flexDir="column" gap="2px">
          <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Manajemen Asuransi</Text>
          <Text color="#64748B" fontSize="13px">Kelola perusahaan asuransi dan konfigurasi produk & komisi</Text>
        </Flex>
        <Button
          bg="#1A3557" color="white" fontSize="13px" fontWeight="semibold" gap="6px"
          onClick={() => { setShowAdd(true); setFeedback(null) }}
        >
          <LuPlus size={14} /> Tambah Insurer
        </Button>
      </Flex>

      {feedback && <Toast type={feedback.type} message={feedback.msg} />}

      {/* Add form */}
      {showAdd && (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#3B82F6" p="20px">
          <Flex align="center" gap="8px" mb="16px">
            <Text color="#1D4ED8" fontSize="14px" fontWeight="semibold">Tambah Perusahaan Asuransi Baru</Text>
          </Flex>
          <Flex gap="12px" flexWrap="wrap" mb="12px">
            <Flex flexDir="column" gap="4px" flex="1" minW="180px">
              <Text {...lbl}>NAMA LENGKAP *</Text>
              <Input fontSize="13px" placeholder="PT Asuransi XYZ" value={addForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
            </Flex>
            <Flex flexDir="column" gap="4px" w="140px">
              <Text {...lbl}>KODE SINGKAT *</Text>
              <Input fontSize="13px" placeholder="XYZ" value={addForm.short_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, short_name: e.target.value }))} />
            </Flex>
            <Flex flexDir="column" gap="4px" w="160px">
              <Text {...lbl}>KODE AGEN</Text>
              <Input fontSize="13px" placeholder="AG-001" value={addForm.agent_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm((f) => ({ ...f, agent_code: e.target.value }))} />
            </Flex>
          </Flex>
          <Flex gap="12px" align="center" justify="flex-end">
            <Switch.Root checked={addForm.is_primary} onCheckedChange={(e) => setAddForm((f) => ({ ...f, is_primary: e.checked }))} colorPalette="blue" size="sm">
              <Switch.HiddenInput /><Switch.Control />
              <Text fontSize="12px" color="#374151" ml="6px">Insurer Utama</Text>
            </Switch.Root>
            <Button variant="ghost" color="#64748B" fontSize="13px" onClick={() => setShowAdd(false)}><LuX size={14} /></Button>
            <Button bg="#1A3557" color="white" fontSize="13px" loading={adding} onClick={handleAdd}>Simpan</Button>
          </Flex>
        </Box>
      )}

      {/* Insurer list */}
      {loading
        ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="80px" borderRadius="12px" />)
        : insurers.length === 0
          ? (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="40px" textAlign="center">
              <Text color="#94A3B8" fontSize="14px">Belum ada insurer. Klik "Tambah Insurer" untuk mulai.</Text>
            </Box>
          )
          : insurers.map((ins) => {
            const isEditing  = editingId === ins.insurer_id
            const isExpanded = expandedId === ins.insurer_id
            const color      = insurerColor(ins.name)
            const initials   = ins.short_name.slice(0, 2).toUpperCase()

            return (
              <Box key={ins.insurer_id} bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
                <Flex p="16px" align="center" gap="14px">
                  {/* Avatar */}
                  <Flex w="44px" h="44px" borderRadius="10px" align="center" justify="center" flexShrink={0}
                    bg={color + "18"} color={color}>
                    <Text fontWeight="bold" fontSize="14px">{initials}</Text>
                  </Flex>

                  {/* Info / Edit form */}
                  <Flex flex="1" flexDir="column" gap="6px" minW={0}>
                    {isEditing ? (
                      <Flex gap="8px" flexWrap="wrap">
                        <Input
                          fontSize="13px" fontWeight="semibold" h="32px" flex="1" minW="160px"
                          placeholder="Nama Insurer" value={editForm.name ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <Input
                          fontSize="13px" h="32px" w="100px"
                          placeholder="Singkat" value={editForm.short_name ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, short_name: e.target.value }))}
                        />
                        <Input
                          fontSize="13px" h="32px" w="120px"
                          placeholder="Kode agen" value={editForm.agent_code ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, agent_code: e.target.value }))}
                        />
                      </Flex>
                    ) : (
                      <>
                        <Flex align="center" gap="8px" flexWrap="wrap">
                          <Text color="#1C2833" fontSize="14px" fontWeight="semibold">{ins.name}</Text>
                          <Box px="6px" py="1px" borderRadius="4px" fontSize="10px" fontWeight="bold"
                            bg={color + "18"} color={color}>{ins.short_name}</Box>
                          {ins.is_primary && (
                            <Box px="6px" py="1px" borderRadius="4px" fontSize="10px" fontWeight="bold" bg="#FEF3C7" color="#D97706">UTAMA</Box>
                          )}
                        </Flex>
                        {ins.agent_code && (
                          <Text color="#94A3B8" fontSize="11px">Kode Agen: {ins.agent_code}</Text>
                        )}
                      </>
                    )}
                  </Flex>

                  {/* Controls */}
                  <Flex align="center" gap="10px" flexShrink={0}>
                    {isEditing ? (
                      <>
                        <Switch.Root checked={editForm.is_primary ?? false} onCheckedChange={(e) => setEditForm((f) => ({ ...f, is_primary: e.checked }))} colorPalette="blue" size="sm">
                          <Switch.HiddenInput /><Switch.Control />
                          <Text fontSize="11px" color="#64748B" ml="4px">Utama</Text>
                        </Switch.Root>
                        <Button size="sm" variant="ghost" color="#64748B" onClick={() => setEditingId(null)} px="2">
                          <LuX size={14} />
                        </Button>
                        <Button size="sm" bg="#1A3557" color="white" fontSize="12px" loading={savingId === ins.insurer_id} onClick={() => saveEdit(ins.insurer_id)}>
                          Simpan
                        </Button>
                      </>
                    ) : (
                      <>
                        <Flex align="center" gap="6px">
                          <Text fontSize="11px" color="#94A3B8">{ins.is_active ? "Aktif" : "Nonaktif"}</Text>
                          <Switch.Root checked={ins.is_active} onCheckedChange={() => toggleActive(ins)} colorPalette="blue" size="sm">
                            <Switch.HiddenInput /><Switch.Control />
                          </Switch.Root>
                        </Flex>
                        <Button size="sm" variant="ghost" color="#64748B" gap="4px" fontSize="12px" onClick={() => startEdit(ins)}>
                          <LuPencil size={12} /> Edit
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          color={isExpanded ? "#1D4ED8" : "#64748B"}
                          bg={isExpanded ? "#EFF6FF" : "transparent"}
                          gap="4px" fontSize="12px"
                          onClick={() => setExpandedId(isExpanded ? null : ins.insurer_id)}
                        >
                          {isExpanded ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />} Produk
                        </Button>
                        <Button
                          size="sm" variant="ghost" color="#EF4444" px="2"
                          loading={deletingId === ins.insurer_id}
                          onClick={() => handleDelete(ins.insurer_id)}
                        >
                          <LuTrash2 size={14} />
                        </Button>
                      </>
                    )}
                  </Flex>
                </Flex>

                {/* Product config */}
                {isExpanded && (
                  <Box px="16px" pb="16px" borderTop="1px solid" borderColor="#F1F5F9">
                    <Text color="#1C2833" fontSize="13px" fontWeight="semibold" py="12px">Konfigurasi Produk & Komisi</Text>
                    <ProductConfig insurerId={ins.insurer_id} onClose={() => setExpandedId(null)} />
                  </Box>
                )}
              </Box>
            )
          })
      }
    </Flex>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser]       = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    getMyProfile(token)
      .then(setUser)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Settings" />
        </Box>

        <Flex p="32px" flexDir="column" gap="24px">
          <Flex flexDir="column" gap="4px">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Pengaturan Akun</Text>
            <Text color="#5D6D7E" fontSize="14px">Kelola profil, keamanan, dan preferensi notifikasi Anda</Text>
          </Flex>

          {loading ? (
            <Flex flexDir="column" gap="16px">
              <Skeleton h="48px" w="360px" borderRadius="8px" />
              <Skeleton h="320px" borderRadius="12px" />
            </Flex>
          ) : user ? (
            <Tabs.Root defaultValue="profile" variant="plain">
              <Tabs.List bg="#EDEDF0" borderRadius="10px" p="4px" gap="2px" w="max-content" mb="4px">
                {[
                  { value: "profile",       label: "Profil",      Icon: LuUser },
                  { value: "security",      label: "Keamanan",    Icon: LuLock },
                  { value: "notifications", label: "Notifikasi",  Icon: LuBell },
                  { value: "insurers",      label: "Asuransi",    Icon: LuBuilding2 },
                ].map(({ value, label, Icon }) => (
                  <Tabs.Trigger key={value} value={value}
                    px="20px" py="8px" borderRadius="8px" fontSize="14px"
                    fontWeight="medium" color="#64748B" gap="6px"
                    _selected={{ bg: "white", color: "#0F172A", fontWeight: "bold", shadow: "sm" }}>
                    <Icon size={14} /> {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <Tabs.Content value="profile">
                <ProfileTab user={user} onUpdate={setUser} />
              </Tabs.Content>
              <Tabs.Content value="security">
                <SecurityTab />
              </Tabs.Content>
              <Tabs.Content value="notifications">
                <NotificationsTab />
              </Tabs.Content>
              <Tabs.Content value="insurers">
                <InsurersTab />
              </Tabs.Content>
            </Tabs.Root>
          ) : null}
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
