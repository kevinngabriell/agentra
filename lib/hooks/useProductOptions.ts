"use client"

import { useEffect, useState } from "react"
import { getAccessToken } from "@/lib/auth/session"
import { getMasterProducts, type ApiMasterProduct } from "@/lib/api/master-products"

// Policies, quotes and prospects store the company's own product code (master products: "01", "kebakaran",
// "61"...), not a fixed enum, so pickers and labels come from the master products. Codes created before the
// master products existed keep a readable name through LEGACY_PRODUCT_LABELS.

export const LEGACY_PRODUCT_LABELS: Record<string, string> = {
    fire: "Kebakaran", motorcycle: "Motor", car: "Mobil", travel: "Perjalanan", cargo: "Kargo",
    other: "Lainnya", kecelakaan: "Kecelakaan Diri", aep: "AEP",
}

let cache: Promise<ApiMasterProduct[]> | null = null

function loadProducts(): Promise<ApiMasterProduct[]> {
    const token = getAccessToken()
    if (!token) return Promise.resolve([])
    cache ??= getMasterProducts(token).catch(() => { cache = null; return [] })
    return cache
}

/** Drops the cached list, e.g. after products were edited in Settings. */
export function invalidateProductOptions() { cache = null }

export function useProductOptions() {
    const [products, setProducts] = useState<ApiMasterProduct[]>([])
    useEffect(() => {
        let cancelled = false
        loadProducts().then((p) => { if (!cancelled) setProducts(p) })
        return () => { cancelled = true }
    }, [])

    const options = products
        .filter((p) => Number(p.is_active) === 1)
        .map((p) => ({ value: p.product_code, label: p.product_name }))

    function label(code: string | null | undefined): string {
        if (!code) return "—"
        const p = products.find((x) => x.product_code.toLowerCase() === code.toLowerCase())
        return p?.product_name ?? LEGACY_PRODUCT_LABELS[code] ?? code
    }

    return { products, options, label }
}
