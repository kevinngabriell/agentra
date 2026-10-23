"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react"
import { Suspense, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LuCircleCheck, LuDownload, LuFileSpreadsheet, LuTriangleAlert, LuUpload } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import {
  downloadImportTemplate, previewImport, runImport,
  type ImportKind, type ImportPreviewResult, type ImportResult,
} from "@/lib/api/imports"
import { errorMessage, saveBlob } from "@/lib/api/client"
import { fmtFileSize, fmtIDR } from "@/lib/format"

const KINDS: { key: ImportKind; label: string; hint: string; next: string; nextLabel: string }[] = [
  {
    key: "customers", label: "Nasabah",
    hint: "Individu (wajib NIK 16 digit) dan perusahaan (wajib nama legal, NPWP, dan data PIC) dalam satu file. NIK/NPWP yang sudah terdaftar akan ditolak.",
    next: "/agentra/customer", nextLabel: "Lihat customer",
  },
  {
    key: "policies", label: "Polis",
    hint: "Customer dicocokkan lewat NIK/NPWP (kolom customer_identifier) atau nama persis; penanggung lewat nama singkat, kode agen, atau nama lengkap. Impor customer terlebih dahulu. Komisi dihitung dari aturan produk jika commission_rate dikosongkan.",
    next: "/agentra/policies", nextLabel: "Lihat polis",
  },
]

const colHeader = {
  color: "#64748B", fontSize: "16px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px",
}

