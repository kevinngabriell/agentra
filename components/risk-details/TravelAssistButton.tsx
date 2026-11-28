"use client"

import { useEffect, useState } from "react"
import { Button, Text } from "@chakra-ui/react"
import { FaWhatsapp } from "react-icons/fa"
import { getAccessToken } from "@/lib/auth/session"
import { getRiskDetails, type PolicyRiskDetails } from "@/lib/api/risk-details"
import { whatsappUrl } from "@/lib/format"

/**
 * Travel: sends the traveller(s) the insurer's 24-hour assistance number, certificate numbers and cover
 * before departure, through a prefilled WhatsApp message the agent sends (wa.me). The roster is loaded up
 * front so the click can open WhatsApp synchronously (a window opened after an await is blocked as a popup).
 */
export function TravelAssistButton({ policyNumber, policyId, insurerName, assistancePhone, whatsapp, coverageStart, coverageEnd }: {
    policyNumber: string; policyId: string; insurerName: string; assistancePhone: string | null | undefined
    whatsapp: string | null | undefined; coverageStart: string; coverageEnd: string
}) {
    const [risk, setRisk] = useState<PolicyRiskDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const base = whatsapp ? whatsappUrl(whatsapp) : null

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getRiskDetails(token, policyId).then((r) => { if (!cancelled) setRisk(r) }).catch(() => {})
        return () => { cancelled = true }
    }, [policyId])

    function send() {
        setError(null)
        if (!base) { setError("Nasabah belum punya nomor WhatsApp"); return }
        const travellers = (risk?.members ?? []).filter((m) => m.member_role === "traveller")
            .map((m) => `- ${m.full_name}${m.certificate_number ? ` (sertifikat ${m.certificate_number})` : ""}`)
        const d = risk?.details
        const medical = d?.medical_limit ? `Limit biaya medis: ${d.benefit_currency ?? ""} ${Number(d.medical_limit).toLocaleString("id-ID")}\n` : ""
        const text = `Selamat jalan! Berikut info asuransi perjalanan Anda.\n\nPolis: ${policyNumber} (${insurerName})\nPeriode: ${coverageStart} s/d ${coverageEnd}\n`
            + medical
            + (travellers.length ? `Peserta:\n${travellers.join("\n")}\n` : "")
            + `\nBantuan darurat 24 jam: ${assistancePhone ?? "(hubungi agen)"}\nSimpan nomor ini dan tunjukkan sertifikat bila dirawat di luar negeri.`
        window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
    }

    return (
        <>
            <Button size="sm" variant="outline" fontSize="14px" gap="6px" onClick={send} w="max-content">
                <FaWhatsapp color="#25D366" size={14} /> Kirim info darurat sebelum berangkat
            </Button>
            {!assistancePhone && <Text fontSize="13px" color="#B45309">Nomor darurat 24 jam penanggung belum diisi (Pengaturan → Asuransi).</Text>}
            {error && <Text fontSize="13px" color="#DC2626">{error}</Text>}
        </>
    )
}
