import { toast as sonner, type ExternalToast } from "sonner";
import { rt } from "./runtime";

/**
 * Sostituto di `toast` di sonner che traduce da solo i messaggi: la chiave e' il testo italiano, quindi anche i messaggi
 * restituiti dalle azioni del server ("Non autorizzato", "Ordine non trovato"...) compaiono nella lingua dell'utente se il
 * dizionario li contiene. Se manca la traduzione si vede l'italiano. Stessa interfaccia di sonner: basta cambiare l'import.
 */
type Message = Parameters<typeof sonner>[0];

const tr = (message: Message): Message => (typeof message === "string" ? rt(message) : message);
const trOpts = (data?: ExternalToast): ExternalToast | undefined =>
    data && typeof data.description === "string" ? { ...data, description: rt(data.description) } : data;

type PromiseArgs = Parameters<typeof sonner.promise>;
const trPromiseData = (data: PromiseArgs[1]): PromiseArgs[1] => {
    if (!data) return data;
    const wrap = <T,>(v: T): T => {
        if (typeof v === "string") return rt(v) as unknown as T;
        if (typeof v === "function") return ((...args: unknown[]) => {
            const out = (v as (...a: unknown[]) => unknown)(...args);
            return typeof out === "string" ? rt(out) : out;
        }) as unknown as T;
        return v;
    };
    return { ...data, loading: wrap(data.loading), success: wrap(data.success), error: wrap(data.error) } as PromiseArgs[1];
};

export const toast = Object.assign(
    (message: Message, data?: ExternalToast) => sonner(tr(message), trOpts(data)),
    {
        success: (message: Message, data?: ExternalToast) => sonner.success(tr(message), trOpts(data)),
        error: (message: Message, data?: ExternalToast) => sonner.error(tr(message), trOpts(data)),
        warning: (message: Message, data?: ExternalToast) => sonner.warning(tr(message), trOpts(data)),
        info: (message: Message, data?: ExternalToast) => sonner.info(tr(message), trOpts(data)),
        message: (message: Message, data?: ExternalToast) => sonner.message(tr(message), trOpts(data)),
        loading: (message: Message, data?: ExternalToast) => sonner.loading(tr(message), trOpts(data)),
        // Stessa firma generica di sonner (il tipo del risultato resta quello della promessa)
        promise: ((promise: PromiseArgs[0], data?: PromiseArgs[1]) => sonner.promise(promise, trPromiseData(data))) as typeof sonner.promise,
        dismiss: sonner.dismiss,
        custom: sonner.custom,
    },
);
