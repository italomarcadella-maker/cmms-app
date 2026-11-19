// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    computeAssetHealth,
    parseHealthConfig,
    defaultHealthConfig,
    DEFAULT_HEALTH_CONFIG,
    frequencyScore,
    type HealthOrder,
    type HealthPlan,
    type HealthInput,
} from '@/modules/maintenance/domain/asset-health';

const NOW = new Date('2026-11-19T12:00:00Z');
const OLD_ASSET = '2024-01-10T12:00:00Z';
const NEW_ASSET = '2026-10-20T12:00:00Z'; // 30 giorni prima di NOW

const fault = (over: Partial<HealthOrder> = {}): HealthOrder => ({ type: 'FAULT', priority: 'MALFUNCTIONING', status: 'COMPLETED', createdAt: '2026-09-01T12:00:00Z', ...over });
const request = (over: Partial<HealthOrder> = {}): HealthOrder => ({ type: 'REQUEST', priority: 'MEDIUM', status: 'COMPLETED', createdAt: '2026-09-01T12:00:00Z', ...over });
const routine = (over: Partial<HealthOrder> = {}): HealthOrder => ({
    type: 'ROUTINE', priority: 'MEDIUM', status: 'COMPLETED', createdAt: '2026-10-01T12:00:00Z',
    dueDate: '2026-10-10T12:00:00Z', completedAt: '2026-10-10T18:00:00Z', ...over,
});
const planOk: HealthPlan = { nextDueDate: '2026-12-01T12:00:00Z' };
const planLate: HealthPlan = { nextDueDate: '2026-11-10T12:00:00Z' };

function health(orders: HealthOrder[], plans: HealthPlan[], extra: Partial<HealthInput> = {}, cfg = DEFAULT_HEALTH_CONFIG) {
    return computeAssetHealth({ assetCreatedAt: OLD_ASSET, orders, plans, now: NOW, ...extra }, cfg);
}
const comp = (r: ReturnType<typeof health>, key: string) => r.components.find(c => c.key === key)!;

describe('punteggio di salute: caso base', () => {
    it('asset con un piano in regola e nessun guasto: 100, nessun punto perso, nessun tetto', () => {
        const r = health([], [planOk], { totalOrders: 0 });
        expect(r.evaluable).toBe(true);
        expect(r.score).toBe(100);
        expect(r.components.map(c => c.score)).toEqual([100, 100, 100]);
        expect(r.components.map(c => c.weight)).toEqual([40, 30, 30]);
        expect(r.losses).toEqual([]);
        expect(r.capped).toBe(false);
        expect(r.capValue).toBeNull();
        expect(comp(r, 'schedule').detail).toBe('1 piano in regola');
    });

    it('i componenti hanno chiave, etichetta italiana e dettaglio', () => {
        const r = health([], [planOk]);
        expect(r.components.map(c => c.key)).toEqual(['current', 'frequency', 'schedule']);
        expect(r.components.map(c => c.label)).toEqual(['Stato attuale', 'Frequenza degli eventi', 'Manutenzione programmata']);
        expect(comp(r, 'current').detail).toBe('Nessun guasto aperto');
        expect(comp(r, 'frequency').detail).toBe('Nessun guasto né richiesta negli ultimi 12 mesi');
    });
});

