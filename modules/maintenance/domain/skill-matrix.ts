/**
 * Matrice competenze dei manutentori. Funzioni pure.
 * Competenze: livello 0-4 (0 = nessuna riga). Abilitazioni: presenti con scadenza facoltativa.
 */

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export const MAX_SKILL_LEVEL = 4;
/** Livello minimo per contare una persona come "copertura" di una competenza (Autonomo). */
export const DEFAULT_MIN_LEVEL = 2;

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
    0: 'Nessuna',
    1: 'Base',
    2: 'Autonomo',
    3: 'Esperto',
    4: 'Può formare altri',
};

export const SKILL_LEVELS: SkillLevel[] = [0, 1, 2, 3, 4];

/** Un livello valido e' un intero tra 0 e 4. */
export function isValidSkillLevel(level: unknown): level is SkillLevel {
    return typeof level === 'number' && Number.isInteger(level) && level >= 0 && level <= MAX_SKILL_LEVEL;
}

/** Etichetta del livello; livelli non validi risultano "Nessuna". */
export function skillLevelLabel(level: number): string {
    return isValidSkillLevel(level) ? SKILL_LEVEL_LABEL[level] : SKILL_LEVEL_LABEL[0];
}

/** Quante persone hanno livello >= minLevel. */
export function coverage(levels: number[], minLevel: number = DEFAULT_MIN_LEVEL): number {
    return levels.filter(l => typeof l === 'number' && l >= minLevel).length;
}

/**
 * Un'abilitazione conta come valida se non ha scadenza o la scadenza non e' passata
 * (vale fino alla fine del giorno di scadenza; confronto per giorno di calendario, ora ignorata).
 */
export function isQualificationValid(expiresAt: Date | null, now: Date): boolean {
    if (!expiresAt) return true;
    const a = Date.UTC(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
    const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return a >= b;
}

/** Quante abilitazioni valide (senza scadenza o non scadute) tra le scadenze date: una voce per persona abilitata. */
export function validQualificationCount(expiries: (Date | null)[], now: Date): number {
    return expiries.filter(e => isQualificationValid(e, now)).length;
}
