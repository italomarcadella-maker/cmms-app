/**
 * Scadenze periodiche. Se l'attivita' e' fatta in anticipo si mantiene il ritmo (scadenza + frequenza); se e' fatta in
 * orario o in ritardo si riparte da adesso, senza accumulare scadenze arretrate.
 */
export function nextOccurrence(due: Date, frequencyDays: number, now: Date): Date {
    const days = Math.max(1, Math.floor(frequencyDays));
    const base = due.getTime() > now.getTime() ? due : now;
    return new Date(base.getTime() + days * 86_400_000);
}
