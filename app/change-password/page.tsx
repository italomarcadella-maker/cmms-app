'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Loader2, AlertCircle } from 'lucide-react';
import { updateFirstLoginPassword } from '@/app/lib/actions';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 3) {
            setError('La password deve essere di almeno 3 caratteri.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Le password non coincidono.');
            setLoading(false);
            return;
        }

        try {
            const result = await updateFirstLoginPassword(password);
            if (result.success) {
                setSuccess('Password aggiornata! Reindirizzamento...');
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 2000);
            } else {
                setError(result.message || 'Errore durante l\'aggiornamento.');
            }
        } catch (err) {
            setError('Si è verificato un errore.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-md border dark:border-zinc-800">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Primo Accesso
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Per sicurezza, devi cambiare la tua password per continuare.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div className="relative">
                            <label htmlFor="new-password" className="sr-only">Nuova Password</label>
                            <Input
                                id="new-password"
                                name="new-password"
                                type="password"
                                required
                                className="pl-10"
                                placeholder="Nuova Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                        <div className="relative">
                            <label htmlFor="confirm-password" className="sr-only">Conferma Password</label>
                            <Input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                className="pl-10"
                                placeholder="Conferma Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-sm text-center text-green-500 bg-green-50 p-3 rounded border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                            {success}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Aggiorna Password
                    </Button>
                </form>
            </div>
        </main>
    );
}
