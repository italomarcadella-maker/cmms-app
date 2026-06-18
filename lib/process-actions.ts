"use server";

import {
    getUnresolvedAnomalies as newGetUnresolvedAnomalies,
    getProjects as newGetProjects,
    getProjectById as newGetProjectById,
    updateProject as newUpdateProject,
    addProjectTaskNote as newAddProjectTaskNote,
    createProject as newCreateProject,
    archiveProject as newArchiveProject,
    deleteProject as newDeleteProject,
    createProjectTask as newCreateProjectTask,
    updateTaskDates as newUpdateTaskDates,
    linkTaskToMaintenance as newLinkTaskToMaintenance,
    getSopDocuments as newGetSopDocuments,
    createSopDocument as newCreateSopDocument,
    getSOPsByAsset as newGetSOPsByAsset,
    updateSopDocument as newUpdateSopDocument,
    searchCMMS as newSearchCMMS,
    askLeanCopilot as newAskLeanCopilot,
    updateAssetStatus as newUpdateAssetStatus,
    createQuickWorkOrder as newCreateQuickWorkOrder,
    getLivePresenceData as newGetLivePresenceData
} from "@/modules/process/adapters/actions/process-actions";

export async function getUnresolvedAnomalies() {
    return newGetUnresolvedAnomalies();
}

export async function getProjects(showArchived: boolean = false) {
    return newGetProjects(showArchived);
}

export async function getProjectById(id: string) {
    return newGetProjectById(id);
}

export async function updateProject(id: string, data: { roi?: number; title?: string; description?: string; status?: string; progress?: number }) {
    return newUpdateProject(id, data);
}

export async function addProjectTaskNote(taskId: string, content: string, projectId: string) {
    return newAddProjectTaskNote(taskId, content, projectId);
}

export async function createProject(data: { title: string, description?: string, startDate: Date, endDate: Date, roi?: number }) {
    return newCreateProject(data);
}

export async function archiveProject(id: string) {
    return newArchiveProject(id);
}

export async function deleteProject(id: string) {
    return newDeleteProject(id);
}

export async function createProjectTask(data: { projectId: string, title: string, startDate: Date, endDate: Date, status?: string, dependencies?: string }) {
    return newCreateProjectTask(data);
}

export async function updateTaskDates(taskId: string, startDate: Date, endDate: Date, projectId: string) {
    return newUpdateTaskDates(taskId, startDate, endDate, projectId);
}

export async function linkTaskToMaintenance(taskId: string, assetId: string, description: string, projectId: string) {
    return newLinkTaskToMaintenance(taskId, assetId, description, projectId);
}

export async function getSopDocuments() {
    return newGetSopDocuments();
}

export async function createSopDocument(data: { title: string, assetId: string, imageUrl: string, aiExtractedParameters: string, line?: string, product?: string }) {
    return newCreateSopDocument(data);
}

export async function getSOPsByAsset(assetId: string) {
    return newGetSOPsByAsset(assetId);
}

export async function updateSopDocument(id: string, data: { title?: string, aiExtractedParameters?: string }) {
    return newUpdateSopDocument(id, data);
}

export async function searchCMMS(query: string) {
    return newSearchCMMS(query);
}

export async function askLeanCopilot(fpesData: any, message: string) {
    return newAskLeanCopilot(fpesData, message);
}

export async function updateAssetStatus(assetId: string, status: "OPERATIONAL" | "MAINTENANCE" | "OFFLINE") {
    return newUpdateAssetStatus(assetId, status);
}

export async function createQuickWorkOrder(data: {
    assetId: string;
    title: string;
    description: string;
    priority: "STOPPED" | "MALFUNCTIONING" | "HIGH" | "MEDIUM" | "LOW";
    category: "MECHANICAL" | "ELECTRICAL" | "HYDRAULIC" | "PNEUMATIC" | "SOFTWARE" | "CIVIL" | "OTHER" | "SAFETY" | "IMPROVEMENT";
}) {
    return newCreateQuickWorkOrder(data);
}

export async function getLivePresenceData() {
    return newGetLivePresenceData();
}

export async function searchCMMS(query: string) {
    if (!query || query.trim().length === 0) return { assets: [], workOrders: [], projects: [] };
    const q = query.trim().toLowerCase();
    try {
        const assets = await prisma.asset.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { model: { contains: q, mode: 'insensitive' } },
                    { serialNumber: { contains: q, mode: 'insensitive' } },
                    { location: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 5
        });
        const workOrders = await prisma.workOrder.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 5
        });
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 5
        });
        return { assets, workOrders, projects };
    } catch (e) {
        console.error("Search failed", e);
        return { assets: [], workOrders: [], projects: [] };
    }
}

