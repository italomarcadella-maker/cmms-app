"use client";

import * as React from "react";
import { Box, Hammer, Loader2, Search, Sparkles, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetStatusPill, PriorityPill } from "@/components/ui/status-badge";
import { searchCMMS } from "@/lib/process-actions";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, canSee } from "@/components/layout/nav-config";

type Results = { assets: any[]; workOrders: any[]; projects: any[] };
const EMPTY: Results = { assets: [], workOrders: [], projects: [] };

/** Global search and quick navigation (Ctrl/Cmd + K). The only search dialog in the app. */
export function CommandMenu() {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState<Results>(EMPTY);
    const [isMac, setIsMac] = React.useState(false);

    React.useEffect(() => {
        setIsMac(/mac|iphone|ipad/i.test(navigator.platform));
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (!query.trim()) {
            setResults(EMPTY);
            setLoading(false);
            return;
        }
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                setResults((await searchCMMS(query)) || EMPTY);
            } catch (err) {
                console.error("Search error", err);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const go = React.useCallback(
        (href: string) => {
            setOpen(false);
            setQuery("");
            router.push(href);
        },
        [router]
    );

    const shortcuts = NAV_GROUPS.flatMap((group) => group.items.filter((item) => !item.query && canSee(user?.role, item, group))).slice(0, 8);
    const hasQuery = query.trim().length > 0;
    const noResults = !loading && !results.assets.length && !results.workOrders.length && !results.projects.length;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="relative flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">Cerca asset, ordini, progetti...</span>
                <kbd className="hidden h-5 select-none items-center rounded border bg-background px-1.5 font-sans text-[11px] font-medium text-muted-foreground sm:flex">
                    {isMac ? "⌘" : "Ctrl"} K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[600px]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Cerca</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center gap-3 border-b px-4 py-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Cerca asset, ordini di lavoro, progetti..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {hasQuery ? (
                            <>
                                {noResults && (
                                    <p className="py-10 text-center text-sm text-muted-foreground">
                                        Nessun risultato per &ldquo;{query}&rdquo;.
                                    </p>
                                )}

                                {results.assets.length > 0 && (
                                    <ResultGroup title="Asset">
                                        {results.assets.map((asset) => (
                                            <ResultRow
                                                key={asset.id}
                                                icon={<Box className="h-4 w-4" />}
                                                title={asset.name}
                                                subtitle={[asset.model, asset.location].filter(Boolean).join(" · ")}
                                                trailing={<AssetStatusPill status={asset.status} />}
                                                onSelect={() => go(`/assets/${asset.id}`)}
                                            />
                                        ))}
                                    </ResultGroup>
                                )}

                                {results.workOrders.length > 0 && (
                                    <ResultGroup title="Ordini di lavoro">
                                        {results.workOrders.map((wo) => (
                                            <ResultRow
                                                key={wo.id}
                                                icon={<Wrench className="h-4 w-4" />}
                                                title={wo.title}
                                                subtitle={wo.description}
                                                trailing={<PriorityPill priority={wo.priority} />}
                                                onSelect={() => go(`/work-orders/${wo.id}`)}
                                            />
                                        ))}
                                    </ResultGroup>
                                )}

                                {results.projects.length > 0 && (
                                    <ResultGroup title="Progetti">
                                        {results.projects.map((proj) => (
                                            <ResultRow
                                                key={proj.id}
                                                icon={<Sparkles className="h-4 w-4" />}
                                                title={proj.title}
                                                subtitle={`${proj.status} · ${proj.progress}% completato`}
                                                onSelect={() => go(`/process/projects/${proj.id}`)}
                                            />
                                        ))}
                                    </ResultGroup>
                                )}
                            </>
                        ) : (
                            <>
                                <ResultGroup title="Vai a">
                                    <div className="grid grid-cols-2 gap-1">
                                        {shortcuts.map((item) => (
                                            <button
                                                key={item.href}
                                                type="button"
                                                onClick={() => go(item.href)}
                                                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ResultGroup>

                                <ResultGroup title="Azioni rapide">
                                    <ResultRow
                                        icon={<Hammer className="h-4 w-4" />}
                                        title="Nuovo ordine di lavoro"
                                        onSelect={() => go("/work-orders/new")}
                                    />
                                </ResultGroup>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                        <kbd className="rounded border bg-background px-1.5 font-sans text-[11px] font-medium">Esc</kbd>
                        <span>per chiudere</span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-2 last:mb-0">
            <h3 className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">{title}</h3>
            <div className="space-y-0.5">{children}</div>
        </div>
    );
}

function ResultRow({
    icon,
    title,
    subtitle,
    trailing,
    onSelect,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    trailing?: React.ReactNode;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            )}
        >
            <span className="text-muted-foreground">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{title}</span>
                {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
            </span>
            {trailing}
        </button>
    );
}
