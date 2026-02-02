'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteUser } from '@/lib/actions';

interface DeleteUserDialogProps {
    userId: string;
    userName: string;
}

export function DeleteUserDialog({ userId, userName }: DeleteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const result = await deleteUser(userId);
            if (result.success) {
                setOpen(false);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Si è verificato un errore imprevisto");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cancella Utente</DialogTitle>
                    <DialogDescription>
                        Sei sicuro di voler cancellare l'utente <strong>{userName}</strong>?
                        <br />
                        Questa azione non può essere annullata.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                        Annulla
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading ? 'Cancellazione...' : 'Cancella Utente'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


