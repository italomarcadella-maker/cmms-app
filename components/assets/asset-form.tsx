"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

import { useAssets } from "@/lib/assets-context";
import { Asset } from "@/lib/types";

export function AssetForm() {
    const router = useRouter();
    const { addAsset } = useAssets();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        const newAsset: Asset = {
            id: `AST-${Math.floor(Math.random() * 10000)}`,
            name: formData.get("name") as string,
            model: formData.get("model") as string,
            serialNumber: formData.get("serial") as string,
            vendor: formData.get("vendor") as string,
            department: formData.get("department") as string,
            plant: formData.get("plant") as string,
            line: formData.get("line") as string,
            cespite: formData.get("cespite") as string,
            location: formData.get("location") as string,
            purchaseDate: new Date().toISOString(),
            status: 'OPERATIONAL',
            healthScore: 100,
            lastMaintenance: new Date().toISOString(),
        };

        addAsset(newAsset);
        setLoading(false);
        router.push("/assets");
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Asset Name</label>
                        <input required id="name" name="name" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Hydraulic Pump" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="model" className="text-sm font-medium">Model</label>
                        <input required id="model" name="model" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. HP-200" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="serial" className="text-sm font-medium">Serial Number</label>
                        <input required id="serial" name="serial" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Serial No." />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="vendor" className="text-sm font-medium">Vendor</label>
                        <input required id="vendor" name="vendor" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Vendor Name" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <div className="space-y-2">
                        <label htmlFor="department" className="text-sm font-medium">Department</label>
                        <input required id="department" name="department" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Production" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="line" className="text-sm font-medium">Linea</label>
                        <input id="line" name="line" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Line 1" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="cespite" className="text-sm font-medium">Codice Cespite</label>
                        <input id="cespite" name="cespite" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. CESP-001" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-medium">Location</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="plant" className="text-sm font-medium">Plant</label>
                        <input required id="plant" name="plant" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Turin Plant A" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="location" className="text-sm font-medium">Area / Room</label>
                        <input required id="location" name="location" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Sector 4" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/assets" className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                </Link>
                <button disabled={loading} type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Asset
                </button>
            </div>
        </form>
    );
}