function ImportData() {
  const router = useRouter()
  const initialType = useSearchParams().get("type")
  const fileInput = useRef<HTMLInputElement>(null)
  const [kind, setKind]         = useState<ImportKind>(initialType === "policies" ? "policies" : "customers")
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<ImportPreviewResult | null>(null)
  const [result, setResult]     = useState<ImportResult | null>(null)
  const [busy, setBusy]         = useState<"preview" | "import" | "template" | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const meta = KINDS.find((k) => k.key === kind)!

  function reset(nextKind?: ImportKind) {
    if (nextKind) setKind(nextKind)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  function authed(): string | null {
    const token = getAccessToken()
    if (!token) router.push("/login")
    return token
  }

  async function template(format: "xlsx" | "csv") {
    const token = authed()
    if (!token) return
    setBusy("template")
    setError(null)
    try {
      const { blob, filename } = await downloadImportTemplate(token, kind, format)
      saveBlob(blob, filename)
    } catch (err: unknown) {
      setError(errorMessage(err, "Gagal mengunduh template"))
    } finally {
      setBusy(null)
    }
  }

  async function pick(f: File | null) {
    setPreview(null)
    setResult(null)
    setError(null)
    setFile(f)
    if (!f) return
    const token = authed()
    if (!token) return
    setBusy("preview")
    try {
      setPreview(await previewImport(token, kind, f))
    } catch (err: unknown) {
      setError(errorMessage(err, "Gagal memeriksa file"))
    } finally {
      setBusy(null)
    }
  }

  async function confirm() {
    if (!file) return
    const token = authed()
    if (!token) return
    setBusy("import")
    setError(null)
    try {
      setResult(await runImport(token, kind, file))
      setPreview(null)
    } catch (err: unknown) {
      setError(errorMessage(err, "Pemindahan data gagal"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Box bg="#F4F6F9" minH="100vh">
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Import Data" />
        </Box>

        <Flex flexDir="column" gap="24px" p={{ base: "16px", md: "32px" }} maxW="1100px">

          <Flex flexDir="column" gap="4px">
            <Text color="#1C2833" fontSize="24px" fontWeight="bold">Pindahkan Data dari Excel</Text>
            <Text color="#5D6D7E" fontSize="16px">
              Unggah file CSV atau Excel. File diperiksa baris demi baris sebelum apa pun disimpan.
            </Text>
          </Flex>

          <Flex gap="8px" role="tablist">
            {KINDS.map(({ key, label }) => {
              const active = kind === key
              return (
                <Button key={key} role="tab" aria-selected={active} size="sm" onClick={() => reset(key)}
                  bg={active ? "#1A3557" : "white"} color={active ? "white" : "#374151"}
                  border="1px solid" borderColor={active ? "#1A3557" : "#E2E8F0"} borderRadius="8px" px="16px">
                  {label}
                </Button>
              )
            })}
          </Flex>

          {/* Step 1 + 2 */}
          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
            <Flex flexDir="column" gap="16px">
              <Text color="#5D6D7E" fontSize="16px">{meta.hint}</Text>

              <Flex gap="10px" flexWrap="wrap" align="center">
                <Text fontSize="16px" fontWeight="bold" color="#1C2833">1. Template</Text>
                <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" gap="6px"
                  loading={busy === "template"} onClick={() => template("xlsx")}>
                  <LuDownload size={13} /> Excel (.xlsx)
                </Button>
                <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" gap="6px"
                  loading={busy === "template"} onClick={() => template("csv")}>
                  <LuDownload size={13} /> CSV
                </Button>
              </Flex>

              <Flex gap="10px" flexWrap="wrap" align="center">
                <Text fontSize="16px" fontWeight="bold" color="#1C2833">2. File</Text>
                <input ref={fileInput} type="file" hidden aria-label="Pilih file import"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                <Button size="sm" bg="#1A3557" color="white" gap="6px" loading={busy === "preview"} loadingText="Memeriksa..."
                  disabled={busy === "import"} onClick={() => fileInput.current?.click()}>
                  <LuUpload size={13} /> {file ? "Ganti file" : "Pilih file"}
                </Button>
                {file && (
                  <Flex align="center" gap="6px">
                    <LuFileSpreadsheet size={14} color="#64748B" />
                    <Text fontSize="16px" color="#1C2833">{file.name}</Text>
                    <Text fontSize="16px" color="#64748B">{fmtFileSize(file.size)}</Text>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Box>

          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="16px" role="alert">{error}</Text>
            </Box>
          )}

          {/* Step 3: preview */}
          {preview && (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
              <Flex p="20px" gap="16px" align="center" justify="space-between" flexWrap="wrap" borderBottom="1px solid" borderColor="#E2E8F0">
                <Flex gap="12px" flexWrap="wrap" align="center">
                  <Text fontSize="16px" fontWeight="bold" color="#1C2833">3. Pratinjau</Text>
                  <Badge bg="#DCFCE7" color="#16A34A" borderRadius="full" px="10px" py="2px">{preview.valid_count} baris valid</Badge>
                  <Badge bg={preview.failed_count ? "#FEE2E2" : "#F1F5F9"} color={preview.failed_count ? "#DC2626" : "#64748B"} borderRadius="full" px="10px" py="2px">
                    {preview.failed_count} baris bermasalah
                  </Badge>
                  <Text fontSize="16px" color="#64748B">dari {preview.total} baris</Text>
                </Flex>
                <Button bg="#1A3557" color="white" borderRadius="8px" px="20px" disabled={preview.valid_count === 0}
                  loading={busy === "import"} loadingText="Mengimpor..." onClick={confirm}>
                  Impor {preview.valid_count} baris valid
                </Button>
              </Flex>
              {preview.failed_count > 0 && (
                <Text px="20px" py="10px" fontSize="16px" color="#92400E" bg="#FFFBEB" borderBottom="1px solid" borderColor="#FDE68A">
                  Baris bermasalah dilewati saat impor. Perbaiki di file lalu unggah ulang jika ingin menyertakannya.
                </Text>
              )}

              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row bg="#F8FAFC">
                      {(kind === "customers"
                        ? ["BARIS", "TIPE", "NAMA", "NIK / NPWP", "STATUS"]
                        : ["BARIS", "NO. POLIS", "CUSTOMER", "PENANGGUNG", "PRODUK", "PREMI", "STATUS"]
                      ).map((h) => <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>)}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {preview.preview.map((r) => {
                      const ok = r.errors.length === 0
                      return (
                        <Table.Row key={r.row} bg={ok ? undefined : "#FEF2F2"}>
                          <Table.Cell px="16px" py="8px"><Text fontSize="16px" color="#64748B">{r.row}</Text></Table.Cell>
                          {kind === "customers" ? (
                            <>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.customer_type || "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.display_name || "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px" fontFamily="mono">{r.identifier || "—"}</Text></Table.Cell>
                            </>
                          ) : (
                            <>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px" fontFamily="mono">{r.policy_number || "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.customer_name ?? "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.insurer_name ?? "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.product_type || "—"}</Text></Table.Cell>
                              <Table.Cell px="16px" py="8px"><Text fontSize="16px">{r.premium_amount ? fmtIDR(r.premium_amount) : "—"}</Text></Table.Cell>
                            </>
                          )}
                          <Table.Cell px="16px" py="8px">
                            {ok ? (
                              <Flex align="center" gap="4px" color="#16A34A"><LuCircleCheck size={13} /><Text fontSize="16px">Valid</Text></Flex>
                            ) : (
                              <Flex flexDir="column" gap="2px">
                                {r.errors.map((m) => (
                                  <Flex key={m} align="flex-start" gap="4px" color="#DC2626">
                                    <Box mt="2px" flexShrink={0}><LuTriangleAlert size={12} /></Box>
                                    <Text fontSize="16px">{m}</Text>
                                  </Flex>
                                ))}
                              </Flex>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
              {preview.total > preview.preview.length && (
                <Text px="20px" py="10px" fontSize="16px" color="#64748B">
                  Menampilkan {preview.preview.length} baris pertama. Semua baris bermasalah tetap terdaftar di bawah.
                </Text>
              )}
              {preview.failed.length > 0 && preview.total > preview.preview.length && (
                <Box px="20px" pb="16px">
                  <Text fontSize="16px" fontWeight="bold" color="#1C2833" mb="4px">Seluruh baris bermasalah</Text>
                  <Box maxH="200px" overflowY="auto">
                    {preview.failed.map((f) => (
                      <Text key={f.row} fontSize="16px" color="#DC2626">Baris {f.row}: {f.reason}</Text>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Result */}
          {result && (
            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="20px">
              <Flex align="center" gap="8px" mb="8px" color={result.inserted ? "#16A34A" : "#D97706"}>
                <LuCircleCheck size={18} />
                <Text fontSize="16px" fontWeight="bold">{result.inserted} dari {result.total} baris berhasil diimpor</Text>
              </Flex>
              {result.failed.length > 0 && (
                <Box mb="12px">
                  <Text fontSize="16px" fontWeight="bold" color="#1C2833" mb="4px">{result.failed_count} baris dilewati</Text>
                  <Box maxH="200px" overflowY="auto">
                    {result.failed.map((f) => (
                      <Text key={f.row} fontSize="16px" color="#DC2626">Baris {f.row}: {f.reason}</Text>
                    ))}
                  </Box>
                </Box>
              )}
              <Flex gap="10px">
                <Button size="sm" bg="#1A3557" color="white" onClick={() => router.push(meta.next)}>{meta.nextLabel}</Button>
                <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" onClick={() => reset()}>Impor lagi</Button>
              </Flex>
            </Box>
          )}
        </Flex>
      </Box>

      <MobileBottomNav />
    </Box>
  )
}

export default function ImportDataPage() {
  return (
    <Suspense fallback={null}>
      <ImportData />
    </Suspense>
  )
}
