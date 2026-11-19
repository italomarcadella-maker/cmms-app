import { SparePart } from '../entities/spare-part';

export interface ISparePartRepository {
    findById(id: string): Promise<SparePart | null>;
    findAll(): Promise<SparePart[]>;
    save(part: SparePart): Promise<SparePart>;
    delete(id: string): Promise<boolean>;
    /**
     * Cambia la giacenza di un valore (positivo = carico, negativo = scarico) in modo atomico, senza partire da un
     * valore letto prima. Restituisce l'articolo aggiornato, oppure null se lo scarico supererebbe la giacenza.
     */
    adjustQuantity(id: string, delta: number): Promise<SparePart | null>;
}
