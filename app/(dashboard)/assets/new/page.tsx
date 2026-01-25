import { AssetForm } from "@/components/assets/asset-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAssetPage() {
    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Link href="/assets" className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add New Asset</h1>
                    <p className="text-muted-foreground text-sm">Register new equipment into the system.</p>
                </div>
            </div>

            <AssetForm />
        </div>
    );
}
