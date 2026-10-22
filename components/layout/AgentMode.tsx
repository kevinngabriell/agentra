"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { getSubAgent } from "@/lib/api/sub-agents"

export type AgentMode = "unknown" | "main" | "sub-agent"

const AgentModeContext = createContext<AgentMode>("unknown")

export const useAgentMode = () => useContext(AgentModeContext)

export const SUB_AGENT_HOME = "/agentra/my"

/**
 * Tells a sub-agent login from the main agent: /sub-agents/me answers 200 only for a sub-agent.
 * A sub-agent is kept on its read-only portal; the API enforces the same limit (helpers/access.php),
 * this just spares them pages that would only show 403s. Nothing renders until the answer is in.
 */
export function AgentModeProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [mode, setMode] = useState<AgentMode>("unknown")

    useEffect(() => {
        const token = getAccessToken()
        if (!token) { router.replace("/login"); return }
        let cancelled = false
        getSubAgent(token, "me")
            .then(() => { if (!cancelled) setMode("sub-agent") })
            // 404: not a sub-agent. Any other failure also falls back to the full app; the API still decides.
            .catch(() => { if (!cancelled) setMode("main") })
        return () => { cancelled = true }
    }, [router])

    useEffect(() => {
        if (mode === "sub-agent" && pathname !== SUB_AGENT_HOME) router.replace(SUB_AGENT_HOME)
    }, [mode, pathname, router])

    if (mode === "unknown" || (mode === "sub-agent" && pathname !== SUB_AGENT_HOME)) return null
    return <AgentModeContext.Provider value={mode}>{children}</AgentModeContext.Provider>
}
