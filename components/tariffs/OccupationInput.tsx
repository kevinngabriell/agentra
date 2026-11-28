"use client"

import { useRef, useState } from "react"
import { Box, Flex, Input, Text } from "@chakra-ui/react"
import { getAccessToken } from "@/lib/auth/session"
import { getOccupations, type Occupation } from "@/lib/api/tariffs"
import { CLAIM_INPUT } from "@/components/claims/fields"

/**
 * Occupation code input with suggestions from the company's occupation table (Pengaturan → Tarif & Okupasi).
 * Picking a suggestion fills the code and its description, so two warehouses of the same use share one code.
 * Free text still works when the table is empty.
 */
export function OccupationInput({ code, onPick, bg }: {
    code: string
    onPick: (code: string, description: string | null) => void
    bg?: string
}) {
    const [query, setQuery] = useState(code)
    const [syncedCode, setSyncedCode] = useState(code)
    const [options, setOptions] = useState<Occupation[]>([])
    const [open, setOpen] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // The parent changed the code (e.g. the form was reset): show it.
    if (code !== syncedCode) {
        setSyncedCode(code)
        setQuery(code)
    }

    function search(q: string) {
        setQuery(q)
        setSyncedCode(q)
        onPick(q, null)
        if (timer.current) clearTimeout(timer.current)
        if (q.trim().length < 1) { setOptions([]); return }
        timer.current = setTimeout(() => {
            const token = getAccessToken()
            if (!token) return
            getOccupations(token, q.trim()).then((rows) => { setOptions(rows.slice(0, 8)); setOpen(true) }).catch(() => setOptions([]))
        }, 250)
    }

    return (
        <Box position="relative">
            <Input {...CLAIM_INPUT} bg={bg} maxLength={40} value={query} placeholder="Ketik kode atau nama okupasi"
                onChange={(e) => search(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)} onFocus={() => options.length && setOpen(true)} />
            {open && options.length > 0 && (
                <Flex position="absolute" zIndex={20} top="100%" left="0" right="0" mt="4px" flexDir="column" bg="white"
                    border="1px solid" borderColor="#E2E8F0" borderRadius="8px" shadow="md" maxH="240px" overflowY="auto">
                    {options.map((o) => (
                        <Box key={o.occupation_id} as="button" textAlign="left" px="10px" py="8px" _hover={{ bg: "#F1F5F9" }}
                            onMouseDown={(e) => { e.preventDefault(); setQuery(o.code); setSyncedCode(o.code); onPick(o.code, o.description); setOpen(false) }}>
                            <Text fontSize="13px" fontWeight="semibold" color="#1C2833">{o.code}{o.tariff_class ? ` · kelas ${o.tariff_class}` : ""}</Text>
                            <Text fontSize="13px" color="#64748B">{o.description}</Text>
                        </Box>
                    ))}
                </Flex>
            )}
        </Box>
    )
}
