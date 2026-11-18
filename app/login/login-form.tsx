'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

import { authenticate } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form action={dispatch} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="nome@azienda.it"
                    autoComplete="username"
                    className="h-11"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="La tua password"
                        autoComplete="current-password"
                        className="h-11 pr-11"
                        required
                        minLength={3}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Nascondi la password' : 'Mostra la password'}
                        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <LoginButton />

            <div aria-live="polite" aria-atomic="true">
                {errorMessage && (
                    <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical-strong">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accesso in corso
                </>
            ) : (
                'Accedi'
            )}
        </Button>
    );
}
