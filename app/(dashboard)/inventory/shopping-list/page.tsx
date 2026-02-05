import { prisma } from "@/lib/prisma";
import { ShoppingList } from "@/components/inventory/shopping-list";

export const dynamic = 'force-dynamic';

async function getLowStockParts() {
    // Basic query: quantity <= minQuantity
    return await prisma.sparePart.findMany({
        where: {
            quantity: {
                lte: prisma.sparePart.fields.minQuantity
            }
        },
        orderBy: { quantity: 'asc' } // Most critical first
    });
}

export default async function ShoppingListPage() {
    const parts = await getLowStockParts();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight print:hidden">Riordino Materiali</h1>
            <ShoppingList parts={parts} />
        </div>
    );
}
