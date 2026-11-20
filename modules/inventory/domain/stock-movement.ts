/**
 * Movimenti di magazzino: tipi, etichette, riferimenti e formati. Funzioni pure, usabili anche dal browser.
 */

import { tk } from '@/lib/i18n/translate';

export const STOCK_MOVEMENT_TYPES = [
    'RECEIPT', 'CONSUMPTION', 'RETURN', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'INVENTORY', 'MATERIAL_REQUEST', 'INITIAL',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
    RECEIPT: tk('Carico / ricevimento merce'),
    CONSUMPTION: tk('Scarico / consumo'),
    RETURN: tk('Rientro a magazzino'),
    ADJUSTMENT: tk('Rettifica manuale'),
    TRANSFER_OUT: tk('Trasferimento in uscita'),
    TRANSFER_IN: tk('Trasferimento in entrata'),
    INVENTORY: tk('Inventario fisico'),
    MATERIAL_REQUEST: tk('Consegna richiesta di materiale'),
    INITIAL: tk('Giacenza iniziale'),
};

export function isStockMovementType(value: unknown): value is StockMovementType {
    return typeof value === 'string' && (STOCK_MOVEMENT_TYPES as readonly string[]).includes(value);
}

export function movementTypeLabel(type: string): string {
    return isStockMovementType(type) ? STOCK_MOVEMENT_LABELS[type] : type;
}

/** Quantita' con segno esplicito ("+5", "-3", "0"): il segno e' sempre scritto, mai solo il colore. */
export function formatSignedQty(delta: number): string {
    const n = Math.trunc(delta);
    if (n > 0) return `+${n.toLocaleString('it-IT')}`;
    if (n < 0) return `-${Math.abs(n).toLocaleString('it-IT')}`;
    return '0';
}

export interface MovementReference {
    kind: 'WORK_ORDER' | 'MATERIAL_REQUEST' | 'PURCHASE_REQUEST' | 'TRANSFER' | 'STOCK_COUNT' | 'OTHER';
    label: string;
    /** Pagina dell'applicazione a cui rimanda; null se non c'e' una pagina dedicata. */
    href: string | null;
}

const shortId = (id: string) => (id.length > 8 ? id.slice(-8) : id);

/** Interpreta il riferimento di un movimento ("WO:<id>", "MR:<id>", "PR:<id>", "PT:<id>", "SC:<id>"). */
export function parseMovementReference(reference: string | null | undefined): MovementReference | null {
    const ref = reference?.trim();
    if (!ref) return null;
    const idx = ref.indexOf(':');
    if (idx <= 0) return { kind: 'OTHER', label: ref, href: null };
    const prefix = ref.slice(0, idx).toUpperCase();
    const id = ref.slice(idx + 1).trim();
    if (!id) return { kind: 'OTHER', label: ref, href: null };
    switch (prefix) {
        case 'WO':
            return { kind: 'WORK_ORDER', label: `Ordine ${shortId(id)}`, href: `/work-orders/${encodeURIComponent(id)}` };
        case 'MR':
            return { kind: 'MATERIAL_REQUEST', label: `Richiesta di materiale ${shortId(id)}`, href: '/requests/material' };
        case 'PR':
            return { kind: 'PURCHASE_REQUEST', label: `Richiesta d'acquisto ${shortId(id)}`, href: '/inventory/purchase-requests' };
        case 'PT':
            return { kind: 'TRANSFER', label: `Trasferimento ${shortId(id)}`, href: '/inventory/availability?tab=transfers' };
        case 'SC':
            return { kind: 'STOCK_COUNT', label: `Inventario ${shortId(id)}`, href: `/inventory/counts?count=${encodeURIComponent(id)}` };
        default:
            return { kind: 'OTHER', label: ref, href: null };
    }
}

/** Campo CSV con separatore ";": virgolette se serve; i testi che iniziano come una formula vengono neutralizzati per Excel. */
export function csvField(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    let s = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Contenuto di un file CSV (BOM UTF-8 per Excel, separatore ";", righe separate da CRLF). */
export function buildCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
    const lines = [header, ...rows].map(r => r.map(csvField).join(';'));
    return `﻿${lines.join('\r\n')}\r\n`;
}