describe('stato attuale', () => {
    it('guasto aperto che non ferma la macchina: 50', () => {
        const r = health([fault({ status: 'IN_PROGRESS' })], [planOk]);
        expect(comp(r, 'current').score).toBe(50);
        expect(comp(r, 'current').detail).toBe('1 guasto aperto, la macchina non è ferma');
        // 0,4*50 + 0,3*80 (1 punto) + 0,3*100 = 74
        expect(r.score).toBe(74);
    });

    it('guasto aperto con priorita\' STOPPED: 0', () => {
        const r = health([fault({ status: 'OPEN', priority: 'STOPPED' })], [planOk]);
        expect(comp(r, 'current').score).toBe(0);
        expect(comp(r, 'current').detail).toBe('1 guasto aperto che ferma la macchina');
        // 0 + 0,3*60 (2 punti) + 30 = 48
        expect(r.score).toBe(48);
    });

    it('un guasto che ferma tra piu\' guasti aperti basta per lo 0', () => {
        const r = health([fault({ status: 'OPEN' }), fault({ status: 'ASSIGNED', priority: 'STOPPED' })], [planOk]);
        expect(comp(r, 'current').score).toBe(0);
        expect(comp(r, 'current').detail).toBe('2 guasti aperti, di cui 1 che ferma la macchina');
    });

    it('le richieste aperte non contano nello stato attuale (ma contano nella frequenza)', () => {
        const r = health([request({ status: 'OPEN' })], [planOk]);
        expect(comp(r, 'current').score).toBe(100);
        expect(comp(r, 'frequency').score).toBe(80); // 0,5 punti
        expect(r.score).toBe(94); // 40 + 24 + 30
    });

    it('un guasto chiuso o annullato non e\' aperto; ogni stato aperto lo e\'', () => {
        for (const status of ['COMPLETED', 'CLOSED', 'CANCELED']) {
            expect(comp(health([fault({ status })], [planOk]), 'current').score, status).toBe(100);
        }
        for (const status of ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW']) {
            expect(comp(health([fault({ status })], [planOk]), 'current').score, status).toBe(50);
        }
    });

    it('un guasto aperto da prima della finestra conta nello stato attuale ma non nella frequenza', () => {
        const r = health([fault({ status: 'OPEN', createdAt: '2025-01-01T12:00:00Z' })], [planOk]);
        expect(comp(r, 'current').score).toBe(50);
        expect(comp(r, 'frequency').score).toBe(100);
    });

    it('un ordine ROUTINE aperto non e\' un guasto', () => {
        const r = health([routine({ status: 'OPEN', completedAt: null })], [planOk]);
        expect(comp(r, 'current').score).toBe(100);
    });
});

