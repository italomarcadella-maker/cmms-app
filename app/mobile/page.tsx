import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Camera, Plus, Calendar } from "lucide-react";

export default async function MobileDashboardPage() {
    const session = await auth();
    const userRole = session?.user?.role || "USER";

    // Fetch My Active Task
    const myTasks = await prisma.workOrder.findMany({
        where: {
            assignedTo: session?.user?.name, // Fallback filtering
            status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        take: 3,
        orderBy: { priority: 'desc' }
    });

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl font-bold mb-1">Ciao, {session?.user?.name?.split(' ')[0]}!</h1>
                <p className="opacity-90 text-sm mb-4">Pronto per il turno di oggi?</p>
                <div className="flex gap-3">
                    <div className="bg-white/20 p-2 rounded-lg flex-1 text-center">
                        <div className="text-xl font-bold">{myTasks.length}</div>
                        <div className="text-xs opacity-80 uppercase">Da Fare</div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg flex-1 text-center">
                        <div className="text-xl font-bold">0</div>
                        <div className="text-xs opacity-80 uppercase">Urgenti</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <h2 className="font-semibold text-lg px-1">Azioni Rapide</h2>
            <div className="grid grid-cols-2 gap-4">
                <Link href="/mobile/scan" className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors h-32 active:scale-95 duration-200">
                    <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <Camera className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">Scan Asset</span>
                </Link>
                <Link href="/work-orders/new?mobile=true" className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors h-32 active:scale-95 duration-200">
                    <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">Segnala Guasto</span>
                </Link>
                <Link href="/technicians/calendar" className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors h-32 active:scale-95 duration-200">
                    <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">Turni & Ferie</span>
                </Link>
                <button className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors h-32 active:scale-95 duration-200 opacity-50 cursor-not-allowed">
                    <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">Altro</span>
                </button>
            </div>

            {/* My Task List */}
            <h2 className="font-semibold text-lg px-1 mt-4">I tuoi Ordini</h2>
            <div className="space-y-3 pb-8">
                {myTasks.length === 0 ? (
                    <div className="text-center py-8 bg-white border border-dashed rounded-xl">
                        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">Tutto pulito! Nessun ordine assegnato.</p>
                    </div>
                ) : (
                    myTasks.map(task => (
                        <Link href={`/work-orders/${task.id}`} key={task.id} className="block bg-white p-4 rounded-xl border shadow-sm active:bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {task.priority}
                                </span>
                                <span className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1">{task.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
