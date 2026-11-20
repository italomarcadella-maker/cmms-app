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
import { toast } from '@/lib/i18n/toast';
import { deleteUser } from '@/lib/actions';
import { useT } from '@/lib/i18n/client';

interface DeleteUserDialogProps {
    userId: string;
    userName: string;
}

export function DeleteUserDialog({ userId, userName }: DeleteUserDialogProps) {
    const t = useT();
    // Il nome resta in grassetto: si traduce la frase con un segnaposto e si inserisce il nome nel punto giusto
    const [confirmBefore, confirmAfter] = t("Sei sicuro di voler cancellare l'utente {name}?", { name: "\u0000" }).split("\u0000");
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
                <Button variant="ghost" size="icon" aria-label={t("Cancella Utente")} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("Cancella Utente")}</DialogTitle>
                    <DialogDescription>
                        {confirmBefore}<strong>{userName}</strong>{confirmAfter}
                        <br />
                        {t("Questa azione non può essere annullata.")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                        {t("Annulla")}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading ? t("Cancellazione...") : t("Cancella Utente")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