describe('frequenza: punti-evento a gradini', () => {
    const faults = (n: number) => Array.from({ length: n }, () => fault());

    it('soglie ai bordi: 0 -> 100, 1 -> 80, 2 -> 60, 3 -> 40, oltre -> 20', () => {
        expect(frequencyScore(0, DEFAULT_HEALTH_CONFIG)).toBe(100);
        expect(frequencyScore(0.5, DEFAULT_HEALTH_CONFIG)).toBe(80);
        expect(frequencyScore(1, DEFAULT_HEALTH_CONFIG)).toBe(80);
        expect(frequencyScore(1.5, DEFAULT_HEALTH_CONFIG)).toBe(60);
        expect(frequencyScore(2, DEFAULT_HEALTH_CONFIG)).toBe(60);
        expect(frequencyScore(2.5, DEFAULT_HEALTH_CONFIG)).toBe(40);
        expect(frequencyScore(3, DEFAULT_HEALTH_CONFIG)).toBe(40);
        expect(frequencyScore(3.5, DEFAULT_HEALTH_CONFIG)).toBe(20);
        expect(frequencyScore(99, DEFAULT_HEALTH_CONFIG)).toBe(20);
    });

    it('guasti: 1 -> 80, 2 -> 60, 3 -> 40, 4 -> 20', () => {
        expect(comp(health(faults(1), [planOk]), 'frequency').score).toBe(80);
        expect(comp(health(faults(2), [planOk]), 'frequency').score).toBe(60);
        expect(comp(health(faults(3), [planOk]), 'frequency').score).toBe(40);
        expect(comp(health(faults(4), [planOk]), 'frequency').score).toBe(20);
    });

    it('un guasto che ferma vale 2 punti, una richiesta mezzo', () => {
        const r = health([fault({ priority: 'STOPPED' })], [planOk]);
        expect(r.counts.eventPoints).toBe(2);
        expect(comp(r, 'frequency').score).toBe(60);
        expect(health([request(), request()], [planOk]).counts.eventPoints).toBe(1);
        expect(comp(health([fault(), fault(), fault(), request()], [planOk]), 'frequency').score).toBe(20); // 3,5 punti
    });

    it('il dettaglio dice quanti guasti e richieste ci sono', () => {
        expect(comp(health(faults(2), [planOk]), 'frequency').detail).toBe('2 guasti negli ultimi 12 mesi');
        expect(comp(health([fault()], [planOk]), 'frequency').detail).toBe('1 guasto negli ultimi 12 mesi');
        expect(comp(health([fault({ priority: 'STOPPED' }), request(), request()], [planOk]), 'frequency').detail)
            .toBe('1 guasto (1 con macchina ferma) e 2 richieste negli ultimi 12 mesi');
    });

    it('fuori dalla finestra e annullati non contano; il bordo della finestra e\' incluso', () => {
        const r = health([
            fault({ createdAt: '2025-11-01T12:00:00Z' }), // oltre 12 mesi
            fault({ status: 'CANCELED' }),
            request({ status: 'CANCELED' }),
            fault({ createdAt: '2025-11-19T12:00:00Z' }), // esattamente 12 mesi prima: dentro
        ], [planOk]);
        expect(r.counts.faultsInWindow).toBe(1);
        expect(r.counts.requestsInWindow).toBe(0);
    });

    it('la finestra e\' configurabile', () => {
        const cfg = parseHealthConfig({ windowMonths: 6 });
        const orders = [fault({ createdAt: '2026-03-01T12:00:00Z' }), fault({ createdAt: '2026-09-01T12:00:00Z' })];
        expect(health(orders, [planOk], {}, cfg).counts.faultsInWindow).toBe(1);
        expect(comp(health(orders, [planOk], {}, cfg), 'frequency').detail).toBe('1 guasto negli ultimi 6 mesi');
        expect(health(orders, [planOk]).counts.faultsInWindow).toBe(2);
    });

    it('gli ordini programmati non sono eventi', () => {
        expect(health([routine(), routine()], [planOk]).counts.eventPoints).toBe(0);
    });
});

