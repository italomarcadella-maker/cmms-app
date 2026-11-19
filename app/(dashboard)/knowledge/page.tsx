import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";
import { requireRole } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage() {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER']);
    if (!authorized) redirect('/');

    const methods = await prisma.maintenanceKnowledge.findMany({
        orderBy: { successCount: 'desc' },
        take: 100,
    });

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Base di conoscenza"
                description="Soluzioni apprese dagli interventi chiusi: cosa ha risolto quale guasto, e quante volte."
            />
            <KnowledgeList items={methods.map(m => ({ id: m.id, problemTags: m.problemTags, solution: m.solution, assetCategory: m.assetCategory, successCount: m.successCount }))} />
        </div>
    );
}
