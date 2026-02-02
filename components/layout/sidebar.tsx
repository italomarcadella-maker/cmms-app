"use client";

import { LayoutDashboard, Package, ClipboardList, Settings, ListChecks, Users, Box, BarChart3, Calendar, ReceiptEuro, Cylinder, CalendarDays, BrainCircuit, FileDown, Gauge, Inbox, PlusCircle, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkOrders } from '@/lib/work-orders-context';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onNavigate?: () => void;
    mobile?: boolean;
}

export function Sidebar({ className, onNavigate, mobile }: SidebarProps) {
    const { user, isLoading } = useAuth();
    const { workOrders } = useWorkOrders();
    const pathname = usePathname();

    // Count pending requests
    const pendingRequestsCount = workOrders.filter(wo => wo.status === 'PENDING_APPROVAL').length;

    // Loading Skeleton
    if (isLoading) {
        return (
            <div className={cn("pb-12 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", mobile ? "w-full" : "w-64", className)}>
                <div className="space-y-6 py-6 px-4">
                    <div className="h-8 w-32 bg-sidebar-accent/10 animate-pulse rounded-md mb-8"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-10 w-full bg-sidebar-accent/5 animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const isActive = (path: string) => pathname === path;

    return (
        <div className={cn("pb-12 h-full bg-sidebar text-sidebar-foreground", mobile ? "w-full" : "w-64 border-r border-sidebar-border", className)}>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Box className="w-6 h-6 text-primary" />
                        <span>CMMS<span className="text-primary font-light">Pro</span></span>
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                    {/* General Section */}
                    <SidebarGroup title="Generale">
                        {user?.role !== 'USER' && (
                            <SidebarItem
                                href="/"
                                icon={LayoutDashboard}
                                label="Dashboard"
                                active={isActive('/')}
                                onClick={onNavigate}
                            />
                        )}
                        <SidebarItem
                            href="/requests/new"
                            icon={PlusCircle}
                            label="Nuova Richiesta"
                            active={isActive('/requests/new')}
                            onClick={onNavigate}
                        />
                        {user?.role !== 'USER' && (
                            <SidebarItem
                                href="/work-orders?tab=requests"
                                icon={Inbox}
                                label="Richieste"
                                active={isActive('/work-orders')}
                                onClick={onNavigate}
                                badge={pendingRequestsCount > 0 ? pendingRequestsCount : undefined}
                            />
                        )}
                    </SidebarGroup>

                    {/* Operational Section */}
                    {(user?.role === 'MAINTAINER' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
                        <SidebarGroup title="Operativo">
                            <SidebarItem href="/assets" icon={Box} label="Asset & Macchinari" active={isActive('/assets')} onClick={onNavigate} />
                            <SidebarItem href="/inventory" icon={Package} label="Magazzino" active={isActive('/inventory')} onClick={onNavigate} />
                            <SidebarItem href="/screws" icon={Cylinder} label="Viti & Cilindri" active={isActive('/screws')} onClick={onNavigate} />
                            <SidebarItem href="/calendar" icon={CalendarDays} label="Calendario" active={isActive('/calendar')} onClick={onNavigate} />
                            <SidebarItem href="/maintenance/schedule" icon={Calendar} label="Pianificazione" active={isActive('/maintenance/schedule')} onClick={onNavigate} />
                        </SidebarGroup>
                    )}

                    {/* Supervision Section */}
                    {(user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
                        <SidebarGroup title="Supervisione">
                            <SidebarItem href="/technicians/calendar" icon={Calendar} label="Calendario Turni" active={isActive('/technicians/calendar')} onClick={onNavigate} />
                            <SidebarItem href="/technicians" icon={Users} label="Team Tecnico" active={isActive('/technicians')} onClick={onNavigate} />
                            <SidebarItem href="/activities" icon={ListChecks} label="Attività" active={isActive('/activities')} onClick={onNavigate} />
                            <SidebarItem href="/predictive" icon={BrainCircuit} label="AI Predittiva" active={isActive('/predictive')} onClick={onNavigate} />
                            <SidebarItem href="/energy" icon={Gauge} label="Energy Monitor" active={isActive('/energy')} onClick={onNavigate} />
                        </SidebarGroup>
                    )}

                    {/* Admin Section */}
                    {user?.role === 'ADMIN' && (
                        <SidebarGroup title="Amministrazione">
                            <SidebarItem href="/kpi" icon={BarChart3} label="KPI & Report" active={isActive('/kpi')} onClick={onNavigate} />
                            <SidebarItem href="/costs" icon={ReceiptEuro} label="Analisi Costi" active={isActive('/costs')} onClick={onNavigate} />
                            <SidebarItem href="/users" icon={Users} label="Utenti" active={isActive('/users')} onClick={onNavigate} />
                            <SidebarItem href="/exports" icon={FileDown} label="Export Dati" active={isActive('/exports')} onClick={onNavigate} />
                            <SidebarItem href="/settings" icon={Settings} label="Impostazioni" active={isActive('/settings')} onClick={onNavigate} />
                        </SidebarGroup>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Sub Components ---

function SidebarGroup({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <h3 className="px-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2 font-mono">
                {title}
            </h3>
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );
}

interface SidebarItemProps {
    href: string;
    icon: LucideIcon;
    label: string;
    active?: boolean;
    onClick?: () => void;
    badge?: number;
    highlight?: boolean;
}

function SidebarItem({ href, icon: Icon, label, active, onClick, badge, highlight }: SidebarItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                highlight && !active && "bg-primary/5 text-primary hover:bg-primary/10"
            )}
        >
            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-0.5 bg-primary rounded-r-full" />}

            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary")} />
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm ring-1 ring-background">
                    {badge}
                </span>
            )}
        </Link>
    );
}
