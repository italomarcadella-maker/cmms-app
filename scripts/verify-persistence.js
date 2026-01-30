
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Persistence Verification...");

    // 1. Create User (Admin) for Testing
    const testAdminEmail = `test-admin-${Date.now()}@example.com`;
    console.log(`Creating Test Admin: ${testAdminEmail}`);
    const admin = await prisma.user.create({
        data: {
            name: "Test Admin",
            email: testAdminEmail,
            role: "ADMIN",
            isActive: true,
            password: "hashed_dummy_password"
        }
    });

    if (!admin) throw new Error("Failed to create admin");
    console.log("Admin Created OK.");

    // 2. Create Asset with new fields (Plant, Line, Vendor)
    console.log("Creating Asset with Hierarchy...");
    const asset = await prisma.asset.create({
        data: {
            name: "Test Motor",
            model: "X-2000",
            serialNumber: `SN-TEST-${Date.now()}`,
            location: "Room 101",
            plant: "Stabilimento A",
            department: "Produzione",
            line: "Linea 1",
            vendor: "Acme Corp",
            purchaseDate: new Date(),
            status: "OPERATIONAL"
        }
    });

    if (asset.plant !== "Stabilimento A") throw new Error("Persistence Fail: Plant not saved");
    if (asset.line !== "Linea 1") throw new Error("Persistence Fail: Line not saved");
    console.log("Asset Created & Verified OK.");

    // 3. Create Work Order linked to Asset
    console.log("Creating Work Order...");
    const wo = await prisma.workOrder.create({
        data: {
            title: "Test Request",
            description: "Noise from motor",
            assetId: asset.id,
            priority: "HIGH",
            category: "MECHANICAL",
            status: "PENDING_APPROVAL",
            requesterId: admin.id,
            type: "REQUEST",
        }
    });

    if (wo.priority !== "HIGH") throw new Error("Persistence Fail: Priority not saved");
    if (wo.assetId !== asset.id) throw new Error("Persistence Fail: Asset Link broken");
    console.log("Work Order Created & Verified OK.");

    // 4. Update Asset Check
    console.log("Updating Asset Status...");
    const updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data: { status: "MAINTENANCE" }
    });
    if (updatedAsset.status !== "MAINTENANCE") throw new Error("Persistence Fail: Update not saved");
    console.log("Asset Update OK.");

    // Cleanup
    console.log("Cleaning up...");
    await prisma.workOrder.delete({ where: { id: wo.id } });
    await prisma.asset.delete({ where: { id: asset.id } });
    await prisma.user.delete({ where: { id: admin.id } });
    console.log("Cleanup OK.");

    console.log("✅ VERIFICATION SUCCESSFUL: All systems nominal.");
}

main()
    .catch((e) => {
        console.error("❌ VERIFICATION FAILED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
