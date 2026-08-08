const BASE_URL = process.env.NEXT_PUBLIC_API_URL

// A 404 from these endpoints means "no data synced for this parent yet" —
// expected while the wilayah sync is in progress, not an error — so it
// resolves to an empty list instead of throwing.
async function reqWilayah<T>(path: string, token: string): Promise<T[]> {
    const res = await fetch(`${BASE_URL}/api/v1/master-wilayah${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 404) return []
    const json = await res.json()
    if (!res.ok) {
        const err: any = new Error(json.status_message || 'Request failed')
        err.status = res.status
        throw err
    }
    return json.data?.data ?? []
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
}

export async function getWilayahProvinces(token: string): Promise<ApiWilayahProvince[]> {
    return reqWilayah<ApiWilayahProvince>('/provinces', token)
}

export async function getWilayahCities(token: string, provinceCode: string): Promise<ApiWilayahCity[]> {
    return reqWilayah<ApiWilayahCity>(`/cities?province_code=${encodeURIComponent(provinceCode)}`, token)
}

export async function getWilayahDistricts(token: string, cityCode: string): Promise<ApiWilayahDistrict[]> {
    return reqWilayah<ApiWilayahDistrict>(`/districts?city_code=${encodeURIComponent(cityCode)}`, token)
}

export async function getWilayahVillages(token: string, districtCode: string): Promise<ApiWilayahVillage[]> {
    return reqWilayah<ApiWilayahVillage>(`/villages?district_code=${encodeURIComponent(districtCode)}`, token)
}
