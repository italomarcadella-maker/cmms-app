"use client";

import { useRouter } from "next/navigation";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, AlertCircle, Archive } from "lucide-react";

interface RequestListProps {
    requests?: any[];
}

export function RequestList({ requests }: RequestListProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { workOrders } = useWorkOrders();

    // Use passed requests or filter from context if not provided (backward compatibility)
    const myRequests = requests || workOrders.filter(wo => wo.requesterId === user?.id && wo.type === 'REQUEST');

    // Sort by Date Desc
    const sortedRequests = [...myRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'OPEN':
            case 'IN_PROGRESS': return <CheckCircle className="h-4 w-4 text-blue-500" />;
            case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'CLOSED': return <Archive className="h-4 w-4 text-gray-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return "In Attesa";
            case 'OPEN': return "Approvato";
            case 'IN_PROGRESS': return "In Corso";
            case 'COMPLETED': return "Completato";
            case 'CLOSED': return "Chiuso";
            case 'ON_HOLD': return "Sospeso";
            case 'CANCELED': return "Annullato";
            default: return status;
        }
    };

    if (sortedRequests.length === 0) {
        return (
            <div className="text-center py-10 border rounded-lg bg-muted/20 border-dashed">
                <p className="text-muted-foreground mb-4">Non hai effettuato nessuna richiesta.</p>
                <Button onClick={() => router.push('/requests/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Nuova Richiesta
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Le Mie Richieste</h2>
                <Button size="sm" onClick={() => router.push('/requests/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Nuova
                </Button>
            </div>
            <div className="grid gap-4">
                {sortedRequests.map((req) => (
                    <Card key={req.id} className="hover:bg-muted/30 transition-colors">
                        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    {req.title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Asset: {req.assetName} • Data: {new Date(req.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(req.status)}
                                <span className="text-sm font-medium">{getStatusLabel(req.status)}</span>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}
