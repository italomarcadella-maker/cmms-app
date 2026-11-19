"use client";

import { useSyncExternalStore } from "react";

/** Un solo timer condiviso: tutti i componenti che mostrano un orologio si aggiornano insieme, una volta al secondo. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(callback: () => void) {
    listeners.add(callback);
    if (!timer) timer = setInterval(() => listeners.forEach(l => l()), 1000);
    return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && timer) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

const getSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const getServerSnapshot = () => 0;

/** Istante corrente in millisecondi, aggiornato ogni secondo. Vale 0 durante il rendering sul server. */
export function useNow(): number {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