import { calcP } from "@/lib/fpes-utils";

export async function askLeanCopilot(fpesData: any, message: string) {
    if (!fpesData) return { content: "Nessun dato di linea disponibile su cui calcolare l'ottimizzazione." };

    const cp = calcP(fpesData);
    const msg = message.toLowerCase();

    // Check if user wants a full line optimization
    const isOptimizationRequest = msg.includes("ottimizza") || msg.includes("bilancia") || msg.includes("ribilancia") || msg.includes("calcola") || msg.includes("consigli") || msg.trim().length === 0;

    let content = "";

    if (isOptimizationRequest) {
        content += `### 🧠 Report Generativo di Bilanciamento Lean\n\n`;
        content += `Analizzando la configurazione corrente della cella **${fpesData.nome || "PROGETTO LINEA"}** (Layout: **${fpesData.layout || "U"}**), ho elaborato i seguenti consigli di ottimizzazione:\n\n`;

        content += `#### 📊 Stato di Linea Corrente\n`;
        content += `* **Efficienza di Linea:** \`${cp.lineEff}%\` ${cp.lineEff < 75 ? "⚠️ (Bassa, margine di miglioramento elevato)" : "🟢 (Buona)"}\n`;
        content += `* **Takt Time Obiettivo:** \`${cp.takt}s\`\n`;
        if (cp.bot) {
            content += `* **Collo di Bottiglia (Bottleneck):** **${cp.bot.nome}** con tempo ciclo di \`${cp.bot.cicloS}s\` (Takt Time richiesto: ${cp.takt}s)\n`;
        }
        content += `* **Stazioni Attive:** \`${cp.n}\` stazioni\n\n`;

        content += `#### 🛠️ Azioni di Ottimizzazione ALBP (Assembly Line Balancing)\n`;
        
        let hasAction = false;
        // ALBP balance check
        const activeStations = cp.active || [];
        if (activeStations.length > 1 && cp.bot) {
            const botSt = cp.bot;
            // Find most underloaded station
            const underSt = activeStations.reduce((a: any, b: any) => a.cicloS < b.cicloS ? a : b, activeStations[0]);
            
            const diff = botSt.cicloS - underSt.cicloS;
            if (diff > 8 && botSt.id !== underSt.id) {
                hasAction = true;
                const shiftSec = Math.round(diff / 2);
                content += `1. **Ribilanciamento Carichi:** Sposta circa **${shiftSec} secondi** di attività dalla postazione collo di bottiglia **${botSt.nome}** (${botSt.cicloS}s) alla postazione più scarica **${underSt.nome}** (${underSt.cicloS}s).\n`;
                content += `   * *Impatto previsto:* Il tempo ciclo massimo scenderà a circa \`${botSt.cicloS - shiftSec}s\`, incrementando l'efficienza complessiva della linea a circa **${Math.min(95, cp.lineEff + 12)}%**.\n`;
            }
        }

        // Check ergonomics
        const badErgoSt = activeStations.filter((s: any) => s.altPrelievo < 75 || s.altPrelievo > 125);
        if (badErgoSt.length > 0) {
            hasAction = true;
            content += `2. **Miglioramento Ergonomico (NIOSH):** Ho rilevato altezze di prelievo fuori dalla *Golden Zone* (75-125cm) nelle seguenti postazioni:\n`;
            badErgoSt.forEach((s: any) => {
                content += `   * **${s.nome}:** Altezza prelievo attuale \`${s.altPrelievo}cm\`. Si consiglia di regolare il piano rack a **90cm**.\n`;
            });
            content += `   * *Impatto previsto:* Riduzione dell'indice di fatica e aumento dell'Ergonomics Score complessivo a **100%** (attualmente ${cp.ergoScore}%).\n`;
        }

        // Check Buffer & Space
        if (cp.copMin !== "∞" && parseFloat(cp.copMin || "0") < 20) {
            hasAction = true;
            content += `3. **Gestione Buffer (Superamento Stockout):** La copertura del rack a gravità è di soli \`${cp.copMin} minuti\`. Per ridurre il rischio di fermo linea per mancanza materiali:\n`;
            content += `   * Aumenta il numero di livelli a **3** o aumenta la capacità di stoccaggio per livello del rack.\n`;
        }

        if (!hasAction) {
            content += `* Eccellente! La linea è attualmente bilanciata in modo ottimale con parametri ergonomici e logistici entro i limiti di tolleranza Lean. Continua così!`;
        }

        content += `\n\n#### 📈 Benefici Lean Stimati (Post-Intervento)\n`;
        content += `| Metrica | Stato Attuale | Stato Previsto | Delta |\n`;
        content += `| :--- | :---: | :---: | :---: |\n`;
        content += `| **Efficienza Linea** | ${cp.lineEff}% | ${Math.min(95, cp.lineEff + 12)}% | **+12%** |\n`;
        content += `| **Lean Score** | ${cp.leanScore}/100 | ${Math.min(100, cp.leanScore + 15)}/100 | **+15** |\n`;
        content += `| **Ergonomics Score** | ${cp.ergoScore}% | 100% | **+${100 - cp.ergoScore}%** |\n`;

    } else if (msg.includes("ergo") || msg.includes("salute") || msg.includes("postura")) {
        content += `### 🧍 Analisi Ergonomica e Posturale della Linea\n\n`;
        content += `L'Ergonomics Score corrente è pari a **${cp.ergoScore}%**.\n\n`;
        content += `Ecco le linee guida applicate secondo gli standard NIOSH:\n`;
        content += `* **Altezza Prelievo Ottimale (Golden Zone):** 75 - 125 cm. Qualsiasi valore superiore o inferiore costringe l'operatore a piegamenti o estensioni non ergonomiche.\n`;
        content += `* **Limite Peso NIOSH:** ≤ 15 kg. I carichi attuali sollevati sulle tue stazioni variano con un massimo di \`${Math.max(...cp.active.map((s:any)=>s.pesoSollev || 0))}kg\`.\n\n`;
        content += `**Consiglio Copilot:** Assicurati che gli operatori eseguano il prelievo dei componenti ad altezza gomito. Regola le guide a rulli del rack a gravità a 85-95 cm.`;
    } else if (msg.includes("muda") || msg.includes("spreco") || msg.includes("timwoods")) {
        content += `### 🗑️ Identificazione degli Sprechi (Muda) & TIMWOODS\n\n`;
        content += `Il punteggio TIMWOODS complessivo è di **${cp.twPct}%** di efficienza sugli sprechi.\n\n`;
        content += `I principali sprechi censiti nella cella:\n`;
        const tw = fpesData.timwoods || {};
        content += `* **Attese (Waiting):** Livello \`${tw.W || 0}/5\`\n`;
        content += `* **Movimenti (Motion):** Livello \`${tw.M || 0}/5\`\n`;
        content += `* **Trasporti (Transport):** Livello \`${tw.T || 0}/5\`\n\n`;
        content += `**Suggerimento Lean:** Per eliminare i movimenti inutili, applica una disposizione a U o a C (il layout attuale è **${fpesData.layout}**), posizionando i componenti ad alta rotazione nei canali del rack più vicini all'operatore.`;
    } else {
        content += `### 🤖 Risposta Lean Copilot\n\n`;
        content += `Ciao! Sono il tuo **Lean Copilot** per il progetto **${fpesData.title || fpesData.nome}**.\n\n`;
        content += `Posso aiutarti a:\n`;
        content += `* 📊 Calcolare il bilanciamento ottimo della linea (ALBP) e ridistribuire le attività.\n`;
        content += `* 🧍 Analizzare e correggere le problematiche ergonomiche e posturali NIOSH/Golden Zone.\n`;
        content += `* 🗑️ Ridurre i 7 sprechi industriali (TIMWOODS) analizzando i tuoi carichi di lavoro.\n\n`;
        content += `**Come posso supportarti oggi nella tua caccia allo spreco?** Puoi digitare *"ottimizza"* per generare un piano d'azione immediato.`;
    }

    return { content };
}

