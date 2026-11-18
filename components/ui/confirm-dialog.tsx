"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmOptions {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Use "destructive" for deletions and other irreversible actions. */
    variant?: "default" | "destructive"
}

/**
 * Promise-based replacement for window.confirm():
 *
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: "Eliminare l'asset?", variant: "destructive" }))) return
 *   ...
 *   return <>{...}{dialog}</>
 */
export function useConfirm() {
    const [options, setOptions] = React.useState<ConfirmOptions | null>(null)
    const resolver = React.useRef<((value: boolean) => void) | null>(null)

    const confirm = React.useCallback((opts: ConfirmOptions) => {
        setOptions(opts)
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve
        })
    }, [])

    const settle = (value: boolean) => {
        resolver.current?.(value)
        resolver.current = null
        setOptions(null)
    }

    const dialog = (
        <Dialog open={options !== null} onOpenChange={(open) => { if (!open) settle(false) }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{options?.title}</DialogTitle>
                    {options?.description && <DialogDescription>{options.description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => settle(false)}>
                        {options?.cancelLabel ?? "Annulla"}
                    </Button>
                    <Button
                        variant={options?.variant === "destructive" ? "destructive" : "default"}
                        onClick={() => settle(true)}
                    >
                        {options?.confirmLabel ?? "Conferma"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

    return { confirm, dialog }
}
