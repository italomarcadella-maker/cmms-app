"use client"

import * as React from "react"
import {
    CalendarIcon,
    CreditCard,
    Settings,
    User,
    LayoutGrid,
    FileText,
    Hammer,
    Search,
    Box
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <Button
                variant="outline"
                className={
                    "relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
                }
                onClick={() => setOpen(true)}
            >
                <span className="hidden lg:inline-flex">Cerca nel CMMS...</span>
                <span className="inline-flex lg:hidden">Cerca...</span>
                <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Digita un comando o cerca..." />
                <CommandList>
                    <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
                    <CommandGroup heading="Navigazione Rapida">
                        <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/work-orders"))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Ordini di Lavoro</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/assets"))}>
                            <Box className="mr-2 h-4 w-4" />
                            <span>Assets</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/planning/calendar"))}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span>Planning</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Impostazioni</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/inventory"))}>
                            <Box className="mr-2 h-4 w-4" />
                            <span>Magazzino</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Azioni">
                        <CommandItem onSelect={() => runCommand(() => router.push("/work-orders/new"))}>
                            <Hammer className="mr-2 h-4 w-4" />
                            <span>Nuovo Ordine di Lavoro</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
