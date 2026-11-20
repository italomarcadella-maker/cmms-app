import {
    BarChart3,
    BrainCircuit,
    Box,
    CalendarClock,
    CalendarDays,
    CalendarRange,
    ClipboardList,
    Cylinder,
    Factory,
    FileDown,
    Grid3x3,
    FileText,
    Lightbulb,
    FlaskConical,
    HardHat,
    Inbox,
    LayoutDashboard,
    Leaf,
    ListChecks,
    ListTodo,
    ArrowRightLeft,
    SearchCheck,
    GitCompareArrows,
    BookCopy,
    Handshake,
    Cog,
    Scale,
    ShieldCheck,
    History,
    ClipboardCheck,
    HandHelping,
    MessagesSquare,
    Package,
    PackageOpen,
    PlusCircle,
    ReceiptEuro,
    ScanLine,
    Settings,
    UserCog,
    type LucideIcon,
} from "lucide-react";

import { tk } from "@/lib/i18n/translate";
import type { Role } from "@/lib/roles";
export type { Role };

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Roles allowed to see the item. Falls back to the group's roles, then to everyone. */
    roles?: Role[];
    /** If set, the item is active only when this query param has this value (e.g. ?tab=requests). */
    query?: { key: string; value: string };
    /** Pages that belong to this item but are not under its own path. */
    alsoActiveFor?: string[];
}

export interface NavGroup {
    title: string;
    roles?: Role[];
    items: NavItem[];
}

const OPERATIVE: Role[] = ["PLANT_MANAGER", "MAINTAINER", "SUPERVISOR", "ADMIN", "PROCESS_ENGINEER"];
const SUPERVISION: Role[] = ["PLANT_MANAGER", "SUPERVISOR", "ADMIN", "PROCESS_ENGINEER"];
const MANAGEMENT: Role[] = ["PLANT_MANAGER", "ADMIN", "PROCESS_ENGINEER"];
const NOT_BASIC_USER: Role[] = ["PLANT_MANAGER", "MAINTAINER", "SUPERVISOR", "ADMIN", "PROCESS_ENGINEER"];