describe('manutenzione programmata', () => {
    it('25 punti persi per ogni piano in ritardo, minimo 0', () => {
        expect(comp(health([], [planOk, planLate]), 'schedule').score).toBe(75);
        expect(comp(health([], [planLate, planLate]), 'schedule').score).toBe(50);
        expect(comp(health([], [planLate, planLate, planLate, planLate]), 'schedule').score).toBe(0);
        expect(comp(health([], Array(6).fill(planLate)), 'schedule').score).toBe(0);
        expect(comp(health([], [planLate]), 'schedule').detail).toBe('1 piano in ritardo');
        expect(comp(health([], [planLate, planLate]), 'schedule').detail).toBe('2 piani in ritardo');
    });

    it('una scadenza di oggi e\' ancora in regola; ieri e\' in ritardo', () => {
        expect(health([], [{ nextDueDate: '2026-11-19T12:00:00Z' }]).counts.overduePlans).toBe(0);
        expect(health([], [{ nextDueDate: '2026-11-18T12:00:00Z' }]).counts.overduePlans).toBe(1);
    });

    it('la quota di interventi chiusi in tempo abbassa il punteggio (il minimo tra le due misure)', () => {
        // 4 chiusi, 3 in tempo -> 75
        const closed = [routine(), routine(), routine(), routine({ completedAt: '2026-10-12T12:00:00Z' })];
        const r = health(closed, [planOk]);
        expect(r.counts).toMatchObject({ routineClosed: 4, routineOnTime: 3 });
        expect(comp(r, 'schedule').score).toBe(75);
        expect(comp(r, 'schedule').detail).toBe('1 piano in regola; 3 interventi su 4 chiusi entro la scadenza');

        // con un piano in ritardo: penalita' 75, quota 50 -> 50
        const half = [routine(), routine({ completedAt: '2026-10-12T12:00:00Z' })];
        expect(comp(health(half, [planOk, planLate]), 'schedule').score).toBe(50);
        // quota 100% ma un piano in ritardo: vale la penalita' (75)
        expect(comp(health([routine()], [planOk, planLate]), 'schedule').score).toBe(75);
    });

    it('il confronto e\' per giorno: chiuso lo stesso giorno della scadenza e\' in tempo', () => {
        const same = health([routine({ dueDate: '2026-10-10T08:00:00Z', completedAt: '2026-10-10T18:00:00Z' })], [planOk]);
        expect(same.counts.routineOnTime).toBe(1);
        const next = health([routine({ dueDate: '2026-10-10T12:00:00Z', completedAt: '2026-10-11T12:00:00Z' })], [planOk]);
        expect(next.counts.routineOnTime).toBe(0);
        expect(comp(next, 'schedule').score).toBe(0);
    });

    it('senza dati sui chiusi (storico antico senza completedAt) conta solo il ritardo dei piani', () => {
        const old = [routine({ completedAt: null }), routine({ completedAt: null })];
        const r = health(old, [planOk]);
        expect(r.counts.routineClosed).toBe(0);
        expect(comp(r, 'schedule').score).toBe(100);
        expect(comp(health(old, [planLate]), 'schedule').score).toBe(75);
    });

    it('ordini programmati chiusi prima della finestra, annullati, aperti o senza scadenza non fanno quota', () => {
        const r = health([
            routine({ completedAt: '2025-06-01T12:00:00Z', dueDate: '2025-05-30T12:00:00Z' }),
            routine({ status: 'CANCELED' }),
            routine({ status: 'IN_PROGRESS', completedAt: null }),
            routine({ dueDate: null }),
        ], [planOk]);
        expect(r.counts.routineClosed).toBe(0);
        expect(comp(r, 'schedule').score).toBe(100);
    });

    it('anche CLOSED conta come chiuso', () => {
        expect(health([routine({ status: 'CLOSED' })], [planOk]).counts.routineClosed).toBe(1);
    });
});

describe('senza piani: tetto e rinormalizzazione', () => {
    it('componente non valutabile e tetto a 70 anche con tutto perfetto', () => {
        const r = health([], [], { totalOrders: 3 });
        expect(comp(r, 'schedule').score).toBeNull();
        expect(comp(r, 'schedule').detail).toBe('Nessun piano di manutenzione: non valutabile');
        expect(r.uncappedScore).toBe(100);
        expect(r.score).toBe(70);
        expect(r.capped).toBe(true);
        expect(r.capValue).toBe(70);
        expect(r.capReason).toBe('nessun piano di manutenzione');
        expect(r.losses).toEqual([{ component: 'cap', points: 30, reason: 'tetto di 70 per nessun piano di manutenzione' }]);
    });

    it('i pesi si rinormalizzano sui due componenti rimasti, poi si applica il tetto', () => {
        // corrente 50, frequenza 80 (1 punto): (40*50 + 30*80) / 70 = 62,86 -> 63, sotto il tetto
        const r = health([fault({ status: 'OPEN' })], []);
        expect(r.uncappedScore).toBe(63);
        expect(r.score).toBe(63);
        expect(r.capped).toBe(true);
        expect(r.losses.some(l => l.component === 'cap')).toBe(false);
        // la somma dei punti persi e' 100 meno il punteggio (con i decimali)
        expect(r.losses.reduce((s, l) => s + l.points, 0)).toBeCloseTo(100 - 62.857, 0);
    });

    it('tetto configurabile', () => {
        const cfg = parseHealthConfig({ noPlanCap: 55 });
        expect(health([], [], { totalOrders: 3 }, cfg).score).toBe(55);
        expect(parseHealthConfig({ noPlanCap: 100 }).noPlanCap).toBe(100);
        expect(health([], [], { totalOrders: 3 }, parseHealthConfig({ noPlanCap: 100 })).score).toBe(100);
    });

    it('con pesi a zero sui due componenti rimasti la media e\' semplice (niente divisione per zero)', () => {
        const cfg = parseHealthConfig({ weights: { current: 0, frequency: 0, schedule: 10 }, noPlanCap: 100 });
        const r = health([fault({ status: 'OPEN' })], [], {}, cfg);
        expect(r.score).toBe(65); // (50 + 80) / 2
    });

    it('con i piani il tetto non c\'e\' (nemmeno con un solo piano)', () => {
        const r = health([], [planOk]);
        expect(r.score).toBe(100);
        expect(r.capped).toBe(false);
    });
});

