"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export interface PromptOptions {
    title: string
    description?: string
    /** Etichetta del campo */
    label?: string
    defaultValue?: string
    placeholder?: string
    /** "number" per quantità, "text" per il resto */
    inputType?: "text" | "number"
    confirmLabel?: string
    /** Se true il campo non puo' restare vuoto */
    required?: boolean
    /** Testo che deve essere scritto esattamente per confermare (azioni pericolose) */
    mustType?: string
    variant?: "default" | "destructive"
}

/**
 * Sostituto di window.prompt(): restituisce il testo inserito, oppure null se l'utente annulla.
 *
 *   const { ask, dialog } = usePrompt()
 *   const qty = await ask({ title: "Quanti pezzi carichi?", inputType: "number", defaultValue: "1" })
 *   if (qty === null) return
 *   return <>{...}{dialog}</>
 */
export function usePrompt() {
    const t = useT()
    const [options, setOptions] = React.useState<PromptOptions | null>(null)
    const [value, setValue] = React.useState("")
    const resolver = React.useRef<((value: string | null) => void) | null>(null)

    const ask = React.useCallback((opts: PromptOptions) => {
        setValue(opts.defaultValue ?? "")
        setOptions(opts)
        return new Promise<string | null>((resolve) => {
            resolver.current = resolve
        })
    }, [])

    const settle = (result: string | null) => {
        resolver.current?.(result)
        resolver.current = null
        setOptions(null)
    }

    const blocked = !!options && ((options.required && value.trim() === "") || (options.mustType !== undefined && value !== options.mustType))

    const dialog = (
        <Dialog open={options !== null} onOpenChange={(open) => { if (!open) settle(null) }}>
            <DialogContent className="max-w-md">
                <form onSubmit={(e) => { e.preventDefault(); if (!blocked) settle(value) }} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{options?.title}</DialogTitle>
                        {options?.description && <DialogDescription>{options.description}</DialogDescription>}
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        {options?.label && <Label htmlFor="prompt-input">{options.label}</Label>}
                        <Input
                            id="prompt-input"
                            autoFocus
                            type={options?.inputType ?? "text"}
                            inputMode={options?.inputType === "number" ? "decimal" : undefined}
                            value={value}
                            placeholder={options?.placeholder}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => settle(null)}>{t("Annulla")}</Button>
                        <Button type="submit" variant={options?.variant === "destructive" ? "destructive" : "default"} disabled={blocked}>
                            {options?.confirmLabel ?? t("Conferma")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )

    return { ask, dialog }
}