export const NAV_GROUPS: NavGroup[] = [
    {
        title: tk("Generale"),
        items: [
            { href: "/", label: tk("Dashboard"), icon: LayoutDashboard, roles: NOT_BASIC_USER },
            { href: "/requests/new", label: tk("Nuova richiesta"), icon: PlusCircle },
            { href: "/work-orders", label: tk("Richieste"), icon: Inbox, roles: NOT_BASIC_USER, query: { key: "tab", value: "requests" } },
            { href: "/requests/material", label: tk("Richieste di materiale"), icon: PackageOpen },
        ],
    },
    {
        title: tk("Operativo"),
        roles: OPERATIVE,
        items: [
            { href: "/work-orders", label: tk("Ordini di lavoro"), icon: ClipboardList },
            { href: "/assets", label: tk("Asset e macchinari"), icon: Box },
            { href: "/mobile/scan", label: tk("Scanner QR"), icon: ScanLine },
            { href: "/inventory", label: tk("Magazzino"), icon: Package },
            { href: "/inventory/movements", label: tk("Storico movimenti"), icon: History },
            { href: "/inventory/counts", label: tk("Inventari"), icon: ClipboardCheck, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/inventory/availability", label: tk("Ricambi tra plant"), icon: ArrowRightLeft, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/screws", label: tk("Viti e cilindri"), icon: Cylinder },
            { href: "/planning/calendar", label: tk("Planning e calendario"), icon: CalendarDays },
            { href: "/planning/line-suggestions", label: tk("Suggerimenti per linea"), icon: ListTodo, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "PROCESS_ENGINEER"] },
            { href: "/maintenance/schedule", label: tk("Manutenzione preventiva"), icon: CalendarClock },
            { href: "/maintenance/regulatory", label: tk("Scadenziario normativo"), icon: Scale, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "PROCESS_ENGINEER"] },
            { href: "/permits", label: tk("Permessi di lavoro"), icon: ShieldCheck, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "PROCESS_ENGINEER"] },
            { href: "/impianti", label: tk("Impianti"), icon: Cog, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/contractors", label: tk("Ditte esterne"), icon: Handshake, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "MAINTAINER", "PROCESS_ENGINEER"] },
        ],
    },
    {
        title: tk("Supervisione"),
        roles: SUPERVISION,
        items: [
            { href: "/daily-meetings", label: tk("Daily meeting"), icon: MessagesSquare },
            { href: "/process", label: tk("Ingegneria di processo"), icon: FlaskConical },
            { href: "/technicians/calendar", label: tk("Calendario turni"), icon: CalendarRange, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/technicians", label: tk("Team tecnico"), icon: HardHat, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/technicians/matrix", label: tk("Matrice competenze"), icon: Grid3x3, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "PROCESS_ENGINEER"] },
            { href: "/technicians/loans", label: tk("Prestiti tecnici"), icon: HandHelping, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/library", label: tk("Libreria di gruppo"), icon: BookCopy, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/activities", label: tk("Attività"), icon: ListChecks, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/failure-insights", label: tk("Analisi guasti di gruppo"), icon: SearchCheck, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/maintenance/predictive", label: tk("AI predittiva"), icon: BrainCircuit, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/knowledge", label: tk("Base di conoscenza"), icon: Lightbulb, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/sustainability", label: tk("Sostenibilità"), icon: Leaf },
        ],
    },
    {
        title: tk("Amministrazione"),
        roles: MANAGEMENT,
        items: [
            { href: "/group", label: tk("Confronto stabilimenti"), icon: GitCompareArrows, roles: ["ADMIN", "PLANT_MANAGER"] },
            { href: "/kpi", label: tk("KPI e report"), icon: BarChart3, roles: ["ADMIN", "PLANT_MANAGER", "PROCESS_ENGINEER", "SUPERVISOR"] },
            { href: "/costs", label: tk("Analisi costi"), icon: ReceiptEuro },
            { href: "/users", label: tk("Utenti"), icon: UserCog, roles: ["ADMIN"] },
            { href: "/exports", label: tk("Export dati"), icon: FileDown },
            { href: "/reports", label: tk("Schede asset"), icon: FileText },
            { href: "/plants", label: tk("Stabilimenti"), icon: Factory, roles: ["ADMIN", "PLANT_MANAGER"] },
            { href: "/settings", label: tk("Impostazioni"), icon: Settings, roles: ["ADMIN"] },
        ],
    },
];

export function canSee(role: string | undefined, item: NavItem, group: NavGroup): boolean {
    const allowed = item.roles ?? group.roles;
    if (!allowed) return true;
    return !!role && (allowed as string[]).includes(role);
}

/** Is `item` the current page? `search` is the URLSearchParams of the current URL. */
export function isItemActive(item: NavItem, pathname: string, search: URLSearchParams | null): boolean {
    if (item.query) {
        return pathname === item.href && search?.get(item.query.key) === item.query.value;
    }
    if (item.href === "/") return pathname === "/";
    const underItem = pathname === item.href || pathname.startsWith(item.href + "/");
    if (!underItem) return item.alsoActiveFor?.some((p) => pathname.startsWith(p)) ?? false;
    // Se un'altra voce piu' specifica corrisponde alla stessa pagina (es. /inventory/availability), vince quella
    const moreSpecific = NAV_GROUPS.some(g => g.items.some(o => o !== item && !o.query && o.href !== "/" && o.href.length > item.href.length && (pathname === o.href || pathname.startsWith(o.href + "/"))));
    if (moreSpecific) return false;
    // /work-orders?tab=requests belongs to its own item, not to "Ordini di lavoro"
    if (item.href === "/work-orders" && pathname === "/work-orders" && search?.get("tab") === "requests") return false;
    return true;
}

/** Human title of the section the current URL belongs to (longest matching path wins). */
export function sectionTitle(pathname: string): string {
    let best: { label: string; len: number } | null = null;
    for (const group of NAV_GROUPS) {
        for (const item of group.items) {
            if (item.query) continue;
            const match = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
            if (match && (!best || item.href.length > best.len)) best = { label: item.label, len: item.href.length };
        }
    }
    return best?.label ?? "";
}
