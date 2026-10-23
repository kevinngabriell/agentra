"use client"

import { use, useEffect, useState } from "react"
import { Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react"
import { LuPrinter } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { getPolicyDetail, type ApiPolicyDetail } from "@/lib/api/policies"
import { getPolicyPayments, type PolicyPayments } from "@/lib/api/payments"
import { fmtIDR } from "@/lib/format"

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <Flex justify="space-between" py="6px" borderBottom="1px solid" borderColor="#E2E8F0" fontWeight={bold ? "bold" : "normal"}>
            <Text fontSize="16px">{label}</Text>
            <Text fontSize="16px">{value}</Text>
        </Flex>
    )
}

/** Printable debit note / invoice for a policy. "Cetak / Simpan PDF" opens the browser print dialog. */
export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [state, setState] = useState<{ policy: ApiPolicyDetail; payments: PolicyPayments } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        Promise.all([getPolicyDetail(token, id), getPolicyPayments(token, id)])
            .then(([policy, payments]) => setState({ policy, payments }))
            .catch((err: unknown) => setError(errorMessage(err, "Invoice belum bisa dibuka. Periksa sinyal internet, lalu coba lagi.")))
    }, [id])

    if (error) return <Text p="24px" color="#DC2626">{error}</Text>
    if (!state) return <Box p="24px"><Skeleton h="400px" maxW="720px" mx="auto" /></Box>

    const { policy: p, payments } = state
    const gross = p.premium_amount + (p.materai_amount ?? 0) + (p.biaya_polis ?? 0)
    const total = payments.expected_amount
    const discount = gross - total
    const insuredName = p.insured_name || p.customer_name

    return (
        <Box bg="#F1F5F9" minH="100vh" py="24px" px="16px" css={{ "@media print": { background: "white", padding: 0 } }}>
            <Flex maxW="720px" mx="auto" mb="12px" justify="flex-end" css={{ "@media print": { display: "none" } }}>
                <Button size="sm" bg="#1A3557" color="white" gap="6px" onClick={() => window.print()}><LuPrinter size={14} /> Cetak / Simpan PDF</Button>
            </Flex>
            <Box maxW="720px" mx="auto" bg="white" p={{ base: "20px", md: "40px" }} borderRadius="8px" border="1px solid" borderColor="#E2E8F0" color="#1C2833">
                <Flex justify="space-between" align="flex-start" mb="24px" gap="12px" flexWrap="wrap">
                    <Box>
                        <Text fontSize="22px" fontWeight="bold">DEBIT NOTE</Text>
                        <Text fontSize="15px" color="#64748B">Polis {p.policy_number}</Text>
                    </Box>
                    <Box textAlign="right">
                        <Text fontSize="15px" color="#64748B">Tanggal terbit</Text>
                        <Text fontSize="16px" fontWeight="semibold">{fmtDate(new Date().toISOString())}</Text>
                        <Text fontSize="15px" color="#64748B" mt="6px">Jatuh tempo</Text>
                        <Text fontSize="16px" fontWeight="semibold">{fmtDate(payments.effective_due_date)}</Text>
                    </Box>
                </Flex>

                <Box mb="20px">
                    <Text fontSize="14px" color="#64748B">Kepada</Text>
                    <Text fontSize="16px" fontWeight="semibold">{p.customer_name}</Text>
                    {insuredName !== p.customer_name && <Text fontSize="15px">Tertanggung: {insuredName}</Text>}
                </Box>

                <Box mb="20px" fontSize="15px">
                    <Text><b>Penanggung:</b> {p.insurer_name}</Text>
                    <Text><b>Produk:</b> {p.product_type}{p.object_insured ? ` · ${p.object_insured}` : ""}</Text>
                    <Text><b>Periode:</b> {fmtDate(p.coverage_start)} – {fmtDate(p.coverage_end)}</Text>
                    <Text><b>Nilai pertanggungan:</b> {fmtIDR(p.sum_insured)}</Text>
                </Box>

                <Row label="Premi" value={fmtIDR(p.premium_amount)} />
                {!!p.materai_amount && <Row label="Biaya materai" value={fmtIDR(p.materai_amount)} />}
                {!!p.biaya_polis && <Row label="Biaya polis" value={fmtIDR(p.biaya_polis)} />}
                {discount > 0 && <Row label="Potongan" value={`- ${fmtIDR(discount)}`} />}
                <Row label="Total yang harus dibayar" value={fmtIDR(total)} bold />

                {payments.installments.length > 0 && (
                    <Box mt="20px">
                        <Text fontSize="15px" fontWeight="semibold" mb="4px">Jadwal cicilan</Text>
                        {payments.installments.map((i) => (
                            <Row key={i.installment_id} label={`Cicilan ${i.seq} · ${fmtDate(i.due_date)}${i.is_paid ? " (lunas)" : ""}`} value={fmtIDR(i.amount)} />
                        ))}
                    </Box>
                )}

                <Text mt="24px" fontSize="14px" color="#64748B">
                    Mohon lakukan pembayaran sebelum tanggal jatuh tempo dan sertakan nomor polis pada berita transfer.
                </Text>
            </Box>
        </Box>
    )
}
