"use client"

import { MobileBottomNav, MobileHeader, Sidebar, TopBar } from "@/components/layout";
import { getAccessToken } from "@/lib/auth/session";
import { getCustomers, deleteCustomer, exportCustomers, type ApiCustomer, type ApiCustomerStatus, type ApiCustomerType } from "@/lib/api/customers";
import { ApiError, errorMessage, errorStatus, saveBlob } from "@/lib/api/client";
import { getInitials } from "@/lib/format";
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Dialog,
  Flex,
  IconButton,
  Input,
  Pagination,
  Popover,
  Skeleton,
  Table,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaEye, FaFilter, FaPlus, FaUserPlus } from "react-icons/fa";
import { LuChevronLeft, LuChevronRight, LuSearch, LuTrash2, LuUpload, LuX } from "react-icons/lu";
import { TbFileExport } from "react-icons/tb";

const PAGE_SIZE = 10
const SKELETON_ROWS = 6

const STATUS_LABELS: Record<ApiCustomerStatus, string> = {
  active:   "Aktif",
  inactive: "Tidak Aktif",
  lapsed:   "Lapse",
}

const STATUS_CONFIG: Record<ApiCustomerStatus, { bg: string; color: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A" },
  inactive: { bg: "#FEF9C3", color: "#CA8A04" },
  lapsed:   { bg: "#FEE2E2", color: "#DC2626" },
}

const TYPE_CONFIG: Record<ApiCustomerType, { bg: string; color: string; label: string }> = {
  individual: { bg: "#E5EFF5", color: "#006397", label: "Individu" },
  company:    { bg: "#F3E8FF", color: "#7E22CE", label: "Korporat" },
}

const avatarColors = ["#1D4ED8", "#047857", "#B45309", "#7C3AED", "#BE123C", "#0369A1"]

function getAvatarColor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

