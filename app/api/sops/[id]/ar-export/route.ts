import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const sop = await prisma.sopDocument.findUnique({
            where: { id: params.id },
            include: {
                asset: true,
            },
        });

        if (!sop) {
            return NextResponse.json({ error: "SOP not found" }, { status: 404 });
        }

        // Transform into a generic, AR-friendly format
        const arPayload = {
            meta: {
                sopId: sop.id,
                title: sop.title,
                version: sop.version,
                machine: sop.asset.name,
                machineId: sop.asset.serialNumber,
            },
            visuals: {
                anchorImageSource: sop.imageUrl || null, // Image to track
                demoVideoSource: sop.videoUrl || null,
            },
            steps: JSON.parse(sop.aiExtractedParameters).map((param: any, index: number) => ({
                stepId: index + 1,
                instruction: `Imposta ${param.label} a ${param.optimalValue}`,
                validation: {
                    type: "hmi_read",
                    targetValue: param.optimalValue,
                    tolerance: param.tolerance || 0,
                },
                // For video frames mapping
                mediaTimecode: sop.mediaFrames ? (sop.mediaFrames as any)[index]?.timestamp : null
            }))
        };

        return NextResponse.json(arPayload);
    } catch (error) {
        console.error("AR Export Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
