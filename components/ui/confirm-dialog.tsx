"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { Button, Dialog, Portal, Text } from "@chakra-ui/react"
import { useOpenOnMount } from "./use-open-on-mount"

export interface ConfirmOptions {
    title: string
    message?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    /** Red confirm button, for deletes. */
    danger?: boolean
}

function ConfirmDialog({ options, onDecide, onGone }: { options: ConfirmOptions; onDecide: (ok: boolean) => void; onGone: () => void }) {
    const { open, close } = useOpenOnMount()
    const decide = (ok: boolean) => { onDecide(ok); close() }
    const { title, message, confirmLabel = "Ya", cancelLabel = "Batal", danger } = options

    return (
        <Dialog.Root open={open} role="alertdialog" lazyMount unmountOnExit
            onOpenChange={(d) => { if (!d.open) decide(false) }} onExitComplete={onGone}>
            <Portal>
                <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
                <Dialog.Positioner zIndex={1501}>
                    <Dialog.Content bg="white" borderRadius="12px" maxW="420px" w="92vw" shadow="xl">
                        <Dialog.Header px="24px" pt="24px" pb="0">
                            <Dialog.Title color="#0D1B3E" fontSize="20px" fontWeight="bold">{title}</Dialog.Title>
                        </Dialog.Header>
                        {message && (
                            <Dialog.Body px="24px" py="12px">
                                <Text color="#1F2937" fontSize="16px" lineHeight="1.6">{message}</Text>
                            </Dialog.Body>
                        )}
                        <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                            <Button variant="outline" h="44px" px="24px" fontSize="16px" color="#111827" borderColor="#94A3B8" onClick={() => decide(false)}>{cancelLabel}</Button>
                            <Button h="44px" px="24px" fontSize="16px" fontWeight="semibold" color="white" bg={danger ? "#B91C1C" : "#0D1B3E"}
                                _hover={{ bg: danger ? "#991B1B" : "#1A2F5C" }} onClick={() => decide(true)}>{confirmLabel}</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}

/**
 * Replacement for window.confirm in the app's own style.
 *
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: "Hapus tugas?", danger: true, confirmLabel: "Hapus" }))) return
 *   ...
 *   return <>{...}{dialog}</>
 */
export function useConfirm() {
    const [request, setRequest] = useState<{ id: number; options: ConfirmOptions } | null>(null)
    const resolver = useRef<((ok: boolean) => void) | null>(null)
    const counter = useRef(0)

    const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setRequest({ id: ++counter.current, options })
    }), [])

    const dialog = request && (
        <ConfirmDialog key={request.id} options={request.options}
            onDecide={(ok) => { resolver.current?.(ok); resolver.current = null }}
            onGone={() => setRequest((r) => (r && r.id === request.id ? null : r))} />
    )

    return { confirm, dialog }
}
