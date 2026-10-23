"use client"

import { useParams } from "next/navigation"
import { SubAgentProfile } from "@/components/sub-agents"

export default function SubAgentProfilePage() {
    const { id } = useParams<{ id: string }>()
    return <SubAgentProfile id={id} />
}
