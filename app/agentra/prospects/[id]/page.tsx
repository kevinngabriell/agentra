"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileHeader, TopBar, MobileBottomNav } from "@/components/layout"
import { Box, Button, Flex, Grid, Skeleton, Text } from "@chakra-ui/react"
import { LuArrowLeft, LuFileText, LuPencil, LuPlus, LuTrash2, LuUserCheck } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import {
    LOST_REASON_LABELS, PROSPECT_SOURCE_LABELS, PROSPECT_STAGE_LABELS, PROSPECT_TYPE_LABELS, changeProspectStage, deleteProspect, getProspect,
    type ApiProspect, type ProspectStage,
} from "@/lib/api/prospects"
import { getQuotes, type ApiQuote } from "@/lib/api/quotes"
import { fmtIDR, whatsappUrl } from "@/lib/format"
import { SearchSelect } from "@/components/ui/search-select"
import {
    ConvertDialog, LostDialog, ProspectDialog, QuoteDialog, QuoteStatusBadge, StageBadge, fmtDate, productLabel,
} from "@/components/sales"
import { useConfirm } from "@/components/ui/confirm-dialog"

function Info({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null
    return (
        <Flex flexDir="column" gap="2px" minW="0">
            <Text color="#64748B" fontSize="14px" fontWeight="semibold">{label.toUpperCase()}</Text>
            <Text color="#1C2833" fontSize="15px" wordBreak="break-word">{value}</Text>
        </Flex>
    )
}

type MovableStage = Exclude<ProspectStage, "won" | "lost">
const MOVABLE_STAGES: MovableStage[] = ["new", "contacted", "quoted", "negotiating"]

export default function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { confirm, dialog: confirmDialog } = useConfirm()
    const { id } = use(params)
    const router = useRouter()
    const [prospect, setProspect] = useState<ApiProspect | null>(null)
    const [quotes, setQuotes] = useState<ApiQuote[]>([])
    const [error, setError] = useState<string | null>(null)
    const [dialog, setDialog] = useState<"edit" | "quote" | "lost" | "convert" | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) { router.replace("/login"); return }
        let cancelled = false
        Promise.all([getProspect(token, id), getQuotes(token, { prospect_id: id, limit: 50 })])
            .then(([p, q]) => {
                if (cancelled) return
                setProspect(p)
                setQuotes(q.data ?? [])
            })
            .catch((err: unknown) => { if (!cancelled) setError(errorMessage(err, "Data prospek belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")) })
        return () => { cancelled = true }
    }, [id, router])

    async function moveTo(stage: MovableStage) {
        const token = getAccessToken()
        if (!token || !prospect || stage === prospect.stage) return
        setBusy(true)
        try { setProspect(await changeProspectStage(token, id, { stage })) }
        catch (err) { setError(errorMessage(err, "Gagal mengubah tahap")) }
        finally { setBusy(false) }
    }

    async function remove() {
        const token = getAccessToken()
        if (!token || !prospect) return
        if (!(await confirm({ title: `Hapus ${prospect.name}?`, confirmLabel: "Hapus", message: "Semua penawaran prospek ini ikut terhapus.", danger: true }))) return
        try { await deleteProspect(token, id); router.replace("/agentra/prospects") }
        catch (err) { setError(errorMessage(err, "Gagal menghapus")) }
    }

    const closed = prospect?.stage === "won" || prospect?.stage === "lost"
    const wa = prospect?.whatsapp ? whatsappUrl(prospect.whatsapp) : null

    return (
        <Box bg="#F4F6F9" minH="100vh">
      {confirmDialog}
            <Sidebar />
            <MobileHeader />
            <Box ml={{ base: 0, md: "250px" }} pt={{ base: "56px", md: 0 }} pb={{ base: "150px", md: "96px" }}>
                <Box display={{ base: "none", md: "block" }}><TopBar title="Prospects" /></Box>

                <Flex px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} gap="20px" flexDir="column" maxW="1100px">
                    <Button alignSelf="flex-start" variant="ghost" size="sm" fontSize="15px" color="#475569" onClick={() => router.push("/agentra/prospects")}>
                        <LuArrowLeft size={14} /> Semua prospek
                    </Button>

                    {error && <Text color="#DC2626" fontSize="15px" role="alert">{error}</Text>}
                    {!prospect && !error && <Skeleton h="200px" borderRadius="12px" />}

                    {prospect && (
                        <>
                            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                                <Flex justify="space-between" align="flex-start" gap="12px" flexWrap="wrap" mb="16px">
                                    <Box>
                                        <Flex align="center" gap="10px" flexWrap="wrap">
                                            <Text color="#1C2833" fontSize="22px" fontWeight="bold">{prospect.name}</Text>
                                            <StageBadge stage={prospect.stage} />
                                        </Flex>
                                        <Text color="#64748B" fontSize="15px">{PROSPECT_TYPE_LABELS[prospect.prospect_type]}</Text>
                                    </Box>
                                    <Flex gap="8px" flexWrap="wrap">
                                        {wa && <Button asChild size="sm" variant="outline" fontSize="15px"><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>}
                                        {!closed && <Button size="sm" variant="outline" fontSize="15px" onClick={() => setDialog("edit")}><LuPencil size={13} /> Ubah</Button>}
                                        {prospect.customer_id
                                            ? <Button size="sm" variant="outline" fontSize="15px" onClick={() => router.push(`/agentra/customer/detail?id=${encodeURIComponent(prospect.customer_id!)}`)}><LuUserCheck size={13} /> Lihat Nasabah</Button>
                                            : !closed && <Button size="sm" bg="#16A34A" color="white" fontSize="15px" _hover={{ bg: "#15803D" }} onClick={() => setDialog("convert")}><LuUserCheck size={13} /> Jadikan Nasabah</Button>}
                                        {!closed && <Button size="sm" variant="outline" color="#DC2626" fontSize="15px" onClick={() => setDialog("lost")}>Tandai Batal</Button>}
                                        {!prospect.customer_id && <Button size="sm" variant="ghost" color="#DC2626" aria-label="Hapus prospek" onClick={remove}><LuTrash2 size={14} /></Button>}
                                    </Flex>
                                </Flex>

                                {!closed && (
                                    <Flex align="center" gap="10px" mb="16px" flexWrap="wrap">
                                        <Text color="#64748B" fontSize="14px">Tahap</Text>
                                        <Box w="200px" opacity={busy ? 0.6 : 1}>
                                            <SearchSelect value={prospect.stage} onChange={(v) => moveTo(v as MovableStage)} ariaLabel="Ubah tahap"
                                                options={MOVABLE_STAGES.map(s => ({ value: s, label: PROSPECT_STAGE_LABELS[s] }))} />
                                        </Box>
                                    </Flex>
                                )}

                                {prospect.stage === "lost" && (
                                    <Box bg="#FEF2F2" borderRadius="8px" p="12px" mb="16px">
                                        <Text color="#DC2626" fontSize="15px" fontWeight="semibold">Batal: {prospect.lost_reason ? LOST_REASON_LABELS[prospect.lost_reason] : "—"}</Text>
                                        {prospect.lost_note && <Text color="#7F1D1D" fontSize="14px">{prospect.lost_note}</Text>}
                                    </Box>
                                )}

                                <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap="14px 20px">
                                    <Info label="Kontak" value={prospect.contact_name} />
                                    <Info label="WhatsApp" value={prospect.whatsapp} />
                                    <Info label="Telepon" value={prospect.phone} />
                                    <Info label="Email" value={prospect.email} />
                                    <Info label="Sumber" value={PROSPECT_SOURCE_LABELS[prospect.source]} />
                                    <Info label="Dirujuk oleh" value={prospect.referred_by_agent_name} />
                                    <Info label="Minat produk" value={prospect.product_interest ? productLabel(prospect.product_interest) : null} />
                                    <Info label="Perkiraan premi" value={prospect.expected_premium ? fmtIDR(prospect.expected_premium) : null} />
                                    <Info label="Tindak lanjut" value={prospect.follow_up_date ? fmtDate(prospect.follow_up_date) : null} />
                                    <Info label="Asuransi saat ini" value={prospect.competitor_insurer} />
                                    <Info label="No. polis saat ini" value={prospect.competitor_policy_number} />
                                    <Info label="Polis berakhir" value={prospect.competitor_expiry ? fmtDate(prospect.competitor_expiry) : null} />
                                    <Info label="Premi saat ini" value={prospect.competitor_premium ? fmtIDR(prospect.competitor_premium) : null} />
                                    <Info label="Nasabah" value={prospect.customer_name} />
                                </Grid>
                                {prospect.notes && <Text mt="16px" color="#475569" fontSize="15px" whiteSpace="pre-wrap">{prospect.notes}</Text>}
                            </Box>

                            <Box bg="white" borderRadius="12px" border="1px solid" borderColor="#E2E8F0" p="24px">
                                <Flex justify="space-between" align="center" gap="8px" mb="16px" flexWrap="wrap">
                                    <Flex align="center" gap="8px">
                                        <LuFileText size={16} color="#1A3557" />
                                        <Text color="#1C2833" fontSize="16px" fontWeight="semibold">Penawaran ({quotes.length})</Text>
                                    </Flex>
                                    {!closed && <Button size="sm" bg="#1A3557" color="white" fontSize="15px" _hover={{ bg: "#162C47" }} onClick={() => setDialog("quote")}><LuPlus size={13} /> Buat Penawaran</Button>}
                                </Flex>
                                {quotes.length === 0 ? (
                                    <Text color="#64748B" fontSize="15px">Belum ada penawaran. Buat penawaran dan bandingkan beberapa asuransi sekaligus.</Text>
                                ) : (
                                    <Flex flexDir="column" gap="8px">
                                        {quotes.map(q => (
                                            <Flex key={q.quote_id} as="button" textAlign="left" justify="space-between" align="center" gap="12px" p="12px 14px" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" cursor="pointer" _hover={{ bg: "#F8FAFC" }}
                                                onClick={() => router.push(`/agentra/quotes/${encodeURIComponent(q.quote_id)}`)}>
                                                <Flex flexDir="column" gap="2px" minW="0">
                                                    <Flex align="center" gap="8px" flexWrap="wrap">
                                                        <Text color="#1D4ED8" fontSize="15px" fontWeight="semibold">{q.quote_number}</Text>
                                                        <QuoteStatusBadge status={q.status} expired={q.is_expired} />
                                                    </Flex>
                                                    <Text color="#64748B" fontSize="14px">
                                                        {productLabel(q.product_type)} · Nilai {fmtIDR(q.sum_insured)} · {q.option_count} asuransi
                                                        {q.lowest_premium !== null ? ` · mulai ${fmtIDR(q.lowest_premium)}` : ""}
                                                    </Text>
                                                </Flex>
                                                <Text color="#64748B" fontSize="14px" flexShrink={0}>{fmtDate(q.created_at)}</Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                )}
                            </Box>
                        </>
                    )}
                </Flex>
            </Box>

            {prospect && dialog === "edit" && <ProspectDialog type={prospect.prospect_type} editing={prospect} onClose={() => setDialog(null)} onSaved={(p) => { setProspect(p); setDialog(null) }} />}
            {prospect && dialog === "lost" && <LostDialog prospect={prospect} onClose={() => setDialog(null)} onSaved={(p) => { setProspect(p); setDialog(null) }} />}
            {prospect && dialog === "convert" && <ConvertDialog prospect={prospect} onClose={() => setDialog(null)} onConverted={(p) => { setProspect(p); setDialog(null) }} />}
            {prospect && dialog === "quote" && <QuoteDialog prospect={prospect} editing={null} onClose={() => setDialog(null)}
                onSaved={(q) => { setDialog(null); router.push(`/agentra/quotes/${encodeURIComponent(q.quote_id)}`) }} />}

            <MobileBottomNav />
        </Box>
    )
}
