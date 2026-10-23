"use client"

import { useEffect, useMemo, useState } from "react"
import { SearchSelect } from "@/components/ui/search-select"
import { getAccessToken } from "@/lib/auth/session"
import { getActiveSubAgents, getSubAgent, type ApiSubAgent } from "@/lib/api/sub-agents"

export const NO_SUB_AGENT_LABEL = "Langsung (tanpa sub-agen)"

export function subAgentLabel(a: Pick<ApiSubAgent, "full_name" | "agent_code">) {
    return `${a.full_name} (${a.agent_code})`
}

/**
 * Picker for an active sub-agent; "" means the main agent. An inactive sub-agent that is already
 * selected (an older policy or customer) stays in the list, marked as such, so the value is not lost.
 */
export function SubAgentSelect({ value, onChange, disabled, ariaLabel = "Sub-agen" }: {
    value: string
    onChange: (id: string) => void
    disabled?: boolean
    ariaLabel?: string
}) {
    const [agents, setAgents] = useState<ApiSubAgent[] | null>(null)
    const [current, setCurrent] = useState<ApiSubAgent | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!token) return
        let cancelled = false
        getActiveSubAgents(token)
            .then((list) => { if (!cancelled) setAgents(list) })
            .catch(() => { if (!cancelled) setAgents([]) })
        return () => { cancelled = true }
    }, [])

    const missing = !!value && agents !== null && !agents.some((a) => a.sub_agent_id === value)
    useEffect(() => {
        const token = getAccessToken()
        if (!missing || !token) return
        let cancelled = false
        getSubAgent(token, value)
            .then((a) => { if (!cancelled) setCurrent(a) })
            .catch(() => { /* deleted or foreign id: the value simply shows no label */ })
        return () => { cancelled = true }
    }, [missing, value])

    const options = useMemo(() => {
        const list = (agents ?? []).map((a) => ({ value: a.sub_agent_id, label: subAgentLabel(a) }))
        if (missing && current?.sub_agent_id === value) list.unshift({ value, label: `${subAgentLabel(current)} — nonaktif` })
        return [{ value: "", label: NO_SUB_AGENT_LABEL }, ...list]
    }, [agents, missing, current, value])

    return (
        <SearchSelect value={value} onChange={onChange} options={options} loading={agents === null}
            disabled={disabled} ariaLabel={ariaLabel} emptyText="Sub-agen tidak ditemukan" />
    )
}
