
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks MUST be hoisted or defined before imports
vi.mock('@/lib/prisma', () => ({
    prisma: {
        meter: {
            findMany: vi.fn(),
        },
        meterReading: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('@/auth', () => ({
    auth: vi.fn(),
    signIn: vi.fn(),
}));

vi.mock('next-auth', () => ({
    default: vi.fn(),
    AuthError: class AuthError extends Error { },
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: (fn: any) => fn,
}));

// Import AFTER mocks
import { getEnergyStats } from '@/lib/actions';
import { prisma } from '@/lib/prisma';

describe('getEnergyStats Distribution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should distribute consumption evenly across days between readings', async () => {
        // Setup Dates
        const now = new Date();
        const today = new Date(now);

        const startOfTrend = new Date();
        startOfTrend.setDate(startOfTrend.getDate() - 30);

        // Mock Meters
        (prisma.meter.findMany as any).mockResolvedValue([
            { id: 'm1', type: 'ELEC', name: 'Test Meter' }
        ]);

        // Mock Readings
        // Reading 1: 30 days ago, Value 100
        // Reading 2: Today, Value 400
        // Diff = 300 over 30 days => 10 per day
        // Note: getEnergyStats looks back 60 days
        const reading1Date = new Date(startOfTrend); // 30 days ago
        const reading2Date = new Date(today); // Today

        (prisma.meterReading.findMany as any).mockResolvedValue([
            { meterId: 'm1', value: 100, date: reading1Date },
            { meterId: 'm1', value: 400, date: reading2Date }
        ]);

        const stats = await getEnergyStats();

        // Check Trends
        // We expect roughly 10 per day for each day in the trend
        // The loop in getEnergyStats initializes 30 days of trends.
        // Our reading covers the entire period.

        // Let's check a few days in the middle
        const trendValues = stats.trends.map(t => t.elec);

        // Check if we have values > 0 (distributed) rather than just one spike
        const nonZeroDays = trendValues.filter(v => v > 0).length;

        console.log("Trend Values:", trendValues);
        console.log("Non-Zero Days:", nonZeroDays);

        expect(nonZeroDays).toBeGreaterThan(1); // Should be distributed
        expect(trendValues[10]).toBeCloseTo(10, 0); // Approx 10
        expect(stats.currentMonth.ELEC).toBeGreaterThan(0);
    });
});
