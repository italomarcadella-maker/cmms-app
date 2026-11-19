-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "healthConfig" JSONB;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "completedAt" TIMESTAMP(3);

