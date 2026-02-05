import LoginForm from './login-form';
import { Factory } from 'lucide-react';

export default function LoginPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-[#F5F5F7] overflow-hidden relative font-sans">

            {/* Mac-style Abstract Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] min-w-[600px] min-h-[600px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-[120px] mix-blend-multiply opacity-70 animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] rounded-full bg-gradient-to-tr from-rose-300/20 to-orange-300/20 blur-[100px] mix-blend-multiply opacity-70 animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] rounded-full bg-gradient-to-bl from-teal-300/20 to-blue-300/20 blur-[90px] mix-blend-multiply opacity-60 animate-pulse" style={{ animationDuration: '12s' }} />
            </div>

            <div className="relative w-full max-w-[420px] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700">

                {/* Glassmorphism Card */}
                <div className="relative z-10 bg-white/60 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-black/5 rounded-[2rem] p-8 md:p-10">

                    <div className="flex justify-center mb-8">
                        <div className="bg-gradient-to-tr from-blue-500 to-blue-600 p-3.5 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                            <Factory className="h-8 w-8" />
                        </div>
                    </div>

                    <div className="text-center mb-8 space-y-2">
                        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">CMMS Pro</h1>
                        <p className="text-slate-500 text-sm font-medium">Accedi al tuo spazio di lavoro</p>
                    </div>

                    <LoginForm />

                    <div className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                        Secure System • v2.0
                    </div>
                </div>
            </div>
        </main>
    );
}