export async function updateAssetStatus(assetId: string, status: "OPERATIONAL" | "MAINTENANCE" | "OFFLINE") {
    const session = await auth();
    if (!session?.user) return { success: false, message: "Non autenticato" };

    try {
        await prisma.asset.update({
            where: { id: assetId },
            data: { status }
        });
        
        // Log audit trail
        try {
            await prisma.auditLog.create({
                data: {
                    action: "UPDATE_STATUS",
                    resourceId: assetId,
                    userId: session.user.id || "",
                    details: `Asset status updated to ${status} via Mobile Console by ${session.user.name}`
                }
            });
        } catch (e) {
            console.error("Failed to create audit log", e);
        }

        revalidatePath(`/mobile/assets/${assetId}`);
        revalidatePath(`/assets/${assetId}`);
        revalidatePath("/assets");
        revalidatePath("/mobile");
        
        return { success: true };
    } catch (e) {
        console.error("Failed to update asset status", e);
        return { success: false, message: "Errore durante l'aggiornamento dello stato dell'asset" };
    }
}

export async function createQuickWorkOrder(data: {
    assetId: string;
    title: string;
    description: string;
    priority: "STOPPED" | "MALFUNCTIONING" | "HIGH" | "MEDIUM" | "LOW";
    category: "MECHANICAL" | "ELECTRICAL" | "HYDRAULIC" | "PNEUMATIC" | "SOFTWARE" | "CIVIL" | "OTHER" | "SAFETY" | "IMPROVEMENT";
}) {
    const session = await auth();
    if (!session?.user) return { success: false, message: "Non autenticato" };

    try {
        const asset = await prisma.asset.findUnique({
            where: { id: data.assetId },
            select: { plantId: true, name: true }
        });

        if (!asset) return { success: false, message: "Asset non trovato" };

        // Search if the user has a technician profile to link
        let technicianId: string | undefined = undefined;
        if (session.user.id) {
            const tech = await prisma.technician.findUnique({
                where: { userId: session.user.id }
            });
            if (tech) {
                technicianId = tech.id;
            }
        }

        // Map WorkOrderPriority from client
        let priorityMapped: "STOPPED" | "MALFUNCTIONING" | "HIGH" | "MEDIUM" | "LOW" = data.priority;

        const newWO = await prisma.workOrder.create({
            data: {
                title: data.title,
                description: data.description,
                priority: priorityMapped,
                category: data.category,
                status: "OPEN",
                type: "FAULT",
                assetId: data.assetId,
                plantId: asset.plantId,
                assignedTo: session.user.name, // pre-assigned to reporting technician for zero friction
                assignedTechnicianId: technicianId,
                requesterId: session.user.id
            }
        });

        // If priority is STOPPED or MALFUNCTIONING, update the asset status automatically
        if (data.priority === "STOPPED") {
            await prisma.asset.update({
                where: { id: data.assetId },
                data: { status: "OFFLINE" }
            });
        } else if (data.priority === "MALFUNCTIONING") {
            await prisma.asset.update({
                where: { id: data.assetId },
                data: { status: "MAINTENANCE" }
            });
        }

        // Log audit trail
        try {
            await prisma.auditLog.create({
                data: {
                    action: "CREATE_WO",
                    resourceId: newWO.id,
                    userId: session.user.id || "",
                    details: `Quick Work Order #${newWO.id} created via Mobile Console by ${session.user.name}`
                }
            });
        } catch (e) {
            console.error("Failed to create audit log", e);
        }

        revalidatePath(`/mobile/assets/${data.assetId}`);
        revalidatePath(`/assets/${data.assetId}`);
        revalidatePath("/mobile");
        
        return { success: true, workOrderId: newWO.id };
    } catch (e) {
        console.error("Failed to create quick work order", e);
        return { success: false, message: "Errore durante la creazione del ticket" };
    }
}

