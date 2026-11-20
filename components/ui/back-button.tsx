"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Small "back to dashboard" link kept on pages that have not moved to <PageHeader /> yet. */
export function BackToDashboardButton() {
    const t = useT();
    return (
        <Button variant="ghost" size="xs" asChild className="-ml-2 mb-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("Dashboard")}
            </Link>
        </Button>
    );
}
