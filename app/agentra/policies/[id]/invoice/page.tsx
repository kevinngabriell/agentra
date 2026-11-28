"use client"

import { use, useEffect, useState } from "react"
import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuPrinter } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getPolicyDetail, type ApiPolicyDetail } from "@/lib/api/policies"
import { getPolicyPayments, type PolicyPayments } from "@/lib/api/payments"
import { ENDORSEMENT_TYPE_LABELS, getPolicyEndorsements, type PolicyEndorsement } from "@/lib/api/endorsements"
import { fmtIDR } from "@/lib/format"
import { useProductOptions } from "@/lib/hooks/useProductOptions"

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <Flex justify="space-between" py="6px" borderBottom="1px solid" borderColor="#E2E8F0" fontWeight={bold ? "bold" : "normal"}>
            <Text fontSize="15px">{label}</Text>
            <Text fontSize="15px">{value}</Text>
        </Flex>
    )
}

/** Printable debit note / invoice for a policy. "Cetak / Simpan PDF" opens the browser print dialog. */
export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const productCatalog = useProductOptions()
    const [state, setState] = useState<{ policy: ApiPolicyDetail; payments: PolicyPayments; note: PolicyEndorsement | null } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        // ?note=<endorsement_id> prints that endorsement's debit / credit note instead of the policy's.
        const noteId = new URLSearchParams(window.location.search).get("note")
        Promise.all([getPolicyDetail(token, id), getPolicyPayments(token, id), noteId ? getPolicyEndorsements(token, id) : Promise.resolve(null)])
            .then(([policy, payments, ends]) => setState({ policy, payments, note: ends?.items.find((e) => e.endorsement_id === noteId) ?? null }))
            .catch((err: unknown) => setError(errorMessage(err, "Invoice belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [id])

    if (error) return <Text p="24px" color="#DC2626">{error}</Text>
    if (!state) return <Box p="24px"><Skeleton h="400px" maxW="720px" mx="auto" /></Box>

    const { policy: p, payments, note } = state
    if (note) return <EndorsementNote policy={p} note={note} productName={productCatalog.label(p.product_type)} />
    // The API answers numbers as strings: convert before adding (string "+" would concatenate).
    // This is the ORIGINAL debit note: endorsements are billed on their own notes.
    const premium = Number(p.issued_premium_amount ?? p.premium_amount) || 0
    const materai = Number(p.materai_amount ?? 0) || 0
    const biayaPolis = Number(p.biaya_polis ?? 0) || 0
    const gross = premium + materai + biayaPolis
    const total = payments.expected_amount
    const discount = gross - total
    const insuredName = p.qq_name || p.insured_name || p.customer_name
    const endorsementCount = p.billing?.endorsement_count ?? 0

    return (
        <Box bg="#F1F5F9" minH="100vh" py="24px" px="16px" css={{ "@media print": { background: "white", padding: 0 } }}>
            <Flex maxW="720px" mx="auto" mb="12px" justify="flex-end" css={{ "@media print": { display: "none" } }}>
                <Button size="sm" bg="#0D1B3E" color="white" gap="6px" onClick={() => window.print()}><LuPrinter size={14} /> Cetak / Simpan PDF</Button>
            </Flex>
            <Box maxW="720px" mx="auto" bg="white" p={{ base: "20px", md: "40px" }} borderRadius="8px" border="1px solid" borderColor="#E2E8F0" color="#1C2833">
                <Flex justify="space-between" align="flex-start" mb="24px" gap="12px" flexWrap="wrap">
                    <Box>
                        <Text fontSize="20px" fontWeight="bold">DEBIT NOTE</Text>
                        {payments.debit_note_number && <Text fontSize="15px" fontWeight="semibold">No. {payments.debit_note_number}</Text>}
                        <Text fontSize="14px" color="#64748B">Polis {p.policy_number}</Text>
                    </Box>
                    <Box textAlign="right">
                        <Text fontSize="14px" color="#64748B">Tanggal terbit</Text>
                        <Text fontSize="15px" fontWeight="semibold">{fmtDate(new Date().toISOString())}</Text>
                        <Text fontSize="14px" color="#64748B" mt="6px">Jatuh tempo</Text>
                        <Text fontSize="15px" fontWeight="semibold">{fmtDate(payments.effective_due_date)}</Text>
                    </Box>
                </Flex>

                <Box mb="20px">
                    <Text fontSize="13px" color="#64748B">Kepada</Text>
                    <Text fontSize="15px" fontWeight="semibold">{p.customer_name}</Text>
                    {insuredName !== p.customer_name && <Text fontSize="14px">Tertanggung: {insuredName}</Text>}
                </Box>

                <Box mb="20px" fontSize="14px">
                    <Text><b>Penanggung:</b> {p.insurer_name}</Text>
                    <Text><b>Produk:</b> {productCatalog.label(p.product_type)}{p.object_insured ? ` · ${p.object_insured}` : ""}</Text>
                    <Text><b>Periode:</b> {fmtDate(p.coverage_start)} – {fmtDate(p.coverage_end)}</Text>
                    <Text><b>Nilai pertanggungan:</b> {fmtIDR(Number(p.sum_insured))}{p.currency && p.currency !== "IDR" && p.sum_insured_fc ? ` (${p.currency} ${Number(p.sum_insured_fc).toLocaleString("id-ID")})` : ""}</Text>
                </Box>

                <Row label="Premi" value={fmtIDR(premium)} />
                {materai > 0 && <Row label="Biaya materai" value={fmtIDR(materai)} />}
                {biayaPolis > 0 && <Row label="Biaya polis" value={fmtIDR(biayaPolis)} />}
                {discount > 0 && <Row label="Potongan" value={`- ${fmtIDR(discount)}`} />}
                <Row label="Total yang harus dibayar" value={fmtIDR(total)} bold />

                {payments.installments.length > 0 && (
                    <Box mt="20px">
                        <Text fontSize="14px" fontWeight="semibold" mb="4px">Jadwal cicilan</Text>
                        {payments.installments.map((i) => (
                            <Row key={i.installment_id} label={`Cicilan ${i.seq} · ${fmtDate(i.due_date)}${i.is_paid ? " (lunas)" : ""}`} value={fmtIDR(i.amount)} />
                        ))}
                    </Box>
                )}

                {endorsementCount > 0 && (
                    <Text mt="16px" fontSize="13px" color="#64748B">
                        Polis ini memiliki {endorsementCount} nota endorsemen yang ditagih terpisah (lihat panel Nota &amp; Endorsemen).
                    </Text>
                )}

                <Text mt="24px" fontSize="13px" color="#64748B">
                    Mohon lakukan pembayaran sebelum tanggal jatuh tempo dan sertakan nomor polis pada berita transfer.
                </Text>
            </Box>
        </Box>
    )
}

/** Printable endorsement debit note (additional premium) or credit note (refund). */
function EndorsementNote({ policy: p, note: n, productName }: { policy: ApiPolicyDetail; note: PolicyEndorsement; productName: string }) {
    const credit = n.note_type === "credit"
    const abs = (v: number) => Math.abs(v)
    return (
        <Box bg="#F1F5F9" minH="100vh" py="24px" px="16px" css={{ "@media print": { background: "white", padding: 0 } }}>
            <Flex maxW="720px" mx="auto" mb="12px" justify="flex-end" css={{ "@media print": { display: "none" } }}>
                <Button size="sm" bg="#0D1B3E" color="white" gap="6px" onClick={() => window.print()}><LuPrinter size={14} /> Cetak / Simpan PDF</Button>
            </Flex>
            <Box maxW="720px" mx="auto" bg="white" p={{ base: "20px", md: "40px" }} borderRadius="8px" border="1px solid" borderColor="#E2E8F0" color="#1C2833">
                <Flex justify="space-between" align="flex-start" mb="24px" gap="12px" flexWrap="wrap">
                    <Box>
                        <Text fontSize="20px" fontWeight="bold">{credit ? "CREDIT NOTE" : "DEBIT NOTE"}</Text>
                        <Text fontSize="15px" fontWeight="semibold">No. {n.note_number ?? "—"}</Text>
                        <Text fontSize="14px" color="#64748B">Polis {p.policy_number}{n.endorsement_number ? ` · Endorsemen ${n.endorsement_number}` : ""}</Text>
                    </Box>
                    <Box textAlign="right">
                        <Text fontSize="14px" color="#64748B">Berlaku efektif</Text>
                        <Text fontSize="15px" fontWeight="semibold">{fmtDate(n.effective_date)}</Text>
                        {n.due_date && (
                            <>
                                <Text fontSize="14px" color="#64748B" mt="6px">{credit ? "Dikembalikan paling lambat" : "Jatuh tempo"}</Text>
                                <Text fontSize="15px" fontWeight="semibold">{fmtDate(n.due_date)}</Text>
                            </>
                        )}
                    </Box>
                </Flex>
                <Box mb="20px">
                    <Text fontSize="13px" color="#64748B">Kepada</Text>
                    <Text fontSize="15px" fontWeight="semibold">{p.customer_name}</Text>
                    {p.qq_name && p.qq_name !== p.customer_name && <Text fontSize="14px">Tertanggung: {p.qq_name}</Text>}
                </Box>
                <Box mb="20px" fontSize="14px">
                    <Text><b>Penanggung:</b> {p.insurer_name}</Text>
                    <Text><b>Produk:</b> {productName}</Text>
                    <Text><b>Endorsemen:</b> {ENDORSEMENT_TYPE_LABELS[n.endorsement_type]}{n.description ? ` — ${n.description}` : ""}</Text>
                    <Text><b>Periode polis:</b> {fmtDate(p.coverage_start)} – {fmtDate(p.coverage_end)}</Text>
                </Box>
                <Row label={credit ? "Pengembalian premi" : "Premi tambahan"} value={fmtIDR(abs(n.premium_delta))} />
                {n.materai_amount > 0 && <Row label="Biaya materai" value={fmtIDR(n.materai_amount)} />}
                {n.biaya_polis > 0 && <Row label="Biaya endorsemen" value={fmtIDR(n.biaya_polis)} />}
                <Row label={credit ? "Total dikembalikan ke nasabah" : "Total yang harus dibayar"} value={fmtIDR(abs(n.gross_amount))} bold />
                <Text mt="24px" fontSize="13px" color="#64748B">
                    {credit ? "Pengembalian dihitung dari sisa periode pertanggungan sesuai ketentuan polis." : "Mohon lakukan pembayaran sebelum jatuh tempo dan sertakan nomor nota pada berita transfer."}
                </Text>
            </Box>
        </Box>
    )
}

