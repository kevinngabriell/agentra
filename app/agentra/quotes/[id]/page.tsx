"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuArrowLeft, LuCheck, LuFileCheck, LuPencil, LuPrinter, LuSend, LuTrash2 } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    PLACEMENT_STATUS_COLORS, PLACEMENT_STATUS_LABELS, QUOTE_TRANSITIONS, acceptQuote, changeQuoteStatus, deleteQuote, getQuote, updateOptionPlacement,
    type ApiQuoteDetail, type PlacementStatus, type QuoteOption,
} from "@/lib/api/quotes"
import { COVERAGE_TYPE_LABELS, type ApiCoverageType } from "@/lib/api/policies"
import { SearchSelect } from "@/components/ui/search-select"
import { deductibleText } from "@/components/policy-terms/catalog"
import { getProspect, type ApiProspect } from "@/lib/api/prospects"
import { fmtIDR, whatsappUrl } from "@/lib/format"
import { ConvertDialog, QuoteDialog, QuoteStatusBadge, fmtDate } from "@/components/sales"
import { quoteMessageText } from "@/components/sales/quoteMessage"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useProductOptions } from "@/lib/hooks/useProductOptions"

type Row = { label: string; cell: (o: QuoteOption) => string; bold?: boolean }

/** Structured deductibles / extensions offered, one per line. */
function termsText(o: QuoteOption): string {
    return o.terms.map((t) => t.term_type === "deductible"
        ? `Risiko sendiri: ${deductibleText({ deductible_type: t.deductible_type ?? null, deductible_amount: t.deductible_amount ?? null, deductible_percent: t.deductible_percent ?? null })}`
        : (t.title ?? "")).filter(Boolean).join("\n")
}

const ROWS: Row[] = [
    { label: "Rate", cell: o => (o.rate_permille !== null ? `${o.rate_permille}‰` : o.item_rates.length ? "per item" : "—") },
    { label: "Premi", cell: o => fmtIDR(o.premium_amount) },
    { label: "Biaya polis", cell: o => (o.biaya_polis ? fmtIDR(o.biaya_polis) : "—") },
    { label: "Materai", cell: o => (o.materai_amount ? fmtIDR(o.materai_amount) : "—") },
    { label: "Total dibayar", cell: o => fmtIDR(o.total_amount), bold: true },
    { label: "Risiko sendiri", cell: o => o.deductible_note ?? "—" },
    { label: "Klausula & perluasan", cell: o => [termsText(o), o.terms_note].filter(Boolean).join("\n") || "—" },
]

