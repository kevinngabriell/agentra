"use client"

import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import {
  Badge, Box, Button, Checkbox, Dialog, Field, Flex, Input, Skeleton, Table, Text, Textarea,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LuArrowLeft, LuPlus, LuReceipt, LuTrash2, LuX } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import {
  createCommissionStatement, deleteCommissionStatement, getCommissions, getCommissionStatement,
  getCommissionStatements, matchStatementCommissions, unmatchStatementCommission,
  type ApiCommission, type ApiCommissionStatement, type ApiCommissionStatementDetail,
} from "@/lib/api/commissions"
import { getInsurers, type ApiInsurer } from "@/lib/api/insurers"
import { errorMessage, errorStatus } from "@/lib/api/client"
import { fmtIDR, localISODate } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import { useConfirm } from "@/components/ui/confirm-dialog"

function formatIDR(raw: string): string {
  return raw.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const colHeader = {
  color: "#64748B", fontSize: "16px", fontWeight: "bold", letterSpacing: "0.05em", px: "16px", py: "10px",
}

export default function CommissionStatements() {
  const { confirm, dialog } = useConfirm()
  const router = useRouter()
  const [insurers, setInsurers]     = useState<ApiInsurer[]>([])
  const [insurerFilter, setInsurerFilter] = useState("")
  const [reloadKey, setReloadKey]   = useState(0)
  const [result, setResult] = useState<{ key: string; rows: ApiCommissionStatement[]; error: string | null } | null>(null)

  // create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ insurer_id: "", statement_date: localISODate(), amount: "", reference_number: "", notes: "" })
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // detail / match dialog
  const [detail, setDetail]         = useState<ApiCommissionStatementDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ApiCommission[] | null>(null)
  const [picked, setPicked]         = useState<Record<string, string>>({}) // commission_id -> allocated amount (digits)
  const [busy, setBusy]             = useState(false)

  const queryKey = `${insurerFilter}|${reloadKey}`

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    getInsurers(token).then(setInsurers).catch(() => {})
  }, [router])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    const key = `${insurerFilter}|${reloadKey}`
    let cancelled = false
    getCommissionStatements(token, { ...(insurerFilter ? { insurer_id: insurerFilter } : {}), limit: 100 })
      .then((res) => { if (!cancelled) setResult({ key, rows: res.data, error: null }) })
      .catch((err: unknown) => {
        if (!cancelled && errorStatus(err) !== 401) setResult({ key, rows: [], error: errorMessage(err, "Statement belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.") })
      })
    return () => { cancelled = true }
  }, [insurerFilter, reloadKey, router])

  const loading = result?.key !== queryKey
  const rows    = loading ? [] : result?.rows ?? []
  const error   = loading ? null : result?.error ?? null

  const insurerOptions = insurers.map((i) => ({ value: i.insurer_id, label: i.short_name || i.name }))

  async function submitCreate() {
    const amount = Number(form.amount.replace(/\D/g, ""))
    if (!form.insurer_id) { setCreateError("Penanggung wajib dipilih"); return }
    if (!form.statement_date) { setCreateError("Tanggal wajib diisi"); return }
    if (!amount) { setCreateError("Jumlah wajib diisi"); return }
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createCommissionStatement(token, {
        insurer_id: form.insurer_id,
        statement_date: form.statement_date,
        amount,
        ...(form.reference_number.trim() ? { reference_number: form.reference_number.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
      setCreateOpen(false)
      setForm({ insurer_id: "", statement_date: localISODate(), amount: "", reference_number: "", notes: "" })
      setReloadKey((k) => k + 1)
      void openDetail(created.statement_id)
    } catch (err: unknown) {
      setCreateError(errorMessage(err, "Gagal menyimpan statement"))
    } finally {
      setCreating(false)
    }
  }

  async function loadCandidates(insurerId: string) {
    const token = getAccessToken()
    if (!token) return
    try {
      const res = await getCommissions(token, { insurer_id: insurerId, unmatched: true, limit: 100 })
      setCandidates(res.data.filter((c) => c.status !== "cancelled"))
    } catch (err: unknown) {
      setDetailError(errorMessage(err, "Komisi belum bisa dibuka. Periksa sinyal internet, lalu coba lagi."))
    }
  }

  async function openDetail(statementId: string) {
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setDetail(null)
    setDetailError(null)
    setCandidates(null)
    setPicked({})
    setDetailLoading(true)
    try {
      const d = await getCommissionStatement(token, statementId)
      setDetail(d)
      await loadCandidates(d.insurer_id)
    } catch (err: unknown) {
      setDetailError(errorMessage(err, "Statement belum bisa dibuka. Periksa sinyal internet, lalu coba lagi."))
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetail(null)
    setDetailError(null)
    setDetailLoading(false)
  }

  function togglePick(c: ApiCommission) {
    setPicked((p) => {
      const next = { ...p }
      if (c.commission_id in next) delete next[c.commission_id]
      else next[c.commission_id] = String(c.expected_amount)
      return next
    })
  }

  const pickedTotal = Object.values(picked).reduce((sum, v) => sum + (Number(v) || 0), 0)

  async function submitMatch() {
    if (!detail) return
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setBusy(true)
    setDetailError(null)
    try {
      const updated = await matchStatementCommissions(token, detail.statement_id,
        Object.entries(picked).map(([commission_id, v]) => ({ commission_id, allocated_amount: Number(v) || 0 })))
      setDetail(updated)
      setPicked({})
      setReloadKey((k) => k + 1)
      await loadCandidates(updated.insurer_id)
    } catch (err: unknown) {
      setDetailError(errorMessage(err, "Gagal mencocokkan komisi"))
    } finally {
      setBusy(false)
    }
  }

  async function unmatch(commissionId: string) {
    if (!detail) return
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setBusy(true)
    setDetailError(null)
    try {
      const updated = await unmatchStatementCommission(token, detail.statement_id, commissionId)
      setDetail(updated)
      setReloadKey((k) => k + 1)
      await loadCandidates(updated.insurer_id)
    } catch (err: unknown) {
      setDetailError(errorMessage(err, "Gagal membatalkan pencocokan"))
    } finally {
      setBusy(false)
    }
  }

  async function removeStatement() {
    if (!detail) return
    if (!(await confirm({ title: "Hapus statement ini?", message: "Semua komisi yang cocok akan kembali menjadi Menunggu.", confirmLabel: "Hapus", danger: true }))) return
    const token = getAccessToken()
    if (!token) { router.push("/login"); return }
    setBusy(true)
    try {
      await deleteCommissionStatement(token, detail.statement_id)
      closeDetail()
      setReloadKey((k) => k + 1)
    } catch (err: unknown) {
      setDetailError(errorMessage(err, "Gagal menghapus statement"))
    } finally {
      setBusy(false)
    }
  }

  const remainderAfterPick = detail ? detail.unmatched_amount - pickedTotal : 0

  return (
    <Box bg="#F4F6F9" minH="100vh">
    {dialog}
      <Sidebar />
      <MobileHeader />

      <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
        <Box display={{ base: "none", md: "block" }}>
          <TopBar title="Commissions" />
        </Box>

        <Flex flexDir="column" gap="24px" p="32px">

          <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap">
            <Flex flexDir="column" gap="4px">
              <Button variant="ghost" size="xs" alignSelf="flex-start" color="#64748B" px="0"
                onClick={() => router.push("/agentra/commissions")}>
                <LuArrowLeft size={13} /> Komisi
              </Button>
              <Text color="#1C2833" fontSize="24px" fontWeight="bold">Rekonsiliasi Statement Penanggung</Text>
              <Text color="#5D6D7E" fontSize="16px">
                Catat satu pembayaran dari penanggung, lalu cocokkan ke banyak komisi sekaligus.
              </Text>
            </Flex>
            <Button bg="#1A3557" color="white" borderRadius="8px" gap="6px" onClick={() => { setCreateError(null); setCreateOpen(true) }}>
              <LuPlus size={14} /> Catat Statement
            </Button>
          </Flex>

          <Box maxW="260px">
            <SearchSelect value={insurerFilter} onChange={setInsurerFilter} clearable height="40px" fontSize="16px"
              ariaLabel="Filter penanggung" placeholder="Semua penanggung" options={insurerOptions} />
          </Box>

          {error && (
            <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="10px" p="16px">
              <Text color="#DC2626" fontSize="16px">{error}</Text>
            </Box>
          )}

          <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" overflow="hidden">
            {loading ? (
              <Flex flexDir="column" gap="12px" p="20px">
                {[1, 2, 3].map((i) => <Skeleton key={i} h="48px" borderRadius="8px" />)}
              </Flex>
            ) : rows.length === 0 ? (
              <Flex align="center" justify="center" py="48px" flexDir="column" gap="8px">
                <LuReceipt size={32} color="#CBD5E1" />
                <Text color="#64748B" fontSize="16px">Belum ada statement</Text>
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="#F8FAFC">
                      {["TANGGAL", "PENANGGUNG", "REFERENSI", "JUMLAH", "TERCOCOKKAN", "SISA", "SELISIH", "AKSI"].map((h) => (
                        <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((s) => (
                      <Table.Row key={s.statement_id} borderBottom="1px solid" borderColor="#F1F5F9" _hover={{ bg: "#F8FAFC" }}>
                        <Table.Cell px="16px" py="12px"><Text fontSize="16px" color="#1C2833">{formatDate(s.statement_date)}</Text></Table.Cell>
                        <Table.Cell px="16px" py="12px"><Text fontSize="16px" color="#1C2833">{s.insurer_short_name ?? s.insurer_name ?? "—"}</Text></Table.Cell>
                        <Table.Cell px="16px" py="12px"><Text fontSize="16px" color="#64748B" fontFamily="mono">{s.reference_number ?? "—"}</Text></Table.Cell>
                        <Table.Cell px="16px" py="12px"><Text fontSize="16px" fontWeight="semibold" color="#1C2833">{fmtIDR(s.amount)}</Text></Table.Cell>
                        <Table.Cell px="16px" py="12px">
                          <Text fontSize="16px" color="#16A34A" fontWeight="semibold">{fmtIDR(s.matched_amount)}</Text>
                          <Text fontSize="16px" color="#64748B">{s.matched_count} komisi</Text>
                        </Table.Cell>
                        <Table.Cell px="16px" py="12px">
                          <Text fontSize="16px" fontWeight="semibold" color={s.unmatched_amount === 0 ? "#16A34A" : "#D97706"}>
                            {fmtIDR(s.unmatched_amount)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell px="16px" py="12px">
                          {s.discrepancy_count > 0
                            ? <Badge bg="#FEE2E2" color="#DC2626" borderRadius="full" px="8px">{s.discrepancy_count} komisi</Badge>
                            : <Text fontSize="16px" color="#64748B">—</Text>}
                        </Table.Cell>
                        <Table.Cell px="16px" py="12px">
                          <Button size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                            onClick={() => openDetail(s.statement_id)}>
                            Cocokkan / Detail
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Box>
        </Flex>
      </Box>

      <MobileBottomNav />

      {/* Create statement */}
      <Dialog.Root open={createOpen} onOpenChange={(d) => setCreateOpen(d.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="480px" borderRadius="16px" p="0" overflow="hidden">
            <Dialog.Header bg="#F8FAFC" borderBottom="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
              <Dialog.Title fontSize="16px" color="#1C2833" fontWeight="bold">Catat Statement Penanggung</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px="24px" py="20px">
              <Flex flexDir="column" gap="16px">
                <Field.Root required>
                  <Field.Label fontSize="16px" color="#374151" fontWeight="semibold">Penanggung <Field.RequiredIndicator /></Field.Label>
                  <SearchSelect value={form.insurer_id} onChange={(v) => setForm((f) => ({ ...f, insurer_id: v }))}
                    options={insurerOptions} placeholder="Pilih penanggung" ariaLabel="Penanggung" />
                </Field.Root>
                <Field.Root required>
                  <Field.Label fontSize="16px" color="#374151" fontWeight="semibold">Tanggal <Field.RequiredIndicator /></Field.Label>
                  <Input type="date" fontSize="16px" borderRadius="8px" borderColor="#E2E8F0" value={form.statement_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, statement_date: e.target.value }))} />
                </Field.Root>
                <Field.Root required>
                  <Field.Label fontSize="16px" color="#374151" fontWeight="semibold">Jumlah Dibayar (Rp) <Field.RequiredIndicator /></Field.Label>
                  <Input inputMode="numeric" placeholder="25.000.000" fontSize="16px" borderRadius="8px" borderColor="#E2E8F0"
                    value={formatIDR(form.amount)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="16px" color="#374151" fontWeight="semibold">No. Referensi</Field.Label>
                  <Input placeholder="STM/2026/10/001" fontSize="16px" borderRadius="8px" borderColor="#E2E8F0" value={form.reference_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, reference_number: e.target.value }))} />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="16px" color="#374151" fontWeight="semibold">Catatan</Field.Label>
                  <Textarea rows={2} fontSize="16px" borderRadius="8px" borderColor="#E2E8F0" value={form.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </Field.Root>
                {createError && (
                  <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" p="10px">
                    <Text color="#DC2626" fontSize="16px" role="alert">{createError}</Text>
                  </Box>
                )}
              </Flex>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
              <Flex justify="flex-end" gap="10px">
                <Button variant="outline" borderColor="#E2E8F0" color="#374151" borderRadius="8px"
                  onClick={() => setCreateOpen(false)} disabled={creating}>Batal</Button>
                <Button bg="#1A3557" color="white" borderRadius="8px" px="20px" loading={creating} loadingText="Menyimpan..." onClick={submitCreate}>
                  Simpan
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Statement detail + matching */}
      <Dialog.Root open={detailLoading || detail !== null || detailError !== null} onOpenChange={(d) => { if (!d.open) closeDetail() }}
        scrollBehavior="inside">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="860px" borderRadius="16px" p="0" overflow="hidden">
            <Dialog.Header bg="#F8FAFC" borderBottom="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
              <Flex justify="space-between" align="center" w="full">
                <Flex flexDir="column" gap="2px">
                  <Dialog.Title fontSize="16px" color="#1C2833" fontWeight="bold">
                    Statement {detail?.insurer_short_name ?? detail?.insurer_name ?? ""}
                  </Dialog.Title>
                  {detail && (
                    <Text fontSize="16px" color="#64748B">
                      {formatDate(detail.statement_date)}{detail.reference_number ? ` · ${detail.reference_number}` : ""}
                    </Text>
                  )}
                </Flex>
                <Dialog.CloseTrigger asChild>
                  <Button size="sm" variant="ghost" color="#64748B" borderRadius="8px" px="8px" aria-label="Tutup"><LuX size={16} /></Button>
                </Dialog.CloseTrigger>
              </Flex>
            </Dialog.Header>

            <Dialog.Body px="24px" py="20px">
              {detailLoading && <Skeleton h="120px" borderRadius="8px" />}
              {detailError && (
                <Box bg="#FEF2F2" border="1px solid" borderColor="#FECACA" borderRadius="8px" p="10px" mb="16px">
                  <Text color="#DC2626" fontSize="16px" role="alert">{detailError}</Text>
                </Box>
              )}
              {detail && (
                <Flex flexDir="column" gap="20px">
                  <Flex gap="12px" flexWrap="wrap">
                    {[
                      { label: "Jumlah Statement", value: fmtIDR(detail.amount), color: "#1C2833" },
                      { label: "Tercocokkan", value: fmtIDR(detail.matched_amount), color: "#16A34A" },
                      { label: "Sisa Belum Cocok", value: fmtIDR(detail.unmatched_amount), color: detail.unmatched_amount === 0 ? "#16A34A" : "#D97706" },
                      { label: "Komisi Selisih", value: `${detail.discrepancy_count}`, color: detail.discrepancy_count ? "#DC2626" : "#64748B" },
                    ].map((c) => (
                      <Box key={c.label} flex="1" minW="150px" bg="#F8FAFC" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" p="12px">
                        <Text fontSize="16px" color="#64748B" fontWeight="bold">{c.label.toUpperCase()}</Text>
                        <Text fontSize="16px" fontWeight="bold" color={c.color}>{c.value}</Text>
                      </Box>
                    ))}
                  </Flex>

                  {/* matched */}
                  <Box>
                    <Text fontSize="16px" fontWeight="bold" color="#1C2833" mb="8px">Komisi Tercocokkan ({detail.items.length})</Text>
                    {detail.items.length === 0 ? (
                      <Text fontSize="16px" color="#64748B">Belum ada komisi yang dicocokkan.</Text>
                    ) : (
                      <Box overflowX="auto" border="1px solid" borderColor="#E2E8F0" borderRadius="10px">
                        <Table.Root size="sm">
                          <Table.Header>
                            <Table.Row bg="#F8FAFC">
                              {["NASABAH", "NO. POLIS", "DIHARAPKAN", "DIBAYAR", "SELISIH", ""].map((h) => (
                                <Table.ColumnHeader key={h} {...colHeader}>{h}</Table.ColumnHeader>
                              ))}
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {detail.items.map((it) => (
                              <Table.Row key={it.commission_id}>
                                <Table.Cell px="16px" py="8px"><Text fontSize="16px">{it.customer_name ?? "—"}</Text></Table.Cell>
                                <Table.Cell px="16px" py="8px"><Text fontSize="16px" fontFamily="mono" color="#64748B">{it.policy_number ?? "—"}</Text></Table.Cell>
                                <Table.Cell px="16px" py="8px"><Text fontSize="16px">{fmtIDR(it.expected_amount)}</Text></Table.Cell>
                                <Table.Cell px="16px" py="8px"><Text fontSize="16px" fontWeight="semibold">{fmtIDR(it.allocated_amount)}</Text></Table.Cell>
                                <Table.Cell px="16px" py="8px">
                                  <Text fontSize="16px" fontWeight="semibold" color={Math.abs(it.difference) <= 1 ? "#94A3B8" : "#DC2626"}>
                                    {Math.abs(it.difference) <= 1 ? "—" : `${it.difference > 0 ? "+" : "−"}${fmtIDR(Math.abs(it.difference))}`}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell px="16px" py="8px">
                                  <Button size="xs" variant="ghost" color="#DC2626" disabled={busy} onClick={() => unmatch(it.commission_id)}>
                                    Lepas
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    )}
                  </Box>

                  {/* candidates */}
                  <Box>
                    <Text fontSize="16px" fontWeight="bold" color="#1C2833" mb="8px">
                      Komisi {detail.insurer_short_name ?? ""} yang Belum Dicocokkan
                    </Text>
                    {candidates === null ? (
                      <Skeleton h="60px" borderRadius="8px" />
                    ) : candidates.length === 0 ? (
                      <Text fontSize="16px" color="#64748B">Tidak ada komisi yang tersedia untuk dicocokkan.</Text>
                    ) : (
                      <Box overflowX="auto" border="1px solid" borderColor="#E2E8F0" borderRadius="10px" maxH="260px" overflowY="auto">
                        <Table.Root size="sm">
                          <Table.Body>
                            {candidates.map((c) => {
                              const on = c.commission_id in picked
                              return (
                                <Table.Row key={c.commission_id} bg={on ? "#EFF6FF" : undefined}>
                                  <Table.Cell px="12px" py="6px" w="36px">
                                    <Checkbox.Root checked={on} onCheckedChange={() => togglePick(c)}>
                                      <Checkbox.HiddenInput aria-label={`Pilih ${c.policy_number ?? c.commission_id}`} />
                                      <Checkbox.Control />
                                    </Checkbox.Root>
                                  </Table.Cell>
                                  <Table.Cell px="12px" py="6px">
                                    <Text fontSize="16px">{c.customer_name ?? "—"}</Text>
                                    <Text fontSize="16px" fontFamily="mono" color="#64748B">{c.policy_number ?? "—"}</Text>
                                  </Table.Cell>
                                  <Table.Cell px="12px" py="6px"><Text fontSize="16px" fontWeight="semibold">{fmtIDR(c.expected_amount)}</Text></Table.Cell>
                                  <Table.Cell px="12px" py="6px" w="160px">
                                    {on && (
                                      <Input size="xs" inputMode="numeric" aria-label="Jumlah dibayar" borderRadius="6px"
                                        value={formatIDR(picked[c.commission_id])}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                          setPicked((p) => ({ ...p, [c.commission_id]: e.target.value.replace(/\D/g, "") }))} />
                                    )}
                                  </Table.Cell>
                                </Table.Row>
                              )
                            })}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    )}
                  </Box>
                </Flex>
              )}
            </Dialog.Body>

            {detail && (
              <Dialog.Footer borderTop="1px solid" borderColor="#E2E8F0" px="24px" py="16px">
                <Flex justify="space-between" align="center" w="full" gap="12px" flexWrap="wrap">
                  <Button variant="ghost" color="#DC2626" size="sm" gap="6px" disabled={busy} onClick={removeStatement}>
                    <LuTrash2 size={13} /> Hapus Statement
                  </Button>
                  <Flex align="center" gap="12px">
                    {Object.keys(picked).length > 0 && (
                      <Text fontSize="16px" color={remainderAfterPick < 0 ? "#DC2626" : "#64748B"}>
                        Dipilih {fmtIDR(pickedTotal)} · sisa {fmtIDR(remainderAfterPick)}
                      </Text>
                    )}
                    <Button bg="#1A3557" color="white" borderRadius="8px" px="20px" loading={busy}
                      disabled={Object.keys(picked).length === 0 || remainderAfterPick < 0} onClick={submitMatch}>
                      Cocokkan {Object.keys(picked).length > 0 ? `(${Object.keys(picked).length})` : ""}
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
