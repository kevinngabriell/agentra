"use client"

import { Button, Flex, Text } from "@chakra-ui/react"
import { LuCalendar } from "react-icons/lu"
import { monthLabel, shiftMonth } from "@/lib/format"

/** ‹ Oktober 2026 › stepper used by the renewals, commissions and reports pages. */
export function MonthPickerButton({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <Flex align="center" gap="8px" w={{ base: "100%", md: "auto" }}>
      <Button
        size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px"
        aria-label="Bulan sebelumnya"
        onClick={() => onChange(shiftMonth(month, -1))}
      >‹</Button>
      <Flex align="center" justify={{ base: "center", md: "flex-start" }} flex={{ base: 1, md: "initial" }} gap="6px" bg="white" border="1px solid" borderColor="#E2E8F0" borderRadius="8px" px="12px" py="6px">
        <LuCalendar size={14} color="#64748B" aria-hidden="true" />
        <Text fontSize="15px" color="#374151" fontWeight="medium" aria-live="polite">{monthLabel(month)}</Text>
      </Flex>
      <Button
        size="sm" variant="outline" borderColor="#E2E8F0" color="#374151" fontSize="14px"
        aria-label="Bulan berikutnya"
        onClick={() => onChange(shiftMonth(month, 1))}
      >›</Button>
    </Flex>
  )
}
