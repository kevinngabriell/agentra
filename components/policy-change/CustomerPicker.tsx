"use client"

import { useEffect, useState } from "react"
import { Box, Flex, Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { getCustomers, type ApiCustomer } from "@/lib/api/customers"
import { CLAIM_INPUT } from "@/components/claims/fields"

/** Search-as-you-type nasabah picker. `value` is the chosen customer_id; `selectedName` is shown until a new one is picked. */
export function CustomerPicker({ value, selectedName, onChange }: {
    value: string
    selectedName: string
    onChange: (customer: { customer_id: string; display_name: string }) => void
}) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<ApiCustomer[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const q = query.trim()
        const token = getAccessToken()
        if (q.length < 2 || !token) return
        const ctrl = new AbortController()
        const timer = window.setTimeout(() => {
            setLoading(true)
            getCustomers(token, { params: q, limit: 8, signal: ctrl.signal })
                .then(r => setResults(r.data ?? []))
                .catch(() => { /* aborted or offline: keep the previous list */ })
                .finally(() => setLoading(false))
        }, 300)
        return () => { window.clearTimeout(timer); ctrl.abort() }
    }, [query])

    const searching = query.trim().length >= 2
    const shown = searching ? results : []

    return (
        <Flex flexDir="column" gap="6px">
            <Input {...CLAIM_INPUT} placeholder={selectedName || "Cari nama nasabah"} aria-label="Cari nasabah" value={query} onChange={(e) => setQuery(e.target.value)} />
            {value && selectedName && !query && <Text fontSize="14px" color="#64748B">Dipilih: <b>{selectedName}</b></Text>}
            {searching && (
                <Box border="1px solid" borderColor="#E2E8F0" borderRadius="8px" maxH="180px" overflowY="auto">
                    {loading && <Text px="10px" py="8px" fontSize="14px" color="#64748B">Mencari…</Text>}
                    {!loading && shown.length === 0 && <Text px="10px" py="8px" fontSize="14px" color="#64748B">Tidak ada hasil</Text>}
                    {shown.map(c => (
                        <Box key={c.customer_id} as="button" display="block" w="100%" textAlign="left" px="10px" py="8px" fontSize="15px"
                            _hover={{ bg: "#EFF6FF" }} bg={c.customer_id === value ? "#EFF6FF" : "transparent"}
                            onClick={() => { onChange({ customer_id: c.customer_id, display_name: c.display_name }); setQuery("") }}>
                            {c.display_name}
                        </Box>
                    ))}
                </Box>
            )}
        </Flex>
    )
}
