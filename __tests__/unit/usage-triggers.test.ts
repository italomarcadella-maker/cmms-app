import { describe, it, expect } from 'vitest';
import {
    averageDailyUsage,
    cleanLegalText,
    computeUsageStatus,
    dueDateForUsage,
    dueDateNeedsUpdate,
    isValidInterval,
    normalizeTriggerType,
    placeholderDueDate,
} from '@/modules/maintenance/domain/usage-triggers';

const day = (n: number) => new Date(2026, 0, 1 + n, 12, 0, 0); // n giorni dopo il 01/01/2026
const r = (n: number, value: number) => ({ date: day(n), value });

describe('computeUsageStatus', () => {
    it('consumo, quota usata e residuo dall\'ultima esecuzione', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 1000 }, [r(0, 1000), r(5, 1100), r(10, 1320)]);
        expect(s.consumed).toBe(320);
        expect(s.usedPct).toBeCloseTo(64);
        expect(s.remaining).toBe(180);
        expect(s.overdue).toBe(false);
        expect(s.currentValue).toBe(1320);
        expect(s.baseline).toBe(1000);
    });

    it('scaduto quando il consumo raggiunge l\'intervallo (>=), residuo zero', () => {
        const exact = computeUsageStatus({ interval: 500, lastMeterValue: 1000 }, [r(0, 1000), r(10, 1500)]);
        expect(exact.overdue).toBe(true);
        expect(exact.remaining).toBe(0);
        expect(exact.estimatedDueDate).toBeNull();
        const over = computeUsageStatus({ interval: 500, lastMeterValue: 1000 }, [r(0, 1000), r(10, 1620)]);
        expect(over.overdue).toBe(true);
        expect(over.usedPct).toBeCloseTo(124);
    });

    it('senza lettura nulla e\' inventato', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 100 }, []);
        expect(s.hasReadings).toBe(false);
        expect(s.consumed).toBeNull();
        expect(s.usedPct).toBeNull();
        expect(s.remaining).toBeNull();
        expect(s.overdue).toBe(false);
        expect(s.estimatedDueDate).toBeNull();
    });

    it('lastMeterValue nullo: la base e\' la prima lettura disponibile', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: null }, [r(10, 1320), r(0, 1000), r(5, 1100)]);
        expect(s.baseline).toBe(1000);
        expect(s.consumed).toBe(320);
        const single = computeUsageStatus({ interval: 500, lastMeterValue: undefined }, [r(0, 777)]);
        expect(single.consumed).toBe(0);
        expect(single.overdue).toBe(false);
    });

    it('intervallo non valido: nessun calcolo e mai scaduto', () => {
        for (const interval of [0, -5, NaN, Infinity, null, undefined]) {
            const s = computeUsageStatus({ interval, lastMeterValue: 0 }, [r(0, 0), r(1, 9999)]);
            expect(s.validInterval).toBe(false);
            expect(s.overdue).toBe(false);
            expect(s.consumed).toBeNull();
            expect(s.estimatedDueDate).toBeNull();
        }
        expect(isValidInterval(0.5)).toBe(true);
        expect(isValidInterval('5')).toBe(false);
    });

    it('azzeramento tra le letture: il calo non e\' consumo, si riparte dal nuovo valore', () => {
        // base 300 (ultima esecuzione), poi il contatore e' stato azzerato e ha ripreso da 20
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 300 }, [r(0, 300), r(5, 380), r(6, 10), r(9, 60)]);
        expect(s.consumed).toBe(80 + 50);
        expect(s.overdue).toBe(false);
    });

    it('base non piu\' presente tra le letture e valore attuale sceso: riparte dall\'ultimo azzeramento', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 9000 }, [r(0, 8800), r(1, 8950), r(2, 15), r(3, 45)]);
        expect(s.consumed).toBe(30);
    });

    it('base non presente ma valore attuale >= base: differenza semplice', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 1000 }, [r(0, 1100), r(2, 1180)]);
        expect(s.consumed).toBe(180);
    });

    it('letture con lo stesso valore non aggiungono consumo', () => {
        const s = computeUsageStatus({ interval: 100, lastMeterValue: 50 }, [r(0, 50), r(3, 50), r(6, 50)]);
        expect(s.consumed).toBe(0);
        expect(s.avgDailyUsage).toBeNull();
        expect(s.estimatedDueDate).toBeNull();
    });
});

