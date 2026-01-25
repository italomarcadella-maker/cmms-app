"use client";

import { Asset } from "@/lib/types";
import { AssetStatusBadge } from "./asset-status-badge";
import { BadgeCheck, Calendar, MapPin, Factory } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetDetailHeaderProps {
    asset: Asset;
}

export function AssetDetailHeader({ asset }: AssetDetailHeaderProps) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{asset.id}</span>
                            <span>•</span>
                            <span>{asset.model}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> {asset.vendor}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-muted-foreground uppercase font-semibold">Health Score</div>
                            <div className={cn("text-2xl font-bold",
                                asset.healthScore >= 90 ? "text-green-600" :
                                    asset.healthScore >= 70 ? "text-amber-600" : "text-red-600"
                            )}>
                                {asset.healthScore}%
                            </div>
                        </div>
                        <AssetStatusBadge status={asset.status} className="text-sm px-3 py-1" />
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <Factory className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Plant</div>
                            <div className="font-medium text-sm">{asset.plant}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Location</div>
                            <div className="font-medium text-sm">{asset.location}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Last Maintenance</div>
                            <div className="font-medium text-sm">{asset.lastMaintenance}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
