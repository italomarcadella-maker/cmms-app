/**
 * Le attivita' di un piano preventivo sono salvate come testo JSON. Questa funzione le legge senza mai fallire:
 * un valore non valido non deve far sparire l'intero elenco dei piani.
 */
export function parseActivities(raw: unknown): string[] {
    let value: unknown = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(value)) return [];
    return value
        .map(item => (typeof item === 'string' ? item : item && typeof item === 'object' && typeof (item as { label?: unknown }).label === 'string' ? (item as { label: string }).label : ''))
        .map(label => label.trim())
        .filter(label => label.length > 0)
        .slice(0, 100);
}
