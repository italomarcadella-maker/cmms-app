import { unstable_cache } from 'next/cache';
import { getPlantScope, scopeFromKey, scopeKey, withPlantScope } from '@/lib/plant-scope';

/**
 * Sostituto di unstable_cache che tiene separate le cache per stabilimento.
 *
 * Dentro unstable_cache non si possono leggere cookie e sessione, quindi lo scope viene risolto prima
 * (fuori dalla cache), entra nella chiave di cache e viene ripristinato dentro la funzione.
 * Non usare unstable_cache direttamente: un test lo impedisce (vedi __tests__/unit/plant-scope.test.ts).
 */
export function scopedCache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyParts: string[],
    options?: { revalidate?: number | false; tags?: string[] },
): T {
    const cached = unstable_cache(
        async (key: string, ...args: any[]) => withPlantScope(scopeFromKey(key), () => fn(...args)),
        keyParts,
        options,
    );
    return (async (...args: any[]) => cached(scopeKey(await getPlantScope()), ...args)) as unknown as T;
}
