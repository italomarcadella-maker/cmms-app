'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireLogin, requireRole } from '@/lib/auth-guard';
import { runUnscoped } from '@/lib/plant-scope';
import {
    computeHealthForAssets,
    loadHealthConfig,
    refreshAllAssetHealthNow,
    refreshAssetHealthNow,
} from '@/lib/asset-health-sync';
import { isSystemAssetId } from '@/lib/system-assets';
import { parseHealthConfig, type AssetHealthResult, type HealthConfig } from '../../domain/asset-health';

/**
 * Punteggio di salute degli asset, calcolato (regola e pesi: domain/asset-health.ts, valori modificabili dalle impostazioni).
 * I dati alla base sono aggregati: il calcolo e' sempre sull'intero asset, anche per un manutentore, ma il risultato
 * contiene solo punteggi, conteggi e testi generici: nessun titolo o dettaglio di ordini altrui.
 */

const MAX_BATCH = 5000;

export interface AssetHealthDetail {
    success: boolean;
    message?: string;
    health: AssetHealthResult | null;
    /** Valore salvato in Asset.healthScore (quello che mostrano dashboard, impianti, gruppo e predittiva). */
    storedScore: number | null;
}

/** Dettaglio completo per la scheda dell'asset. */
export async function getAssetHealth(assetId: string): Promise<AssetHealthDetail> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', health: null, storedScore: null };
    if (typeof assetId !== 'string' || !assetId) return { success: false, message: 'Asset non valido', health: null, storedScore: null };
    if (isSystemAssetId(assetId)) return { success: false, message: 'Non è una macchina', health: null, storedScore: null };

    try {
        const entry = (await computeHealthForAssets([assetId])).get(assetId);
        if (!entry) return { success: false, message: 'Asset non trovato', health: null, storedScore: null };
        return { success: true, health: entry.health, storedScore: entry.storedScore };
    } catch (error) {
        console.error('[asset-health] getAssetHealth', error);
        return { success: false, message: 'Errore nel calcolo della salute', health: null, storedScore: null };
    }
}

export interface AssetHealthSummary {
    /** 0-100, oppure null se non valutabile ("n.d."). */
    score: number | null;
    /** Perche' non e' valutabile; null se lo e'. */
    reason: string | null;
    /** Tetto per mancanza di piani in vigore. */
    capped: boolean;
}

/** Punteggio di piu' asset per le liste: una query per tabella, non una per asset. Senza elenco: tutti gli asset visibili. */
export async function getAssetsHealth(assetIds?: string[]): Promise<{ success: boolean; message?: string; byAsset: Record<string, AssetHealthSummary> }> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', byAsset: {} };
    if (assetIds !== undefined && (!Array.isArray(assetIds) || assetIds.length > MAX_BATCH || assetIds.some(id => typeof id !== 'string'))) {
        return { success: false, message: 'Elenco di asset non valido', byAsset: {} };
    }

    try {
        const map = await computeHealthForAssets(assetIds ?? null);
        const byAsset: Record<string, AssetHealthSummary> = {};
        for (const [id, e] of map) {
            byAsset[id] = { score: e.health.score, reason: e.health.notEvaluableReason, capped: e.health.capped };
        }
        return { success: true, byAsset };
    } catch (error) {
        console.error('[asset-health] getAssetsHealth', error);
        return { success: false, message: 'Errore nel calcolo della salute', byAsset: {} };
    }
}

/** Ricalcola un asset e salva Asset.healthScore se e' valutabile (altrimenti non scrive nulla). */
export async function refreshAssetHealth(assetId: string): Promise<{ success: boolean; message?: string; score: number | null }> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', score: null };
    if (typeof assetId !== 'string' || !assetId) return { success: false, message: 'Asset non valido', score: null };
    try {
        const score = await refreshAssetHealthNow(assetId);
        return { success: true, score };
    } catch (error) {
        console.error('[asset-health] refreshAssetHealth', error);
        return { success: false, message: 'Errore nell\'aggiornamento della salute', score: null };
    }
}

/** Ricalcola tutti gli asset. Solo amministratore (il cron usa direttamente lib/asset-health-sync.ts). */
export async function refreshAllAssetHealth(): Promise<{ success: boolean; message?: string; evaluated?: number; updated?: number; notEvaluable?: number }> {
    const guard = await requireRole('ADMIN');
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato' };
    try {
        const r = await runUnscoped(() => refreshAllAssetHealthNow());
        return { success: true, ...r };
    } catch (error) {
        console.error('[asset-health] refreshAllAssetHealth', error);
        return { success: false, message: 'Errore nell\'aggiornamento della salute degli asset' };
    }
}

// --- Configurazione ---

/** Pesi e soglie in vigore (i predefiniti dove non e' stato salvato nulla). */
export async function getHealthConfig(): Promise<{ success: boolean; message?: string; config: HealthConfig }> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', config: parseHealthConfig(null) };
    return { success: true, config: await loadHealthConfig() };
}

/**
 * Salva pesi e soglie (solo ADMIN). Il valore e' validato con parseHealthConfig: quello che manca o non ha senso torna
 * al predefinito. `null` ripristina tutti i valori predefiniti. Dopo il salvataggio ricalcola tutti gli asset.
 */
export async function updateHealthConfig(input: unknown): Promise<{ success: boolean; message?: string; config?: HealthConfig }> {
    const guard = await requireRole('ADMIN');
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato' };

    try {
        const reset = input === null;
        const config = parseHealthConfig(reset ? null : input);
        const value = reset ? Prisma.DbNull : (config as unknown as Prisma.InputJsonValue);
        await prisma.systemSettings.upsert({
            where: { id: 'settings' },
            update: { healthConfig: value },
            create: { id: 'settings', healthConfig: value },
        });
        // I punteggi salvati dipendono dalla configurazione: li riallinea subito (un errore qui non annulla il salvataggio)
        try {
            await runUnscoped(() => refreshAllAssetHealthNow());
        } catch (error) {
            console.error('[asset-health] updateHealthConfig refresh', error);
        }
        revalidatePath('/settings');
        revalidatePath('/assets');
        revalidatePath('/');
        return { success: true, message: reset ? 'Valori predefiniti ripristinati' : 'Impostazioni di salute salvate', config };
    } catch (error) {
        console.error('[asset-health] updateHealthConfig', error);
        return { success: false, message: 'Errore salvataggio impostazioni di salute' };
    }
}
