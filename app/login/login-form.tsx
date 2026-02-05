'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions';
import { AtSign, Key, Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form action={dispatch} className="space-y-5">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide" htmlFor="email">
                        Email
                    </label>
                    <div className="relative group">
                        <input
                            className="peer block w-full rounded-xl border border-slate-200 bg-white/50 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none backdrop-blur-sm"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="nome@azienda.it"
                            required
                        />
                        <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 peer-focus:text-blue-500 transition-colors" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide" htmlFor="password">
                            Password
                        </label>
                    </div>
                    <div className="relative group">
                        <input
                            className="peer block w-full rounded-xl border border-slate-200 bg-white/50 py-3.5 pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none backdrop-blur-sm"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={3}
                        />
                        <Key className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 peer-focus:text-blue-500 transition-colors" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <LoginButton />
            </div>

            <div className="flex h-8 items-end space-x-1 mt-2" aria-live="polite" aria-atomic="true">
                {errorMessage && (
                    <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-2.5 rounded-lg w-full text-xs font-medium border border-rose-100 animate-in slide-in-from-top-1 fade-in duration-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p>{errorMessage}</p>
                    </div>
                )}
            </div>
        </form>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className={cn(
                "group w-full flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed",
                pending && "opacity-90"
            )}
            disabled={pending}
        >
            {pending ? (
                <Loader2 className="h-5 w-5 animate-spin text-white/90" />
            ) : (
                <span className="flex items-center gap-2">
                    Accedi <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
            )}
        </button>
    );
}