function maskId(value: string | null | undefined): string {
  if (!value || value === "—" || value.length <= 8) return value ?? "—"
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

function maskPhone(value: string | null | undefined): string {
  if (!value || value === "—") return "—"
  if (value.length <= 4) return value
  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

function maskEmail(value: string | null | undefined): string {
  if (!value || value === "—") return "—"
  const at = value.indexOf("@")
  if (at <= 1) return value
  return `${value.slice(0, 1)}***${value.slice(at)}`
}

function getNik(c: ApiCustomer): string {
  return maskId(c.nik ?? c.npwp_company ?? c.npwp_personal ?? "—")
}

function getPic(c: ApiCustomer): string {
  if (c.customer_type === "company") return c.pic_name ?? "—"
  return maskPhone(c.personal_phone ?? c.personal_whatsapp ?? "—")
}

function getPicSub(c: ApiCustomer): string {
  if (c.customer_type === "company") return c.pic_role ?? maskPhone(c.pic_phone)
  return maskEmail(c.personal_email)
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <Table.Row key={i} bg="white" borderBottom="1px solid" borderColor="#F1F5F9">
          <Table.Cell px="20px" py="14px">
            <Flex align="center" gap="12px">
              <Skeleton w="36px" h="36px" borderRadius="full" flexShrink={0} />
              <Flex flexDir="column" gap="7px">
                <Skeleton h="13px" w="130px" borderRadius="4px" />
                <Skeleton h="10px" w="58px" borderRadius="4px" />
              </Flex>
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Skeleton h="12px" w="150px" borderRadius="4px" />
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex flexDir="column" gap="7px">
              <Skeleton h="13px" w="110px" borderRadius="4px" />
              <Skeleton h="11px" w="85px" borderRadius="4px" />
            </Flex>
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Skeleton h="22px" w="56px" borderRadius="full" />
          </Table.Cell>
          <Table.Cell px="20px" py="14px">
            <Flex justify="end" gap="6px">
              <Skeleton w="30px" h="30px" borderRadius="6px" />
              <Skeleton w="30px" h="30px" borderRadius="6px" />
            </Flex>
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  )
}

export default function Customer() {
  const router = useRouter()

  const [page, setPage]                     = useState(1)
  const [query, setQuery]                   = useState("")
  const [debouncedQuery, setDQ]             = useState("")
  const [filterType, setFilterType]         = useState<ApiCustomerType | "">("")
  const [filterStatus, setFilterStatus]     = useState<ApiCustomerStatus | "">("")
  const [pendingType, setPendingType]       = useState<ApiCustomerType | "">("")
  const [pendingStatus, setPendingStatus]   = useState<ApiCustomerStatus | "">("")

  // Result of the last list request, tagged with the query it answered: `loading` is
  // derived from it, so a slow response for an old query can never overwrite a newer one.
  const [result, setResult] = useState<{ key: string; customers: ApiCustomer[]; total: number; error: string | null } | null>(null)
  const [retryKey, setRetryKey]           = useState(0)
  const [customerToDelete, setCustomerToDelete] = useState<ApiCustomer | null>(null)
  const [deleting, setDeleting]                 = useState(false)
  const [deleteErrorMsg, setDeleteErrorMsg]     = useState<string>("")
  const [exporting, setExporting]               = useState(false)
  const [exportErrorMsg, setExportErrorMsg]     = useState<string>("")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDQ(query)
      setPage(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const queryKey = [debouncedQuery, filterType, filterStatus, page, retryKey].join("|")

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }

    const key = [debouncedQuery, filterType, filterStatus, page, retryKey].join("|")
    const controller = new AbortController()

    getCustomers(token, {
      params: debouncedQuery || undefined,
      customer_type: filterType || undefined,
      status: filterStatus || undefined,
      page,
      limit: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((res) => {
        setResult({ key, customers: res.data ?? [], total: res.pagination?.total ?? 0, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || errorStatus(err) === 401) return
        setResult({ key, customers: [], total: 0, error: errorMessage(err, "Data nasabah belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => controller.abort()
  }, [debouncedQuery, filterType, filterStatus, page, retryKey, router])

  const loading   = result?.key !== queryKey
  const customers = result?.customers ?? []
  const total     = result?.total ?? 0
  const error     = loading ? null : result?.error ?? null

  async function handleDelete() {
    if (!customerToDelete) return
    const token = getAccessToken()
    if (!token) return
    setDeleting(true)
    setDeleteErrorMsg("")
    try {
      await deleteCustomer(token, customerToDelete.customer_id)
      setCustomerToDelete(null)
      // Reload so pagination stays correct (e.g. deleting the last row of a page).
      if (customers.length === 1 && page > 1) setPage(page - 1)
      else setRetryKey((k) => k + 1)
    } catch (err: unknown) {
      const raw: string = (err instanceof ApiError ? err.detail : undefined) ?? errorMessage(err, "")
      const friendly = raw.toLowerCase().includes("foreign key")
        ? "Nasabah tidak dapat dihapus karena masih memiliki polis atau data terkait. Hapus polis nasabah terlebih dahulu."
        : raw || "Gagal menghapus nasabah. Coba lagi."
      setDeleteErrorMsg(friendly)
    } finally {
      setDeleting(false)
    }
  }

  async function handleExport() {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setExporting(true)
    setExportErrorMsg("")
    try {
      const { blob, filename } = await exportCustomers(token, {
        params: debouncedQuery || undefined,
        customer_type: filterType || undefined,
        status: filterStatus || undefined,
      })
      saveBlob(blob, filename)
    } catch (err: unknown) {
      setExportErrorMsg(errorStatus(err) === 404 ? "Tidak ada nasabah yang cocok untuk diekspor" : errorMessage(err, "Gagal mengekspor data nasabah"))
    } finally {
      setExporting(false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)
  const hasActiveFilter = filterType !== "" || filterStatus !== ""
  const isEmpty = !loading && !error && customers.length === 0

  function applyFilter() {
    setFilterType(pendingType)
    setFilterStatus(pendingStatus)
    setPage(1)
  }

  function resetFilter() {
    setPendingType("")
    setPendingStatus("")
    setFilterType("")
    setFilterStatus("")
    setPage(1)
  }

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Customer" />
        </Box>

        <Flex p={{ base: "16px", md: "24px" }} gap="24px" flexDir="column">
          {/* Heading */}
          <Flex gap="4px" flexDir="column">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Cari Nasabah</Text>
            <Text color="#5D6D7E" fontSize="16px">Cari data nasabah atau entitas bisnis di seluruh database agensi</Text>
          </Flex>

          {/* Search bar */}
          <Flex align="center" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" px="14px" py="5px">
            <LuSearch size={16} color="#64748B" />
            <Input
              outline="none" border="none" fontSize="16px" color="#1C2833"
              placeholder="Cari Nama, NIK, NPWP, atau PIC..."
              aria-label="Cari nasabah"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              style={{ background: "transparent" }}
            />
            {query && (
              <IconButton
                size="xs" variant="ghost" aria-label="Hapus pencarian"
                color="#64748B" _hover={{ color: "#374151" }}
                onClick={() => setQuery("")}
              >
                <LuX size={14} />
              </IconButton>
            )}
          </Flex>

          {/* Table card */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">

            {/* Toolbar */}
            <Flex
              px="20px" py="14px"
              justify="space-between" align="center"
              borderBottom="1px solid" borderColor="#E2E8F0"
              flexWrap="wrap" gap="10px"
            >
              <Flex align="baseline" gap="6px">
                <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Hasil Pencarian</Text>
                {!loading && (
                  <Text color="#5D6D7E" fontSize="15px">({total} ditemukan)</Text>
                )}
              </Flex>

              <Flex gap="8px" align="center" flexWrap="wrap" w={{ base: "100%", md: "auto" }}>
                {/* Filter */}
                <Popover.Root onOpenChange={(d) => { if (d.open) { setPendingType(filterType); setPendingStatus(filterStatus) } }}>
                  <Popover.Trigger asChild>
                    <Button
                      size="sm" variant="outline"
                      borderColor={hasActiveFilter ? "#1D4ED8" : "#E2E8F0"}
                      color={hasActiveFilter ? "#1D4ED8" : "#374151"}
                      bg={hasActiveFilter ? "#EFF6FF" : "white"}
                      fontWeight="medium" fontSize="15px" gap="6px"
                    >
                      <FaFilter size={12} />
                      Filter
                      {hasActiveFilter && (
                        <Badge ml="2px" px="5px" py="0" borderRadius="full" fontSize="14px" bg="#1D4ED8" color="white">
                          {[filterType, filterStatus].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Positioner>
                    <Popover.Content p="16px" w="240px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="12px" shadow="lg">
                      <Flex flexDir="column" gap="14px">

                        {/* Type */}
                        <Flex flexDir="column" gap="8px">
                          <Text fontSize="14px" fontWeight="bold" color="#64748B" letterSpacing="0.06em">TIPE NASABAH</Text>
                          <Flex gap="6px" flexWrap="wrap">
                            {(["individual", "company"] as ApiCustomerType[]).map((t) => (
                              <Box
                                key={t} as="button" aria-pressed={pendingType === t} px="10px" py="4px" borderRadius="full" fontSize="14px"
                                border="1px solid" cursor="pointer"
                                borderColor={pendingType === t ? "#1D4ED8" : "#E2E8F0"}
                                bg={pendingType === t ? "#EFF6FF" : "white"}
                                color={pendingType === t ? "#1D4ED8" : "#374151"}
                                fontWeight={pendingType === t ? "semibold" : "normal"}
                                onClick={() => setPendingType(pendingType === t ? "" : t)}
                              >
                                {TYPE_CONFIG[t].label}
                              </Box>
                            ))}
                          </Flex>
                        </Flex>

                        {/* Status */}
                        <Flex flexDir="column" gap="8px">
                          <Text fontSize="14px" fontWeight="bold" color="#64748B" letterSpacing="0.06em">STATUS</Text>
                          <Flex gap="6px" flexWrap="wrap">
                            {(["active", "inactive", "lapsed"] as ApiCustomerStatus[]).map((s) => (
                              <Box
                                key={s} as="button" aria-pressed={pendingStatus === s} px="10px" py="4px" borderRadius="full" fontSize="14px"
                                border="1px solid" cursor="pointer"
                                borderColor={pendingStatus === s ? STATUS_CONFIG[s].color : "#E2E8F0"}
                                bg={pendingStatus === s ? STATUS_CONFIG[s].bg : "white"}
                                color={pendingStatus === s ? STATUS_CONFIG[s].color : "#374151"}
                                fontWeight={pendingStatus === s ? "semibold" : "normal"}
                                onClick={() => setPendingStatus(pendingStatus === s ? "" : s)}
                              >
                                {STATUS_LABELS[s]}
                              </Box>
                            ))}
                          </Flex>
                        </Flex>

                        {/* Actions */}
                        <Flex gap="8px" borderTop="1px solid" borderColor="#F1F5F9" pt="12px">
                          <Button flex="1" size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px" onClick={resetFilter}>
                            Reset
                          </Button>
                          <Popover.CloseTrigger asChild>
                            <Button flex="1" size="sm" bg="#1A3557" color="white" fontSize="14px" onClick={applyFilter}>
                              Terapkan
                            </Button>
                          </Popover.CloseTrigger>
                        </Flex>

                      </Flex>
                    </Popover.Content>
                  </Popover.Positioner>
                </Popover.Root>

                <Button
                  size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontWeight="medium" fontSize="15px" gap="6px"
                  loading={exporting} loadingText="Mengekspor..."
                  onClick={handleExport}
                >
                  <TbFileExport size={14} />
                  Ekspor
                </Button>

                <Button
                  size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontWeight="medium" fontSize="16px" gap="6px"
                  onClick={() => router.push("/agentra/import?type=customers")}
                >
                  <LuUpload size={14} />
                  Impor
                </Button>

                {/* Always-visible create button */}
                <Button
                  size="sm" bg="#001F40" color="white" fontWeight="medium" fontSize="15px" gap="6px"
                  w={{ base: "100%", md: "auto" }}
                  onClick={() => router.push("/agentra/customer/detail")}
                >
                  <FaUserPlus size={13} />
                  Tambah Nasabah
                </Button>
              </Flex>
            </Flex>

            {exportErrorMsg && (
              <Flex px="20px" py="10px" bg="#FEF2F2" borderBottom="1px solid" borderColor="#FECACA">
                <Text fontSize="15px" color="#DC2626">{exportErrorMsg}</Text>
              </Flex>
            )}

            {/* Empty state — inside the card, no table rendered */}
            {isEmpty && (
              <Flex flexDir="column" align="center" gap="8px" py="64px" px="24px">
                <Text color="#1C2833" fontWeight="semibold" fontSize="18px" textAlign="center">
                  Tidak menemukan yang Anda cari?
                </Text>
                <Text color="#5D6D7E" fontSize="16px" pb="16px" textAlign="center" maxW="360px">
                  Pastikan ejaan nama benar atau gunakan nomor identitas (NIK/NPWP) untuk hasil yang lebih akurat
                </Text>
                <Button
                  bg="#001F40" color="white" gap="8px"
                  paddingX="24px" paddingY="10px"
                  onClick={() => router.push("/agentra/customer/detail")}
                  w="max-content"
                >
                  <FaUserPlus />
                  Daftarkan Nasabah Baru
                </Button>
              </Flex>
            )}

            {/* Table — only rendered when loading, error, or has data */}
            {(loading || error || customers.length > 0) && (
            <Table.Root bg="white">
              <Table.Header>
                <Table.Row bg="#F8FAFC">
                  <Table.ColumnHeader color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="12px">NAMA NASABAH</Table.ColumnHeader>
                  <Table.ColumnHeader color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="12px">NIK / NPWP</Table.ColumnHeader>
                  <Table.ColumnHeader color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="12px">PIC / KONTAK</Table.ColumnHeader>
                  <Table.ColumnHeader color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="12px">STATUS</Table.ColumnHeader>
                  <Table.ColumnHeader color="#64748B" fontSize="14px" fontWeight="bold" letterSpacing="0.05em" px="20px" py="12px" textAlign="end">AKSI</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {/* Skeleton rows while loading */}
                {loading && <TableSkeleton />}

                {/* Error row */}
                {!loading && error && (
                  <Table.Row>
                    <Table.Cell colSpan={5} px="20px" py="40px" textAlign="center">
                      <Flex flexDir="column" align="center" gap="10px">
                        <Text color="#DC2626" fontSize="16px">{error}</Text>
                        <Button size="sm" variant="outline" borderColor="#E2E8F0" onClick={() => setRetryKey((k) => k + 1)}>
                          Coba Lagi
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                )}

                {/* Real rows */}
                {!loading && !error && customers.map((c) => (
                  <Table.Row
                    key={c.customer_id}
                    bg="white"
                    borderBottom="1px solid" borderColor="#F1F5F9"
                    _hover={{ bg: "#F8FAFC" }} transition="background 0.15s"
                  >
                    <Table.Cell px="20px" py="14px">
                      <Flex align="center" gap="12px">
                        <Avatar.Root w="36px" h="36px" bg={getAvatarColor(c.customer_id)} borderRadius="full">
                          <Avatar.Fallback color="white" fontSize="14px" fontWeight="bold">
                            {getInitials(c.display_name)}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        <Flex flexDir="column" gap="2px">
                          <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{c.display_name}</Text>
                          <Badge px="6px" py="1px" borderRadius="4px" fontSize="14px" fontWeight="medium" w="max-content" bg={TYPE_CONFIG[c.customer_type].bg} color={TYPE_CONFIG[c.customer_type].color}>
                            {TYPE_CONFIG[c.customer_type].label}
                          </Badge>
                        </Flex>
                      </Flex>
                    </Table.Cell>

                    <Table.Cell px="20px" py="14px" color="#64748B" fontSize="14px" fontFamily="mono">
                      {getNik(c)}
                    </Table.Cell>

                    <Table.Cell px="20px" py="14px">
                      <Text color="#1C2833" fontSize="15px">{getPic(c)}</Text>
                      <Text color="#64748B" fontSize="14px">{getPicSub(c)}</Text>
                    </Table.Cell>

                    <Table.Cell px="20px" py="14px">
                      <Badge px="10px" py="3px" borderRadius="full" fontSize="14px" fontWeight="medium" bg={STATUS_CONFIG[c.status].bg} color={STATUS_CONFIG[c.status].color}>
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell px="20px" py="14px" textAlign="end">
                      <Flex justify="end" gap="6px">
                        <IconButton
                          size="sm" variant="ghost" aria-label="Lihat detail"
                          color="#3B82F6" _hover={{ bg: "#EFF6FF" }}
                          onClick={() => router.push(`/agentra/customer/detail?id=${encodeURIComponent(c.customer_id)}`)}
                        >
                          <FaEye size={14} />
                        </IconButton>
                        <IconButton
                          size="sm" variant="ghost" aria-label="Tambah polis" color="#64748B" _hover={{ bg: "#F1F5F9" }}
                          onClick={() => router.push(`/agentra/policies/new?customer_id=${encodeURIComponent(c.customer_id)}`)}
                        >
                          <FaPlus size={14} />
                        </IconButton>
                        <IconButton
                          size="sm" variant="ghost" aria-label="Hapus nasabah"
                          color="#64748B" _hover={{ bg: "#FEF2F2", color: "#DC2626" }}
                          onClick={() => { setDeleteErrorMsg(""); setCustomerToDelete(c) }}
                        >
                          <LuTrash2 size={14} />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
            )}

            {/* Pagination */}
            {!loading && !error && customers.length > 0 && (
              <Flex px="20px" py="14px" justify="space-between" align="center" borderTop="1px solid" borderColor="#E2E8F0">
                <Text color="#64748B" fontSize="15px">
                  Menampilkan {start}–{end} dari {total} nasabah
                </Text>
                <Pagination.Root count={total} pageSize={PAGE_SIZE} page={page} onPageChange={(e) => setPage(e.page)}>
                  <ButtonGroup variant="ghost" size="sm" gap="2px">
                    <Pagination.PrevTrigger asChild>
                      <IconButton aria-label="Halaman sebelumnya" borderRadius="6px" border="1px solid" borderColor="#E2E8F0" color="#374151" _hover={{ bg: "#F1F5F9" }}>
                        <LuChevronLeft />
                      </IconButton>
                    </Pagination.PrevTrigger>
                    <Pagination.Items
                      ellipsis={<Flex w="32px" h="32px" align="center" justify="center" color="#64748B" fontSize="15px">…</Flex>}
                      render={(item) => (
                        <Pagination.Item key={item.value} type="page" value={item.value} asChild>
                          <Button
                            w="32px" h="32px" minW="32px" p="0" borderRadius="6px" border="1px solid"
                            borderColor={item.value === page ? "#1D4ED8" : "#E2E8F0"}
                            bg={item.value === page ? "#1D4ED8" : "white"}
                            color={item.value === page ? "white" : "#374151"}
                            fontSize="15px" fontWeight={item.value === page ? "semibold" : "normal"}
                            _hover={{ bg: item.value === page ? "#1E40AF" : "#F1F5F9" }}
                          >
                            {item.value}
                          </Button>
                        </Pagination.Item>
                      )}
                    />
                    <Pagination.NextTrigger asChild>
                      <IconButton aria-label="Halaman berikutnya" borderRadius="6px" border="1px solid" borderColor="#E2E8F0" color="#374151" _hover={{ bg: "#F1F5F9" }}>
                        <LuChevronRight />
                      </IconButton>
                    </Pagination.NextTrigger>
                  </ButtonGroup>
                </Pagination.Root>
              </Flex>
            )}
          </Box>

        </Flex>
      </Box>

      <MobileBottomNav />

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={customerToDelete !== null}
        onOpenChange={(d) => { if (!d.open && !deleting) { setCustomerToDelete(null); setDeleteErrorMsg("") } }}
      >
        <Dialog.Backdrop bg="rgba(0,0,0,0.5)" />
        <Dialog.Positioner>
          <Dialog.Content bg="white" borderRadius="12px" p="0" maxW="420px" w="90vw" shadow="xl">
            <Dialog.Header px="24px" pt="24px" pb="0">
              <Dialog.Title color="#1C2833" fontSize="18px" fontWeight="bold">
                Hapus Nasabah
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body px="24px" py="16px">
              <Text color="#5D6D7E" fontSize="16px" lineHeight="1.6">
                Apakah Anda yakin ingin menghapus{" "}
                <Text as="span" color="#1C2833" fontWeight="semibold">
                  {customerToDelete?.display_name}
                </Text>
                ? Tindakan ini tidak dapat dibatalkan.
              </Text>

              {deleteErrorMsg && (
                <Flex
                  mt="14px" bg="#FEF2F2" border="1px solid" borderColor="#FECACA"
                  borderRadius="8px" px="12px" py="10px"
                >
                  <Text fontSize="15px" color="#DC2626" lineHeight="1.5">
                    {deleteErrorMsg}
                  </Text>
                </Flex>
              )}
            </Dialog.Body>

            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
              <Button
                flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151"
                fontSize="16px" borderRadius="8px"
                _hover={{ bg: "#F1F5F9" }}
                disabled={deleting}
                onClick={() => { setCustomerToDelete(null); setDeleteErrorMsg("") }}
              >
                Batal
              </Button>
              <Button
                flex="1" bg="#DC2626" color="white"
                fontSize="16px" borderRadius="8px"
                loading={deleting} loadingText="Menghapus..."
                _hover={{ bg: "#B91C1C" }}
                onClick={handleDelete}
              >
                Ya, Hapus
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
