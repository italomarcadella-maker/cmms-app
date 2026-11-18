"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Small "back to dashboard" link kept on pages that have not moved to <PageHeader /> yet. */
export function BackToDashboardButton() {
    return (
        <Button variant="ghost" size="xs" asChild className="-ml-2 mb-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
            </Link>
        </Button>
    );
}
