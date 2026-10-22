"use client"

import type { ReactNode } from "react"
import { Button, Dialog, Flex, Grid, Portal, Text } from "@chakra-ui/react"
import { CLAIM_LABEL } from "@/components/claims/fields"
import { useOpenOnMount } from "./use-open-on-mount"

/**
 * Modal with a title, a scrolling body, an inline error and Batal / submit buttons.
 *
 * Render it conditionally (`{x && <SomeDialog onClose={() => setX(null)} />}`). It closes through Chakra's
 * exit and calls `onClose` once that finished, see useOpenOnMount for why it cannot simply be unmounted.
 */
export function FormDialog({ title, size = "520px", saving, error, submitLabel = "Simpan", onClose, onSubmit, children }: {
    title: string
    size?: string
    saving: boolean
    error: string | null
    submitLabel?: string
    onClose: () => void
    onSubmit: () => void
    children: ReactNode
}) {
    const { open, close: requestClose } = useOpenOnMount()
    const close = () => { if (!saving) requestClose() }

    return (
        <Dialog.Root open={open} scrollBehavior="inside" lazyMount unmountOnExit
            onOpenChange={(d) => { if (!d.open) close() }} onExitComplete={onClose}>
            <Portal>
            <Dialog.Backdrop bg="rgba(0,0,0,0.25)" zIndex={1500} />
            <Dialog.Positioner zIndex={1501}>
                <Dialog.Content bg="white" borderRadius="12px" maxW={size} w="94vw" shadow="xl">
                    <Dialog.Header px="24px" pt="24px" pb="0">
                        <Dialog.Title color="#1C2833" fontSize="16px" fontWeight="bold">{title}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body px="24px" py="16px">
                        <Flex flexDir="column" gap="12px">
                            {children}
                            {error && <Text color="#DC2626" fontSize="14px" role="alert">{error}</Text>}
                        </Flex>
                    </Dialog.Body>
                    <Dialog.Footer px="24px" pb="24px" pt="8px" gap="8px">
                        <Button variant="outline" size="sm" fontSize="15px" disabled={saving} onClick={close}>Batal</Button>
                        <Button size="sm" bg="#1A3557" color="white" fontSize="15px" _hover={{ bg: "#162C47" }} loading={saving} onClick={onSubmit}>{submitLabel}</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <Flex flexDir="column" gap="4px">
            <Text {...CLAIM_LABEL}>{label}</Text>
            {children}
            {hint && <Text fontSize="14px" color="#64748B">{hint}</Text>}
        </Flex>
    )
}

/** Two fields side by side on wider screens, stacked on phones. */
export function FormRow({ children }: { children: ReactNode }) {
    return <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="12px">{children}</Grid>
}
