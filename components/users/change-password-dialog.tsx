'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Key, Loader2, Lock } from 'lucide-react';
import { updateUserPassword } from '@/lib/actions';
import { useT } from '@/lib/i18n/client';

interface ChangePasswordDialogProps {
    userId: string;
    userName: string;
}

export function ChangePasswordDialog({ userId, userName }: ChangePasswordDialogProps) {
    const t = useT();
    // Il nome resta in grassetto: si traduce la frase con un segnaposto e si inserisce il nome nel punto giusto
    const [descBefore, descAfter] = t("Imposta una nuova password per l'utente {name}.", { name: "\u0000" }).split("\u0000");
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (password.length < 3) {
            setError(t("La password deve essere di almeno 3 caratteri."));
            setLoading(false);
            return;
        }

        try {
            const result = await updateUserPassword(userId, password);
            if (result.success) {
                setSuccess(t("Password aggiornata con successo!"));
                setPassword('');
                setTimeout(() => setOpen(false), 2000);
            } else {
                setError(result.message ? t(result.message) : t("Errore sconosciuto."));
            }
        } catch (err) {
            setError(t("Si è verificato un errore."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setPassword('');
                setError('');
                setSuccess('');
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Lock className="h-4 w-4" />
                    {t("Cambia Password")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("Cambia Password")}</DialogTitle>
                    <DialogDescription>
                        {descBefore}<strong>{userName}</strong>{descAfter}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="new-password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t("Nuova Password")}
                        </label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t("Inserisci nuova password")}
                                className="pl-10"
                                required
                            />
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("La password sarà visibile mentre digiti per conferma.")}
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-sm text-green-500 font-medium bg-green-50 p-2 rounded border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                            {success}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("Salva Password")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
