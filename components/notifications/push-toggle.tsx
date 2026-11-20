"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { getPushStatus, removePushSubscription, savePushSubscription } from "@/modules/notifications/adapters/actions/push-actions";

/**
 * Attiva / disattiva le notifiche push sul telefono (Web Push) per questo dispositivo.
 * - "popover": riga nel centro notifiche della versione completa, mostra sempre lo stato.
 * - "banner": vista mobile; invito in alto solo quando c'e' qualcosa da fare, poi una riga discreta.
 */

type Phase =
    | "loading"
    | "unconfigured"  // chiavi VAPID non impostate sul server
    | "unsupported"   // browser senza push
    | "ios-install"   // iPhone/iPad: serve prima l'app sulla schermata Home
    | "denied"        // permesso negato dall'utente
    | "off"
    | "on";

const DISMISS_KEY = "push-banner-dismissed";

function isIos(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isSupported(): boolean {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(padded);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

/** Service worker dell'app (lo registra next-pwa; in sviluppo e' disattivato, quindi lo si registra qui se manca). */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10_000)),
    ]);
    return ready ?? reg;
}

/** Fase "locale" (browser e permesso) per un dispositivo con le push configurate sul server. */
async function detectPhase(): Promise<Phase> {
    if (isIos() && !isStandalone()) return "ios-install";
    if (!isSupported()) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission !== "granted") return "off";
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        return sub ? "on" : "off";
    } catch {
        return "off";
    }
}