describe('non valutabile', () => {
    it('asset recente (meno di 90 giorni) senza eventi ne\' piani', () => {
        const r = health([], [], { assetCreatedAt: NEW_ASSET, totalOrders: 0 });
        expect(r.score).toBeNull();
        expect(r.evaluable).toBe(false);
        expect(r.notEvaluableReason).toMatch(/da meno di 90 giorni/);
        expect(r.components.every(c => c.score === null)).toBe(true);
        expect(r.losses).toEqual([]);
    });

    it('asset recente ma con una storia di ordini: comunque non valutabile se mancano eventi e piani', () => {
        const r = health([routine()], [], { assetCreatedAt: NEW_ASSET, totalOrders: 1 });
        expect(r.score).toBeNull();
    });

    it('asset vecchio senza eventi, piani ne\' storia', () => {
        const r = health([], [], { totalOrders: 0 });
        expect(r.score).toBeNull();
        expect(r.notEvaluableReason).toMatch(/né storia registrata/);
    });

    it('asset vecchio senza eventi ne\' piani ma con storia (ordini antichi): valutabile, col tetto', () => {
        const r = health([], [], { totalOrders: 4 });
        expect(r.evaluable).toBe(true);
        expect(r.score).toBe(70);
    });

    it('asset recente con un piano, o con un evento, e\' valutabile', () => {
        expect(health([], [planOk], { assetCreatedAt: NEW_ASSET }).score).toBe(100);
        expect(health([request({ createdAt: '2026-11-01T12:00:00Z' })], [], { assetCreatedAt: NEW_ASSET }).evaluable).toBe(true);
    });

    it('un guasto aperto vecchio di anni e\' un evento: l\'asset resta valutabile', () => {
        const r = health([fault({ status: 'OPEN', createdAt: '2024-03-01T12:00:00Z' })], [], { totalOrders: 1 });
        expect(r.evaluable).toBe(true);
    });

    it('il numero di giorni minimo e\' configurabile', () => {
        const cfg = parseHealthConfig({ minHistoryDays: 10 });
        expect(health([], [], { assetCreatedAt: NEW_ASSET, totalOrders: 1 }, cfg).evaluable).toBe(true);
    });

    it('senza totalOrders la storia si ricava dagli ordini passati (annullati esclusi)', () => {
        expect(health([routine({ status: 'CANCELED' })], []).score).toBeNull();
        expect(health([routine()], []).score).toBe(70);
    });
});

