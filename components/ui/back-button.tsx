"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToDashboardButton() {
    return (
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground mb-4">
            <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Torna alla Dashboard
            </Link>
        </Button>
    );
}
