import { getUsers } from '@/lib/actions';
import { UserList } from '@/components/users/user-list';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const session = await auth();

    // Double check on page level, though components/actions should handle it
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h1 className="text-2xl font-bold text-red-500">Accesso Negato</h1>
                <p>Questa pagina è riservata agli amministratori.</p>
            </div>
        );
    }

    const users = await getUsers();

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-lg md:text-2xl">Gestione Utenti</h1>
                <AddUserDialog />
            </div>
            <div className="border rounded-lg shadow-sm">
                <UserList users={users} />
            </div>
        </div>
    );
}