export function PushToggle({ variant = "popover", className }: { variant?: "popover" | "banner"; className?: string }) {
    const t = useT();
    const [phase, setPhase] = useState<Phase>("loading");
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const status = await getPushStatus().catch(() => ({ configured: false, subscribed: false }));
            let next: Phase = status.configured ? await detectPhase() : "unconfigured";
            // Il server non ha piu' questo dispositivo (sottoscrizione scaduta e cancellata): si mostra come spento
            if (next === "on" && !status.subscribed) next = "off";
            let wasDismissed = false;
            try { wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* spazio di archiviazione non disponibile */ }
            if (cancelled) return;
            setDismissed(wasDismissed);
            setPhase(next);
        })();
        return () => { cancelled = true; };
    }, []);

    const enable = useCallback(async () => {
        setBusy(true);
        let created: PushSubscription | null = null;
        try {
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) {
                toast.error("Notifiche non ancora disponibili: l'app va aggiornata dall'amministratore");
                return;
            }
            // Il permesso va chiesto subito, nel gesto dell'utente
            const permission = await Notification.requestPermission();
            if (permission === "denied") { setPhase("denied"); return; }
            if (permission !== "granted") { toast.info("Notifiche non attivate"); return; }

            const reg = await getRegistration();
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = created = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                });
            }
            const json = sub.toJSON();
            const res = await savePushSubscription({
                endpoint: sub.endpoint,
                keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
            });
            if (!res.success) {
                if (created) await created.unsubscribe().catch(() => false);
                toast.error(res.message);
                return;
            }
            setPhase("on");
            toast.success(res.message);
        } catch (err) {
            if (created) await created.unsubscribe().catch(() => false);
            console.error("[push] attivazione:", err);
            toast.error("Impossibile attivare le notifiche su questo dispositivo");
        } finally {
            setBusy(false);
        }
    }, []);

    const disable = useCallback(async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = await reg?.pushManager.getSubscription();
            if (sub) {
                const endpoint = sub.endpoint;
                await sub.unsubscribe();
                await removePushSubscription(endpoint);
            }
            setPhase("off");
            toast.success("Notifiche sul telefono disattivate");
        } catch (err) {
            console.error("[push] disattivazione:", err);
            toast.error("Impossibile disattivare le notifiche");
        } finally {
            setBusy(false);
        }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* spazio di archiviazione non disponibile */ }
    };

    if (phase === "loading") return null;

    const iosText = t("Su iPhone le notifiche funzionano solo con l'app installata: in Safari tocca Condividi, poi \"Aggiungi alla schermata Home\" (serve iOS 16.4 o successivo) e apri l'app da li'.");
    const deniedText = t("Le notifiche sono bloccate per questa app. Per riattivarle apri le impostazioni del browser (o del telefono) per questo sito, consenti le notifiche e riprova.");

    // --- Vista mobile: invito in alto solo quando serve, altrimenti una riga discreta ---
    if (variant === "banner") {
        if (phase === "off" && !dismissed) {
            return (
                <div className={cn("mb-4 rounded-xl border bg-info-soft/50 p-3", className)}>
                    <p className="text-sm font-medium">{t("Ricevi gli avvisi anche a telefono bloccato")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("Nuove assegnazioni e richieste ti arrivano come notifica sul telefono.")}</p>
                    <div className="mt-2 flex gap-2">
                        <Button size="sm" className="min-h-[44px] flex-1" onClick={enable} disabled={busy}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <BellRing className="mr-2 h-4 w-4" aria-hidden />}
                            {t("Attiva le notifiche sul telefono")}
                        </Button>
                        <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={dismiss} disabled={busy}>{t("Non ora")}</Button>
                    </div>
                </div>
            );
        }
        if (phase === "ios-install" && !dismissed) {
            return (
                <div className={cn("mb-4 rounded-xl border bg-info-soft/50 p-3", className)}>
                    <p className="text-xs text-muted-foreground">{iosText}</p>
                    <Button size="sm" variant="ghost" className="mt-1 min-h-[44px]" onClick={dismiss}>{t("Ho capito")}</Button>
                </div>
            );
        }
        if (phase === "denied" && !dismissed) {
            return (
                <div className={cn("mb-4 rounded-xl border bg-warning-soft/50 p-3", className)}>
                    <p className="text-xs text-muted-foreground">{deniedText}</p>
                    <Button size="sm" variant="ghost" className="mt-1 min-h-[44px]" onClick={dismiss}>{t("Ho capito")}</Button>
                </div>
            );
        }
        if (phase === "on" || (phase === "off" && dismissed)) {
            return (
                <div className={cn("mb-2 flex items-center justify-end gap-2 text-xs text-muted-foreground", className)}>
                    {phase === "on" ? t("Notifiche sul telefono attive") : t("Notifiche sul telefono spente")}
                    <Button size="xs" variant="ghost" className="min-h-[44px]" onClick={phase === "on" ? disable : enable} disabled={busy}>
                        {phase === "on" ? t("Disattiva") : t("Attiva")}
                    </Button>
                </div>
            );
        }
        return null;
    }

    // --- Centro notifiche (versione completa) ---
    return (
        <div className={cn("border-t bg-muted/20 px-4 py-2.5 text-xs", className)}>
            {phase === "unconfigured" && (
                <p className="text-muted-foreground">{t("Notifiche sul telefono non ancora attivate dall'amministratore")}</p>
            )}
            {phase === "unsupported" && (
                <p className="text-muted-foreground">{t("Questo browser non supporta le notifiche sul telefono.")}</p>
            )}
            {phase === "ios-install" && <p className="text-muted-foreground">{iosText}</p>}
            {phase === "denied" && <p className="text-muted-foreground">{deniedText}</p>}
            {(phase === "off" || phase === "on") && (
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {phase === "on" ? <BellRing className="h-3.5 w-3.5" aria-hidden /> : <BellOff className="h-3.5 w-3.5" aria-hidden />}
                        {phase === "on" ? t("Notifiche sul telefono attive") : t("Notifiche sul telefono spente")}
                    </span>
                    <Button size="xs" variant={phase === "on" ? "ghost" : "outline"} onClick={phase === "on" ? disable : enable} disabled={busy}>
                        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
                        {phase === "on" ? t("Disattiva") : t("Attiva le notifiche sul telefono")}
                    </Button>
                </div>
            )}
        </div>
    );
}
