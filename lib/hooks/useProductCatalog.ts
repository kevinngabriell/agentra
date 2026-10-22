"use client"

import { useEffect, useState } from "react"
import { getAccessToken } from "@/lib/auth/session"
import {
    getMasterProducts, getProductTypes,
    type ApiMasterProduct, type ApiProductTypeInfo,
} from "@/lib/api/master-products"

/**
 * Master products plus the fixed product-type catalogue, so a form can ask what its product's
 * type offers (risk group, construction class) instead of hardcoding product codes.
 * A failed fetch leaves both lists empty and sets `error`, which callers should show.
 */
export function useProductCatalog() {
    const [products, setProducts] = useState<ApiMasterProduct[]>([])
    const [types, setTypes]       = useState<ApiProductTypeInfo[]>([])
    const [error, setError]       = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getMasterProducts(token).then((p) => { if (!cancelled) setProducts(p) }).catch(() => {})
        getProductTypes(token).then((t) => { if (!cancelled) setTypes(t) })
            .catch(() => { if (!cancelled) setError("Jenis produk belum bisa dimuat, sehingga kolom khusus produk (mis. kelas konstruksi) tidak tampil. Muat ulang halaman.") })
        return () => { cancelled = true }
    }, [])

    /** The catalogue entry for a product code, or null when the product is unknown or unclassified. */
    function typeInfoOf(productCode: string): ApiProductTypeInfo | null {
        const code = productCode.trim().toLowerCase()
        const type = products.find((p) => p.product_code.toLowerCase() === code)?.product_type
        return (type && types.find((t) => t.product_type === type)) || null
    }

    return { products, types, typeInfoOf, error }
}