describe('stima della scadenza', () => {
    it('con una sola lettura non c\'e\' stima', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 100)]);
        expect(s.avgDailyUsage).toBeNull();
        expect(s.estimatedDueDate).toBeNull();
    });

    it('con almeno due letture proietta il consumo medio giornaliero sul residuo', () => {
        // 10 h al giorno; consumate 100 su 500 -> restano 400 -> 40 giorni dall'ultima lettura
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 0), r(5, 50), r(10, 100)]);
        expect(s.avgDailyUsage).toBeCloseTo(10);
        expect(s.estimatedDueDate).not.toBeNull();
        const days = (s.estimatedDueDate!.getTime() - day(10).getTime()) / 86_400_000;
        expect(days).toBeCloseTo(40);
    });

    it('il tratto con azzeramento non entra nel consumo medio', () => {
        // 10 al giorno prima e dopo l'azzeramento
        const avg = averageDailyUsage([r(0, 500), r(2, 520), r(3, 0), r(5, 20)]);
        expect(avg).toBeCloseTo(10);
    });

    it('usa solo le ultime letture della finestra', () => {
        const readings = [r(0, 0), r(1, 1000), r(2, 1010), r(3, 1020)];
        expect(averageDailyUsage(readings, 3)).toBeCloseTo(10);
        expect(averageDailyUsage(readings, 10)).toBeGreaterThan(100);
    });

    it('orizzonte troppo lontano o consumo nullo: nessuna stima', () => {
        const slow = computeUsageStatus({ interval: 1_000_000, lastMeterValue: 0 }, [r(0, 0), r(10, 1)]);
        expect(slow.estimatedDueDate).toBeNull();
        expect(averageDailyUsage([r(0, 5), r(10, 5)])).toBeNull();
        expect(averageDailyUsage([])).toBeNull();
        expect(averageDailyUsage([r(0, 5)])).toBeNull();
    });

    it('letture con date non valide vengono ignorate', () => {
        const s = computeUsageStatus({ interval: 100, lastMeterValue: 0 }, [{ date: 'non una data', value: 5 }, r(0, 0), r(10, 20)]);
        expect(s.consumed).toBe(20);
    });
});

describe('scadenza salvata nel piano', () => {
    const now = day(0);
    it('segnaposto a 5 anni se non c\'e\' stima', () => {
        const s = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 10)]);
        const due = dueDateForUsage(s, now);
        expect(due.getFullYear()).toBe(now.getFullYear() + 5);
        expect(due.getTime()).toBe(placeholderDueDate(now).getTime());
    });

    it('la stima, se c\'e\'; "adesso" se scaduto', () => {
        const est = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 0), r(10, 100)]);
        expect(dueDateForUsage(est, now).getTime()).toBe(est.estimatedDueDate!.getTime());
        const over = computeUsageStatus({ interval: 100, lastMeterValue: 0 }, [r(0, 0), r(10, 150)]);
        expect(dueDateForUsage(over, now).getTime()).toBe(now.getTime());
    });

    it('evita scritture inutili', () => {
        const noEst = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 10)]);
        // il segnaposto di ieri e' ancora lontano: niente da aggiornare
        expect(dueDateNeedsUpdate(placeholderDueDate(day(-1)), placeholderDueDate(now), noEst, now)).toBe(false);
        // una data a tempo vicina va portata al segnaposto
        expect(dueDateNeedsUpdate(day(3), placeholderDueDate(now), noEst, now)).toBe(true);
        const est = computeUsageStatus({ interval: 500, lastMeterValue: 0 }, [r(0, 0), r(10, 100)]);
        expect(dueDateNeedsUpdate(est.estimatedDueDate!, est.estimatedDueDate!, est, now)).toBe(false);
        expect(dueDateNeedsUpdate(placeholderDueDate(now), est.estimatedDueDate!, est, now)).toBe(true);
    });
});

describe('dati inseriti', () => {
    it('il tipo di innesco ha solo due valori', () => {
        expect(normalizeTriggerType('METER')).toBe('METER');
        expect(normalizeTriggerType('TIME')).toBe('TIME');
        expect(normalizeTriggerType('altro')).toBe('TIME');
        expect(normalizeTriggerType(undefined)).toBe('TIME');
    });

    it('i testi di legge sono puliti e limitati a 200 caratteri', () => {
        expect(cleanLegalText('  D.Lgs. 81/2008 \n art. 71 ')).toBe('D.Lgs. 81/2008 art. 71');
        expect(cleanLegalText('   ')).toBeNull();
        expect(cleanLegalText(42)).toBeNull();
        expect(cleanLegalText(null)).toBeNull();
        expect(cleanLegalText('a\u0000b\u0007c')).toBe('a b c');
        expect(cleanLegalText('x'.repeat(500))!.length).toBe(200);
    });
});
