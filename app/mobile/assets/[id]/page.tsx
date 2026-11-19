import { prisma } from "@/lib/prisma";
import { scopeWorkOrderWhere } from "@/lib/maintainer-scope";
import { notFound } from "next/navigation";
import { AssetConsoleClient } from "@/components/mobile/asset-console-client";

export const dynamic = "force-dynamic";

interface MobileAssetPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function MobileAssetPage({ params }: MobileAssetPageProps) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Fetch Asset Details
    const asset = await prisma.asset.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            model: true,
            serialNumber: true,
            location: true,
            status: true,
            healthScore: true,
        },
    });

    if (!asset) {
        notFound();
    }

    // Fetch Active Work Orders for this Asset
    // (un manutentore vede solo i propri ordini, quelli richiesti da lui e quelli ancora da assegnare)
    const activeWorkOrders = await prisma.workOrder.findMany({
        where: await scopeWorkOrderWhere({
            assetId: id,
            status: {
                in: ["OPEN", "PENDING_APPROVAL", "APPROVED", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "PENDING_REVIEW"],
            },
        }),
        select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="animate-in slide-in-from-bottom-5 duration-500">
            <AssetConsoleClient asset={asset} activeWorkOrders={activeWorkOrders} />
        </div>
    );
}
