/**
 * Regole per le password impostate da un utente o da un amministratore. Funzione pura, usata dalle azioni del server.
 * Il login NON applica queste regole: chi ha gia' una password piu' debole deve poter entrare per cambiarla.
 */
export const MIN_PASSWORD_LENGTH = 10;

const COMMON = new Set([
    'password', 'password1', 'password123', 'admin', 'admin123', 'administrator', 'user', 'user123', 'tech123',
    'qwerty', 'qwertyuiop', '123456', '12345678', '123456789', '1234567890', '0123456789', 'letmein', 'welcome',
    'cmms', 'cmms2026', 'fitt', 'fitt2026', 'claber', 'changeme', 'cambiami',
]);

/** Restituisce il motivo per cui la password non e' accettabile, oppure null se va bene. */
export function validatePassword(password: unknown): string | null {
    if (typeof password !== 'string') return 'Password non valida.';
    if (password.length < MIN_PASSWORD_LENGTH) return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    if (password.length > 128) return 'La password e\' troppo lunga (massimo 128 caratteri).';
    if (COMMON.has(password.toLowerCase())) return 'Questa password e\' troppo comune: scegline un\'altra.';
    if (/^(.)\1+$/.test(password)) return 'La password non puo\' essere un solo carattere ripetuto.';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Usa almeno una lettera e un numero.';
    return null;
}