describe('punti persi spiegati', () => {
    it('ogni voce ha componente, punti e motivo; ordinate dalla piu\' grande', () => {
        // 2 guasti (uno aperto, non ferma), 1 piano in ritardo
        const r = health([fault({ status: 'OPEN' }), fault()], [planLate]);
        // corrente 50 -> -20 ; frequenza 2 punti = 60 -> -12 ; programmata 75 -> -7,5
        expect(r.losses.map(l => [l.component, l.points])).toEqual([['current', 20], ['frequency', 12], ['schedule', 7.5]]);
        expect(r.losses[1].reason).toBe('2 guasti negli ultimi 12 mesi');
        expect(r.losses[2].reason).toBe('1 piano in ritardo');
        expect(r.score).toBe(61); // 100 - 39,5 = 60,5 -> 61
    });

    it('separa i punti persi per ritardo dei piani da quelli per interventi chiusi fuori scadenza', () => {
        const r = health([routine({ completedAt: '2026-10-12T12:00:00Z' })], [planOk, planLate]);
        // penalita' 75; quota 0 -> programmata 0: ritardo -7,5 ; chiusure fuori scadenza -22,5
        expect(r.losses.map(l => [l.component, l.points])).toEqual([['schedule', 22.5], ['schedule', 7.5]]);
        expect(r.losses[0].reason).toBe('0 interventi programmati su 1 chiusi entro la scadenza');
    });
});

