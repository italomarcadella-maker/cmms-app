import { WorkOrderForm } from "@/components/work-orders/wo-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function NewWorkOrderPage() {
    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Link href="/work-orders" className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Crea Ordine di Lavoro</h1>
                    <p className="text-muted-foreground text-sm">Pianifica un nuovo intervento di manutenzione.</p>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <WorkOrderForm />
            </Suspense>
        </div>
    );
}
