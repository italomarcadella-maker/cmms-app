"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = 'IT' | 'EN' | 'ES';

const DICTIONARY: Record<Language, Record<string, string>> = {
    IT: {
        "nav.dashboard": "Dashboard",
        "nav.workOrders": "Ordini di Lavoro",
        "nav.assets": "Asset & Macchinari",
        "nav.calendar": "Planning",
        "nav.requests": "Richieste",
        "nav.inventory": "Magazzino",
        "nav.settings": "Impostazioni",
        "status.open": "APERTO",
        "status.closed": "CHIUSO",
        "status.in_progress": "IN CORSO",
        "btn.save": "Salva",
        "btn.cancel": "Annulla"
    },
    EN: {
        "nav.dashboard": "Dashboard",
        "nav.workOrders": "Work Orders",
        "nav.assets": "Assets & Machines",
        "nav.calendar": "Planning",
        "nav.requests": "Requests",
        "nav.inventory": "Inventory",
        "nav.settings": "Settings",
        "status.open": "OPEN",
        "status.closed": "CLOSED",
        "status.in_progress": "IN PROGRESS",
        "btn.save": "Save",
        "btn.cancel": "Cancel"
    },
    ES: {
        "nav.dashboard": "Tablero",
        "nav.workOrders": "Órdenes de Trabajo",
        "nav.assets": "Activos y Máquinas",
        "nav.calendar": "Planificación",
        "nav.requests": "Solicitudes",
        "nav.inventory": "Inventario",
        "nav.settings": "Configuración",
        "status.open": "ABIERTO",
        "status.closed": "CERRADO",
        "status.in_progress": "EN PROGRESO",
        "btn.save": "Guardar",
        "btn.cancel": "Cancelar"
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('IT');

    // Persist choice
    useEffect(() => {
        const saved = localStorage.getItem('cmms_lang') as Language;
        if (saved) setLanguage(saved);
    }, []);

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('cmms_lang', lang);
    };

    const t = (key: string) => {
        return DICTIONARY[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within LanguageProvider");
    return context;
}