describe('parseHealthConfig', () => {
    it('vuoto, null o sbagliato: valori predefiniti', () => {
        for (const v of [null, undefined, {}, [], 'abc', 42, true]) {
            expect(parseHealthConfig(v)).toEqual(DEFAULT_HEALTH_CONFIG);
        }
    });

    it('i predefiniti sono quelli della regola', () => {
        expect(DEFAULT_HEALTH_CONFIG.weights).toEqual({ current: 40, frequency: 30, schedule: 30 });
        expect(DEFAULT_HEALTH_CONFIG.noPlanCap).toBe(70);
        expect(DEFAULT_HEALTH_CONFIG.eventPoints).toEqual({ fault: 1, stoppingFault: 2, request: 0.5 });
        expect(DEFAULT_HEALTH_CONFIG.windowMonths).toBe(12);
        expect(DEFAULT_HEALTH_CONFIG.overduePenalty).toBe(25);
        expect(DEFAULT_HEALTH_CONFIG.minHistoryDays).toBe(90);
    });

    it('defaultHealthConfig restituisce una copia indipendente', () => {
        const c = defaultHealthConfig();
        c.weights.current = 1;
        c.frequencySteps[0].score = 1;
        expect(DEFAULT_HEALTH_CONFIG.weights.current).toBe(40);
        expect(DEFAULT_HEALTH_CONFIG.frequencySteps[0].score).toBe(100);
    });

    it('accetta valori validi, anche come stringhe (campi di un modulo)', () => {
        const c = parseHealthConfig({
            weights: { current: '50', frequency: 25, schedule: '25,5' },
            noPlanCap: '60',
            eventPoints: { fault: 1.5, stoppingFault: 3, request: '0,25' },
            windowMonths: 6,
        });
        expect(c.weights).toEqual({ current: 50, frequency: 25, schedule: 25.5 });
        expect(c.noPlanCap).toBe(60);
        expect(c.eventPoints).toEqual({ fault: 1.5, stoppingFault: 3, request: 0.25 });
        expect(c.windowMonths).toBe(6);
    });

    it('valori assurdi tornano al predefinito, uno per uno', () => {
        const c = parseHealthConfig({
            weights: { current: -5, frequency: 'abc', schedule: 20 },
            noPlanCap: 150,
            eventPoints: { fault: -1, stoppingFault: NaN, request: Infinity },
            windowMonths: 0,
            overduePenalty: 101,
            currentScores: { ok: 100, fault: -1, stopped: 500 },
            frequencyBeyondScore: -3,
            minHistoryDays: 2.5,
        });
        expect(c.weights).toEqual({ current: 40, frequency: 30, schedule: 20 });
        expect(c.noPlanCap).toBe(70);
        expect(c.eventPoints).toEqual({ fault: 1, stoppingFault: 2, request: 0.5 });
        expect(c.windowMonths).toBe(12);
        expect(c.overduePenalty).toBe(25);
        expect(c.currentScores).toEqual({ ok: 100, fault: 50, stopped: 0 });
        expect(c.frequencyBeyondScore).toBe(20);
        expect(c.minHistoryDays).toBe(90);
    });

    it('pesi tutti a zero (somma 0): pesi predefiniti', () => {
        expect(parseHealthConfig({ weights: { current: 0, frequency: 0, schedule: 0 } }).weights).toEqual({ current: 40, frequency: 30, schedule: 30 });
    });

    it('un peso a zero e\' valido se la somma e\' positiva', () => {
        expect(parseHealthConfig({ weights: { current: 0, frequency: 0, schedule: 100 } }).weights).toEqual({ current: 0, frequency: 0, schedule: 100 });
    });

    it('finestra: solo interi da 1 a 60 mesi', () => {
        expect(parseHealthConfig({ windowMonths: 1 }).windowMonths).toBe(1);
        expect(parseHealthConfig({ windowMonths: 60 }).windowMonths).toBe(60);
        expect(parseHealthConfig({ windowMonths: 61 }).windowMonths).toBe(12);
        expect(parseHealthConfig({ windowMonths: 2.5 }).windowMonths).toBe(12);
        expect(parseHealthConfig({ windowMonths: -3 }).windowMonths).toBe(12);
    });

    it('tetto 0 e 100 sono validi', () => {
        expect(parseHealthConfig({ noPlanCap: 0 }).noPlanCap).toBe(0);
        expect(parseHealthConfig({ noPlanCap: 100 }).noPlanCap).toBe(100);
        expect(parseHealthConfig({ noPlanCap: -1 }).noPlanCap).toBe(70);
    });

    it('gradini della frequenza: validi se crescenti e con punteggi 0-100, altrimenti i predefiniti', () => {
        const ok = parseHealthConfig({ frequencySteps: [{ maxPoints: 0, score: 100 }, { maxPoints: 5, score: 50 }], frequencyBeyondScore: 10 });
        expect(ok.frequencySteps).toEqual([{ maxPoints: 0, score: 100 }, { maxPoints: 5, score: 50 }]);
        expect(ok.frequencyBeyondScore).toBe(10);
        expect(frequencyScore(4, ok)).toBe(50);
        expect(frequencyScore(6, ok)).toBe(10);

        for (const bad of [
            [], 'x',
            [{ maxPoints: 2, score: 50 }, { maxPoints: 1, score: 40 }], // non crescenti
            [{ maxPoints: 1, score: 150 }],
            [{ maxPoints: -1, score: 50 }],
            [{ maxPoints: 'a', score: 50 }],
            Array.from({ length: 11 }, (_, i) => ({ maxPoints: i, score: 50 })),
        ]) {
            expect(parseHealthConfig({ frequencySteps: bad }).frequencySteps).toEqual(DEFAULT_HEALTH_CONFIG.frequencySteps);
        }
    });

    it('una configurazione salvata e riletta da JSON dà lo stesso risultato', () => {
        const c = parseHealthConfig({ weights: { current: 60, frequency: 20, schedule: 20 }, noPlanCap: 50 });
        expect(parseHealthConfig(JSON.parse(JSON.stringify(c)))).toEqual(c);
    });
});

describe('pesi personalizzati', () => {
    it('la media usa i pesi configurati', () => {
        const cfg = parseHealthConfig({ weights: { current: 100, frequency: 0, schedule: 0 } });
        const r = health([fault({ status: 'OPEN' })], [planLate], {}, cfg);
        expect(r.score).toBe(50); // conta solo lo stato attuale
        expect(r.components.map(c => c.weight)).toEqual([100, 0, 0]);
    });

    it('punti-evento e penalita\' configurabili', () => {
        const cfg = parseHealthConfig({ eventPoints: { fault: 3, stoppingFault: 3, request: 0 }, overduePenalty: 50 });
        const r = health([fault(), request()], [planLate], {}, cfg);
        expect(r.counts.eventPoints).toBe(3);
        expect(comp(r, 'frequency').score).toBe(40);
        expect(comp(r, 'schedule').score).toBe(50);
    });
});
