"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { basePrisma } from "@/lib/prisma-base";
import { ALL_PLANTS, PLANT_COOKIE, computeScope, getPlantScope } from "@/lib/plant-scope";

export interface PlantOption {
    id: string;
    name: string;
    location: string | null;
}

export interface PlantSelection {
    /** Stabilimenti tra cui l'utente puo' scegliere. */
    plants: PlantOption[];
    /** 'ALL' oppure l'id dello stabilimento scelto. */
    selected: string;
    /** True se puo' vedere "Tutti gli stabilimenti" (admin, o piu' di un plant assegnato). */
    canSelectAll: boolean;
    isAdmin: boolean;
}

const EMPTY: PlantSelection = { plants: [], selected: ALL_PLANTS, canSelectAll: false, isAdmin: false };

/** Stabilimenti consentiti e scelta corrente, calcolati dalla sessione sul server. */
export async function getPlantSelection(): Promise<PlantSelection> {
    const scope = await getPlantScope();
    if (scope.mode === 'none' || scope.mode === 'bypass') return EMPTY;
    const plants = await basePrisma.plant.findMany({
        where: scope.isAdmin ? undefined : { id: { in: scope.allowedPlantIds } },
        select: { id: true, name: true, location: true },
        orderBy: { name: 'asc' },
    });
    return {
        plants,
        selected: scope.selected,
        canSelectAll: scope.isAdmin || plants.length > 1,
        isAdmin: scope.isAdmin,
    };
}

/** Sceglie lo stabilimento da visualizzare. Il valore viene sempre ricontrollato sugli stabilimenti consentiti. */
export async function selectPlant(value: string): Promise<{ success: boolean; message?: string }> {
    const scope = await getPlantScope();
    if (scope.mode === 'none' || scope.mode === 'bypass') return { success: false, message: 'Non autenticato' };

    const check = computeScope({
        userId: scope.userId,
        role: scope.role,
        memberPlantIds: scope.isAdmin ? [] : scope.allowedPlantIds,
        homePlantId: scope.homePlantId,
        allPlantIds: scope.isAdmin ? scope.allowedPlantIds : [],
        selected: value,
    });
    if (value !== ALL_PLANTS && check.selected !== value) {
        return { success: false, message: 'Stabilimento non consentito' };
    }
    if (value === ALL_PLANTS && !scope.isAdmin && scope.allowedPlantIds.length < 2) {
        return { success: false, message: 'Hai un solo stabilimento assegnato' };
    }

    (await cookies()).set(PLANT_COOKIE, value, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });
    revalidatePath('/', 'layout');
    return { success: true };
}
