import Image from 'next/image';
import { BarChart3, ClipboardList, ScanLine } from 'lucide-react';

import LoginForm from './login-form';

const highlights = [
    { icon: ClipboardList, text: 'Ordini di lavoro e manutenzione preventiva' },
    { icon: ScanLine, text: 'Asset, ricambi e scansione dei QR code' },
    { icon: BarChart3, text: 'KPI di fermo macchina e costi' },
];

export default function LoginPage() {
    return (
        <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
            {/* Brand panel (desktop) */}
            <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
                <div className="fitt-rainbow-rule absolute inset-x-0 top-0" aria-hidden />

                <Image src="/brand/FITT-logo-bianco.svg" alt="FITT" width={104} height={64} unoptimized priority />

                <div className="max-w-md space-y-8">
                    <h2 className="font-display text-5xl leading-[1.05] text-white">
                        Manutenzione
                        <br />
                        sotto controllo.
                    </h2>
                    <ul className="space-y-4">
                        {highlights.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-primary">
                                    <Icon className="h-[18px] w-[18px]" />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-sidebar-foreground/60">FITT CMMS</p>
            </section>

            {/* Form */}
            <section className="flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm space-y-8">
                    <div className="lg:hidden">
                        <Image src="/brand/FITT-logo-colore.svg" alt="FITT" width={64} height={39} unoptimized priority />
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accedi</h1>
                        <p className="text-sm text-muted-foreground">Usa le credenziali del tuo account aziendale.</p>
                    </div>

                    <LoginForm />
                </div>
            </section>
        </main>
    );
}
