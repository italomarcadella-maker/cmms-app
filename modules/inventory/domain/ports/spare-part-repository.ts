import { SparePart } from '../entities/spare-part';
import type { StockMovementType } from '../stock-movement';

export interface ISparePartRepository {
    findById(id: string): Promise<SparePart | null>;
    findAll(): Promise<SparePart[]>;
    /** Salva l'articolo; se la giacenza cambia (o l'articolo nasce con giacenza) scrive il movimento nella stessa transazione. */
    save(part: SparePart, opts?: { note?: string }): Promise<SparePart>;
    delete(id: string): Promise<boolean>;
    /**
     * Cambia la giacenza di un valore (positivo = carico, negativo = scarico) in modo atomico, senza partire da un
     * valore letto prima. Restituisce l'articolo aggiornato, oppure null se lo scarico supererebbe la giacenza.
     */
    adjustQuantity(id: string, delta: number, opts?: { type?: StockMovementType; reference?: string; note?: string }): Promise<SparePart | null>;
}
