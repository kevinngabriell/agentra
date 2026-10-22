"use client"

import type { ReactNode } from "react"
import { useOpenOnMount } from "./use-open-on-mount"

/** For a Dialog.Root that is rendered inline inside `{cond && (...)}`: `<OpenOnMount>{(open) => <Dialog.Root open={open}>…</Dialog.Root>}</OpenOnMount>`. */
export function OpenOnMount({ children }: { children: (open: boolean) => ReactNode }) {
    const { open } = useOpenOnMount()
    return <>{children(open)}</>
}
