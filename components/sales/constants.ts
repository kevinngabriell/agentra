export const PRODUCT_OPTIONS = [
    { value: "car", label: "Kendaraan Mobil" },
    { value: "motorcycle", label: "Kendaraan Motor" },
    { value: "fire", label: "Kebakaran" },
    { value: "cargo", label: "Kargo" },
    { value: "travel", label: "Perjalanan" },
    { value: "kecelakaan", label: "Kecelakaan Diri" },
    { value: "aep", label: "AEP" },
    { value: "other", label: "Lainnya" },
]

export function productLabel(code: string | null | undefined): string {
    if (!code) return "—"
    return PRODUCT_OPTIONS.find(p => p.value === code)?.label ?? code
}

export function fmtDate(iso: string | null | undefined): string {
    return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}
