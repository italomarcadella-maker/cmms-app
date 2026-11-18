"use client";

import React, { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { PlantSwitcher } from "./plant-switcher";
import { NAV_GROUPS, canSee, isItemActive, type NavItem } from "./nav-config";

const COLLAPSED_KEY = "cmms.sidebar.collapsed";
const COLLAPSED_EVENT = "cmms:sidebar-collapsed";

/** Collapsed/expanded preference, persisted in localStorage and readable without an effect. */
function useCollapsedPreference() {
    const collapsed = useSyncExternalStore(
        (notify) => {
            window.addEventListener("storage", notify);
            window.addEventListener(COLLAPSED_EVENT, notify);
            return () => {
                window.removeEventListener("storage", notify);
                window.removeEventListener(COLLAPSED_EVENT, notify);
            };
        },
        () => {
            try {
                return localStorage.getItem(COLLAPSED_KEY) === "1";
            } catch {
                return false; // storage unavailable: stay expanded
            }
        },
        () => false
    );

    const toggle = () => {
        try {
            localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
        } catch {
            /* ignore */
        }
        window.dispatchEvent(new Event(COLLAPSED_EVENT));
    };

    return { collapsed, toggle };
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
    onNavigate?: () => void;
    /** Inside the mobile sheet: always expanded, no collapse toggle. */
    mobile?: boolean;
}

export function Sidebar({ className, onNavigate, mobile }: SidebarProps) {
    const { user, isLoading } = useAuth();
    const { workOrders } = useWorkOrders();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { collapsed: collapsedPref, toggle: toggleCollapsed } = useCollapsedPreference();

    const collapsed = !mobile && collapsedPref;

    const pendingRequestsCount = workOrders.filter((wo) => wo.status === "PENDING_APPROVAL").length;

    const shell = cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        mobile ? "w-full" : cn("border-r border-sidebar-border transition-[width] duration-200", collapsed ? "w-[72px]" : "w-64"),
        className
    );

    if (isLoading) {
        return (
            <aside className={shell} aria-label="Navigazione principale">
                <div className="h-14 border-b border-sidebar-border" />
                <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-9 w-full animate-pulse rounded-md bg-sidebar-accent" />
                    ))}
                </div>
            </aside>
        );
    }

    const visibleGroups = NAV_GROUPS.map((group) => ({
        group,
        items: group.items.filter((item) => canSee(user?.role, item, group)),
    })).filter((g) => g.items.length > 0);

    return (
        <aside className={shell} aria-label="Navigazione principale">
            {/* Brand */}
            <div className={cn("flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
                <Image src="/brand/FITT-logo-bianco.svg" alt="FITT" width={46} height={28} unoptimized priority />
                {!collapsed && (
                    <span className="border-l border-sidebar-border pl-3 text-sm font-semibold tracking-wide text-sidebar-accent-foreground">
                        CMMS
                    </span>
                )}
            </div>

            <div className={cn("shrink-0", collapsed ? "px-2 pt-3" : "px-3 pt-4")}>
                <PlantSwitcher isCollapsed={collapsed} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                {visibleGroups.map(({ group, items }, index) => (
                    <div key={group.title} className="space-y-1">
                        {collapsed ? (
                            index > 0 && <div className="mx-2 mb-2 border-t border-sidebar-border" />
                        ) : (
                            <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                                {group.title}
                            </h3>
                        )}
                        {items.map((item) => (
                            <SidebarItem
                                key={`${item.href}-${item.label}`}
                                item={item}
                                active={isItemActive(item, pathname, searchParams)}
                                collapsed={collapsed}
                                onClick={onNavigate}
                                badge={item.query?.value === "requests" && pendingRequestsCount > 0 ? pendingRequestsCount : undefined}
                            />
                        ))}
                    </div>
                ))}
            </nav>

            {!mobile && (
                <div className="shrink-0 border-t border-sidebar-border p-3">
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? "Espandi il menu" : "Comprimi il menu"}
                        title={collapsed ? "Espandi il menu" : "Comprimi il menu"}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            collapsed && "justify-center px-0"
                        )}
                    >
                        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                        {!collapsed && <span>Comprimi menu</span>}
                    </button>
                </div>
            )}
        </aside>
    );
}

function SidebarItem({
    item,
    active,
    collapsed,
    onClick,
    badge,
}: {
    item: NavItem;
    active: boolean;
    collapsed: boolean;
    onClick?: () => void;
    badge?: number;
}) {
    const Icon = item.icon;
    const href = item.query ? `${item.href}?${item.query.key}=${item.query.value}` : item.href;

    return (
        <Link
            href={href}
            onClick={onClick}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
                "group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                collapsed ? "justify-center px-0" : "px-3",
                active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
        >
            {active && <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary" />}
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
            {collapsed ? <span className="sr-only">{item.label}</span> : <span className="flex-1 truncate">{item.label}</span>}
            {badge !== undefined &&
                (collapsed ? (
                    <span aria-label={`${badge} da approvare`} className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-critical" />
                ) : (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1.5 text-[11px] font-semibold text-critical-foreground">
                        {badge}
                    </span>
                ))}
        </Link>
    );
}
