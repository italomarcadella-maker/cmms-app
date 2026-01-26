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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    image: string | null;
    isActive: boolean;
    lastLogin: string | null;
    department: string | null;
}

interface UserListProps {
    users: User[];
}

export function UserList({ users }: UserListProps) {
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
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Utente</TableHead>
                        <TableHead>Reparto</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Ultimo Accesso</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
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
                                    <span className="font-medium">{user.name || 'N/A'}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {user.department ? (
                                    <Badge variant="outline">{user.department}</Badge>
                                ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={user.isActive}
                                        onCheckedChange={() => handleStatusChange(user.id, user.isActive)}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {user.isActive ? 'Attivo' : 'Inattivo'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <RoleSelector userId={user.id} currentRole={user.role} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Mai'}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <EditUserDialog user={{
                                        id: user.id,
                                        name: user.name,
                                        email: user.email,
                                        department: user.department || undefined,
                                        image: user.image || undefined
                                    }} />
                                    <ChangePasswordDialog userId={user.id} userName={user.name || user.email || 'Utente'} />
                                    <DeleteUserDialog userId={user.id} userName={user.name || user.email || 'Utente'} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
