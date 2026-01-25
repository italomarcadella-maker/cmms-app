import { LayoutDashboard, Package, ClipboardList, Settings, ListChecks, Users, Box, BarChart3, Calendar, ReceiptEuro, Cylinder, CalendarDays, BrainCircuit, FileDown, Gauge } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    return (
        <div className={cn("pb-12 min-h-screen w-64 border-r bg-sidebar text-sidebar-foreground", className)}>
            <div className="space-y-4 py-4">
                <div className="px-4 py-2">
                    <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        CMMS Pro
                    </h2>
                    <div className="space-y-1">
                        <Link href="/" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Link>

                        <Link href="/work-orders" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <ClipboardList className="h-4 w-4" />
                            Ordini di Lavoro
                        </Link>
                        <Link href="/assets" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Box className="h-4 w-4" />
                            Asset (Macchinari)
                        </Link>
                        <Link href="/inventory" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Package className="h-4 w-4" />
                            Magazzino Ricambi
                        </Link>
                        <Link href="/screws" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Cylinder className="h-4 w-4" />
                            Viti & Cilindri
                        </Link>
                        <div className="my-2 h-px bg-muted" />
                        <Link href="/technicians" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Users className="h-4 w-4" />
                            Tecnici
                        </Link>
                        <Link href="/activities" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <ListChecks className="h-4 w-4" />
                            Attività
                        </Link>
                        <Link href="/kpi" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <BarChart3 className="h-4 w-4" />
                            KPI & Performance
                        </Link>
                        <Link href="/costs" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <ReceiptEuro className="h-4 w-4" />
                            Costi & Analisi
                        </Link>
                        <Link href="/calendar" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <CalendarDays className="h-4 w-4" />
                            Calendario
                        </Link>
                        <Link href="/maintenance/schedule" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Calendar className="h-4 w-4" />
                            Manutenzione Prev.
                        </Link>
                        <Link href="/predictive" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <BrainCircuit className="h-4 w-4" />
                            Manutenzione Predittiva
                        </Link>
                        <Link href="/energy" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Gauge className="h-4 w-4" />
                            Monitoraggio Consumi
                        </Link>
                        <Link href="/settings" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Settings className="h-4 w-4" />
                            Impostazioni
                        </Link>
                        <Link href="/users" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <Users className="h-4 w-4" />
                            Gestione Utenti
                        </Link>
                        <Link href="/exports" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <FileDown className="h-4 w-4" />
                            Estrazioni Dati
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
