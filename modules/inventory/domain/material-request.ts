/**
 * Richieste di materiale al magazzino manutenzione: stati, transizioni e validazione delle righe.
 * Logica pura, senza dipendenze: si usa sia nelle azioni del server sia nell'interfaccia.
 */

export const MATERIAL_STATUSES = ['REQUESTED', 'READY', 'DELIVERED', 'REJECTED', 'CANCELED'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
    REQUESTED: 'Richiesta',
    READY: 'Pronto da ritirare',
    DELIVERED: 'Consegnata',
    REJECTED: 'Rifiutata',
    CANCELED: 'Annullata',
};

export const MAX_ITEMS = 30;
export const MAX_QUANTITY = 10000;
export const MAX_DESCRIPTION = 200;

/** Passaggi di stato consentiti. Consegnata, Rifiutata e Annullata sono definitive. */
const TRANSITIONS: Record<MaterialStatus, readonly MaterialStatus[]> = {
    REQUESTED: ['READY', 'DELIVERED', 'REJECTED', 'CANCELED'],
    READY: ['DELIVERED', 'REJECTED'],
    DELIVERED: [],
    REJECTED: [],
    CANCELED: [],
};

export function isMaterialStatus(value: unknown): value is MaterialStatus {
    return typeof value === 'string' && (MATERIAL_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string, to: MaterialStatus): boolean {
    return isMaterialStatus(from) && TRANSITIONS[from].includes(to);
}

/** Stati di partenza da cui si puo' arrivare a `to` (serve per l'aggiornamento condizionato). */
export function statesBefore(to: MaterialStatus): MaterialStatus[] {
    return MATERIAL_STATUSES.filter(from => TRANSITIONS[from].includes(to));
}

/** Richiesta ancora da lavorare (da evadere o da ritirare). */
export function isOpenMaterialStatus(status: string): boolean {
    return status === 'REQUESTED' || status === 'READY';
}

export interface MaterialItemInput {
    partId?: string | null;
    description?: string | null;
    quantity: number;
}

export interface NormalizedMaterialItem {
    partId: string | null;
    /** Vuota se c'e' un partId: la descrizione si ricava dal ricambio. */
    description: string;
    quantity: number;
}

/** Controlla le righe e le ripulisce. Restituisce un messaggio d'errore oppure le righe pronte. */
export function normalizeMaterialItems(items: MaterialItemInput[] | null | undefined): { error: string } | { items: NormalizedMaterialItem[] } {
    if (!Array.isArray(items) || items.length === 0) return { error: 'Aggiungi almeno un materiale.' };
    if (items.length > MAX_ITEMS) return { error: `Al massimo ${MAX_ITEMS} righe per richiesta.` };

    const out: NormalizedMaterialItem[] = [];
    for (const [i, raw] of items.entries()) {
        const n = i + 1;
        const quantity = raw?.quantity;
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
            return { error: `Riga ${n}: la quantità deve essere un numero intero da 1 a ${MAX_QUANTITY}.` };
        }
        const partId = typeof raw.partId === 'string' && raw.partId.trim() ? raw.partId.trim() : null;
        const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, MAX_DESCRIPTION) : '';
        if (!partId && !description) return { error: `Riga ${n}: indica il materiale o scegline uno dal magazzino.` };
        out.push({ partId, description, quantity });
    }
    return { items: out };
}

/** Data AAAA-MM-GG a mezzogiorno (evita slittamenti di fuso). Vuota = nessuna data; testo non valido = 'invalid'. */
export function parseNeededBy(value: string | null | undefined): Date | null | 'invalid' {
    const v = value?.trim();
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'invalid';
    const d = new Date(`${v}T12:00:00`);
    if (Number.isNaN(d.getTime())) return 'invalid';
    // Rifiuta date inesistenti (es. 31/02): il costruttore le sposterebbe al mese dopo
    const [y, m, day] = v.split('-').map(Number);
    if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return 'invalid';
    return d;
}

/** Messaggio da mostrare quando una transizione non riesce perche' lo stato e' cambiato nel frattempo. */
export function staleStatusMessage(current: string): string {
    if (!isMaterialStatus(current)) return 'La richiesta non è più modificabile.';
    return `La richiesta risulta già "${MATERIAL_STATUS_LABELS[current]}": aggiorna l'elenco.`;
}
