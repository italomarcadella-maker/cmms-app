"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ShieldAlert, Search, Filter, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SafetyListProps {
    requests: any[];
}

export function SafetyList({ requests }: SafetyListProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.title.toLowerCase().includes(search.toLowerCase()) ||
            req.description.toLowerCase().includes(search.toLowerCase()) ||
            (req.asset?.name || "").toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
        const matchesPriority = priorityFilter === "ALL" || req.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'STOPPED': return "bg-red-500 text-white animate-pulse";
            case 'HIGH': return "bg-red-100 text-red-700 border-red-200";
            case 'MEDIUM': return "bg-amber-100 text-amber-700 border-amber-200";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cerca segnalazioni..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Stato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tutti gli stati</SelectItem>
                            <SelectItem value="OPEN">Aperti</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Corso</SelectItem>
                            <SelectItem value="COMPLETED">Risolti</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[140px]">
                            <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Priorità" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tutte le priorità</SelectItem>
                            <SelectItem value="STOPPED">CRITICA (Fermo)</SelectItem>
                            <SelectItem value="HIGH">Alta</SelectItem>
                            <SelectItem value="MEDIUM">Media</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titolo</TableHead>
                            <TableHead>Asset</TableHead>
                            <TableHead>Priorità</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Nessuna segnalazione trovata.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{req.title}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {req.asset ? (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {req.asset.name}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", getPriorityColor(req.priority))}>
                                            {req.priority === 'STOPPED' && <ShieldAlert className="mr-1 h-3 w-3" />}
                                            {req.priority}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'OPEN' ? 'destructive' : req.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(req.createdAt), "d MMM yyyy", { locale: it })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm" variant="ghost">
                                            <Link href={`/work-orders/${req.id}`}>
                                                Dettagli <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
