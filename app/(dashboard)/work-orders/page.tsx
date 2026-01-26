"use client";

import { Plus, Search, User, LayoutList, Kanban, Trash2 } from "lucide-react";
import { WorkOrderKanban } from "@/components/work-orders/wo-kanban";
import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

// ... existing imports

function WorkOrdersContent() {
    const router = useRouter();
    // ... entire logic of original WorkOrdersPage
    // ... ending with 
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ... content ... */}
        </div>
    );
}

export default function WorkOrdersPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Caricamento ordini di lavoro...</div>}>
            <WorkOrdersContent />
        </Suspense>
    );
}

