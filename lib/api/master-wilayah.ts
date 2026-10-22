import { apiFetchOr, withQuery } from "./client"

// A 404 from these endpoints means "no data synced for this parent yet" —
// expected while the wilayah sync is in progress, not an error — so it
// resolves to an empty list instead of throwing.
async function reqWilayah<T>(path: string, token: string): Promise<T[]> {
    const res = await apiFetchOr<T[] | { data?: T[] } | null>(`/master-wilayah${path}`, { token }, null)
    // Paginated envelope is `data: { data: [...] }`; accept a flat `data: [...]` too.
    return Array.isArray(res) ? res : res?.data ?? []
}

export interface ApiWilayahProvince {
    province_id: string
    province_code: string
    province_name: string
}

export interface ApiWilayahCity {
    city_id: string
    province_id: string
    city_code: string
    city_name: string
}

export interface ApiWilayahDistrict {
    district_id: string
    city_id: string
    district_code: string
    district_name: string
}

export interface ApiWilayahVillage {
    village_id: string
    district_id: string
    village_code: string
    village_name: string
    /** 5-digit kode pos; only present once the API has the postal-code dataset imported. */
    postal_code?: string | null
}

// Provinces and cities are public on the API (the registration form has no session yet).
async function reqWilayahPublic<T>(path: string): Promise<T[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/master-wilayah${path}`, { cache: "no-store" })
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json().catch(() => ({}))) as { data?: T[] | { data?: T[] } }
    const data = json.data
    return Array.isArray(data) ? data : data?.data ?? []
}

export async function getWilayahProvinces(token?: string): Promise<ApiWilayahProvince[]> {
    return token ? reqWilayah<ApiWilayahProvince>('/provinces', token) : reqWilayahPublic<ApiWilayahProvince>('/provinces')
}

export async function getWilayahCities(token: string | undefined, provinceCode: string): Promise<ApiWilayahCity[]> {
    const path = withQuery('/cities', new URLSearchParams({ province_code: provinceCode }))
    return token ? reqWilayah<ApiWilayahCity>(path, token) : reqWilayahPublic<ApiWilayahCity>(path)
}

export async function getWilayahDistricts(token: string, cityCode: string): Promise<ApiWilayahDistrict[]> {
    return reqWilayah<ApiWilayahDistrict>(withQuery('/districts', new URLSearchParams({ city_code: cityCode })), token)
}

export async function getWilayahVillages(token: string, districtCode: string): Promise<ApiWilayahVillage[]> {
    return reqWilayah<ApiWilayahVillage>(withQuery('/villages', new URLSearchParams({ district_code: districtCode })), token)
}
