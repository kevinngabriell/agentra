"use client"

import { useEffect, useState } from "react"
import { Badge } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { checkTariff, type TariffCheck } from "@/lib/api/tariffs"

/**
 * Small badge comparing a rate with the company's tariff band (Pengaturan → Tarif & Okupasi).
 * Shows nothing while loading, when the rate is inside the band, or when no band exists for the combination
 * (unless `showMissing`), so it only draws attention to rates that need a second look.
 */
export function TariffBadge({ params, showMissing = false }: { params: Record<string, string | number> | null; showMissing?: boolean }) {
    const [result, setResult] = useState<{ key: string; res: TariffCheck | null } | null>(null)
    const key = params ? JSON.stringify(params) : ""

    useEffect(() => {
        const token = getAccessToken()
        if (!token || !key) return
        let cancelled = false
        checkTariff(token, JSON.parse(key))
            .then((r) => { if (!cancelled) setResult({ key, res: r }) })
            .catch(() => { if (!cancelled) setResult({ key, res: null }) })
        return () => { cancelled = true }
    }, [key])

    const res = key && result?.key === key ? result.res : null
    if (!res) return null
    if (res.verdict === "within") return null
    if (res.verdict === "no_band") {
        return showMissing ? <Badge fontSize="14px" bg="#F1F5F9" color="#64748B" title="Isi rentang tarif di Pengaturan → Tarif & Okupasi">Tarif belum diisi</Badge> : null
    }
    const b = res.band
    const range = b ? `${b.rate_min ?? "?"}–${b.rate_max ?? "?"}‰` : ""
    return (
        <Badge fontSize="14px" bg="#FEE2E2" color="#B91C1C" title={b?.description ?? undefined}>
            {res.verdict === "below" ? "Di bawah tarif" : "Di atas tarif"} {range}
        </Badge>
    )
}
