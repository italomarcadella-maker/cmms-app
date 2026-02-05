"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LowStockPart {
    id: string;
    name: string;
    quantity: number;
    minQuantity: number;
    vendor: string | null;
    unitCost: number | null;
}

interface ShoppingListProps {
    parts: LowStockPart[];
}

export function ShoppingList({ parts }: ShoppingListProps) {
    const totalEstimatedCost = parts.reduce((sum, part) => {
        const needed = Math.max(0, part.minQuantity * 2 - part.quantity); // Aim for 2x min stock? Or just restock to min?
        // Let's assume reorder to minQuantity + buffer
        return sum + (needed * (part.unitCost || 0));
    }, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card className="print:border-none print:shadow-none">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6 text-blue-600" />
                            Lista della Spesa
                        </CardTitle>
                        <CardDescription>
                            Articoli sotto la soglia minima di giacenza ({parts.length}).
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handlePrint} className="print:hidden">
                        <Download className="mr-2 h-4 w-4" />
                        Stampa / PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Articolo</TableHead>
                            <TableHead>Fornitore</TableHead>
                            <TableHead className="text-center">Giacenza</TableHead>
                            <TableHead className="text-center">Minimo</TableHead>
                            <TableHead className="text-right">Da Ordinare (Stima)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parts.map((part) => {
                            const recommendedOrder = Math.max(1, part.minQuantity * 3 - part.quantity); // Logic: Restock to 3x min
                            return (
                                <TableRow key={part.id} className="group hover:bg-slate-50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {part.quantity === 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                            {part.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{part.vendor || '-'}</TableCell>
                                    <TableCell className="text-center text-red-600 font-bold">{part.quantity}</TableCell>
                                    <TableCell className="text-center text-muted-foreground">{part.minQuantity}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {recommendedOrder} pz
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {parts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        Nessun articolo da riordinare. Magazzino OK! ✅
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
