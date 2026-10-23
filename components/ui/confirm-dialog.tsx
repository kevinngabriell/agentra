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
                            <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{title}</Dialog.Title>
                        </Dialog.Header>
                        {message && (
                            <Dialog.Body px="24px" py="12px">
                                <Text color="#5D6D7E" fontSize="15px" lineHeight="1.6">{message}</Text>
                            </Dialog.Body>
                        )}
                        <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                            <Button variant="outline" size="sm" fontSize="15px" onClick={() => decide(false)}>{cancelLabel}</Button>
                            <Button size="sm" fontSize="15px" color="white" bg={danger ? "#DC2626" : "#1A3557"}
                                _hover={{ bg: danger ? "#B91C1C" : "#162C47" }} onClick={() => decide(true)}>{confirmLabel}</Button>
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
