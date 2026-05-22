"use client";

import * as React from "react";
import {
    CalendarIcon,
    Settings,
    LayoutGrid,
    FileText,
    Hammer,
    Search,
    Box,
    Sparkles,
    Loader2,
    Wrench,
    Grid
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { searchCMMS } from "@/lib/process-actions";
import { toast } from "sonner";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState<{ assets: any[]; workOrders: any[]; projects: any[] }>({
        assets: [],
        workOrders: [],
        projects: []
    });
    
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

    // Fetch search results on query change
    React.useEffect(() => {
        if (!query.trim()) {
            setResults({ assets: [], workOrders: [], projects: [] });
            return;
        }

        setLoading(true);
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await searchCMMS(query);
                setResults(res || { assets: [], workOrders: [], projects: [] });
            } catch (err) {
                console.error("Search err", err);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(delayDebounce);
    }, [query]);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        setQuery("");
        command();
    }, []);

    const staticPages = [
        { name: "Dashboard", href: "/", icon: LayoutGrid, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" },
        { name: "Ordini di Lavoro", href: "/work-orders", icon: FileText, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" },
        { name: "Assets & Macchine", href: "/assets", icon: Box, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" },
        { name: "Ingegneria di Processo", href: "/process", icon: Grid, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" },
        { name: "Planning & Calendario", href: "/planning/calendar", icon: CalendarIcon, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" },
        { name: "Impostazioni Sistema", href: "/settings", icon: Settings, tag: "NAV", col: "text-purple-600 bg-purple-50 border-purple-100" }
    ];

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-full justify-start rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100/50 hover:text-slate-800 transition-all sm:pr-12 md:w-44 lg:w-64"
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-3.5 w-3.5 text-slate-400" />
                <span className="hidden lg:inline-flex">Cerca nel CMMS...</span>
                <span className="inline-flex lg:hidden">Cerca...</span>
                <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.35rem] hidden h-5 select-none items-center gap-1 rounded-lg border bg-white px-1.5 font-mono text-[9px] font-bold text-slate-400 sm:flex shadow-sm">
                    <span className="text-[10px]">⌘</span>K
                </kbd>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden shadow-2xl sm:max-w-[580px] bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Comandi</DialogTitle>
                    </DialogHeader>

                    {/* Interactive Input with neon glow */}
                    <div className="flex items-center border-b border-slate-200/50 px-4 py-3 relative">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500"></div>
                        <Search className="mr-3 h-4 w-4 shrink-0 text-slate-400 animate-pulse" />
                        <input
                            className="flex w-full rounded-md bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                            placeholder="Cerca assets, ordini di lavoro, progetti o comandi..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {loading && (
                            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin ml-2" />
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
                        
                        {/* Dynamic Search Results */}
                        {query.trim().length > 0 ? (
                            <>
                                {results.assets.length === 0 && results.workOrders.length === 0 && results.projects.length === 0 && !loading && (
                                    <div className="text-center py-8 text-slate-400 text-xs italic">
                                        Nessun risultato reale trovato per "{query}". Prova con altro.
                                    </div>
                                )}

                                {/* Assets Results */}
                                {results.assets.length > 0 && (
                                    <div>
                                        <h3 className="mb-2 px-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                            Asset Stabilimento
                                        </h3>
                                        <div className="space-y-1">
                                            {results.assets.map((asset) => (
                                                <button
                                                    key={asset.id}
                                                    onClick={() => runCommand(() => router.push(`/assets/${asset.id}`))}
                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white/40 hover:bg-emerald-50/50 hover:text-emerald-900 border border-transparent hover:border-emerald-100 transition duration-150 group"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Box className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition" />
                                                        <div className="text-left">
                                                            <div className="truncate text-slate-800 group-hover:text-emerald-950">{asset.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-normal">{asset.model} • {asset.location}</div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 uppercase tracking-wide">
                                                        {asset.status}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Work Orders Results */}
                                {results.workOrders.length > 0 && (
                                    <div>
                                        <h3 className="mb-2 px-2 text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                            Ordini di Lavoro
                                        </h3>
                                        <div className="space-y-1">
                                            {results.workOrders.map((wo) => (
                                                <button
                                                    key={wo.id}
                                                    onClick={() => runCommand(() => router.push(`/work-orders/${wo.id}`))}
                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white/40 hover:bg-amber-50/50 hover:text-amber-900 border border-transparent hover:border-amber-100 transition duration-150 group"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Wrench className="h-4 w-4 text-amber-500 group-hover:rotate-12 transition" />
                                                        <div className="text-left">
                                                            <div className="truncate text-slate-800 group-hover:text-amber-950">{wo.title}</div>
                                                            <div className="text-[10px] text-slate-400 font-normal line-clamp-1 font-normal">{wo.description}</div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 uppercase tracking-wide">
                                                        {wo.priority}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Projects Results */}
                                {results.projects.length > 0 && (
                                    <div>
                                        <h3 className="mb-2 px-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                            Progetti Lean & KPI
                                        </h3>
                                        <div className="space-y-1">
                                            {results.projects.map((proj) => (
                                                <button
                                                    key={proj.id}
                                                    onClick={() => runCommand(() => router.push(`/process/projects/${proj.id}`))}
                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white/40 hover:bg-indigo-50/50 hover:text-indigo-900 border border-transparent hover:border-indigo-100 transition duration-150 group"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                                                        <div className="text-left">
                                                            <div className="truncate text-slate-800 group-hover:text-indigo-950">{proj.title}</div>
                                                            <div className="text-[10px] text-slate-400 font-normal">{proj.status} • {proj.progress}% completato</div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600">
                                                        PROGETTO
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Navigation Shortcuts when input is empty */
                            <div>
                                <h3 className="mb-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigazione Rapida</h3>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {staticPages.map((page) => (
                                        <button
                                            key={page.href}
                                            onClick={() => runCommand(() => router.push(page.href))}
                                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 bg-white/40 hover:bg-slate-100/60 hover:text-slate-900 border border-transparent hover:border-slate-200/50 transition duration-150 group"
                                        >
                                            <page.icon className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition shrink-0" />
                                            <span className="truncate">{page.name}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                <h3 className="mb-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Azioni Rapide</h3>
                                <button
                                    onClick={() => runCommand(() => router.push("/work-orders/new"))}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 bg-white/40 hover:bg-indigo-50/50 hover:text-indigo-900 border border-transparent hover:border-indigo-100 transition duration-150 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Hammer className="h-4 w-4 text-indigo-500 group-hover:rotate-12 transition shrink-0" />
                                        <span>Nuovo Ordine di Lavoro</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">Apri modulo</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer instructions */}
                    <div className="border-t border-slate-200/50 bg-slate-50/50 backdrop-blur-sm px-4 py-2 text-[10px] text-slate-400 flex justify-between items-center">
                        <div>
                            <span>Digita per interrogare il DB Supabase reale</span>
                        </div>
                        <div className="flex gap-2">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-white border shadow-sm px-1.5 font-mono text-[9px] font-bold">
                                ESC
                            </kbd>
                            <span>per chiudere</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
