import { NextResponse } from "next/server";

export async function GET() {
    try {
        // In production, this would query historical data and run an ML model.
        // Here we generate mock predictive forecasts.

        const forecasts = [
            {
                id: "pred-1",
                assetId: "E001",
                assetName: "Estrusore Alpha",
                metric: "Pressione Testa",
                currentValue: 120,
                predictedValue: 145,
                threshold: 140,
                timeToViolationHours: 4.5,
                confidence: 88,
                recommendation: "Ridurre velocità ventole di raffreddamento zona 3."
            },
            {
                id: "pred-2",
                assetId: "C004",
                assetName: "Confezionatrice Rapida",
                metric: "Vibrazione Motore",
                currentValue: 2.1,
                predictedValue: 3.8,
                threshold: 3.5,
                timeToViolationHours: 12,
                confidence: 75,
                recommendation: "Pianificare controllo cuscinetti asse principale."
            }
        ];

        return NextResponse.json(forecasts);
    } catch (error) {
        return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
    }
}
