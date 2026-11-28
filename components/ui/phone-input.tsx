"use client"

import { Input, InputGroup } from "@chakra-ui/react"
import { formatLocalPhone } from "@/lib/format"

interface PhoneInputProps {
    /** Local part as shown, e.g. "811-4411-307" (build it with formatLocalPhone). */
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    fontSize?: string
    h?: string
    borderColor?: string
    borderRadius?: string
    "aria-label"?: string
}

/** Indonesian phone field with a fixed "+62" prefix. The value is the grouped local part; convert with toApiPhone() on save. */
export function PhoneInput({ value, onChange, placeholder = "811-4411-307", invalid, ...rest }: PhoneInputProps) {
    return (
        <InputGroup width="100%" startAddon="+62">
            <Input
                type="tel" inputMode="numeric" autoComplete="tel-national"
                value={value} placeholder={placeholder} aria-invalid={invalid || undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(formatLocalPhone(e.target.value))}
                {...rest}
            />
        </InputGroup>
    )
}
