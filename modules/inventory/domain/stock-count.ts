/**
 * Inventario fisico: scostamenti tra giacenza a sistema (attesa) e quantita' contata. Funzioni pure, senza dipendenze.
 */

export const MAX_COUNT_LINES = 3000;
export const MAX_COUNTED_QTY = 10_000_000;

export interface CountLineInput {
    expectedQty: number;
    /** null/undefined = riga non ancora contata. */
    countedQty: number | null | undefined;
    /** Costo unitario dell'articolo; se assente o non maggiore di zero il valore dello scostamento non e' calcolabile. */
    unitCost?: number | null;
}

export interface CountLineResult {
    counted: boolean;
    /** contato - atteso; null se non contata. */
    variance: number | null;
    /** scostamento x costo unitario, arrotondato al centesimo; null se non calcolabile. */
    varianceValue: number | null;
}

export interface CountSummary {
    totalLines: number;
    countedLines: number;
    notCountedLines: number;
    /** Percentuale di righe contate, 0-100, intera. */
    progressPct: number;
    /** Righe contate con scostamento diverso da zero. */
    linesWithVariance: number;
    /** Righe contate con piu' pezzi di quanto atteso. */
    surplusLines: number;
    /** Righe contate con meno pezzi di quanto atteso. */
    shortageLines: number;
    /** Somma algebrica degli scostamenti in pezzi (solo righe contate). */
    netVarianceQty: number;
    /** Somma degli scostamenti in pezzi in valore assoluto. */
    absVarianceQty: number;
    /** Somma dei valori degli scostamenti calcolabili (null se nessuno e' calcolabile). */
    netVarianceValue: number | null;
    /** Somma dei valori assoluti degli scostamenti calcolabili (null se nessuno e' calcolabile). */
    absVarianceValue: number | null;
    /** Righe con scostamento ma senza costo unitario: il loro valore non e' nei totali. */
    varianceValueMissingLines: number;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Quantita' contata valida: numero intero >= 0 (e ragionevole). */
export function isValidCountedQty(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_COUNTED_QTY;
}

/** Testo digitato nel campo del contato: stringa vuota = non contato (null); non valido se non e' un intero >= 0. */
export function parseCountedInput(text: string): { value: number | null; valid: boolean } {
    const t = text.trim();
    if (t === '') return { value: null, valid: true };
    if (!/^\d+$/.test(t)) return { value: null, valid: false };
    const n = Number(t);
    return isValidCountedQty(n) ? { value: n, valid: true } : { value: null, valid: false };
}

export function lineVariance(expectedQty: number, countedQty: number | null | undefined): number | null {
    if (countedQty === null || countedQty === undefined) return null;
    return countedQty - expectedQty;
}

export function lineVarianceValue(variance: number | null, unitCost: number | null | undefined): number | null {
    if (variance === null) return null;
    if (typeof unitCost !== 'number' || !Number.isFinite(unitCost) || unitCost <= 0) return null;
    return round2(variance * unitCost);
}

export function evaluateLine(line: CountLineInput): CountLineResult {
    const variance = lineVariance(line.expectedQty, line.countedQty);
    return {
        counted: variance !== null,
        variance,
        varianceValue: lineVarianceValue(variance, line.unitCost),
    };
}

export function summarizeCount(lines: CountLineInput[]): CountSummary {
    let counted = 0;
    let withVariance = 0;
    let surplus = 0;
    let shortage = 0;
    let net = 0;
    let abs = 0;
    let valueSum = 0;
    let valueAbs = 0;
    let valueLines = 0;
    let valueMissing = 0;

    for (const line of lines) {
        const r = evaluateLine(line);
        if (!r.counted || r.variance === null) continue;
        counted++;
        if (r.variance === 0) continue;
        withVariance++;
        if (r.variance > 0) surplus++; else shortage++;
        net += r.variance;
        abs += Math.abs(r.variance);
        if (r.varianceValue === null) {
            valueMissing++;
        } else {
            valueLines++;
            valueSum += r.varianceValue;
            valueAbs += Math.abs(r.varianceValue);
        }
    }

    const total = lines.length;
    return {
        totalLines: total,
        countedLines: counted,
        notCountedLines: total - counted,
        progressPct: total === 0 ? 0 : Math.round((counted / total) * 100),
        linesWithVariance: withVariance,
        surplusLines: surplus,
        shortageLines: shortage,
        netVarianceQty: net,
        absVarianceQty: abs,
        netVarianceValue: valueLines > 0 ? round2(valueSum) : null,
        absVarianceValue: valueLines > 0 ? round2(valueAbs) : null,
        varianceValueMissingLines: valueMissing,
    };
}

/**
 * Movimento INVENTORY da applicare alla chiusura: porta la giacenza attuale al valore contato.
 * Il delta e' rispetto alla giacenza di adesso (non a quella dell'apertura); nella nota resta lo scostamento rispetto all'atteso.
 * Restituisce null se la giacenza e' gia' uguale al contato (nessun movimento).
 */
export function inventoryAdjustment(
    expectedQty: number,
    countedQty: number,
    currentQty: number,
): { delta: number; note: string } | null {
    const delta = countedQty - currentQty;
    if (delta === 0) return null;
    const gap = countedQty - expectedQty;
    const gapText = gap === 0
        ? "in linea con l'atteso"
        : `scostamento ${gap > 0 ? '+' : '-'}${Math.abs(gap)} rispetto all'atteso`;
    return {
        delta,
        note: `Inventario fisico: atteso ${expectedQty}, contato ${countedQty} (${gapText})`,
    };
}
