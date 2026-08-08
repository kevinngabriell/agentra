"use client"

import { useEffect, useState } from "react"
import { getAccessToken } from "@/lib/auth/session"
import {
    getWilayahProvinces, getWilayahCities, getWilayahDistricts, getWilayahVillages,
    type ApiWilayahProvince, type ApiWilayahCity, type ApiWilayahDistrict, type ApiWilayahVillage,
} from "@/lib/api/master-wilayah"

export interface RiskLocationNames {
    risk_province: string
    risk_city: string
    risk_district: string
    risk_village: string
}

// Drives the Province → City → District → Village cascade for the policy
// risk-location fields. risk_* columns are still plain free text (no FK to
// master-wilayah), so this only ever writes *_name strings back via onChange —
// the *_code values are kept internally just to drive the next fetch.
//
// A level falls back to "manual" (its select is replaced by a plain text
// input bound directly to the *_name field) once its own fetch confirms
// there's no data for the chosen parent yet (API returns 404 for most
// provinces today), and that manual state cascades to every level below it
// since there's no *_code left to chain from.
export function useWilayahCascade(
    initial: RiskLocationNames,
    onChange: (patch: Partial<RiskLocationNames>) => void,
) {
    const [provinces, setProvinces] = useState<ApiWilayahProvince[]>([])
    const [provinceCode, setProvinceCode] = useState("")

    const [cities, setCities] = useState<ApiWilayahCity[]>([])
    const [cityCode, setCityCode] = useState("")
    const [cityManual, setCityManual] = useState(false)
    const [cityLoading, setCityLoading] = useState(false)

    const [districts, setDistricts] = useState<ApiWilayahDistrict[]>([])
    const [districtCode, setDistrictCode] = useState("")
    const [districtManual, setDistrictManual] = useState(false)
    const [districtLoading, setDistrictLoading] = useState(false)

    const [villages, setVillages] = useState<ApiWilayahVillage[]>([])
    const [villageCode, setVillageCode] = useState("")
    const [villageManual, setVillageManual] = useState(false)
    const [villageLoading, setVillageLoading] = useState(false)

    // Load provinces once; try to preselect from an existing free-text value
    // (e.g. an already-saved policy being edited).
    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        getWilayahProvinces(token).then(list => {
            setProvinces(list)
            if (initial.risk_province) {
                const match = list.find(p => p.province_name.toLowerCase() === initial.risk_province.toLowerCase())
                if (match) setProvinceCode(match.province_code)
            }
        }).catch(() => {})
        // Only meant to run once on mount, using whatever `initial` was at that time.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // province → cities
    useEffect(() => {
        setCities([]); setCityCode(""); setCityManual(false)
        setDistricts([]); setDistrictCode(""); setDistrictManual(false)
        setVillages([]); setVillageCode(""); setVillageManual(false)
        if (!provinceCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        setCityLoading(true)
        getWilayahCities(token, provinceCode).then(list => {
            if (cancelled) return
            setCities(list)
            setCityManual(list.length === 0)
            if (list.length && initial.risk_city) {
                const match = list.find(c => c.city_name.toLowerCase() === initial.risk_city.toLowerCase())
                if (match) setCityCode(match.city_code)
            }
        }).finally(() => { if (!cancelled) setCityLoading(false) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provinceCode])

    // city → districts
    useEffect(() => {
        setDistricts([]); setDistrictCode(""); setDistrictManual(false)
        setVillages([]); setVillageCode(""); setVillageManual(false)
        if (!cityCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        setDistrictLoading(true)
        getWilayahDistricts(token, cityCode).then(list => {
            if (cancelled) return
            setDistricts(list)
            setDistrictManual(list.length === 0)
            if (list.length && initial.risk_district) {
                const match = list.find(d => d.district_name.toLowerCase() === initial.risk_district.toLowerCase())
                if (match) setDistrictCode(match.district_code)
            }
        }).finally(() => { if (!cancelled) setDistrictLoading(false) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cityCode])

    // district → villages
    useEffect(() => {
        setVillages([]); setVillageCode(""); setVillageManual(false)
        if (!districtCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        setVillageLoading(true)
        getWilayahVillages(token, districtCode).then(list => {
            if (cancelled) return
            setVillages(list)
            setVillageManual(list.length === 0)
            if (list.length && initial.risk_village) {
                const match = list.find(v => v.village_name.toLowerCase() === initial.risk_village.toLowerCase())
                if (match) setVillageCode(match.village_code)
            }
        }).finally(() => { if (!cancelled) setVillageLoading(false) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [districtCode])

    function selectProvince(code: string) {
        setProvinceCode(code)
        const p = provinces.find(p => p.province_code === code)
        onChange({ risk_province: p?.province_name ?? "", risk_city: "", risk_district: "", risk_village: "" })
    }
    function selectCity(code: string) {
        setCityCode(code)
        const c = cities.find(c => c.city_code === code)
        onChange({ risk_city: c?.city_name ?? "", risk_district: "", risk_village: "" })
    }
    function selectDistrict(code: string) {
        setDistrictCode(code)
        const d = districts.find(d => d.district_code === code)
        onChange({ risk_district: d?.district_name ?? "", risk_village: "" })
    }
    function selectVillage(code: string) {
        setVillageCode(code)
        const v = villages.find(v => v.village_code === code)
        onChange({ risk_village: v?.village_name ?? "" })
    }

    // A manual ancestor means there's no *_code to chain the next fetch off
    // of, so every level below it must also fall back to free text.
    const cityIsManual = cityManual
    const districtIsManual = districtManual || cityIsManual
    const villageIsManual = villageManual || districtIsManual

    return {
        provinces, provinceCode, selectProvince,
        cities, cityCode, cityManual: cityIsManual, cityLoading, selectCity,
        districts, districtCode, districtManual: districtIsManual, districtLoading, selectDistrict,
        villages, villageCode, villageManual: villageIsManual, villageLoading, selectVillage,
    }
}
