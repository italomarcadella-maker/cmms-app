'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/app/lib/actions';
import { AtSign, Key, Loader2, AlertCircle } from 'lucide-react';

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);

    return (
        <form action={dispatch} className="space-y-3">
            <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8 shadow-sm dark:bg-zinc-900">
                <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                    Accedi
                </h1>
                <div className="w-full">
                    <div>
                        <label
                            className="mb-3 mt-5 block text-xs font-medium text-gray-900 dark:text-gray-200"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <div className="relative">
                            <input
                                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                id="email"
                                type="email"
                                name="email"
                                placeholder="admin@cmms.it"
                                required
                            />
                            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900 dark:peer-focus:text-gray-300" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label
                            className="mb-3 mt-5 block text-xs font-medium text-gray-900 dark:text-gray-200"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Inserisci password"
                                required
                                minLength={3}
                            />
                            <Key className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900 dark:peer-focus:text-gray-300" />
                        </div>
                    </div>
                </div>
                <LoginButton />
                <div
                    className="flex h-8 items-end space-x-1"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {errorMessage && (
                        <>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        </>
                    )}
                </div>

                {/* Helper text for demo */}
                <div className="mt-4 text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                    <p className="font-semibold mb-1">Credenziali Demo:</p>
                    <p>Admin: admin@cmms.it / admin</p>
                    <p>Tech: user@cmms.it / user</p>
                </div>
            </div>
        </form>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="mt-4 w-full flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            aria-disabled={pending}
        >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Accedi'}
        </button>
    );
}
