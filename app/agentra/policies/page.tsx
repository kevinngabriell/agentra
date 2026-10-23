"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Avatar, Badge, Box, Button, ButtonGroup, Checkbox, Dialog, Flex, Grid, IconButton, Input,
  Pagination, Skeleton, Table, Text,
} from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  LuEye, LuPencil, LuFlame, LuCar, LuSettings, LuHospital, LuPlus,
  LuChevronLeft, LuChevronRight, LuFileStack, LuTrendingUp, LuTriangleAlert, LuSearch, LuX,
  LuShip, LuPlane, LuDownload, LuUpload,
} from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage, errorStatus, saveBlob } from "@/lib/api/client"
import { getInitials } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import {
  getPolicies, exportPolicies,
  type ApiPolicy, type ApiProductType, type ApiRenewalStatus,
} from "@/lib/api/policies"

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

const avatarColors = ["#1D4ED8", "#047857", "#B45309", "#7C3AED", "#BE123C", "#0369A1"]
function getAvatarColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

const colHdr = { color: "#64748B", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", px: "20px", py: "12px" }

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

  // Tagged with the query it answers: `loading` is derived and stale responses are ignored.
  const [result, setResult]     = useState<{ key: string; policies: ApiPolicy[]; total: number; error: string | null } | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [exportOpen, setExportOpen]           = useState(false)
  const [exportMonth, setExportMonth]         = useState("")
  const [exportApplyFilters, setExportApplyFilters] = useState(true)
  const [exporting, setExporting]             = useState(false)
  const [exportError, setExportError]         = useState<string | null>(null)

  async function handleExport() {
    const token = getAccessToken()
    if (!token) return
    setExporting(true)
    setExportError(null)
    try {
      const { blob, filename } = await exportPolicies(token, {
        ...(exportMonth ? { month: exportMonth } : {}),
        ...(exportApplyFilters && debouncedSearch ? { search: debouncedSearch } : {}),
        ...(exportApplyFilters && productFilter ? { product_type: productFilter } : {}),
        ...(exportApplyFilters && statusFilter ? { renewal_status: statusFilter } : {}),
      })
      saveBlob(blob, filename)
      setExportOpen(false)
    } catch (err: unknown) {
      setExportError(errorStatus(err) === 404 ? "Tidak ada polis yang cocok untuk diekspor" : errorMessage(err, "Data belum bisa diunduh. Silakan coba lagi, atau hubungi kami lewat tombol Butuh Bantuan."))
    } finally {
      setExporting(false)
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDS(search); setPage(1) }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const queryKey = [page, debouncedSearch, productFilter, statusFilter, retryKey].join("|")

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    const key = [page, debouncedSearch, productFilter, statusFilter, retryKey].join("|")
    const controller = new AbortController()

    getPolicies(token, {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      product_type: productFilter || undefined,
      renewal_status: statusFilter || undefined,
      signal: controller.signal,
    })
      .then((res) => {
        setResult({ key, policies: res.data ?? [], total: res.pagination?.total ?? 0, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || errorStatus(err) === 401) return
        setResult({ key, policies: [], total: 0, error: errorMessage(err, "Data polis belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => controller.abort()
  }, [page, debouncedSearch, productFilter, statusFilter, retryKey, router])

  const loading  = result?.key !== queryKey
  const policies = result?.policies ?? []
  const total    = result?.total ?? 0
  const error    = loading ? null : result?.error ?? null

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)
  const isEmpty = !loading && !error && policies.length === 0

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Policies" />
        </Box>

        <Flex flexDir="column" gap="24px" p={{ base: "16px", md: "32px" }}>

          {/* Filter + search bar */}
          <Flex gap="12px" align={{ base: "stretch", md: "flex-end" }} flexDir={{ base: "column", md: "row" }} flexWrap="wrap">
            {/* Search */}
            <Flex flexDir="column" gap="4px" flex="1" minW={{ base: "0", md: "200px" }}>
              <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">Cari</Text>
              <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px">
                <LuSearch size={14} color="#64748B" />
                <Input
                  border="0" fontSize="15px" color="#1C2833" placeholder="No. polis, nasabah, plat, rangka, atau B/L..."
                  aria-label="Cari polis"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  style={{ background: "transparent" }}
                />
                {search && (
                  <IconButton size="xs" variant="ghost" aria-label="Hapus pencarian" color="#64748B" onClick={() => setSearch("")}>
                    <LuX size={12} />
                  </IconButton>
                )}
              </Flex>
            </Flex>

            {/* Product type */}
            <Flex flexDir="column" gap="4px" minW={{ base: "0", md: "160px" }} w={{ base: "100%", md: "auto" }}>
              <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">Jenis Produk</Text>
              <SearchSelect
                ariaLabel="Jenis Produk"
                value={productFilter}
                onChange={(v) => { setProductFilter(v as ApiProductType | ""); setPage(1) }}
                options={[
                  { value: "", label: "Semua Produk" },
                  ...(Object.keys(PRODUCT_LABELS) as ApiProductType[]).map((k) => ({ value: k, label: PRODUCT_LABELS[k] })),
                ]}
              />
            </Flex>

            {/* Renewal status */}
            <Flex flexDir="column" gap="4px" minW={{ base: "0", md: "160px" }} w={{ base: "100%", md: "auto" }}>
              <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">Status Perpanjangan</Text>
              <SearchSelect
                ariaLabel="Status Perpanjangan"
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as ApiRenewalStatus | ""); setPage(1) }}
                options={[
                  { value: "", label: "Semua Status" },
                  { value: "pending", label: "Pending" },
                  { value: "renewed", label: "Diperbarui" },
                  { value: "lapsed", label: "Lapse" },
                  { value: "cancelled", label: "Dibatalkan" },
                ]}
              />
            </Flex>

            <Flex gap="8px" ml={{ base: 0, md: "auto" }} flexDir={{ base: "column", md: "row" }} w={{ base: "100%", md: "auto" }}>
              <Button
                variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="15px"
                fontWeight="semibold" borderRadius="8px" gap="6px" px="16px"
                onClick={() => { setExportError(null); setExportOpen(true) }}
              >
                <LuDownload size={14} /> Export Excel
              </Button>
              <Button
                variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px"
                fontWeight="semibold" borderRadius="8px" gap="6px" px="16px"
                onClick={() => router.push("/agentra/import?type=policies")}
              >
                <LuUpload size={14} /> Impor Polis
              </Button>
              <Button
                bg="#1A3557" color="white" fontSize="15px" fontWeight="semibold" borderRadius="8px"
                gap="6px" px="16px"
                onClick={() => router.push("/agentra/policies/new")}
              >
                <LuPlus size={14} /> Tambah Polis Baru
              </Button>
            </Flex>
          </Flex>

          {/* Stats */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="16px">
            {[
              { Icon: LuFileStack,    label: "Total Polis",          value: loading ? "—" : total.toLocaleString(),      iconBg: "#EFF6FF", iconColor: "#1D4ED8" },
              { Icon: LuTriangleAlert, label: "Hasil Pencarian",     value: loading ? "—" : total.toLocaleString(),      iconBg: "#FFF7ED", iconColor: "#F97316" },
              { Icon: LuTrendingUp,  label: "Filter Dipakai",          value: [productFilter, statusFilter].filter(Boolean).length > 0 ? "Ya" : "Tidak", iconBg: "#F0FDF4", iconColor: "#16A34A" },
            ].map(({ Icon, label, value, iconBg, iconColor }) => (
              <Box key={label} minW="0" bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
                <Flex justify="space-between" align="flex-start" mb="12px">
                  <Box p="10px" bg={iconBg} borderRadius="10px" color={iconColor}><Icon size={20} /></Box>
                </Flex>
                <Text color="#5D6D7E" fontSize="14px" mb="4px">{label}</Text>
                <Text color="#1C2833" fontSize="24px" fontWeight="bold">{value}</Text>
              </Box>
            ))}
          </Grid>

          {/* Table */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {isEmpty ? (
              <Flex flexDir="column" align="center" gap="8px" py="64px" px="24px">
                <Text color="#1C2833" fontWeight="semibold" fontSize="18px">Polis belum ditemukan</Text>
                <Text color="#5D6D7E" fontSize="16px" textAlign="center" maxW="360px">
                  Coba hapus pilihan filter, atau tekan tombol di bawah untuk mencatat polis baru.
                </Text>
                <Button mt="8px" bg="#001F40" color="white" gap="8px" onClick={() => router.push("/agentra/policies/new")}>
                  <LuPlus /> Tambah Polis Baru
                </Button>
              </Flex>
            ) : (
              <Box overflowX="auto"><Table.Root>
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
                          <Text color="#DC2626" fontSize="16px">{error}</Text>
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
                          <Text color="#1C2833" fontSize="15px" fontWeight="semibold" fontFamily="mono">{p.policy_number}</Text>
                          <Text color="#64748B" fontSize="14px">Tahun ke-{p.policy_year ?? 1}</Text>
                          {(p.plate_number || p.chassis_number || p.bl_awb_number) && (
                            <Text color="#64748B" fontSize="14px" fontFamily="mono">
                              {p.plate_number ?? (p.chassis_number ? `Rangka ${p.chassis_number}` : `B/L ${p.bl_awb_number}`)}
                            </Text>
                          )}
                        </Table.Cell>

                        {/* Nasabah */}
                        <Table.Cell px="20px" py="14px"
                          cursor="pointer"
                          onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.policy_id)}`)}
                        >
                          <Flex align="center" gap="8px">
                            <Avatar.Root w="34px" h="34px" bg={getAvatarColor(p.customer_id)} borderRadius="full">
                              <Avatar.Fallback color="white" fontSize="14px" fontWeight="bold">
                                {getInitials(p.customer_name)}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <Flex flexDir="column" gap="2px">
                              <Text color="#3B82F6" fontSize="15px" fontWeight="semibold">{p.customer_name}</Text>
                              {p.object_insured && (
                                <Text color="#64748B" fontSize="14px">{p.object_insured}</Text>
                              )}
                            </Flex>
                          </Flex>
                        </Table.Cell>

                        {/* Produk & Insurer */}
                        <Table.Cell px="20px" py="14px">
                          <Flex align="center" gap="6px" mb="4px">
                            <Box color="#64748B"><ProductIcon size={14} /></Box>
                            <Text color="#1C2833" fontSize="15px">{PRODUCT_LABELS[p.product_type]}</Text>
                          </Flex>
                          <Badge px="6px" py="1px" borderRadius="4px" fontSize="14px" fontWeight="bold"
                            bg={insurerColor + "20"} color={insurerColor}>
                            {p.insurer_short_name ?? p.insurer_name}
                          </Badge>
                        </Table.Cell>

                        {/* Premi */}
                        <Table.Cell px="20px" py="14px">
                          <Text color="#1C2833" fontSize="15px" fontWeight="semibold">{fmt(p.premium_amount)}</Text>
                        </Table.Cell>

                        {/* Periode */}
                        <Table.Cell px="20px" py="14px">
                          <Text color="#64748B" fontSize="14px">{formatDate(p.coverage_start)}</Text>
                          <Text color={endExpired ? "#DC2626" : "#64748B"} fontSize="14px">
                            s/d {formatDate(p.coverage_end)}
                          </Text>
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell px="20px" py="14px">
                          <Badge px="10px" py="3px" borderRadius="full" fontSize="14px" fontWeight="medium"
                            bg={STATUS_CFG[status].bg} color={STATUS_CFG[status].color}>
                            {status.toUpperCase()}
                          </Badge>
                        </Table.Cell>

                        {/* Aksi */}
                        <Table.Cell px="20px" py="14px">
                          <Flex gap="4px">
                            <IconButton size="sm" variant="ghost" aria-label="Lihat detail polis" color="#3B82F6" _hover={{ bg: "#EFF6FF" }}
                              onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.policy_id)}`)}>
                              <LuEye size={14} />
                            </IconButton>
                            <IconButton size="sm" variant="ghost" aria-label="Ubah polis" color="#64748B" _hover={{ bg: "#F1F5F9", color: "#1A3557" }}
                              onClick={() => router.push(`/agentra/policies/${encodeURIComponent(p.policy_id)}`)}>
                              <LuPencil size={14} />
                            </IconButton>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root></Box>
            )}

            {/* Pagination */}
            {!loading && !error && policies.length > 0 && (
              <Flex px="20px" py="14px" justify="space-between" align="center" borderTop="1px solid" borderColor="#E2E8F0">
                <Text color="#64748B" fontSize="15px">Menampilkan {start}–{end} dari {total.toLocaleString()} Polis</Text>
                <Pagination.Root count={total} pageSize={PAGE_SIZE} page={page} onPageChange={(e) => setPage(e.page)}>
                  <ButtonGroup variant="ghost" size="sm" gap="2px">
                    <Pagination.PrevTrigger asChild>
                      <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="15px" px="12px" _hover={{ bg: "#F1F5F9" }}>
                        <LuChevronLeft size={14} /> Sebelumnya
                      </Button>
                    </Pagination.PrevTrigger>
                    <Pagination.Items render={(item) => (
                      <Pagination.Item key={item.value} type="page" value={item.value} asChild>
                        <Button w="32px" h="32px" minW="32px" p="0" borderRadius="6px" border="1px solid"
                          borderColor={item.value === page ? "#1A3557" : "#E2E8F0"}
                          bg={item.value === page ? "#1A3557" : "white"}
                          color={item.value === page ? "white" : "#374151"}
                          fontSize="15px" _hover={{ bg: item.value === page ? "#162C47" : "#F1F5F9" }}>
                          {item.value}
                        </Button>
                      </Pagination.Item>
                    )} ellipsis={<Flex w="32px" h="32px" align="center" justify="center" color="#64748B">…</Flex>} />
                    <Pagination.NextTrigger asChild>
                      <Button variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="15px" px="12px" _hover={{ bg: "#F1F5F9" }}>
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

      {/* ── Export Dialog ──────────────────────────────────────────────────── */}
      <Dialog.Root
        open={exportOpen}
        onOpenChange={({ open }) => { if (!open) { setExportOpen(false); setExportError(null) } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.45)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="16px" maxW="400px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">
                Export Polis ke Excel
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body px="24px" py="16px">
              <Flex flexDir="column" gap="16px">

                <Flex flexDir="column" gap="4px">
                  <Text fontSize="14px" color="#5D6D7E" fontWeight="medium">
                    Bulan (opsional)
                  </Text>
                  <input
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    style={{
                      fontSize: "15px", color: "#1C2833", border: "1px solid #E2E8F0",
                      borderRadius: "8px", padding: "8px 12px", width: "100%",
                      outline: "none", background: "white",
                    }}
                  />
                  <Text fontSize="14px" color="#64748B">
                    Kosongkan untuk mengekspor semua polis
                  </Text>
                </Flex>

                <Flex align="center" gap="8px">
                  <Checkbox.Root
                    checked={exportApplyFilters}
                    onCheckedChange={({ checked }) => setExportApplyFilters(!!checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control
                      w="16px" h="16px" borderRadius="4px" borderColor="#CBD5E1"
                      bg={exportApplyFilters ? "#1A3557" : "white"}
                    >
                      <Checkbox.Indicator color="white" />
                    </Checkbox.Control>
                    <Checkbox.Label fontSize="15px" color="#374151">
                      Terapkan filter aktif (produk, status)
                    </Checkbox.Label>
                  </Checkbox.Root>
                </Flex>

                {exportError && (
                  <Text fontSize="15px" color="#DC2626">{exportError}</Text>
                )}
              </Flex>
            </Dialog.Body>

            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="15px"
                borderRadius="8px" onClick={() => setExportOpen(false)}
              >
                Batal
              </Button>
              <Button
                bg="#1A3557" color="white" fontSize="15px" fontWeight="semibold"
                borderRadius="8px" gap="6px" loading={exporting}
                onClick={handleExport}
              >
                <LuDownload size={14} /> Download
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
