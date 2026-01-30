"use client";

import { LayoutDashboard, Package, ClipboardList, Settings, ListChecks, Users, Box, BarChart3, Calendar, ReceiptEuro, Cylinder, CalendarDays, BrainCircuit, FileDown, Gauge, Inbox, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useWorkOrders } from '@/lib/work-orders-context';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onNavigate?: () => void;
    mobile?: boolean;
}

export function Sidebar({ className, onNavigate, mobile }: SidebarProps) {
    const { workOrders } = useWorkOrders();
    const { user } = useAuth();

    // Count pending requests (for Admin/Supervisor view mainly, but useful for all to see open requests)
    const pendingRequestsCount = workOrders.filter(wo => wo.status === 'PENDING_APPROVAL').length;
    const canSeeRequests = true; // Everyone can see the count, logic might differ on what they see inside

    return (
        <div className={cn("pb-12 h-full bg-sidebar text-sidebar-foreground", mobile ? "w-full" : "w-64 border-r", className)}>
            <div className="space-y-4 py-4">
                <div className="px-4 py-2">
                    <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        CMMS Pro
                    </h2>
                    <div className="space-y-1">
                        {user?.role !== 'USER' && (
                            <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                <LayoutDashboard className="h-4 w-4" />
                                Dashboard
                            </Link>
                        )}

                        {/* New Requests Item - Everyone (especially User) */}
                        <Link href="/requests/new" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                            <PlusCircle className="h-4 w-4" />
                            Inserimento Richiesta
                        </Link>

                        {user?.role !== 'USER' && (
                            <Link href="/work-orders?tab=requests" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground group">
                                <Inbox className="h-4 w-4" />
                                <span className="flex-1">Richieste</span>
                                {pendingRequestsCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm group-hover:bg-red-600 transition-colors">
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* MAINTAINER+ Section */}
                        {(user?.role === 'MAINTAINER' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
                            <>

                                <Link href="/assets" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Box className="h-4 w-4" />
                                    Asset (Macchinari)
                                </Link>
                                <Link href="/inventory" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Package className="h-4 w-4" />
                                    Magazzino Ricambi
                                </Link>
                                <Link href="/screws" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Cylinder className="h-4 w-4" />
                                    Viti & Cilindri
                                </Link>
                                <Link href="/calendar" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    Calendario
                                </Link>
                                <Link href="/maintenance/schedule" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Calendar className="h-4 w-4" />
                                    Manutenzione Prev.
                                </Link>
                            </>
                        )}

                        {/* SUPERVISOR+ Section */}
                        {(user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
                            <>
                                <div className="my-2 h-px bg-muted" />
                                <Link href="/technicians" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Users className="h-4 w-4" />
                                    Tecnici
                                </Link>
                                <Link href="/activities" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <ListChecks className="h-4 w-4" />
                                    Attività
                                </Link>
                                <Link href="/predictive" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <BrainCircuit className="h-4 w-4" />
                                    Manutenzione Predittiva
                                </Link>
                                <Link href="/energy" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Gauge className="h-4 w-4" />
                                    Monitoraggio Consumi
                                </Link>
                            </>
                        )}

                        {/* ADMIN Only Section */}
                        {user?.role === 'ADMIN' && (
                            <>
                                <div className="my-2 h-px bg-muted" />
                                <Link href="/kpi" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <BarChart3 className="h-4 w-4" />
                                    KPI & Performance
                                </Link>
                                <Link href="/costs" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <ReceiptEuro className="h-4 w-4" />
                                    Costi & Analisi
                                </Link>
                                <Link href="/settings" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Settings className="h-4 w-4" />
                                    Impostazioni
                                </Link>
                                <Link href="/users" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <Users className="h-4 w-4" />
                                    Gestione Utenti
                                </Link>
                                <Link href="/exports" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground">
                                    <FileDown className="h-4 w-4" />
                                    Estrazioni Dati
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
