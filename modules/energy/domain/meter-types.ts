/**
 * Tipi di contatore/punto di lettura. Energia, acqua e gas sono cumulativi (il valore cresce nel tempo);
 * pressioni, temperature e livelli sono istantanei (salgono e scendono).
 */
import { tk } from '@/lib/i18n/translate';

export const METER_TYPES = [
    { id: 'ELEC', label: tk('Elettricità'), unit: 'kWh', cumulative: true },
    { id: 'WATER', label: tk('Acqua'), unit: 'm3', cumulative: true },
    { id: 'GAS', label: tk('Gas'), unit: 'm3', cumulative: true },
    { id: 'PRESSURE', label: tk('Pressione'), unit: 'bar', cumulative: false },
    { id: 'TEMP', label: tk('Temperatura'), unit: '°C', cumulative: false },
    { id: 'LEVEL', label: tk('Livello'), unit: '%', cumulative: false },
    { id: 'HOURS', label: tk('Ore di funzionamento'), unit: 'h', cumulative: true },
    { id: 'CYCLES', label: tk('Cicli'), unit: 'cicli', cumulative: true },
    { id: 'OTHER', label: tk('Altro'), unit: '', cumulative: false },
] as const;

export type MeterTypeId = (typeof METER_TYPES)[number]['id'];

export const meterTypeLabel = (id: string) => METER_TYPES.find(t => t.id === id)?.label ?? id;
export const defaultUnit = (id: string) => METER_TYPES.find(t => t.id === id)?.unit ?? '';
export const isCumulative = (id: string) => METER_TYPES.find(t => t.id === id)?.cumulative ?? false;

export type ReadingState = 'LATE' | 'TODAY' | 'OK' | 'UNPLANNED';

/** Stato della lettura pianificata rispetto a oggi (inizio e fine giornata nel fuso del server). */
export function readingState(nextDue: Date | null, now: Date): ReadingState {
    if (!nextDue) return 'UNPLANNED';
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86_400_000;
    if (nextDue.getTime() < startOfToday) return 'LATE';
    if (nextDue.getTime() < endOfToday) return 'TODAY';
    return 'OK';
}
