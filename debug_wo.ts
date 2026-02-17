
import { workOrderSchema } from './lib/validations';

console.log("--- DEBUGGING WO VALIDATION ---");

const testCases = [
    {
        name: "Empty Object",
        data: {}
    },
    {
        name: "Missing Asset",
        data: {
            title: "Test Order",
            description: "Test Desc",
            priority: "MEDIUM",
            category: "OTHER",
            status: "OPEN",
            checklist: []
        }
    },
    {
        name: "Valid Data",
        data: {
            title: "Valid Order",
            description: "Desc",
            assetId: "test-asset-id",
            priority: "MEDIUM",
            category: "MECHANICAL",
            status: "OPEN",
            checklist: []
        }
    },
    {
        name: "Invalid Enum",
        data: {
            title: "Bad Enum",
            description: "Desc",
            assetId: "123",
            priority: "SUPER_HIGH", // Invalid
            category: "MECHANICAL"
        }
    }
];

testCases.forEach(tc => {
    console.log(`\nTesting: ${tc.name}`);
    const result = workOrderSchema.safeParse(tc.data);
    if (!result.success) {
        console.log("Validation Failed (Expected for some). Errors:");
        // Simulate exactly what we do in actions.ts to see if it crashes or returns "Unknown"
        try {
            const zError = result.error as any;
            const errorMsg = zError.errors ? zError.errors.map((e: any) => e.message).join(", ") : "Unknown Validation Error (errors prop missing)";
            console.log("Generated Message:", errorMsg);
            console.log("Raw Zod Error Keys:", Object.keys(zError));
            console.log("Raw Zod Error JSON:", JSON.stringify(zError, null, 2));
            if (zError.issues) console.log("Has .issues property?");
        } catch (e) {
            console.error("Error parsing ZodError:", e);
        }
    } else {
        console.log("Validation Success");
    }
});
