"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "./change-password-dialog";
import { RoleSelector } from "./role-selector";
import { DeleteUserDialog } from "./delete-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { Switch } from "@/components/ui/switch";
import { updateUserStatus } from "@/lib/actions";
import { toast } from "@/lib/i18n/toast";
import { useRouter } from "next/navigation";
import { useT, useFormat } from "@/lib/i18n/client";
import type { PlantChoice } from "./plant-picker";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    image: string | null;
    isActive: boolean;
    lastLogin: string | null;
    department: string | null;
    plantIds?: string[];
}

interface UserListProps {
    users: User[];
    plants?: PlantChoice[];
}

export function UserList({ users, plants = [] }: UserListProps) {
    const t = useT();
    const fmt = useFormat();
    const router = useRouter();

    const handleStatusChange = async (userId: string, currentStatus: boolean) => {
        try {
            const result = await updateUserStatus(userId, !currentStatus);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Errore aggiornamento stato");
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">{t("Avatar")}</TableHead>
                        <TableHead>{t("Utente")}</TableHead>
                        <TableHead>{t("Reparto")}</TableHead>
                        <TableHead>{t("Stabilimenti")}</TableHead>
                        <TableHead>{t("Stato")}</TableHead>
                        <TableHead>{t("Ruolo")}</TableHead>
                        <TableHead>{t("Ultimo Accesso")}</TableHead>
                        <TableHead className="text-right">{t("Azioni")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id} className={!user.isActive ? "opacity-60 bg-muted/50" : ""}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user.image || ''} />
                                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{user.name || t("N/D")}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {user.department ? (
                                    <Badge variant="outline">{t(user.department)}</Badge>
                                ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {user.role === 'ADMIN' ? (
                                    <Badge variant="secondary">{t("Tutti")}</Badge>
                                ) : (user.plantIds ?? []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {(user.plantIds ?? []).map(id => (
                                            <Badge key={id} variant="outline">{plants.find(p => p.id === id)?.name ?? '?'}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-warning-strong">{t("Nessuno: non vede dati")}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={user.isActive}
                                        onCheckedChange={() => handleStatusChange(user.id, user.isActive)}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {user.isActive ? t("Attivo") : t("Inattivo")}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <RoleSelector userId={user.id} currentRole={user.role} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {user.lastLogin ? fmt.dateTime(user.lastLogin) : t("Mai")}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <EditUserDialog user={{
                                        id: user.id,
                                        name: user.name,
                                        email: user.email,
                                        department: user.department || undefined,
                                        image: user.image || undefined,
                                        role: user.role,
                                        plantIds: user.plantIds
                                    }} plants={plants} />
                                    <ChangePasswordDialog userId={user.id} userName={user.name || user.email || t("Utente")} />
                                    <DeleteUserDialog userId={user.id} userName={user.name || user.email || t("Utente")} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
