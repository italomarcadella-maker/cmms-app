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

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    image: string | null;
}

interface UserListProps {
    users: User[];
}

export function UserList({ users }: UserListProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user.image || ''} />
                                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <RoleSelector userId={user.id} currentRole={user.role} />
                            </TableCell>
                            <TableCell className="text-right">
                                <ChangePasswordDialog userId={user.id} userName={user.name || user.email || 'Utente'} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
