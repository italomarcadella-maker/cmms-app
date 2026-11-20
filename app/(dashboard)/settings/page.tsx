"use client";

import { Save, User, Globe, AlertTriangle, Download, Trash2, Bell, Shield, Server, Plug, Smartphone, Calendar, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { resetDatabase } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/i18n/toast";
import { BackToDashboardButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { getHealthConfig, updateHealthConfig } from "@/modules/maintenance/adapters/actions/asset-health-actions";
import { DEFAULT_HEALTH_CONFIG, defaultHealthConfig, type HealthConfig } from "@/modules/maintenance/domain/asset-health";
import { useT } from "@/lib/i18n/client";

export default function SettingsPage() {
    const t = useT();
    const router = useRouter();
    const { ask, dialog } = usePrompt();

    const handleExport = () => {
        const data = {
            assets: localStorage.getItem("assets"),
            workOrders: localStorage.getItem("workOrders"),
            inventory: localStorage.getItem("inventory"),
            technicians: localStorage.getItem("technicians"),
            activities: localStorage.getItem("activities"),
            schedules: localStorage.getItem("pm_schedules")
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cmms_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Backup esportato correttamente");
    };

    const handleReset = async () => {
        const typed = await ask({ title: t("Reset totale del database"), description: t("Questa azione è irreversibile e cancella Ordini, Asset, Tecnici e Utenti non-admin."), label: t("Per confermare scrivi: ELIMINA TUTTO"), mustType: "ELIMINA TUTTO", confirmLabel: t("Elimina tutto"), variant: "destructive" });
        if (typed !== null) {
            try {
                const result = await resetDatabase(typed);
                if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                } else {
                    toast.error(result.message);
                }
            } catch (e) {
                console.error(e);
                toast.error("Errore durante il reset.");
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <BackToDashboardButton />
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t("Impostazioni")}
                </h1>
                <p className="text-muted-foreground mt-1">{t("Gestisci la piattaforma, le preferenze utente e le configurazioni di sistema.")}</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="general">{t("Generale")}</TabsTrigger>
                    <TabsTrigger value="notifications">{t("Notifiche")}</TabsTrigger>
                    <TabsTrigger value="system">{t("Sistema")}</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-amber-600 data-[state=active]:text-amber-700">{t("Avanzate")}</TabsTrigger>
                </TabsList>

                {/* --- GENERAL TAB --- */}
                <TabsContent value="general" className="space-y-6 mt-6">
                    {/* Profile Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t("Profilo Utente")}</CardTitle>
                            <CardDescription>{t("Gestisci le tue informazioni personali e aziendali.")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("Nome Azienda")}</Label>
                                    <Input defaultValue="My Factory S.p.A." />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("Nome Utente")}</Label>
                                    <Input defaultValue="Mario Rossi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("Email Aziendale")}</Label>
                                    <Input defaultValue="mario.rossi@factory.it" readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("Lingua Interfaccia")}</Label>
                                    <Select defaultValue="it">
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("Seleziona lingua")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="it">Italiano</SelectItem>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 bg-muted/20">
                            <Button onClick={() => toast.success("Profilo aggiornato")} className="ml-auto">
                                <Save className="h-4 w-4 mr-2" /> {t("Salva Modifiche")}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Security Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> {t("Sicurezza")}</CardTitle>
                            <CardDescription>{t("Gestione password e accessi.")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <div className="font-medium">{t("Password")}</div>
                                    <div className="text-sm text-muted-foreground">{t("Ultima modifica 30 giorni fa")}</div>
                                </div>
                                <Button variant="outline">{t("Cambia Password")}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- NOTIFICATIONS TAB --- */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t("Preferenze Notifiche")}</CardTitle>
                            <CardDescription>{t("Decidi come e quando essere avvisato.")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t("Notifiche Push")}</Label>
                                    <p className="text-sm text-muted-foreground">{t("Ricevi notifiche in tempo reale nel browser.")}</p>
                                </div>
                                <Switch defaultChecked onCheckedChange={() => toast("Impostazione salvata")} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t("Report Settimanale Email")}</Label>
                                    <p className="text-sm text-muted-foreground">{t("Ricevi un riepilogo delle attività ogni lunedì.")}</p>
                                </div>
                                <Switch defaultChecked onCheckedChange={() => toast("Impostazione salvata")} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t("Allerte Critiche Asset")}</Label>
                                    <p className="text-sm text-muted-foreground">{t("Notifica immediata se un asset va in stato CRITICAL.")}</p>
                                </div>
                                <Switch defaultChecked disabled title={t("Sempre attivo per la sicurezza")} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SYSTEM TAB --- */}
                <TabsContent value="system" className="space-y-6 mt-6">
                    <SchedulerTriggerSection />
                    <EWOSettingsSection />
                    <CostSettingsSection />
                    <HealthSettingsSection />
                    <IntegrationsSection />
                </TabsContent>

                {/* --- ADVANCED TAB --- */}
                <TabsContent value="advanced" className="space-y-6 mt-6">
                    <Card className="border-amber-200 bg-amber-50/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" /> {t("Zona Pericolo")}</CardTitle>
                            <CardDescription>{t("Azioni che possono comportare perdita di dati.")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-amber-200 bg-white rounded-lg">
                                <div>
                                    <div className="font-medium">{t("Esporta Backup Completo")}</div>
                                    <div className="text-sm text-muted-foreground">{t("Scarica un file JSON con tutti i dati del sistema.")}</div>
                                </div>
                                <Button onClick={handleExport} variant="outline" className="border-amber-200 hover:bg-amber-50">
                                    <Download className="h-4 w-4 mr-2" /> {t("Esporta Dati")}
                                </Button>
                            </div>

                            <Separator className="bg-amber-200/50" />

                            <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50/30 rounded-lg">
                                <div>
                                    <div className="font-medium text-red-700">{t("Factory Reset")}</div>
                                    <div className="text-sm text-red-600/80">{t("Cancella tutti i dati operativi (ordini, asset, etc). Mantiene gli admin.")}</div>
                                </div>
                                <Button onClick={handleReset} variant="destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> {t("Reset Totale")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {dialog}
        </div>
    );
}

function EWOSettingsSection() {
    const t = useT();
    const [threshold, setThreshold] = useState<number>(0);

    useEffect(() => {
        import("@/lib/actions").then(async (mod) => {
            const s = await mod.getSystemSettings();
            if (s) setThreshold(s.ewoThresholdHours);
        });
    }, []);

    const handleSave = async () => {
        const { updateSystemSettings } = await import("@/lib/actions");
        const res = await updateSystemSettings({ ewoThresholdHours: threshold });
        toast.success(res.message);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                    <AlertTriangle className="h-5 w-5" /> {t("Configurazione EWO")}
                </CardTitle>
                <CardDescription>{t("Regole per l'apertura automatica di Emergency Work Order.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label>{t("Soglia Ore Intervento")}</Label>
                    <div className="flex gap-4">
                        <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-32"
                        />
                        <div className="flex-1 text-sm text-muted-foreground self-center">
                            {t("ore. Se superata, l'ordine richiede EWO obbligatorio. (0 = Disabilitato)")}
                        </div>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {t("Aggiorna Regola")}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CostSettingsSection() {
    const t = useT();
    const [values, setValues] = useState({
        downtimeCostPerMinute: 100,
        defaultLaborHourlyRate: 30,
        electricityPricePerKwh: 0.22,
        waterPricePerM3: 0.85,
        co2FactorPerKwh: 0.44,
    });

    useEffect(() => {
        import("@/lib/actions").then(async (mod) => {
            const s = await mod.getSystemSettings();
            if (s) setValues({
                downtimeCostPerMinute: s.downtimeCostPerMinute,
                defaultLaborHourlyRate: s.defaultLaborHourlyRate,
                electricityPricePerKwh: s.electricityPricePerKwh,
                waterPricePerM3: s.waterPricePerM3,
                co2FactorPerKwh: s.co2FactorPerKwh,
            });
        });
    }, []);

    const handleSave = async () => {
        const { updateSystemSettings } = await import("@/lib/actions");
        const res = await updateSystemSettings(values);
        toast.success(res.message);
    };

    const field = (key: keyof typeof values, label: string, unit: string, step = "0.01") => (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <div className="flex gap-2 items-center">
                <Input
                    type="number"
                    min="0"
                    step={step}
                    value={values[key]}
                    onChange={(e) => setValues(v => ({ ...v, [key]: Number(e.target.value) }))}
                    className="w-32"
                />
                <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                    <Server className="h-5 w-5" /> {t("Costi & Tariffe")}
                </CardTitle>
                <CardDescription>{t("Valori usati per stimare costi di fermo macchina, manodopera e sostenibilità. Sostituiscono le costanti fisse usate finora nei KPI.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {field('downtimeCostPerMinute', t("Costo Fermo Macchina"), '€/min', '1')}
                    {field('defaultLaborHourlyRate', t("Tariffa Manodopera (fallback)"), '€/h', '1')}
                    {field('electricityPricePerKwh', t("Tariffa Elettricità"), '€/kWh')}
                    {field('waterPricePerM3', t("Tariffa Acqua"), '€/m³')}
                    {field('co2FactorPerKwh', t("Fattore Emissione CO2"), 'kg/kWh')}
                </div>
                <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {t("Salva Costi & Tariffe")}
                </Button>
            </CardContent>
        </Card>
    );
}

/** Campi modificabili del punteggio di salute, come testo (per accettare la virgola decimale). */
type HealthForm = {
    wCurrent: string; wFrequency: string; wSchedule: string;
    noPlanCap: string;
    pFault: string; pStopping: string; pRequest: string;
    windowMonths: string;
};

function healthToForm(c: HealthConfig): HealthForm {
    const t = (n: number) => String(n).replace('.', ',');
    return {
        wCurrent: t(c.weights.current), wFrequency: t(c.weights.frequency), wSchedule: t(c.weights.schedule),
        noPlanCap: t(c.noPlanCap),
        pFault: t(c.eventPoints.fault), pStopping: t(c.eventPoints.stoppingFault), pRequest: t(c.eventPoints.request),
        windowMonths: t(c.windowMonths),
    };
}

function HealthSettingsSection() {
    const t = useT();
    const d = DEFAULT_HEALTH_CONFIG;
    const [base, setBase] = useState<HealthConfig>(defaultHealthConfig());
    const [form, setForm] = useState<HealthForm>(healthToForm(defaultHealthConfig()));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getHealthConfig().then(r => {
            if (r.success) { setBase(r.config); setForm(healthToForm(r.config)); }
        });
    }, []);

    const n = (v: string) => (v.trim() === '' ? NaN : Number(v.trim().replace(',', '.')));

    const handleSave = async () => {
        const values = {
            weights: { current: n(form.wCurrent), frequency: n(form.wFrequency), schedule: n(form.wSchedule) },
            noPlanCap: n(form.noPlanCap),
            eventPoints: { fault: n(form.pFault), stoppingFault: n(form.pStopping), request: n(form.pRequest) },
            windowMonths: n(form.windowMonths),
        };
        const flat = [...Object.values(values.weights), values.noPlanCap, ...Object.values(values.eventPoints), values.windowMonths];
        if (flat.some(v => !Number.isFinite(v) || v < 0)) { toast.error("Inserisci solo numeri maggiori o uguali a zero."); return; }
        if (values.weights.current + values.weights.frequency + values.weights.schedule <= 0) { toast.error("La somma dei pesi deve essere maggiore di zero."); return; }
        if (values.noPlanCap > 100) { toast.error("Il tetto deve essere tra 0 e 100."); return; }
        if (!Number.isInteger(values.windowMonths) || values.windowMonths < 1 || values.windowMonths > 60) { toast.error("La finestra deve essere un numero intero di mesi, da 1 a 60."); return; }
        setSaving(true);
        try {
            const res = await updateHealthConfig({ ...base, ...values });
            if (res.success && res.config) { setBase(res.config); setForm(healthToForm(res.config)); toast.success(res.message); }
            else toast.error(res.message ?? t("Errore salvataggio."));
        } finally { setSaving(false); }
    };

    const handleReset = async () => {
        setSaving(true);
        try {
            const res = await updateHealthConfig(null);
            if (res.success && res.config) { setBase(res.config); setForm(healthToForm(res.config)); toast.success(res.message); }
            else toast.error(res.message ?? t("Errore ripristino."));
        } finally { setSaving(false); }
    };

    const field = (key: keyof HealthForm, label: string, unit: string, hint?: string) => (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <div className="flex gap-2 items-center">
                <Input
                    inputMode="decimal"
                    value={form[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-28"
                />
                <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                    <Activity className="h-5 w-5" /> {t("Salute degli asset")}
                </CardTitle>
                <CardDescription>
                    {t("Il punteggio 0-100 di ogni macchina è calcolato, non inserito a mano: media pesata di tre componenti. Regola con i valori predefiniti:")}{" "}
                    {t("Stato attuale: {ok} senza guasti aperti, {fault} con un guasto aperto, {stopped} se il guasto ferma la macchina.", { ok: d.currentScores.ok, fault: d.currentScores.fault, stopped: d.currentScores.stopped })}{" "}
                    {t("Frequenza: punti-evento degli ultimi mesi (guasto, guasto che ferma la macchina, richiesta), a gradini: 0 punti = {s0}, fino a {p1} = {s1}, fino a {p2} = {s2}, fino a {p3} = {s3}, oltre = {sb}.", {
                        s0: d.frequencySteps[0].score, p1: d.frequencySteps[1].maxPoints, s1: d.frequencySteps[1].score,
                        p2: d.frequencySteps[2].maxPoints, s2: d.frequencySteps[2].score,
                        p3: d.frequencySteps[3].maxPoints, s3: d.frequencySteps[3].score, sb: d.frequencyBeyondScore,
                    })}{" "}
                    {t("Manutenzione programmata: {penalty} punti in meno per ogni piano in ritardo, limitato dalla quota di interventi chiusi entro la scadenza.", { penalty: d.overduePenalty })}{" "}
                    {t("Senza piani di manutenzione il terzo componente non è valutabile e il punteggio non supera il tetto. Se i dati non bastano, la macchina risulta \"n.d.\".")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="text-sm font-medium mb-3">{t("Pesi dei componenti")}</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {field('wCurrent', t("Stato attuale"), t("peso"))}
                        {field('wFrequency', t("Frequenza degli eventi"), t("peso"))}
                        {field('wSchedule', t("Manutenzione programmata"), t("peso"), t("I pesi si leggono in proporzione: non serve che sommino 100."))}
                    </div>
                </div>
                <div>
                    <div className="text-sm font-medium mb-3">{t("Punti-evento e finestra")}</div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {field('pFault', t("Guasto"), t("punti"))}
                        {field('pStopping', t("Guasto che ferma la macchina"), t("punti"))}
                        {field('pRequest', t("Richiesta"), t("punti"))}
                        {field('windowMonths', t("Finestra di osservazione"), t("mesi"), t("Predefinita: {value}.", { value: d.windowMonths }))}
                    </div>
                </div>
                <div>
                    <div className="text-sm font-medium mb-3">{t("Senza piano di manutenzione")}</div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {field('noPlanCap', t("Tetto del punteggio"), t("su 100"), t("Predefinito: {value}.", { value: d.noPlanCap }))}
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {t("Salva")}
                    </Button>
                    <Button onClick={handleReset} disabled={saving} variant="outline">
                        {t("Ripristina valori predefiniti")}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("Dopo il salvataggio i punteggi di tutte le macchine vengono ricalcolati.")}</p>
            </CardContent>
        </Card>
    );
}

function IntegrationsSection() {
    const t = useT();
    const [erpUrl, setErpUrl] = useState("");
    const [iotUrl, setIotUrl] = useState("");
    const [saved, setSaved] = useState({ erp: "", iot: "" });

    useEffect(() => {
        import("@/lib/actions").then(async (mod) => {
            const s = await mod.getSystemSettings();
            if (s) {
                setErpUrl(s.erpEndpointUrl || "");
                setIotUrl(s.iotGatewayUrl || "");
                setSaved({ erp: s.erpEndpointUrl || "", iot: s.iotGatewayUrl || "" });
            }
        });
    }, []);

    const handleSave = async (key: 'erpEndpointUrl' | 'iotGatewayUrl', value: string) => {
        const { updateSystemSettings } = await import("@/lib/actions");
        const res = await updateSystemSettings({ [key]: value || null });
        if (res.success) {
            setSaved(s => ({ ...s, [key === 'erpEndpointUrl' ? 'erp' : 'iot']: value }));
        }
        toast.success(res.message);
    };

    const integration = (
        icon: React.ReactNode,
        title: string,
        description: string,
        value: string,
        setValue: (v: string) => void,
        savedValue: string,
        onSave: () => void
    ) => {
        const isConfigured = savedValue.trim().length > 0;
        return (
            <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full", isConfigured ? "bg-emerald-100" : "bg-gray-100")}>
                            {icon}
                        </div>
                        <div>
                            <div className="font-medium">{title}</div>
                            <div className={cn("text-xs font-medium", isConfigured ? "text-emerald-600" : "text-muted-foreground")}>
                                {isConfigured ? t("CONFIGURATO") : t("NON CONFIGURATO")}
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                <div className="flex gap-2">
                    <Input
                        placeholder="https://..."
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={onSave}>{t("Salva")}</Button>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5" /> {t("Integrazioni")}</CardTitle>
                <CardDescription>{t("Connessioni con sistemi esterni. Lo stato riflette solo se un endpoint è stato configurato qui — non testa una connessione live.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {integration(
                    <Server className="h-4 w-4 text-emerald-600" />,
                    t("ERP Corporate"),
                    t("Endpoint dell'ERP aziendale per la sincronizzazione di costi e fermi macchina. Nessuna chiamata reale è ancora collegata: salvare qui prepara il campo per la futura integrazione."),
                    erpUrl,
                    setErpUrl,
                    saved.erp,
                    () => handleSave('erpEndpointUrl', erpUrl)
                )}
                {integration(
                    <Smartphone className="h-4 w-4 text-gray-600" />,
                    t("IoT Gateway"),
                    t("Endpoint del gateway IoT per l'acquisizione automatica di letture sensori/contatori. Nessuna chiamata reale è ancora collegata."),
                    iotUrl,
                    setIotUrl,
                    saved.iot,
                    () => handleSave('iotGatewayUrl', iotUrl)
                )}
            </CardContent>
        </Card>
    );
}

function SchedulerTriggerSection() {
    const t = useT();
    const [loading, setLoading] = useState(false);

    const handleRunScheduler = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/scheduler/run');
            const data = await res.json();
            if (data.success) {
                toast.success(t("Controllo completato: {count} ordini generati.", { count: data.count }));
            } else {
                toast.error(t("Errore: {error}", { error: data.error }));
            }
        } catch (e) {
            toast.error("Errore di connessione al server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {t("Manutenzione Programmata")}</CardTitle>
                <CardDescription>{t("Gestione del motore di schedulazione preventiva.")}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div>
                    <div className="font-medium">{t("Esecuzione Manuale")}</div>
                    <div className="text-sm text-muted-foreground">{t("Forza il controllo delle scadenze e genera gli ordini di lavoro dovuti.")}</div>
                </div>
                <Button onClick={handleRunScheduler} disabled={loading} variant="secondary">
                    {loading ? t("Esecuzione in corso...") : t("Esegui Controllo Ora")}
                </Button>
            </CardContent>
        </Card>
    );
}
