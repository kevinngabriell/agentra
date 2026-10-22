import { useCallback, useEffect, useState } from "react"

/**
 * Open state for a Chakra Dialog that is rendered conditionally, i.e. mounted exactly when it should show.
 *
 * Chakra (zag) only releases the page lock it puts on <body> (pointer-events: none, overflow: hidden)
 * when the dialog was opened *after* it mounted. A Dialog.Root that mounts with open={true} leaves the
 * whole page un-clickable once it closes. So mount closed and open on the next frame. Close with `close()`
 * and unmount from `onExitComplete`, never while `open` is still true.
 */
export function useOpenOnMount() {
    const [open, setOpen] = useState(false)
    useEffect(() => {
        const frame = requestAnimationFrame(() => setOpen(true))
        return () => cancelAnimationFrame(frame)
    }, [])
    const close = useCallback(() => setOpen(false), [])
    return { open, close }
}
