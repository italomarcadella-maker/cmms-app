import { auth } from '@/auth';
import type { prisma } from '@/lib/prisma';
import type { StockMovementType } from '@/modules/inventory/domain/stock-movement';

/**
 * Registro dei movimenti di magazzino (StockMovement).
 *
 * Ogni variazione di `SparePart.quantity` DEVE passare da qui, dentro la stessa `$transaction` che modifica la giacenza:
 * se il movimento non si puo' scrivere, l'eccezione fa annullare anche la variazione di giacenza. Niente errori ingoiati.
 * Non e' un file 'use server': non espone azioni al browser.
 */

/** Il client della transazione (o il client stesso): servono solo i due modelli. */
export type LedgerDb = Pick<typeof prisma, 'sparePart' | 'stockMovement'>;

export interface StockActor {
    id?: string | null;
    name?: string | null;
}

export interface MovementInput {
    partId: string;
    type: StockMovementType;
    /** Positivo = entra, negativo = esce. */
    delta: number;
    /** "WO:<id>", "MR:<id>", "PR:<id>", "PT:<id>", "SC:<id>". */
    reference?: string | null;
    note?: string | null;
    /** Chi ha fatto l'operazione; se manca si usa l'utente della sessione (se c'e'). */
    actor?: StockActor | null;
}

/** Scarico impossibile: la giacenza e' inferiore alla quantita' richiesta. Il messaggio e' modificabile da chi chiama. */
export class InsufficientStockError extends Error {
    constructor(public readonly partId: string, message = 'INSUFFICIENT_STOCK') {
        super(message);
        this.name = 'InsufficientStockError';
    }
}

/** L'articolo non esiste (o non e' visibile all'utente per il filtro per stabilimento). */
export class StockPartNotFoundError extends Error {
    constructor(public readonly partId: string) {
        super('PART_NOT_FOUND');
        this.name = 'StockPartNotFoundError';
    }
}

/** La giacenza e' cambiata mentre la si impostava: l'operazione va ripetuta. */
export class StockConflictError extends Error {
    constructor(public readonly partId: string) {
        super('STOCK_CONFLICT');
        this.name = 'StockConflictError';
    }
}

/** Utente della sessione corrente (null se non c'e' una sessione, ad esempio in un processo automatico). */
export async function currentStockActor(): Promise<StockActor | null> {
    try {
        const session = await auth();
        if (!session?.user) return null;
        return { id: session.user.id ?? null, name: session.user.name ?? null };
    } catch {
        return null;
    }
}

const clip = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);

/**
 * Scrive il movimento. La giacenza dell'articolo DEVE essere gia' stata aggiornata nella stessa transazione:
 * `balanceAfter` si legge da li'. Copia nome e stabilimento dell'articolo.
 */
export async function recordStockMovement(db: LedgerDb, input: MovementInput): Promise<{ balanceAfter: number }> {
    if (!Number.isInteger(input.delta)) throw new Error('Movimento di magazzino non valido: la variazione deve essere intera');
    const part = await db.sparePart.findUnique({ where: { id: input.partId }, select: { name: true, plantId: true, quantity: true } });
    if (!part) throw new StockPartNotFoundError(input.partId);
    const actor = input.actor === undefined ? await currentStockActor() : input.actor;
    await db.stockMovement.create({
        data: {
            partId: input.partId,
            partName: part.name,
            plantId: part.plantId,
            type: input.type,
            delta: input.delta,
            balanceAfter: part.quantity,
            reference: clip(input.reference, 120),
            note: clip(input.note, 500),
            userId: actor?.id ?? null,
            userName: clip(actor?.name, 120),
        },
    });
    return { balanceAfter: part.quantity };
}

/**
 * Variazione atomica della giacenza + movimento. Per gli scarichi l'aggiornamento e' condizionato (`quantity >= scarico`):
 * la giacenza non scende mai sotto zero, nemmeno con due richieste contemporanee. Con variazione zero non fa nulla.
 * Eccezioni: InsufficientStockError, StockPartNotFoundError.
 */
export async function applyStockChange(
    db: LedgerDb,
    input: MovementInput & { insufficientMessage?: string },
): Promise<{ balanceAfter: number | null }> {
    const { delta } = input;
    if (!Number.isInteger(delta)) throw new Error('Movimento di magazzino non valido: la variazione deve essere intera');
    if (delta === 0) return { balanceAfter: null };

    const res = delta > 0
        ? await db.sparePart.updateMany({
            where: { id: input.partId },
            data: { quantity: { increment: delta }, lastUpdated: new Date() },
        })
        : await db.sparePart.updateMany({
            where: { id: input.partId, quantity: { gte: -delta } },
            data: { quantity: { decrement: -delta }, lastUpdated: new Date() },
        });
    if (res.count !== 1) {
        if (delta > 0) throw new StockPartNotFoundError(input.partId);
        // Scarico rifiutato: o la giacenza e' insufficiente o l'articolo non c'e'
        const exists = await db.sparePart.findUnique({ where: { id: input.partId }, select: { id: true } });
        if (!exists) throw new StockPartNotFoundError(input.partId);
        throw new InsufficientStockError(input.partId, input.insufficientMessage);
    }
    return recordStockMovement(db, input);
}

/**
 * Porta la giacenza a un valore assoluto (rettifica manuale, inventario). Il delta del movimento e' calcolato rispetto
 * alla giacenza letta nella transazione e l'aggiornamento e' condizionato a quella lettura: se qualcuno la cambia nel
 * frattempo l'operazione si ripete (fino a 3 tentativi) e poi fallisce con StockConflictError.
 * Restituisce delta e giacenza finale; con delta zero non scrive nessun movimento.
 */
export async function setStockQuantity(
    db: LedgerDb,
    input: Omit<MovementInput, 'delta'> & {
        newQuantity: number;
        /** Costruisce la nota dal valore trovato in giacenza (es. per scrivere "atteso/contato"). */
        noteFor?: (currentQty: number) => string | null;
    },
): Promise<{ delta: number; balanceAfter: number; previous: number }> {
    if (!Number.isInteger(input.newQuantity) || input.newQuantity < 0) throw new Error('Giacenza non valida');
    for (let attempt = 0; attempt < 3; attempt++) {
        const part = await db.sparePart.findUnique({ where: { id: input.partId }, select: { quantity: true } });
        if (!part) throw new StockPartNotFoundError(input.partId);
        const delta = input.newQuantity - part.quantity;
        if (delta === 0) return { delta: 0, balanceAfter: part.quantity, previous: part.quantity };
        const res = await db.sparePart.updateMany({
            where: { id: input.partId, quantity: part.quantity },
            data: { quantity: input.newQuantity, lastUpdated: new Date() },
        });
        if (res.count !== 1) continue;
        await recordStockMovement(db, { ...input, delta, note: input.noteFor ? input.noteFor(part.quantity) : input.note });
        return { delta, balanceAfter: input.newQuantity, previous: part.quantity };
    }
    throw new StockConflictError(input.partId);
}
