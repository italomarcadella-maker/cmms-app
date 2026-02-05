"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, File, User, Box, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    // Mock Data for Search - In a real app, this might fetch from an API or use a search index
    const pages = [
        { name: "Dashboard", href: "/", icon: File },
        { name: "Nuova Richiesta", href: "/requests/new", icon: File },
        { name: "Tutti gli Ordini", href: "/work-orders", icon: File },
        { name: "Assets", href: "/assets", icon: Box },
        { name: "Team Tecnico", href: "/technicians", icon: User },
        { name: "Calendario", href: "/planning/calendar", icon: File },
    ];

    const filteredPages = pages.filter(page =>
        page.name.toLowerCase().includes(query.toLowerCase())
    );

    // Simulated asset search only if query is > 2 chars, usually would be an async search
    const showAssetSearch = query.length > 2;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 gap-0 overflow-hidden shadow-2xl sm:max-w-[550px]">
                <DialogHeader className="sr-only">
                    <DialogTitle>Comandi</DialogTitle>
                </DialogHeader>
                <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                        className="flex w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Cerca comandi, pagine o asset..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredPages.length > 0 && (
                        <div className="mb-2">
                            <h3 className="mb-1 px-2 text-xs font-semibold text-muted-foreground">Pagine</h3>
                            {filteredPages.map((page) => (
                                <button
                                    key={page.href}
                                    onClick={() => runCommand(() => router.push(page.href))}
                                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground group"
                                >
                                    <page.icon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                    <span>{page.name}</span>
                                    {page.name === "Dashboard" && <span className="ml-auto text-xs text-muted-foreground">Home</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {showAssetSearch && (
                        <div className="mb-2 border-t pt-2">
                            <h3 className="mb-1 px-2 text-xs font-semibold text-muted-foreground">Ricerca Rapida</h3>
                            <button
                                onClick={() => runCommand(() => router.push(`/assets?q=${query}`))}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                                <Search className="mr-2 h-4 w-4" />
                                <span>Cerca "{query}" in Assets</span>
                                <ArrowRight className="ml-auto h-3 w-3 opacity-50" />
                            </button>
                            <button
                                onClick={() => runCommand(() => router.push(`/work-orders?q=${query}`))}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                                <Search className="mr-2 h-4 w-4" />
                                <span>Cerca "{query}" in Ordini</span>
                                <ArrowRight className="ml-auto h-3 w-3 opacity-50" />
                            </button>
                        </div>
                    )}

                    {filteredPages.length === 0 && !showAssetSearch && (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                            Nessun risultato trovato. Prova a digitare il nome di una pagina.
                        </p>
                    )}
                </div>

                <div className="border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground flex justify-end">
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        <span className="text-xs">ESC</span>
                    </kbd>
                    <span className="ml-2">per chiudere</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
