import { Badge } from "@chakra-ui/react"
import { PROSPECT_STAGE_COLORS, PROSPECT_STAGE_LABELS, type ProspectStage } from "@/lib/api/prospects"
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/api/quotes"

export function StageBadge({ stage }: { stage: ProspectStage }) {
    const c = PROSPECT_STAGE_COLORS[stage]
    return <Badge px="8px" py="2px" borderRadius="full" bg={c.bg} color={c.color} fontSize="14px" whiteSpace="nowrap">{PROSPECT_STAGE_LABELS[stage]}</Badge>
}

export function QuoteStatusBadge({ status, expired }: { status: QuoteStatus; expired?: boolean }) {
    const c = expired ? { bg: "#FEF3C7", color: "#B45309" } : QUOTE_STATUS_COLORS[status]
    return <Badge px="8px" py="2px" borderRadius="full" bg={c.bg} color={c.color} fontSize="14px" whiteSpace="nowrap">{expired ? "Kedaluwarsa" : QUOTE_STATUS_LABELS[status]}</Badge>
}
