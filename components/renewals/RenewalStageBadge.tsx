import { Badge } from "@chakra-ui/react"
import { RENEWAL_STAGE_COLORS, RENEWAL_STAGE_LABELS, type RenewalStage } from "@/lib/api/renewals"

export function RenewalStageBadge({ stage }: { stage: RenewalStage }) {
    const c = RENEWAL_STAGE_COLORS[stage]
    return <Badge px="8px" py="2px" borderRadius="full" bg={c.bg} color={c.color} fontSize="16px" whiteSpace="nowrap">{RENEWAL_STAGE_LABELS[stage]}</Badge>
}
