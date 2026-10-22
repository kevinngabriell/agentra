"use client"

import { Input, Text, type InputProps } from "@chakra-ui/react"

export const CLAIM_LABEL = { fontSize: "14px", color: "#5D6D7E", fontWeight: "medium" } as const
export const CLAIM_INPUT = { fontSize: "15px", borderColor: "#E2E8F0", borderRadius: "8px" } as const

export function Required() {
    return <Text as="span" color="#DC2626">*</Text>
}

/** "1500000" → "1.500.000" for display; the state keeps plain digits. */
export function groupDigits(digits: string): string {
    return digits ? Number(digits).toLocaleString("id-ID") : ""
}

/** Rupiah input that holds plain digits in state and shows them grouped. */
export function MoneyInput({ value, onChange, ...rest }: { value: string; onChange: (digits: string) => void } & Omit<InputProps, "value" | "onChange">) {
    return (
        <Input {...CLAIM_INPUT} inputMode="numeric" placeholder="0" maxLength={17} {...rest}
            value={groupDigits(value)}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 13))} />
    )
}
