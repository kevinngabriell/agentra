"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button, Dialog, Flex, Text } from "@chakra-ui/react"
import { LuPencil } from "react-icons/lu"
import { getAccessToken } from "@/lib/auth/session"
import { errorMessage } from "@/lib/api/client"
import { updatePolicy } from "@/lib/api/policies"
import { getSubAgent } from "@/lib/api/sub-agents"
import { SubAgentSelect, subAgentLabel } from "./SubAgentSelect"
import { OpenOnMount } from "@/components/ui/open-on-mount"

/** The policy's sub-agent (or "Langsung") with a dialog to change it. */
export function PolicySubAgent({ policyId, subAgentId, onChanged }: {
    policyId: string
    subAgentId: string | null | undefined
    /** Called after the change is saved so the page can reload the policy. */
    onChanged: () => void | Promise<void>
}) {
    const current = subAgentId ?? ""
    const [name, setName] = useState<{ id: string; label: string } | null>(null)
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState(current)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = getAccessToken()
        if (!current || !token) return
        let cancelled = false
        getSubAgent(token, current)
            .then((a) => { if (!cancelled) setName({ id: current, label: subAgentLabel(a) }) })
            .catch(() => { if (!cancelled) setName({ id: current, label: "Sub-agen tidak dikenal" }) })
        return () => { cancelled = true }
    }, [current])

    async function save() {
        const token = getAccessToken()
        if (!token) return
        setSaving(true); setError(null)
        try {
            await updatePolicy(token, policyId, { issuing_agent_id: value })
            await onChanged()
            setOpen(false)
        } catch (err) {
            setError(errorMessage(err, "Gagal mengubah sub-agen"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Flex align="center" gap="8px" flexWrap="wrap">
                {current ? (
                    <Link href={`/agentra/sub-agents/${encodeURIComponent(current)}`} style={{ textDecoration: "none" }}>
                        <Text color="#1D4ED8" fontSize="16px">{name?.id === current ? name.label : "Memuat..."}</Text>
                    </Link>
                ) : (
                    <Text color="#1C2833" fontSize="16px">Langsung</Text>
                )}
                <Button size="xs" variant="ghost" color="#64748B" gap="4px" aria-label="Ubah sub-agen"
                    onClick={() => { setValue(current); setError(null); setOpen(true) }}>
                    <LuPencil size={12} /> Ubah
                </Button>
            </Flex>

            {open && (
                <OpenOnMount>{(shown) => (
                <Dialog.Root open={shown} onOpenChange={(d) => { if (!d.open && !saving) setOpen(false) }}>
                    <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                    <Dialog.Positioner zIndex={1501}>
                        <Dialog.Content bg="white" borderRadius="12px" maxW="440px" w="92vw" shadow="xl">
                            <Dialog.Header px="24px" pt="24px" pb="0">
                                <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">Ubah Sub-Agen Polis</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body px="24px" py="16px">
                                <Flex flexDir="column" gap="10px">
                                    <SubAgentSelect value={value} onChange={setValue} />
                                    <Text color="#64748B" fontSize="14px">
                                        Komisi polis yang masih berstatus pending akan dihitung ulang dengan bagi hasil sub-agen yang baru.
                                    </Text>
                                    {error && <Text fontSize="14px" color="#DC2626">{error}</Text>}
                                </Flex>
                            </Dialog.Body>
                            <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                                <Button flex="1" variant="outline" bg="white" borderColor="#E2E8F0" color="#374151" fontSize="16px" borderRadius="8px"
                                    _hover={{ bg: "#F1F5F9" }} disabled={saving} onClick={() => setOpen(false)}>Batal</Button>
                                <Button flex="1" bg="#1A3557" color="white" fontSize="16px" borderRadius="8px" _hover={{ bg: "#162C47" }}
                                    loading={saving} loadingText="Menyimpan..." disabled={value === current} onClick={save}>Simpan</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>
                )}</OpenOnMount>
            )}
        </>
    )
}