/** A quote: insurer offers side by side, ready to print as PDF or send by WhatsApp, and the path to a policy. */
export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
    const productCatalog = useProductOptions()
    const { confirm, dialog: confirmDialog } = useConfirm()
    const { id } = use(params)
    const router = useRouter()
    const [quote, setQuote] = useState<ApiQuoteDetail | null>(null)
    const [prospect, setProspect] = useState<ApiProspect | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [dialog, setDialog] = useState<"edit" | "convert" | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) { router.replace("/login"); return }
        let cancelled = false
        getQuote(token, id)
            .then(async (q) => {
                const p = await getProspect(token, q.prospect_id)
                if (cancelled) return
                setQuote(q)
                setProspect(p)
            })
            .catch((err: unknown) => { if (!cancelled) setError(errorMessage(err, "Data penawaran belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [id, router])

    async function run(action: (token: string) => Promise<ApiQuoteDetail | void>) {
        const token = getAccessToken()
        if (!token) return
        setBusy(true); setError(null)
        try {
            const next = await action(token)
            if (next) setQuote(next)
        } catch (err) {
            setError(errorMessage(err, "Gagal menyimpan"))
        } finally { setBusy(false) }
    }

    function sendWhatsApp() {
        if (!quote) return
        const base = quote.prospect_whatsapp ? whatsappUrl(quote.prospect_whatsapp) : null
        if (!base) { setError("Prospek belum punya nomor WhatsApp"); return }
        // Opened synchronously so the browser does not block it as a popup.
        window.open(`${base}?text=${encodeURIComponent(quoteMessageText(quote, productCatalog.label(quote.product_type)))}`, "_blank", "noopener,noreferrer")
        if (quote.status === "draft") run(t => changeQuoteStatus(t, id, "sent"))
    }

    async function remove() {
        const token = getAccessToken()
        if (!token || !quote) return
        if (!(await confirm({ title: `Hapus penawaran ${quote.quote_number}?`, confirmLabel: "Hapus", danger: true }))) return
        try { await deleteQuote(token, id); router.replace(`/agentra/prospects/${encodeURIComponent(quote.prospect_id)}`) }
        catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }

    function startPolicy() {
        if (!quote) return
        if (!prospect?.customer_id) { setDialog("convert"); return }
        router.push(`/agentra/policies/new?customer_id=${encodeURIComponent(prospect.customer_id)}&quote_id=${encodeURIComponent(quote.quote_id)}`)
    }

    if (error && !quote) return <Text p="24px" color="#DC2626">{error}</Text>
    if (!quote) return <Box p="24px"><Skeleton h="400px" maxW="960px" mx="auto" /></Box>

    const editable = quote.status === "draft" || quote.status === "sent"
    const priced = quote.options.filter(o => o.placement_status === "quoted" && o.total_amount > 0)
    const lowest = priced.length ? Math.min(...priced.map(o => o.total_amount)) : 0
    // Co-insurance panel: priced options with a share; the leader (or the first) is the accepted option.
    const panel = quote.options.filter(o => o.share_percent && o.placement_status === "quoted")
    const panelTotal = panel.reduce((t, o) => t + (o.share_percent ?? 0), 0)
    const panelLeader = panel.find(o => o.is_leader) ?? panel[0]
    const inPanel = (o: QuoteOption) => !!quote.accepted_panel?.includes(o.option_id)
    const fx = quote.currency !== "IDR" && quote.exchange_rate > 0 ? quote.exchange_rate : null
    const setPlacement = (o: QuoteOption, status: PlacementStatus) => run(t => updateOptionPlacement(t, id, o.option_id, { placement_status: status }))
    const moves = QUOTE_TRANSITIONS[quote.status]
    const cols = quote.options.length

    return (
        <Box bg="#F1F5F9" minH="100vh" py="24px" px="16px" css={{ "@media print": { background: "white", padding: 0 } }}>
      {confirmDialog}
            <Flex maxW="960px" mx="auto" mb="12px" gap="8px" flexWrap="wrap" justify="space-between" css={{ "@media print": { display: "none" } }}>
                <Button size="sm" variant="ghost" fontSize="14px" color="#475569" onClick={() => router.push(`/agentra/prospects/${encodeURIComponent(quote.prospect_id)}`)}>
                    <LuArrowLeft size={14} /> {quote.prospect_name}
                </Button>
                <Flex gap="8px" flexWrap="wrap">
                    {editable && <Button size="sm" variant="outline" bg="white" fontSize="14px" disabled={busy} onClick={() => setDialog("edit")}><LuPencil size={13} /> Ubah</Button>}
                    {editable && <Button size="sm" variant="outline" bg="white" fontSize="14px" disabled={busy} onClick={sendWhatsApp}><LuSend size={13} /> Kirim via WhatsApp</Button>}
                    {moves.includes("sent") && !editable && <Button size="sm" variant="outline" bg="white" fontSize="14px" disabled={busy} onClick={() => run(t => changeQuoteStatus(t, id, "draft"))}>Buka kembali sebagai draf</Button>}
                    {quote.status === "sent" && <Button size="sm" variant="outline" bg="white" color="#DC2626" fontSize="14px" disabled={busy} onClick={() => run(t => changeQuoteStatus(t, id, "declined"))}>Nasabah menolak</Button>}
                    {quote.status === "declined" && <Button size="sm" variant="outline" bg="white" fontSize="14px" disabled={busy} onClick={() => run(t => changeQuoteStatus(t, id, "draft"))}>Buka kembali sebagai draf</Button>}
                    {quote.status === "accepted" && !quote.policy_id && (
                        <Button size="sm" bg="#16A34A" color="white" fontSize="14px" _hover={{ bg: "#15803D" }} onClick={startPolicy}><LuFileCheck size={13} /> Buat Polis</Button>
                    )}
                    <Button size="sm" bg="#0D1B3E" color="white" fontSize="14px" gap="6px" onClick={() => window.print()}><LuPrinter size={14} /> Cetak / Simpan PDF</Button>
                    {quote.status !== "accepted" && <Button size="sm" variant="ghost" color="#DC2626" aria-label="Hapus penawaran" onClick={remove}><LuTrash2 size={14} /></Button>}
                </Flex>
            </Flex>
            {error && <Text maxW="960px" mx="auto" mb="8px" color="#DC2626" fontSize="14px" role="alert" css={{ "@media print": { display: "none" } }}>{error}</Text>}

            <Box maxW="960px" mx="auto" bg="white" p={{ base: "20px", md: "40px" }} borderRadius="8px" border="1px solid" borderColor="#E2E8F0" color="#1C2833">
                <Flex justify="space-between" align="flex-start" mb="24px" gap="12px" flexWrap="wrap">
                    <Box>
                        <Text fontSize="20px" fontWeight="bold">PENAWARAN ASURANSI</Text>
                        <Flex align="center" gap="8px">
                            <Text fontSize="14px" color="#64748B">{quote.quote_number}</Text>
                            <QuoteStatusBadge status={quote.status} expired={quote.is_expired} />
                        </Flex>
                    </Box>
                    <Box textAlign="right">
                        <Text fontSize="14px" color="#64748B">Tanggal</Text>
                        <Text fontSize="15px" fontWeight="semibold">{fmtDate(quote.created_at)}</Text>
                        {quote.valid_until && (
                            <>
                                <Text fontSize="14px" color="#64748B" mt="6px">Berlaku sampai</Text>
                                <Text fontSize="15px" fontWeight="semibold">{fmtDate(quote.valid_until)}</Text>
                            </>
                        )}
                    </Box>
                </Flex>

                <Box mb="20px" fontSize="14px">
                    <Text><b>Kepada:</b> {quote.prospect_name}</Text>
                    <Text><b>Produk:</b> {productCatalog.label(quote.product_type)}{quote.object_description ? ` · ${quote.object_description}` : ""}</Text>
                    <Text><b>Nilai pertanggungan:</b> {fmtIDR(quote.sum_insured)}{fx ? ` (${quote.currency} ${(quote.sum_insured / fx).toLocaleString("id-ID", { maximumFractionDigits: 2 })}, kurs ${fx.toLocaleString("id-ID")})` : ""}</Text>
                    {quote.coverage_start && quote.coverage_end && <Text><b>Periode:</b> {fmtDate(quote.coverage_start)} – {fmtDate(quote.coverage_end)}</Text>}
                </Box>

                <Box overflowX="auto">
                    <Box as="table" w="100%" fontSize="14px" style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: `${140 + cols * 180}px` }}>
                        <Box as="thead">
                            <Box as="tr">
                                <Box as="th" w="140px" />
                                {quote.options.map(o => {
                                    const accepted = o.option_id === quote.accepted_option_id
                                    return (
                                        <Box as="th" key={o.option_id} p="10px 8px" textAlign="left" verticalAlign="top" bg={accepted ? "#DCFCE7" : "#F8FAFC"} borderBottom="2px solid" borderColor={accepted ? "#16A34A" : "#0D1B3E"}>
                                            <Text fontSize="15px" fontWeight="bold">{o.insurer_short_name || o.insurer_name}</Text>
                                            {accepted && <Text fontSize="13px" color="#16A34A" fontWeight="semibold">{quote.accepted_panel ? "Leader panel" : "Dipilih nasabah"}</Text>}
                                            {!accepted && inPanel(o) && <Text fontSize="13px" color="#16A34A" fontWeight="semibold">Anggota panel</Text>}
                                            {o.total_amount === lowest && lowest > 0 && cols > 1 && !accepted && !inPanel(o) && <Text fontSize="13px" color="#0369A1" fontWeight="semibold">Termurah</Text>}
                                            {o.share_percent !== null && <Text fontSize="13px" color="#6D28D9">Share {o.share_percent}%{o.is_leader ? " · leader" : ""}</Text>}
                                            <Box mt="4px" css={{ "@media print": { display: "none" } }}>
                                                {editable ? (
                                                    <SearchSelect value={o.placement_status} onChange={(v) => setPlacement(o, v as PlacementStatus)} fontSize="13px"
                                                        options={(Object.entries(PLACEMENT_STATUS_LABELS) as [PlacementStatus, string][]).map(([value, label]) => ({ value, label }))} />
                                                ) : (
                                                    <Box as="span" px="6px" py="1px" borderRadius="6px" fontSize="13px" bg={PLACEMENT_STATUS_COLORS[o.placement_status].bg} color={PLACEMENT_STATUS_COLORS[o.placement_status].color}>
                                                        {PLACEMENT_STATUS_LABELS[o.placement_status]}</Box>
                                                )}
                                                {o.decline_reason && <Text fontSize="13px" color="#B91C1C" mt="2px">{o.decline_reason}</Text>}
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                        <Box as="tbody">
                            {quote.items.map(it => (
                                <Box as="tr" key={it.item_id} borderBottom="1px solid" borderColor="#E2E8F0">
                                    <Box as="td" p="8px" color="#64748B" verticalAlign="top">
                                        <Text fontWeight="semibold">{it.label || COVERAGE_TYPE_LABELS[it.coverage_type as ApiCoverageType] || it.coverage_type}</Text>
                                        <Text fontSize="13px">{fmtIDR(it.sum_insured)}{it.count_in_tsi ? "" : " (perluasan)"}</Text>
                                    </Box>
                                    {quote.options.map(o => {
                                        const r = o.item_rates.find(x => x.item_id === it.item_id)
                                        return <Box as="td" key={o.option_id} p="8px" verticalAlign="top" fontSize="13px">{r ? `${r.rate_permille}‰ · ${fmtIDR(r.premium_amount)}` : "—"}</Box>
                                    })}
                                </Box>
                            ))}
                            {ROWS.map(row => (
                                <Box as="tr" key={row.label} borderBottom="1px solid" borderColor="#E2E8F0">
                                    <Box as="td" p="8px" color="#64748B" fontWeight="semibold" verticalAlign="top">{row.label}</Box>
                                    {quote.options.map(o => (
                                        <Box as="td" key={o.option_id} p="8px" verticalAlign="top" whiteSpace="pre-wrap" fontWeight={row.bold ? "bold" : "normal"}
                                            bg={o.option_id === quote.accepted_option_id ? "#F0FDF4" : undefined}>
                                            {row.cell(o)}
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                            {fx && (
                                <Box as="tr" borderBottom="1px solid" borderColor="#E2E8F0">
                                    <Box as="td" p="8px" color="#64748B" fontWeight="semibold">Total ({quote.currency})</Box>
                                    {quote.options.map(o => <Box as="td" key={o.option_id} p="8px">{quote.currency} {(o.total_amount / fx).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</Box>)}
                                </Box>
                            )}
                            {editable && (
                                <Box as="tr" css={{ "@media print": { display: "none" } }}>
                                    <Box as="td" />
                                    {quote.options.map(o => (
                                        <Box as="td" key={o.option_id} p="10px 8px">
                                            <Button size="xs" bg="#16A34A" color="white" fontSize="13px" _hover={{ bg: "#15803D" }} disabled={busy}
                                                onClick={async () => { if (await confirm({ title: `Nasabah memilih ${o.insurer_short_name || o.insurer_name}?`, confirmLabel: "Ya, pilih" })) run(t => acceptQuote(t, id, o.option_id)) }}>
                                                <LuCheck size={12} /> Nasabah pilih ini
                                            </Button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {editable && panel.length > 1 && panelLeader && (
                    <Flex mt="16px" p="12px" bg="#F5F3FF" borderRadius="8px" gap="10px" align="center" justify="space-between" flexWrap="wrap" css={{ "@media print": { display: "none" } }}>
                        <Text fontSize="14px" color="#4C1D95">
                            Panel koasuransi: {panel.map(o => `${o.insurer_short_name || o.insurer_name} ${o.share_percent}%`).join(" + ")} = {panelTotal}%
                            {Math.abs(panelTotal - 100) > 0.01 && " — harus 100%"}
                        </Text>
                        <Button size="sm" bg="#6D28D9" color="white" fontSize="13px" _hover={{ bg: "#5B21B6" }} disabled={busy || Math.abs(panelTotal - 100) > 0.01}
                            onClick={async () => { if (await confirm({ title: "Nasabah menerima panel koasuransi?", message: `${panelLeader.insurer_short_name || panelLeader.insurer_name} sebagai leader.`, confirmLabel: "Ya, terima" }))
                                run(t => acceptQuote(t, id, panelLeader.option_id, panel.filter(o => o.option_id !== panelLeader.option_id).map(o => o.option_id))) }}>
                            <LuCheck size={13} /> Terima sebagai panel
                        </Button>
                    </Flex>
                )}
                {quote.notes && <Text mt="20px" fontSize="14px" whiteSpace="pre-wrap">{quote.notes}</Text>}
                {quote.policy_number && <Text mt="16px" fontSize="14px" color="#16A34A" fontWeight="semibold">Sudah diterbitkan sebagai polis {quote.policy_number}</Text>}
                <Text mt="24px" fontSize="13px" color="#64748B">
                    Premi dan ketentuan dapat berubah sesuai hasil seleksi risiko penanggung. Penawaran ini bukan polis dan bukan jaminan pertanggungan.
                </Text>
            </Box>

            {dialog === "edit" && prospect && <QuoteDialog prospect={prospect} editing={quote} onClose={() => setDialog(null)} onSaved={(q) => { setQuote(q); setDialog(null) }} />}
            {dialog === "convert" && prospect && <ConvertDialog prospect={prospect} onClose={() => setDialog(null)}
                onConverted={(p) => {
                    setProspect(p); setDialog(null)
                    router.push(`/agentra/policies/new?customer_id=${encodeURIComponent(p.customer_id ?? "")}&quote_id=${encodeURIComponent(quote.quote_id)}`)
                }} />}
        </Box>
    )
}
