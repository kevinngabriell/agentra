"use client"

import { SubAgentProfile } from "@/components/sub-agents"

// Portal for a sub-agent login: the same profile view as /agentra/sub-agents/{id}, read-only,
// served from /sub-agents/me.
export default function MyPortalPage() {
    return <SubAgentProfile id="me" self />
}