export async function getLivePresenceData() {
    try {
        const technicians = await prisma.technician.findMany({
            include: {
                assignments: {
                    where: {
                        workOrder: {
                            status: {
                                in: ["OPEN", "APPROVED", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "PENDING_REVIEW"]
                            }
                        }
                    },
                    include: {
                        workOrder: {
                            select: {
                                id: true,
                                title: true,
                                priority: true,
                                status: true,
                                asset: {
                                    select: {
                                        location: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Map real DB technicians
        const realOperators = technicians.map((tech) => {
            const activeAssignment = tech.assignments[0]; // grab the most recent active assignment
            
            let status: "ONLINE" | "EXECUTING_TASK" | "WORKING_EWO" = "ONLINE";
            let statusLabel = "Disponibile";
            let activeTask = "Disponibile per interventi e PM";
            let location = "Shopfloor Centrale";

            if (activeAssignment && activeAssignment.workOrder) {
                const wo = activeAssignment.workOrder;
                const isCritical = wo.priority === "STOPPED" || wo.priority === "HIGH" || wo.priority === "MALFUNCTIONING";
                
                status = isCritical ? "WORKING_EWO" : "EXECUTING_TASK";
                statusLabel = isCritical ? "Emergenza EWO" : "In Attività";
                activeTask = `${wo.title} (${wo.status})`;
                if (wo.asset && wo.asset.location) {
                    location = wo.asset.location;
                }
            }

            // Initials helper
            const initials = tech.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

            return {
                id: tech.id,
                name: tech.name,
                role: tech.specialty || "Manutentore",
                specialty: tech.specialty || "Meccanico Generale",
                status,
                statusLabel,
                activeTask,
                location,
                color: status === "WORKING_EWO" ? "red" : status === "EXECUTING_TASK" ? "blue" : "emerald",
                avatarInitials: initials || "MR"
            };
        });

        return realOperators;
    } catch (e) {
        console.error("Failed to fetch live presence data", e);
        // Ritorna una lista vuota in caso di errore invece di dati mock
        return [];
    }
}



