'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions';
import { AtSign, Key, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);

    return (
        <form action={dispatch} className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1" htmlFor="email">
                            Email Aziendale
                        </label>
                        <div className="relative group">
                            <input
                                className="peer block w-full rounded-xl border-0 bg-white/5 py-3 pl-11 text-sm text-white placeholder:text-slate-500 ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all outline-none"
                                id="email"
                                type="email"
                                name="email"
                                placeholder="nome@azienda.it"
                                required
                            />
                            <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 peer-focus:text-blue-400 transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1" htmlFor="password">
                            Password
                        </label>
                        <div className="relative group">
                            <input
                                className="peer block w-full rounded-xl border-0 bg-white/5 py-3 pl-11 text-sm text-white placeholder:text-slate-500 ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all outline-none"
                                id="password"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                minLength={3}
                            />
                            <Key className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 peer-focus:text-blue-400 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <LoginButton />
                </div>

                <div className="flex h-8 items-end space-x-1 mt-2" aria-live="polite" aria-atomic="true">
                    {errorMessage && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-2 rounded-lg w-full text-xs">
                            <AlertCircle className="h-4 w-4" />
                            <p>{errorMessage}</p>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className={cn(
                "group w-full flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-500/20",
                pending && "cursor-not-allowed opacity-70"
            )}
            disabled={pending}
        >
            {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                <span className="flex items-center gap-2">
                    Accedi al Portale <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
            )}
        </button>
    );
}
