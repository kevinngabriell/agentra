"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Avatar, Badge, Box, Button, ButtonGroup, Flex, IconButton, Input,
  NativeSelect, Pagination, Skeleton, Table, Text,
} from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  LuEye, LuPencil, LuFlame, LuCar, LuSettings, LuHospital, LuPlus,
  LuChevronLeft, LuChevronRight, LuFileStack, LuTrendingUp, LuTriangleAlert, LuSearch, LuX,
  LuShip, LuPlane,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { getPolicies, type ApiPolicy, type ApiProductType, type ApiRenewalStatus } from "@/lib/api/policies"

const PAGE_SIZE = 10
const SKELETON_ROWS = 6

const PRODUCT_LABELS: Record<ApiProductType, string> = {
  fire:        "Asuransi Kebakaran",
  motorcycle:  "Asuransi Motor",
  car:         "Asuransi Kendaraan",
  travel:      "Asuransi Perjalanan",
  cargo:       "Asuransi Kargo",
  other:       "Asuransi Lainnya",
  kecelakaan:  "Asuransi Kecelakaan",
  aep:         "AEP",
}

const PRODUCT_ICONS: Record<ApiProductType, React.ElementType> = {
  fire:        LuFlame,
  motorcycle:  LuSettings,
  car:         LuCar,
  travel:      LuPlane,
  cargo:       LuShip,
  other:       LuHospital,
  kecelakaan:  LuHospital,
  aep:         LuHospital,
}

type PolicyStatus = "Aktif" | "Akan Berakhir" | "Sudah Berakhir"

const STATUS_CFG: Record<PolicyStatus, { bg: string; color: string }> = {
  "Aktif":          { bg: "#DCFCE7", color: "#16A34A" },
  "Akan Berakhir":  { bg: "#FEF3C7", color: "#D97706" },
  "Sudah Berakhir": { bg: "#FEE2E2", color: "#DC2626" },
}

