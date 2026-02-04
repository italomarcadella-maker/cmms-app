"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RequestWizard } from "./request-wizard";
import { WorkOrder } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface RequestListProps {
    requests: WorkOrder[];
}

export function RequestList({ requests }: RequestListProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Le Mie Richieste</h2>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                            <Plus className="h-4 w-4 mr-2" />
                            Nuova Richiesta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto sm:max-h-[800px] p-0 border-0 bg-transparent shadow-none">
                        <div className="bg-background rounded-xl p-6 h-full shadow-2xl border">
                            <RequestWizard />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                    <p className="text-muted-foreground">Nessuna richiesta trovata.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Simplified cards for list */}
                    {requests.map(req => (
                        <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant={req.status === 'OPEN' ? 'default' : 'secondary'}>
                                        {req.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: it })}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-semibold line-clamp-1">{req.title}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                                </div>
                                <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-2">
                                    <span className="bg-muted px-2 py-0.5 rounded capitalize">{req.category?.toLowerCase() || 'other'}</span>
                                    {req.priority && <span className="font-medium text-orange-600 dark:text-orange-400 capitalize">{req.priority}</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
