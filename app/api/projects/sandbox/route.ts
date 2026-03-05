import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { actions } = body;

        // Simulate complex what-if logic
        // Example: calculate delays based on moving a critical path task
        let simulatedRoiChange = 0;
        let newEndDate = new Date();

        // Naive sandbox simulation math for demo
        actions.forEach((action: any) => {
            if (action.type === "MOVE_TASK") {
                const daysShift = action.daysShift || 1;
                newEndDate = new Date(newEndDate.setDate(newEndDate.getDate() + daysShift));
                simulatedRoiChange -= (daysShift * 1500); // 1500 per day penalty mock
            }
        });

        return NextResponse.json({
            success: true,
            simulationResult: {
                projectedEndDate: newEndDate,
                roiImpact: simulatedRoiChange,
                warnings: simulatedRoiChange < 0 ? ["Il ritardo nel progetto riduce il ROI del trimestre"] : []
            }
        });

    } catch (error) {
        console.error("Sandbox Simulation Error:", error);
        return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
    }
}
