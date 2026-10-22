"use client"

import { Box, Button, Flex, NativeSelect, Skeleton, Table, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { LuDownload, LuPrinter } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { exportReport, getReport, type Report, type ReportColumn, type ReportKey } from "@/lib/api/reports"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { errorMessage, errorStatus, saveBlob } from "@/lib/api/client"
import { fmtIDR } from "@/lib/format"
import { MonthPickerButton } from "@/components/ui/month-picker"

export interface ReportDef {
  key: ReportKey
  label: string
  description: string
  /** Which controls the report understands. */
  year?: boolean
  month?: boolean
  insurer?: boolean
  groupBy?: { value: string; label: string }[]
}

export const REPORT_DEFS: ReportDef[] = [
  { key: "payment-consolidation", label: "Konsolidasi Pembayaran", description: "Premi per insurer dan status pembayarannya, untuk dilaporkan ke kantor pusat.", year: true, month: true, insurer: true },
  { key: "lapsed", label: "Polis Lapsed", description: "Polis yang berakhir tanpa diperpanjang.", year: true, insurer: true },
  { key: "portfolio", label: "Portofolio", description: "Polis aktif menurut produk dan insurer.", insurer: true },
  { key: "retention", label: "Retensi", description: "Retensi polis dan customer dari tahun ke tahun.", year: true, insurer: true },
  {
    key: "commissions", label: "Komisi", description: "Ringkasan komisi menurut insurer, produk, sub-agen atau bulan.", year: true, insurer: true,
    groupBy: [{ value: "insurer", label: "Insurer" }, { value: "product", label: "Produk" }, { value: "sub_agent", label: "Sub-agen" }, { value: "month", label: "Bulan" }],
  },
  { key: "sub-agent-production", label: "Produksi Sub-agen", description: "Produksi, komisi dan tingkat perpanjangan per sub-agen.", year: true, insurer: true },
  {
    key: "claims", label: "Klaim & Loss Ratio", description: "Jumlah klaim, klaim disetujui dan loss ratio terhadap premi.", year: true, insurer: true,
    groupBy: [{ value: "insurer", label: "Insurer" }, { value: "product", label: "Produk" }],
  },
]

function formatCell(col: ReportColumn, v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "-"
  switch (col.type) {
    case "money": return fmtIDR(Number(v))
    case "int":   return Number(v).toLocaleString("id-ID")
    case "pct":   return `${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`
    case "date":  return new Date(String(v)).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    default:      return String(v)
  }
}

const selectStyle = { bg: "white", borderColor: "#E2E8F0", fontSize: "16px", color: "#374151" } as const

export function ReportView({ def }: { def: ReportDef }) {
  const thisYear = new Date().getFullYear()
  const [year, setYear]       = useState(thisYear)
  const [month, setMonth]     = useState<string | null>(null)
  const [insurerId, setInsurerId] = useState("")
  const [groupBy, setGroupBy] = useState(def.groupBy?.[0]?.value ?? "")
  const [insurers, setInsurers] = useState<ApiInsurer[]>([])
  const [exporting, setExporting] = useState(false)
  const [result, setResult]   = useState<{ id: string; report: Report | null; error: string | null } | null>(null)

  const params = {
    year: def.year ? year : undefined,
    month: def.month && month ? month : undefined,
    insurer_id: insurerId || undefined,
    group_by: groupBy || undefined,
  }
  const requestId = JSON.stringify([def.key, params])

  useEffect(() => {
    const token = getAccessToken()
    if (token && def.insurer) getInsurers(token, true).then(setInsurers).catch(() => {})
  }, [def.insurer])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    const ctrl = new AbortController()
    getReport(token, def.key, JSON.parse(requestId)[1], ctrl.signal)
      .then((report) => setResult({ id: requestId, report, error: null }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || errorStatus(err) === 401) return
        setResult({ id: requestId, report: null, error: errorMessage(err, "Data laporan belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => ctrl.abort()
  }, [def.key, requestId])

  const loading = result?.id !== requestId
  const report  = loading ? null : result?.report ?? null
  const error   = loading ? null : result?.error ?? null

  async function handleExport() {
    const token = getAccessToken()
    if (!token) return
    setExporting(true)
    try {
      const { blob, filename } = await exportReport(token, def.key, params)
      saveBlob(blob, filename)
    } catch (err: unknown) {
      setResult((p) => ({ id: requestId, report: p?.report ?? null, error: errorMessage(err, "Gagal mengekspor laporan") }))
    } finally {
      setExporting(false)
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => thisYear - i)

  return (
    <Flex flexDir="column" gap="16px">
      <Flex justify="space-between" align="flex-end" flexWrap="wrap" gap="12px" className="no-print">
        <Flex gap="12px" flexWrap="wrap" align="center">
          {def.year && (
            <NativeSelect.Root w="110px" size="sm">
              <NativeSelect.Field aria-label="Tahun" value={year} onChange={(e) => { setYear(Number(e.target.value)); setMonth(null) }} {...selectStyle}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
          {def.month && (
            month
              ? <Flex gap="8px" align="center">
                  <MonthPickerButton month={month} onChange={setMonth} />
                  <Button size="sm" variant="ghost" fontSize="16px" onClick={() => setMonth(null)}>Setahun penuh</Button>
                </Flex>
              : <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px"
                  onClick={() => setMonth(`${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`)}>
                  Pilih bulan
                </Button>
          )}
          {def.insurer && (
            <NativeSelect.Root w="180px" size="sm">
              <NativeSelect.Field aria-label="Insurer" value={insurerId} onChange={(e) => setInsurerId(e.target.value)} {...selectStyle}>
                <option value="">Semua insurer</option>
                {insurers.map((i) => <option key={i.insurer_id} value={i.insurer_id}>{i.short_name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
          {def.groupBy && (
            <NativeSelect.Root w="160px" size="sm">
              <NativeSelect.Field aria-label="Kelompokkan menurut" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} {...selectStyle}>
                {def.groupBy.map((g) => <option key={g.value} value={g.value}>Per {g.label}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
        </Flex>
        <Flex gap="8px">
          <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px" gap="6px"
            onClick={handleExport} loading={exporting} disabled={loading || !report}>
            <LuDownload size={13} /> Excel
          </Button>
          <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px" gap="6px"
            onClick={() => window.print()} disabled={loading || !report}>
            <LuPrinter size={13} /> PDF
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
          <Text color="#DC2626" fontSize="16px">{error}</Text>
        </Box>
      )}

      {loading ? <Skeleton h="240px" borderRadius="12px" /> : report && (
        <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
          <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="#E2E8F0" justify="space-between" align="center" gap="12px" flexWrap="wrap">
            <Text color="#1C2833" fontSize="16px" fontWeight="semibold">{report.title}</Text>
            <Text color="#64748B" fontSize="16px">{report.rows.length} baris</Text>
          </Flex>
          {report.rows.length === 0 ? (
            <Flex align="center" justify="center" py="32px">
              <Text color="#64748B" fontSize="16px">Tidak ada data untuk filter ini</Text>
            </Flex>
          ) : (
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row bg="#F8FAFC">
                    {report.columns.map((c) => (
                      <Table.ColumnHeader key={c.key} color="#64748B" fontSize="16px" fontWeight="bold" letterSpacing="0.05em" px="16px" py="10px"
                        textAlign={c.type === "text" || c.type === "date" ? "left" : "right"}>
                        {c.label.toUpperCase()}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {report.rows.map((row, i) => (
                    <Table.Row key={i} borderBottom="1px solid" borderColor="#F1F5F9">
                      {report.columns.map((c, ci) => (
                        <Table.Cell key={c.key} px="16px" py="10px" fontSize="16px" color={ci === 0 ? "#1C2833" : "#475569"}
                          fontWeight={ci === 0 ? "medium" : "normal"} textAlign={c.type === "text" || c.type === "date" ? "left" : "right"}>
                          {formatCell(c, row[c.key])}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                  {report.totals && (
                    <Table.Row bg="#F8FAFC">
                      {report.columns.map((c, ci) => (
                        <Table.Cell key={c.key} px="16px" py="10px" fontSize="16px" fontWeight="bold" color="#1C2833"
                          textAlign={c.type === "text" || c.type === "date" ? "left" : "right"}>
                          {ci === 0 ? "TOTAL" : report.totals?.[c.key] !== undefined ? formatCell(c, report.totals[c.key]) : ""}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>
      )}
    </Flex>
  )
}
