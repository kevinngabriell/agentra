"use client"

import { useEffect, useRef, useState } from "react"
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

// Picking a village also reports its postal code (when the API knows it) so the form can prefill it.
export type RiskLocationPatch = Partial<RiskLocationNames> & { risk_postal_code?: string }

// Result of one level's fetch, tagged with the parent code it was fetched for so a
// response for a parent the user already moved away from is never shown.
interface Level<T> {
    parent: string
    list: T[]
    manual: boolean
}

// Drives the Province → City → District → Village cascade for the policy
// risk-location fields. risk_* columns are still plain free text (no FK to
// master-wilayah), so this only ever writes *_name strings back via onChange —
// the *_code values are kept internally just to drive the next fetch.
//
// A level falls back to "manual" (its select is replaced by a plain text
// input bound directly to the *_name field) once its own fetch confirms
// there's no data for the chosen parent yet (API returns 404 for most
// provinces today) or the fetch fails, and that manual state cascades to every
// level below it since there's no *_code left to chain from.
//
// Child selections are reset in the select handlers (not in effects), and
// loading flags are derived from "fetched for which parent", so the effects only
// ever set state from async callbacks.
export function useWilayahCascade(
    initial: RiskLocationNames,
    onChange: (patch: RiskLocationPatch) => void,
) {
    // Only the values present when the cascade mounts are used to preselect saved
    // names (e.g. an already-saved policy being edited); once the user picks
    // anything, auto-matching stops.
    const initialRef = useRef(initial)
    const autoMatch = useRef(true)

    const [provinces, setProvinces] = useState<ApiWilayahProvince[]>([])
    const [provinceManual, setProvinceManual] = useState(false)
    const [provinceCode, setProvinceCode] = useState("")

    const [cityLevel, setCityLevel] = useState<Level<ApiWilayahCity> | null>(null)
    const [cityCode, setCityCode] = useState("")

    const [districtLevel, setDistrictLevel] = useState<Level<ApiWilayahDistrict> | null>(null)
    const [districtCode, setDistrictCode] = useState("")

    const [villageLevel, setVillageLevel] = useState<Level<ApiWilayahVillage> | null>(null)
    const [villageCode, setVillageCode] = useState("")

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getWilayahProvinces(token).then(list => {
            if (cancelled) return
            setProvinces(list)
            setProvinceManual(list.length === 0)
            const want = initialRef.current.risk_province
            if (autoMatch.current && want) {
                const match = list.find(p => p.province_name.toLowerCase() === want.toLowerCase())
                if (match) setProvinceCode(match.province_code)
            }
        }).catch(() => {
            // Don't block the form: without a province list the whole location is typed manually.
            if (!cancelled) { setProvinces([]); setProvinceManual(true) }
        })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!provinceCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getWilayahCities(token, provinceCode).then(list => {
            if (cancelled) return
            setCityLevel({ parent: provinceCode, list, manual: list.length === 0 })
            const want = initialRef.current.risk_city
            if (autoMatch.current && want && list.length) {
                const match = list.find(c => c.city_name.toLowerCase() === want.toLowerCase())
                if (match) setCityCode(match.city_code)
            }
        }).catch(() => {
            // Non-404 failure (401/5xx/network): don't block the form, let the user type it.
            if (!cancelled) setCityLevel({ parent: provinceCode, list: [], manual: true })
        })
        return () => { cancelled = true }
    }, [provinceCode])

    useEffect(() => {
        if (!cityCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getWilayahDistricts(token, cityCode).then(list => {
            if (cancelled) return
            setDistrictLevel({ parent: cityCode, list, manual: list.length === 0 })
            const want = initialRef.current.risk_district
            if (autoMatch.current && want && list.length) {
                const match = list.find(d => d.district_name.toLowerCase() === want.toLowerCase())
                if (match) setDistrictCode(match.district_code)
            }
        }).catch(() => {
            if (!cancelled) setDistrictLevel({ parent: cityCode, list: [], manual: true })
        })
        return () => { cancelled = true }
    }, [cityCode])

    useEffect(() => {
        if (!districtCode) return
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getWilayahVillages(token, districtCode).then(list => {
            if (cancelled) return
            setVillageLevel({ parent: districtCode, list, manual: list.length === 0 })
            const want = initialRef.current.risk_village
            if (autoMatch.current && want && list.length) {
                const match = list.find(v => v.village_name.toLowerCase() === want.toLowerCase())
                if (match) setVillageCode(match.village_code)
            }
        }).catch(() => {
            if (!cancelled) setVillageLevel({ parent: districtCode, list: [], manual: true })
        })
        return () => { cancelled = true }
    }, [districtCode])

    function selectProvince(code: string) {
        autoMatch.current = false
        setProvinceCode(code)
        setCityCode(""); setDistrictCode(""); setVillageCode("")
        const p = provinces.find(p => p.province_code === code)
        onChange({ risk_province: p?.province_name ?? "", risk_city: "", risk_district: "", risk_village: "", risk_postal_code: "" })
    }
    function selectCity(code: string) {
        autoMatch.current = false
        setCityCode(code)
        setDistrictCode(""); setVillageCode("")
        const c = cities.find(c => c.city_code === code)
        onChange({ risk_city: c?.city_name ?? "", risk_district: "", risk_village: "", risk_postal_code: "" })
    }
    function selectDistrict(code: string) {
        autoMatch.current = false
        setDistrictCode(code)
        setVillageCode("")
        const d = districts.find(d => d.district_code === code)
        onChange({ risk_district: d?.district_name ?? "", risk_village: "", risk_postal_code: "" })
    }
    function selectVillage(code: string) {
        autoMatch.current = false
        setVillageCode(code)
        const v = villages.find(v => v.village_code === code)
        onChange({ risk_village: v?.village_name ?? "", risk_postal_code: v?.postal_code ?? "" })
    }

    const cityReady = !!provinceCode && cityLevel?.parent === provinceCode
    const districtReady = !!cityCode && districtLevel?.parent === cityCode
    const villageReady = !!districtCode && villageLevel?.parent === districtCode

    const cities = cityReady ? cityLevel.list : []
    const districts = districtReady ? districtLevel.list : []
    const villages = villageReady ? villageLevel.list : []

    // A manual ancestor means there's no *_code to chain the next fetch off
    // of, so every level below it must also fall back to free text.
    const cityIsManual = provinceManual || (cityReady && cityLevel.manual)
    const districtIsManual = cityIsManual || (districtReady && districtLevel.manual)
    const villageIsManual = districtIsManual || (villageReady && villageLevel.manual)

    return {
        provinces, provinceCode, provinceManual, selectProvince,
        cities, cityCode, cityManual: cityIsManual, cityLoading: !!provinceCode && !cityReady, selectCity,
        districts, districtCode, districtManual: districtIsManual, districtLoading: !!cityCode && !districtReady, selectDistrict,
        villages, villageCode, villageManual: villageIsManual, villageLoading: !!districtCode && !villageReady, selectVillage,
    }
}
