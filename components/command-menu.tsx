"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"; // Use Dialog primitive
import { Search, Loader2, LayoutDashboard, Calendar, Package, FileText, Settings, User } from "lucide-react";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { cn } from "@/lib/utils";

interface CommandMenuProps extends React.HTMLAttributes<HTMLButtonElement> { }

export function CommandMenu(props: CommandMenuProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    // Quick Data Access
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();

    // Filter Logic
    const filteredWO = workOrders
        .filter(w => w.title.toLowerCase().includes(query.toLowerCase()) || w.id.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

    const filteredAssets = assets
        .filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

    // Reset selection when query changes
    React.useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Shortcut to open
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

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    // Flatten items for navigation index
    const getFlattenedItems = () => {
        if (query === "") {
            return [
                { action: () => router.push("/"), label: "Dashboard" },
                { action: () => router.push("/work-orders/new"), label: "Nuovo Intervento" },
                { action: () => router.push("/requests/new"), label: "Nuova Richiesta" },
                { action: () => router.push("/calendar"), label: "Calendario" },
            ];
        }
        const items = [];
        if (filteredWO.length > 0) {
            items.push(...filteredWO.map(wo => ({ action: () => router.push(`/work-orders/${wo.id}`), label: wo.title })));
        }
        if (filteredAssets.length > 0) {
            items.push(...filteredAssets.map(asset => ({ action: () => router.push(`/assets/${asset.id}`), label: asset.name })));
        }
        return items;
    };

    const flattenedItems = getFlattenedItems();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % flattenedItems.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + flattenedItems.length) % flattenedItems.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (flattenedItems[selectedIndex]) {
                runCommand(flattenedItems[selectedIndex].action);
            }
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64 inline-flex items-center rounded-md border border-input bg-transparent px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                {...props}
            >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Cerca...</span>
                <span className="inline-flex lg:hidden">Cerca...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-0 overflow-hidden max-w-lg shadow-2xl border-none">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            placeholder="Digita un comando o cerca..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <div className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded bg-muted">ESC</div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                        {query === "" && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Suggeriti</div>
                                <CommandItem
                                    selected={selectedIndex === 0 && query === ""}
                                    onSelect={() => runCommand(() => router.push("/"))}
                                    icon={LayoutDashboard}
                                >
                                    Dashboard
                                </CommandItem>
                                <CommandItem
                                    selected={selectedIndex === 1 && query === ""}
                                    onSelect={() => runCommand(() => router.push("/work-orders/new"))}
                                    icon={FileText}
                                >
                                    Nuovo Intervento
                                </CommandItem>
                                <CommandItem
                                    selected={selectedIndex === 2 && query === ""}
                                    onSelect={() => runCommand(() => router.push("/requests/new"))}
                                    icon={FileText}
                                >
                                    Nuova Richiesta
                                </CommandItem>
                                <CommandItem
                                    selected={selectedIndex === 3 && query === ""}
                                    onSelect={() => runCommand(() => router.push("/calendar"))}
                                    icon={Calendar}
                                >
                                    Calendario
                                </CommandItem>
                            </>
                        )}

                        {query !== "" && (
                            <>
                                {filteredWO.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Interventi</div>
                                        {filteredWO.map((wo, i) => (
                                            <CommandItem
                                                key={wo.id}
                                                selected={selectedIndex === i}
                                                onSelect={() => runCommand(() => router.push(`/work-orders/${wo.id}`))}
                                                icon={FileText}
                                            >
                                                <span className="truncate">{wo.title}</span>
                                                <span className="ml-2 text-xs text-muted-foreground font-mono">{wo.id}</span>
                                            </CommandItem>
                                        ))}
                                    </>
                                )}

                                {filteredAssets.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Asset</div>
                                        {filteredAssets.map((asset, i) => (
                                            <CommandItem
                                                key={asset.id}
                                                selected={selectedIndex === (filteredWO.length + i)}
                                                onSelect={() => runCommand(() => router.push(`/assets/${asset.id}`))}
                                                icon={Package}
                                            >
                                                {asset.name}
                                            </CommandItem>
                                        ))}
                                    </>
                                )}

                                {filteredWO.length === 0 && filteredAssets.length === 0 && (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        Nessun risultato trovato.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="border-t p-2 bg-muted/10 text-[10px] text-muted-foreground flex justify-between px-4">
                        <div className="flex gap-2">
                            <span>↑↓ per navigare</span>
                            <span>↵ per selezionare</span>
                        </div>
                        <div className="flex gap-2">
                            <span>⌘K Apri</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CommandItem({ children, icon: Icon, onSelect, selected }: { children: React.ReactNode, icon: any, onSelect: () => void, selected?: boolean }) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer transition-colors",
                selected ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
            )}
        >
            <Icon className="h-4 w-4 text-muted-foreground" />
            {children}
        </div>
    );
}
