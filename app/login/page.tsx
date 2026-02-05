import LoginForm from './login-form';
import { Factory } from 'lucide-react';

export default function LoginPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-900 overflow-hidden relative">

            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative w-full max-w-md p-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-black p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-900">
                            <Factory className="h-10 w-10 text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">CMMS Pro</h1>
                    <p className="text-slate-400">Gestione Manutenzione Avanzata</p>
                </div>

                <LoginForm />

                <div className="mt-8 text-center text-xs text-slate-500 hover:text-slate-400 transition-colors cursor-default">
                    &copy; 2026 Makers • Stable Release
                </div>
            </div>
        </main>
    );
}
