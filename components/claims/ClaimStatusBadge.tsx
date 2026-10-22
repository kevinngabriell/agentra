"use client"

import { Badge } from "@chakra-ui/react"
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS, type ApiClaimStatus } from "@/lib/api/claims"

export function ClaimStatusBadge({ status }: { status: ApiClaimStatus }) {
    const c = CLAIM_STATUS_COLORS[status] ?? { bg: "#F1F5F9", color: "#64748B" }
    return (
        <Badge px="10px" py="3px" borderRadius="full" fontSize="14px" bg={c.bg} color={c.color} whiteSpace="nowrap">
            {CLAIM_STATUS_LABELS[status] ?? status}
        </Badge>
    )
}
