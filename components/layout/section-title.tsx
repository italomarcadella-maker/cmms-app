"use client";

import { usePathname } from "next/navigation";

import { sectionTitle } from "./nav-config";

/** Name of the section the user is in (from the navigation config). The page itself renders its own <h1>. */
export function SectionTitle() {
    const title = sectionTitle(usePathname());
    if (!title) return null;
    return <span className="truncate text-sm font-semibold text-foreground">{title}</span>;
}