function getPolicyStatus(p: ApiPolicy): PolicyStatus {
  if (p.renewal_status === "lapsed" || p.renewal_status === "cancelled") return "Sudah Berakhir"
  const daysLeft = Math.ceil((new Date(p.coverage_end).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return "Sudah Berakhir"
  if (daysLeft <= 30 && p.renewal_status === "pending") return "Akan Berakhir"
  return "Aktif"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function fmt(n: number | string) {
  return "Rp " + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function getInsurerColor(name: string | undefined | null): string {
  if (!name) return "#64748B"
  const colors = ["#0369A1", "#047857", "#1D4ED8", "#7C3AED", "#B45309", "#BE123C"]
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getInitials(name: string | undefined | null) {
  if (!name) return "??"
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const avatarColors = ["#1D4ED8", "#047857", "#B45309", "#7C3AED", "#BE123C", "#0369A1"]
function getAvatarColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

const colHdr = { color: "#64748B", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", px: "20px", py: "12px" }

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <Table.Row key={i} borderBottom="1px solid" borderColor="#F1F5F9">
          <Table.Cell px="20px" py="14px">
            <Flex flexDir="column" gap="6px">
              <Skeleton h="13px" w="140px" borderRadius="4px" />
              <Skeleton h="11px" w="80px" borderRadius="4px" />
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex align="center" gap="10px">
              <Skeleton w="34px" h="34px" borderRadius="full" />
              <Flex flexDir="column" gap="6px">
                <Skeleton h="13px" w="130px" borderRadius="4px" />
                <Skeleton h="11px" w="90px" borderRadius="4px" />
              </Flex>
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex flexDir="column" gap="6px">
              <Skeleton h="13px" w="120px" borderRadius="4px" />
              <Skeleton h="18px" w="60px" borderRadius="4px" />
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px"><Skeleton h="13px" w="100px" borderRadius="4px" /></Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex flexDir="column" gap="6px">
              <Skeleton h="12px" w="80px" borderRadius="4px" />
              <Skeleton h="12px" w="80px" borderRadius="4px" />
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px"><Skeleton h="22px" w="88px" borderRadius="full" /></Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex gap="4px"><Skeleton w="28px" h="28px" borderRadius="6px" /><Skeleton w="28px" h="28px" borderRadius="6px" /></Flex>
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  )
}

export default function Policies() {
  const router = useRouter()

  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const [debouncedSearch, setDS] = useState("")
  const [productFilter, setProductFilter]   = useState<ApiProductType | "">("")
  const [statusFilter, setStatusFilter]     = useState<ApiRenewalStatus | "">("")

  const [policies, setPolicies] = useState<ApiPolicy[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDS(search); setPage(1) }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => { setPage(1) }, [productFilter, statusFilter])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    setLoading(true)
    setError(null)

    getPolicies(token, {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      product_type: productFilter || undefined,
      renewal_status: statusFilter || undefined,
    })
      .then((res) => {
        setPolicies(res.data ?? [])
        setTotal(res.pagination?.total ?? 0)
      })
      .catch((err) => {
        setError(err.message ?? "Gagal memuat data polis")
        setPolicies([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, productFilter, statusFilter, retryKey])

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)
  const isEmpty = !loading && !error && policies.length === 0

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "200px" }} paddingY={{ base: "56px", md: 0 }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Policies" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">

          {/* Filter + search bar */}
          <Flex gap="12px" align="flex-end" flexWrap="wrap">
            {/* Search */}
            <Flex flexDir="column" gap="4px" flex="1" minW="200px">
              <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Cari</Text>
              <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px">
                <LuSearch size={14} color="#94A3B8" />
                <Input
                  border="0" fontSize="13px" color="#1C2833" placeholder="No. polis atau nama nasabah..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  style={{ background: "transparent" }}
                />
                {search && (
                  <IconButton size="xs" variant="ghost" aria-label="clear" color="#94A3B8" onClick={() => setSearch("")}>
                    <LuX size={12} />
                  </IconButton>
                )}
              </Flex>
            </Flex>

            {/* Product type */}
            <Flex flexDir="column" gap="4px" minW="160px">
              <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Jenis Produk</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" fontSize="13px"
                  value={productFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProductFilter(e.target.value as ApiProductType | "")}
                >
                  <option value="">Semua Produk</option>
                  {(Object.keys(PRODUCT_LABELS) as ApiProductType[]).map((k) => (
                    <option key={k} value={k}>{PRODUCT_LABELS[k]}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Flex>

            {/* Renewal status */}
            <Flex flexDir="column" gap="4px" minW="160px">
              <Text fontSize="12px" color="#5D6D7E" fontWeight="medium">Status Renewal</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" fontSize="13px"
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as ApiRenewalStatus | "")}
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="renewed">Diperbarui</option>
                  <option value="lapsed">Lapse</option>
                  <option value="cancelled">Dibatalkan</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Flex>

            <Button
              bg="#1A3557" color="white" fontSize="13px" fontWeight="semibold" borderRadius="8px"
              gap="6px" px="16px" ml="auto"
              onClick={() => router.push("/agentra/policies/new")}
            >
              <LuPlus size={14} /> Tambah Polis Baru
            </Button>
          </Flex>

          {/* Stats */}
          <Flex gap="16px" flexWrap="wrap">
            {[
              { Icon: LuFileStack,    label: "Total Polis",          value: loading ? "—" : total.toLocaleString(),      iconBg: "#EFF6FF", iconColor: "#1D4ED8" },
              { Icon: LuTriangleAlert, label: "Hasil Pencarian",     value: loading ? "—" : total.toLocaleString(),      iconBg: "#FFF7ED", iconColor: "#F97316" },
              { Icon: LuTrendingUp,  label: "Filter Aktif",          value: [productFilter, statusFilter].filter(Boolean).length > 0 ? "Ya" : "Tidak", iconBg: "#F0FDF4", iconColor: "#16A34A" },
            ].map(({ Icon, label, value, iconBg, iconColor }) => (
              <Box key={label} flex="1" minW="160px" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
                <Flex justify="space-between" align="flex-start" mb="12px">
                  <Box p="10px" bg={iconBg} borderRadius="10px" color={iconColor}><Icon size={20} /></Box>
                </Flex>
                <Text color="#5D6D7E" fontSize="12px" mb="4px">{label}</Text>
                <Text color="#1C2833" fontSize="24px" fontWeight="bold">{value}</Text>
              </Box>
            ))}
          </Flex>

          {/* Table */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {isEmpty ? (
              <Flex flexDir="column" align="center" gap="8px" py="64px" px="24px">
                <Text color="#1C2833" fontWeight="semibold" fontSize="18px">Tidak ada polis ditemukan</Text>
                <Text color="#5D6D7E" fontSize="14px" textAlign="center" maxW="360px">
                  Coba ubah filter atau tambahkan polis baru
                </Text>
                <Button mt="8px" bg="#001F40" color="white" gap="8px" onClick={() => router.push("/agentra/policies/new")}>
                  <LuPlus /> Tambah Polis Baru
                </Button>
              </Flex>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row bg="#F8FAFC">
                    {["NO. POLIS", "NASABAH", "PRODUK & INSURER", "PREMI (IDR)", "PERIODE", "STATUS", "AKSI"].map((h) => (
                      <Table.ColumnHeader key={h} {...colHdr}>{h}</Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading && <TableSkeleton />}

                  {!loading && error && (
                    <Table.Row>
                      <Table.Cell colSpan={7} px="20px" py="40px" textAlign="center">
                        <Flex flexDir="column" align="center" gap="10px">
                          <Text color="#DC2626" fontSize="14px">{error}</Text>
                          <Button size="sm" variant="outline" borderColor="#E2E8F0" onClick={() => setRetryKey((k) => k + 1)}>
                            Coba Lagi
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  )}

                  {!loading && !error && policies.map((p) => {
                    const ProductIcon = PRODUCT_ICONS[p.product_type] ?? LuSettings
                    const insurerColor = getInsurerColor(p.insurer_name)
                    const status = getPolicyStatus(p)
                    const endExpired = new Date(p.coverage_end) < new Date()

                    return (
                      <Table.Row
                        key={p.policy_id}
                        borderBottom="1px solid" borderColor="#F1F5F9"
                        _hover={{ bg: "#F8FAFC" }} transition="background 0.15s"
                      >
                        {/* No. Polis */}
                        <Table.Cell px="20px" py="14px">
                          <Text color="#1C2833" fontSize="13px" fontWeight="semibold" fontFamily="mono">{p.policy_number}</Text>
                          <Text color="#94A3B8" fontSize="11px">Tahun ke-{p.policy_year ?? 1}</Text>
                        </Table.Cell>

                        {/* Nasabah */}
                        <Table.Cell px="20px" py="14px"
                          cursor="pointer"
                          onClick={() => router.push(`/agentra/policies/${p.policy_id}`)}
                        >
                          <Flex align="center" gap="8px">
                            <Avatar.Root w="34px" h="34px" bg={getAvatarColor(p.customer_id)} borderRadius="full">
                              <Avatar.Fallback color="white" fontSize="11px" fontWeight="bold">
                                {getInitials(p.customer_name)}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <Flex flexDir="column" gap="2px">
                              <Text color="#3B82F6" fontSize="13px" fontWeight="semibold">{p.customer_name}</Text>
                              {p.object_insured && (
                                <Text color="#94A3B8" fontSize="11px">{p.object_insured}</Text>
                              )}
                            </Flex>
                          </Flex>
                        </Table.Cell>

                        {/* Produk & Insurer */}
                        <Table.Cell px="20px" py="14px">
                          <Flex align="center" gap="6px" mb="4px">
                            <Box color="#64748B"><ProductIcon size={14} /></Box>
                            <Text color="#1C2833" fontSize="13px">{PRODUCT_LABELS[p.product_type]}</Text>
                          </Flex>
                          <Badge px="6px" py="1px" borderRadius="4px" fontSize="10px" fontWeight="bold"
                            bg={insurerColor + "20"} color={insurerColor}>
                            {p.insurer_short_name ?? p.insurer_name}
                          </Badge>
                        </Table.Cell>

                        {/* Premi */}
                        <Table.Cell px="20px" py="14px">
                          <Text color="#1C2833" fontSize="13px" fontWeight="semibold">{fmt(p.premium_amount)}</Text>
                        </Table.Cell>

                        {/* Periode */}
                        <Table.Cell px="20px" py="14px">
                          <Text color="#64748B" fontSize="12px">{formatDate(p.coverage_start)}</Text>
                          <Text color={endExpired ? "#DC2626" : "#64748B"} fontSize="12px">
                            s/d {formatDate(p.coverage_end)}
                          </Text>
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell px="20px" py="14px">
                          <Badge px="10px" py="3px" borderRadius="full" fontSize="11px" fontWeight="medium"
                            bg={STATUS_CFG[status].bg} color={STATUS_CFG[status].color}>
                            {status.toUpperCase()}
                          </Badge>
                        </Table.Cell>

                        {/* Aksi */}
                        <Table.Cell px="20px" py="14px">
                          <Flex gap="4px">
                            <IconButton size="sm" variant="ghost" aria-label="detail" color="#3B82F6" _hover={{ bg: "#EFF6FF" }}
                              onClick={() => router.push(`/agentra/policies/${p.policy_id}`)}>
                              <LuEye size={14} />
                            </IconButton>
                            <IconButton size="sm" variant="ghost" aria-label="edit" color="#64748B" _hover={{ bg: "#F1F5F9", color: "#1A3557" }}>
                              <LuPencil size={14} />
                            </IconButton>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            )}

            {/* Pagination */}
            {!loading && !error && policies.length > 0 && (
              <Flex px="20px" py="14px" justify="space-between" align="center" borderTop="1px solid" borderColor="#E2E8F0">
                <Text color="#64748B" fontSize="13px">Menampilkan {start}–{end} dari {total.toLocaleString()} Polis</Text>
                <Pagination.Root count={total} pageSize={PAGE_SIZE} page={page} onPageChange={(e) => setPage(e.page)}>
                  <ButtonGroup variant="ghost" size="sm" gap="2px">
                    <Pagination.PrevTrigger asChild>
                      <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" px="12px" _hover={{ bg: "#F1F5F9" }}>
                        <LuChevronLeft size={14} /> Sebelumnya
                      </Button>
                    </Pagination.PrevTrigger>
                    <Pagination.Items render={(item) => (
                      <Pagination.Item key={item.value} type="page" value={item.value} asChild>
                        <Button w="32px" h="32px" minW="32px" p="0" borderRadius="6px" border="1px solid"
                          borderColor={item.value === page ? "#1A3557" : "#E2E8F0"}
                          bg={item.value === page ? "#1A3557" : "white"}
                          color={item.value === page ? "white" : "#374151"}
                          fontSize="13px" _hover={{ bg: item.value === page ? "#162C47" : "#F1F5F9" }}>
                          {item.value}
                        </Button>
                      </Pagination.Item>
                    )} ellipsis={<Flex w="32px" h="32px" align="center" justify="center" color="#64748B">…</Flex>} />
                    <Pagination.NextTrigger asChild>
                      <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="13px" px="12px" _hover={{ bg: "#F1F5F9" }}>
                        Selanjutnya <LuChevronRight size={14} />
                      </Button>
                    </Pagination.NextTrigger>
                  </ButtonGroup>
                </Pagination.Root>
              </Flex>
            )}
          </Box>
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}
