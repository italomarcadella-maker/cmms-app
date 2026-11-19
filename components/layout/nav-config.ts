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
    FlaskConical,
    HardHat,
    Inbox,
    LayoutDashboard,
    Leaf,
    ListChecks,
    ArrowRightLeft,
    SearchCheck,
    GitCompareArrows,
    BookCopy,
    HandHelping,
    MessagesSquare,
    Package,
    PlusCircle,
    ReceiptEuro,
    ScanLine,
    Settings,
    UserCog,
    type LucideIcon,
} from "lucide-react";

export type Role = "USER" | "MAINTAINER" | "SUPERVISOR" | "PLANT_MANAGER" | "ADMIN" | "PROCESS_ENGINEER";

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
        title: "Generale",
        items: [
            { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: NOT_BASIC_USER },
            { href: "/requests/new", label: "Nuova richiesta", icon: PlusCircle },
            { href: "/work-orders", label: "Richieste", icon: Inbox, roles: NOT_BASIC_USER, query: { key: "tab", value: "requests" } },
        ],
    },
    {
        title: "Operativo",
        roles: OPERATIVE,
        items: [
            { href: "/work-orders", label: "Ordini di lavoro", icon: ClipboardList },
            { href: "/assets", label: "Asset e macchinari", icon: Box },
            { href: "/mobile/scan", label: "Scanner QR", icon: ScanLine },
            { href: "/inventory", label: "Magazzino", icon: Package },
            { href: "/inventory/availability", label: "Ricambi tra plant", icon: ArrowRightLeft, roles: ["ADMIN", "PLANT_MANAGER", "SUPERVISOR", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/screws", label: "Viti e cilindri", icon: Cylinder },
            { href: "/planning/calendar", label: "Planning e calendario", icon: CalendarDays },
            { href: "/maintenance/schedule", label: "Manutenzione preventiva", icon: CalendarClock },
        ],
    },
    {
        title: "Supervisione",
        roles: SUPERVISION,
        items: [
            { href: "/daily-meetings", label: "Daily meeting", icon: MessagesSquare },
            { href: "/process", label: "Ingegneria di processo", icon: FlaskConical },
            { href: "/technicians/calendar", label: "Calendario turni", icon: CalendarRange, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/technicians", label: "Team tecnico", icon: HardHat, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/technicians/loans", label: "Prestiti tecnici", icon: HandHelping, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/library", label: "Libreria di gruppo", icon: BookCopy, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/activities", label: "Attività", icon: ListChecks, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/failure-insights", label: "Analisi guasti di gruppo", icon: SearchCheck, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN", "MAINTAINER", "PROCESS_ENGINEER"] },
            { href: "/predictive", label: "AI predittiva", icon: BrainCircuit, roles: ["SUPERVISOR", "PLANT_MANAGER", "ADMIN"] },
            { href: "/sustainability", label: "Sostenibilità", icon: Leaf },
        ],
    },
    {
        title: "Amministrazione",
        roles: MANAGEMENT,
        items: [
            { href: "/group", label: "Confronto stabilimenti", icon: GitCompareArrows, roles: ["ADMIN", "PLANT_MANAGER"] },
            { href: "/kpi", label: "KPI e report", icon: BarChart3 },
            { href: "/costs", label: "Analisi costi", icon: ReceiptEuro },
            { href: "/users", label: "Utenti", icon: UserCog, roles: ["ADMIN"] },
            { href: "/exports", label: "Export dati", icon: FileDown },
            { href: "/plants", label: "Stabilimenti", icon: Factory, roles: ["ADMIN", "PLANT_MANAGER"] },
            { href: "/settings", label: "Impostazioni", icon: Settings, roles: ["ADMIN"] },
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
