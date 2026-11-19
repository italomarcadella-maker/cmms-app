-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER', 'SUPERVISOR', 'MAINTAINER', 'USER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'DECOMMISSIONED', 'STORAGE');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('MACHINE', 'FACILITY', 'SAFETY', 'KAIZEN', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('STOPPED', 'MALFUNCTIONING', 'WORKING', 'NOT_PRODUCTION', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "WorkOrderCategory" AS ENUM ('MECHANICAL', 'ELECTRICAL', 'HYDRAULIC', 'PNEUMATIC', 'SOFTWARE', 'CIVIL', 'OTHER', 'SAFETY', 'IMPROVEMENT', 'AI_SUGGESTION');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'COMPLETED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('FAULT', 'ROUTINE', 'REQUEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "department" TEXT,
    "plantId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "vendor" TEXT,
    "plantId" TEXT,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "line" TEXT,
    "cespite" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "lastMaintenance" TIMESTAMP(3),
    "type" "AssetType" NOT NULL DEFAULT 'MACHINE',
    "warrantyExpiration" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "assetId" TEXT NOT NULL,

    CONSTRAINT "AssetDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "AssetImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "WorkOrderPriority" NOT NULL,
    "category" "WorkOrderCategory" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "assignedTechnicianId" TEXT,
    "requesterId" TEXT,
    "validatedById" TEXT,
    "type" "WorkOrderType" NOT NULL DEFAULT 'FAULT',
    "requestImage" TEXT,
    "completionImage" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,
    "plantId" TEXT,
    "originScheduleId" TEXT,
    "ewoFilled" BOOLEAN NOT NULL DEFAULT false,
    "originMeetingId" TEXT,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EWO" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "description" TEXT,
    "causeAnalysis" TEXT NOT NULL,
    "solutionApplied" TEXT NOT NULL,
    "preventiveActions" TEXT,
    "needsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorName" TEXT NOT NULL,
    "downtimeStart" TIMESTAMP(3),
    "downtimeEnd" TIMESTAMP(3),
    "totalDowntimeMin" INTEGER,
    "productionImpact" TEXT,
    "imageBefore" TEXT,
    "imageAfter" TEXT,

    CONSTRAINT "EWO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "ewoThresholdHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downtimeCostPerMinute" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "defaultLaborHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "electricityPricePerKwh" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    "waterPricePerM3" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "co2FactorPerKwh" DOUBLE PRECISION NOT NULL DEFAULT 0.44,
    "erpEndpointUrl" TEXT,
    "iotGatewayUrl" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "workOrderId" TEXT NOT NULL,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPart" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "workOrderId" TEXT NOT NULL,

    CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborLog" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "workOrderId" TEXT NOT NULL,

    CONSTRAINT "LaborLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderTechnician" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceActivity" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "MaintenanceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventiveSchedule" (
    "id" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "frequencyDays" INTEGER NOT NULL DEFAULT 30,
    "activities" TEXT NOT NULL DEFAULT '[]',
    "lastRunDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "sourceTemplateId" TEXT,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "PreventiveSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "serialNumber" TEXT,
    "location" TEXT,
    "installationDate" TIMESTAMP(3),
    "plantId" TEXT,
    "assetId" TEXT,
    "readingFrequencyDays" INTEGER,
    "nextReadingDue" TIMESTAMP(3),
    "readingAssigneeId" TEXT,

    CONSTRAINT "Meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "aiAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "warehouse" TEXT,
    "vendor" TEXT,
    "quantity" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "plantId" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catalogId" TEXT,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SparePartCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartTransferRequest" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT,
    "partName" TEXT NOT NULL,
    "fromPlantId" TEXT NOT NULL,
    "toPlantId" TEXT NOT NULL,
    "fromPartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "decisionNote" TEXT,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "PartTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianLoan" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "fromPlantId" TEXT NOT NULL,
    "toPlantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "TechnicianLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedTemplate" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetVendor" TEXT,
    "assetModel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "originPlantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "adoptions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "nominalDiameter" DOUBLE PRECISION,
    "manufacturer" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "plantId" TEXT,
    "status" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "referenceDrawing" TEXT,
    "drawingUrl" TEXT,
    "isScrapped" BOOLEAN NOT NULL DEFAULT false,
    "hoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifecycle" JSONB,
    "assignedAssetId" TEXT,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentMeasurement" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value1" DOUBLE PRECISION NOT NULL,
    "value2" DOUBLE PRECISION,
    "operator" TEXT NOT NULL,

    CONSTRAINT "ComponentMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderTimer" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "note" TEXT,

    CONSTRAINT "WorkOrderTimer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "thoughtProcess" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "userId" TEXT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceKnowledge" (
    "id" TEXT NOT NULL,
    "problemTags" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "assetCategory" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "shift" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicianAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "plantId" TEXT,
    "line" TEXT NOT NULL,
    "prodStartDay" INTEGER NOT NULL DEFAULT 1,
    "prodStartTime" TEXT NOT NULL DEFAULT '06:00',
    "prodEndDay" INTEGER NOT NULL DEFAULT 5,
    "prodEndTime" TEXT NOT NULL DEFAULT '22:00',
    "maintStart" TEXT NOT NULL DEFAULT '08:00',
    "maintEnd" TEXT NOT NULL DEFAULT '17:00',
    "maintStartDay" INTEGER NOT NULL DEFAULT 1,
    "maintEndDay" INTEGER NOT NULL DEFAULT 5,
    "maintSatStart" TEXT,
    "maintSatEnd" TEXT,
    "maintSunStart" TEXT,
    "maintSunEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION,
    "ecologicalRoi" DOUBLE PRECISION,
    "expectedEnergySavings" DOUBLE PRECISION,
    "plantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "linkedWorkOrderId" TEXT,
    "dependencies" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTaskNote" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTaskNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "mediaFrames" JSONB,
    "aiExtractedParameters" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "line" TEXT,
    "product" TEXT,
    "sourceTemplateId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopFeedback" (
    "id" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SopFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessAnomaly" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "aiRecommendation" TEXT,
    "isPredictive" BOOLEAN NOT NULL DEFAULT false,
    "autoRcaData" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProcessAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMeeting" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "conductedBy" TEXT,
    "plantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSection" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "kpiMetrics" JSONB,
    "aiInsights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingActionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "linkedWorkOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "electricityPricePerKwh" DOUBLE PRECISION,
    "waterPricePerM3" DOUBLE PRECISION,
    "co2FactorPerKwh" DOUBLE PRECISION,
    "downtimeCostPerMinute" DOUBLE PRECISION,
    "defaultLaborHourlyRate" DOUBLE PRECISION,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyEvent" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatNumber" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorContract" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 60,
    "annualValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorActivity" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequencyDays" INTEGER NOT NULL,
    "assetId" TEXT,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastDoneAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorExecution" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "reportUrl" TEXT,
    "cost" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlant" (
    "userId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPlant_pkey" PRIMARY KEY ("userId","plantId")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "expectedCost" DOUBLE PRECISION,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plantId" TEXT NOT NULL,
    "assetId" TEXT,
    "kwhConsumed" DOUBLE PRECISION NOT NULL,
    "co2Emitted" DOUBLE PRECISION NOT NULL,
    "costLocal" DOUBLE PRECISION,

    CONSTRAINT "EnergyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalInsight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "tags" TEXT[],
    "assetId" TEXT,
    "relatedData" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessRecipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetId" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessMachine" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "ProcessMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessParameter" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "setPoint" DOUBLE PRECISION NOT NULL,
    "tolerance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProcessParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessChangelog" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessChangelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReading" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDefect" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "name" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeDefect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineSimulation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetId" TEXT,
    "layout" TEXT NOT NULL,
    "leanScore" INTEGER NOT NULL DEFAULT 0,
    "lineEff" INTEGER NOT NULL DEFAULT 0,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineSimulationVersion" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "leanScore" INTEGER NOT NULL,
    "lineEff" INTEGER NOT NULL,
    "snapshotBy" TEXT,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineSimulationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_healthScore_idx" ON "Asset"("healthScore");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Asset_plantId_idx" ON "Asset"("plantId");

-- CreateIndex
CREATE INDEX "Asset_vendor_model_idx" ON "Asset"("vendor", "model");

-- CreateIndex
CREATE INDEX "WorkOrder_dueDate_idx" ON "WorkOrder"("dueDate");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_assetId_idx" ON "WorkOrder"("assetId");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedTechnicianId_idx" ON "WorkOrder"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "WorkOrder_createdAt_idx" ON "WorkOrder"("createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_priority_idx" ON "WorkOrder"("priority");

-- CreateIndex
CREATE INDEX "WorkOrder_plantId_idx" ON "WorkOrder"("plantId");

-- CreateIndex
CREATE INDEX "WorkOrder_plantId_status_idx" ON "WorkOrder"("plantId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_plantId_createdAt_idx" ON "WorkOrder"("plantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EWO_workOrderId_key" ON "EWO"("workOrderId");

-- CreateIndex
CREATE INDEX "ChecklistItem_workOrderId_idx" ON "ChecklistItem"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_partId_idx" ON "WorkOrderPart"("partId");

-- CreateIndex
CREATE INDEX "LaborLog_workOrderId_idx" ON "LaborLog"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderTechnician_workOrderId_technicianId_key" ON "WorkOrderTechnician"("workOrderId", "technicianId");

-- CreateIndex
CREATE INDEX "PreventiveSchedule_nextDueDate_idx" ON "PreventiveSchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "PreventiveSchedule_assetId_idx" ON "PreventiveSchedule"("assetId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Meter_plantId_idx" ON "Meter"("plantId");

-- CreateIndex
CREATE INDEX "Meter_assetId_idx" ON "Meter"("assetId");

-- CreateIndex
CREATE INDEX "Meter_nextReadingDue_idx" ON "Meter"("nextReadingDue");

-- CreateIndex
CREATE INDEX "MeterReading_meterId_date_idx" ON "MeterReading"("meterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MeterReading_meterId_date_key" ON "MeterReading"("meterId", "date");

-- CreateIndex
CREATE INDEX "SparePart_plantId_idx" ON "SparePart"("plantId");

-- CreateIndex
CREATE INDEX "SparePart_catalogId_idx" ON "SparePart"("catalogId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartCatalog_normalizedKey_key" ON "SparePartCatalog"("normalizedKey");

-- CreateIndex
CREATE INDEX "SparePartCatalog_name_idx" ON "SparePartCatalog"("name");

-- CreateIndex
CREATE INDEX "PartTransferRequest_fromPlantId_status_idx" ON "PartTransferRequest"("fromPlantId", "status");

-- CreateIndex
CREATE INDEX "PartTransferRequest_toPlantId_status_idx" ON "PartTransferRequest"("toPlantId", "status");

-- CreateIndex
CREATE INDEX "TechnicianLoan_toPlantId_status_idx" ON "TechnicianLoan"("toPlantId", "status");

-- CreateIndex
CREATE INDEX "TechnicianLoan_fromPlantId_status_idx" ON "TechnicianLoan"("fromPlantId", "status");

-- CreateIndex
CREATE INDEX "SharedTemplate_assetModel_idx" ON "SharedTemplate"("assetModel");

-- CreateIndex
CREATE INDEX "SharedTemplate_kind_idx" ON "SharedTemplate"("kind");

-- CreateIndex
CREATE INDEX "WorkOrderTimer_workOrderId_idx" ON "WorkOrderTimer"("workOrderId");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_timestamp_idx" ON "ChatMessage"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "MaintenanceKnowledge_problemTags_idx" ON "MaintenanceKnowledge"("problemTags");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianAvailability_userId_date_key" ON "TechnicianAvailability"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_plantId_line_key" ON "ProductionLine"("plantId", "line");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Project_plantId_idx" ON "Project"("plantId");

-- CreateIndex
CREATE INDEX "SopDocument_assetId_idx" ON "SopDocument"("assetId");

-- CreateIndex
CREATE INDEX "ProcessAnomaly_assetId_detectedAt_idx" ON "ProcessAnomaly"("assetId", "detectedAt");

-- CreateIndex
CREATE INDEX "DailyMeeting_plantId_idx" ON "DailyMeeting"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSection_meetingId_type_key" ON "MeetingSection"("meetingId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Plant_name_key" ON "Plant"("name");

-- CreateIndex
CREATE INDEX "SafetyEvent_plantId_occurredAt_idx" ON "SafetyEvent"("plantId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_name_key" ON "Contractor"("name");

-- CreateIndex
CREATE INDEX "ContractorContract_plantId_endDate_idx" ON "ContractorContract"("plantId", "endDate");

-- CreateIndex
CREATE INDEX "ContractorContract_contractorId_idx" ON "ContractorContract"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorActivity_nextDueDate_idx" ON "ContractorActivity"("nextDueDate");

-- CreateIndex
CREATE INDEX "ContractorActivity_contractId_idx" ON "ContractorActivity"("contractId");

-- CreateIndex
CREATE INDEX "ContractorExecution_activityId_doneAt_idx" ON "ContractorExecution"("activityId", "doneAt");

-- CreateIndex
CREATE INDEX "UserPlant_plantId_idx" ON "UserPlant"("plantId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_partId_idx" ON "PurchaseRequest"("partId");

-- CreateIndex
CREATE INDEX "EnergyLog_plantId_date_idx" ON "EnergyLog"("plantId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetImage" ADD CONSTRAINT "AssetImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_originScheduleId_fkey" FOREIGN KEY ("originScheduleId") REFERENCES "PreventiveSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_originMeetingId_fkey" FOREIGN KEY ("originMeetingId") REFERENCES "DailyMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EWO" ADD CONSTRAINT "EWO_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborLog" ADD CONSTRAINT "LaborLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTechnician" ADD CONSTRAINT "WorkOrderTechnician_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTechnician" ADD CONSTRAINT "WorkOrderTechnician_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SparePartCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransferRequest" ADD CONSTRAINT "PartTransferRequest_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SparePartCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransferRequest" ADD CONSTRAINT "PartTransferRequest_fromPartId_fkey" FOREIGN KEY ("fromPartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransferRequest" ADD CONSTRAINT "PartTransferRequest_fromPlantId_fkey" FOREIGN KEY ("fromPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransferRequest" ADD CONSTRAINT "PartTransferRequest_toPlantId_fkey" FOREIGN KEY ("toPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianLoan" ADD CONSTRAINT "TechnicianLoan_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianLoan" ADD CONSTRAINT "TechnicianLoan_fromPlantId_fkey" FOREIGN KEY ("fromPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianLoan" ADD CONSTRAINT "TechnicianLoan_toPlantId_fkey" FOREIGN KEY ("toPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedTemplate" ADD CONSTRAINT "SharedTemplate_originPlantId_fkey" FOREIGN KEY ("originPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMeasurement" ADD CONSTRAINT "ComponentMeasurement_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTimer" ADD CONSTRAINT "WorkOrderTimer_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAvailability" ADD CONSTRAINT "TechnicianAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskNote" ADD CONSTRAINT "ProjectTaskNote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopDocument" ADD CONSTRAINT "SopDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopFeedback" ADD CONSTRAINT "SopFeedback_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "SopDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAnomaly" ADD CONSTRAINT "ProcessAnomaly_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMeeting" ADD CONSTRAINT "DailyMeeting_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSection" ADD CONSTRAINT "MeetingSection_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "DailyMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "MeetingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyEvent" ADD CONSTRAINT "SafetyEvent_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorContract" ADD CONSTRAINT "ContractorContract_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorContract" ADD CONSTRAINT "ContractorContract_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorActivity" ADD CONSTRAINT "ContractorActivity_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorActivity" ADD CONSTRAINT "ContractorActivity_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorExecution" ADD CONSTRAINT "ContractorExecution_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ContractorActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlant" ADD CONSTRAINT "UserPlant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlant" ADD CONSTRAINT "UserPlant_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyLog" ADD CONSTRAINT "EnergyLog_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecipe" ADD CONSTRAINT "ProcessRecipe_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessMachine" ADD CONSTRAINT "ProcessMachine_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProcessRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessParameter" ADD CONSTRAINT "ProcessParameter_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "ProcessMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessChangelog" ADD CONSTRAINT "ProcessChangelog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProcessRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReading" ADD CONSTRAINT "QualityReading_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProcessRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDefect" ADD CONSTRAINT "KnowledgeDefect_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSimulation" ADD CONSTRAINT "LineSimulation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSimulationVersion" ADD CONSTRAINT "LineSimulationVersion_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "LineSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSimulationVersion" ADD CONSTRAINT "LineSimulationVersion_snapshotBy_fkey" FOREIGN KEY ("snapshotBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

