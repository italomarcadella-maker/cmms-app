import {
    Project as PrismaProject,
    ProjectTask as PrismaProjectTask,
    SopDocument as PrismaSopDocument,
    ProcessAnomaly as PrismaProcessAnomaly,
    LineSimulation as PrismaLineSimulation,
    ProcessRecipe as PrismaProcessRecipe,
    QualityReading as PrismaQualityReading
} from '@prisma/client';
import { Project } from '../../domain/entities/project';
import { ProjectTask } from '../../domain/entities/project-task';
import { SopDocument } from '../../domain/entities/sop-document';
import { ProcessAnomaly } from '../../domain/entities/process-anomaly';
import { LineSimulation } from '../../domain/entities/line-simulation';
import { ProcessRecipe } from '../../domain/entities/process-recipe';
import { QualityReading } from '../../domain/entities/quality-reading';

export class ProjectMapper {
    static toDomain(raw: PrismaProject): Project {
        return new Project({
            id: raw.id,
            title: raw.title,
            description: raw.description,
            startDate: raw.startDate,
            endDate: raw.endDate,
            status: raw.status,
            progress: raw.progress,
            roi: raw.roi,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt
        });
    }

    static toPrisma(domain: Project): Partial<PrismaProject> {
        return {
            id: domain.id,
            title: domain.title,
            description: domain.description,
            startDate: domain.startDate,
            endDate: domain.endDate,
            status: domain.status,
            progress: domain.progress,
            roi: domain.roi,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        };
    }
}

export class ProjectTaskMapper {
    static toDomain(raw: PrismaProjectTask): ProjectTask {
        return new ProjectTask({
            id: raw.id,
            projectId: raw.projectId,
            title: raw.title,
            startDate: raw.startDate,
            endDate: raw.endDate,
            status: raw.status,
            dependencies: raw.dependencies,
            linkedWorkOrderId: raw.linkedWorkOrderId
        });
    }

    static toPrisma(domain: ProjectTask): Partial<PrismaProjectTask> {
        return {
            id: domain.id,
            projectId: domain.projectId,
            title: domain.title,
            startDate: domain.startDate,
            endDate: domain.endDate,
            status: domain.status,
            dependencies: domain.dependencies ?? null,
            linkedWorkOrderId: domain.linkedWorkOrderId ?? null
        };
    }
}

export class SopDocumentMapper {
    static toDomain(raw: PrismaSopDocument): SopDocument {
        return new SopDocument({
            id: raw.id,
            title: raw.title,
            assetId: raw.assetId,
            imageUrl: raw.imageUrl,
            author: raw.author,
            isApproved: raw.isApproved,
            aiExtractedParameters: raw.aiExtractedParameters,
            line: raw.line,
            product: raw.product,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt
        });
    }

    static toPrisma(domain: SopDocument): Partial<PrismaSopDocument> {
        return {
            id: domain.id,
            title: domain.title,
            assetId: domain.assetId,
            imageUrl: domain.imageUrl ?? null,
            author: domain.author,
            isApproved: domain.isApproved,
            aiExtractedParameters: domain.aiExtractedParameters,
            line: domain.line ?? null,
            product: domain.product ?? null,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        };
    }
}

export class ProcessAnomalyMapper {
    static toDomain(raw: PrismaProcessAnomaly): ProcessAnomaly {
        return new ProcessAnomaly({
            id: raw.id,
            assetId: raw.assetId,
            description: raw.description,
            detectedAt: raw.detectedAt,
            aiRecommendation: raw.aiRecommendation,
            isPredictive: raw.isPredictive,
            autoRcaData: raw.autoRcaData,
            isResolved: raw.isResolved
        });
    }

    static toPrisma(domain: ProcessAnomaly): Partial<PrismaProcessAnomaly> {
        return {
            id: domain.id,
            assetId: domain.assetId,
            description: domain.description,
            detectedAt: domain.detectedAt,
            aiRecommendation: domain.aiRecommendation ?? null,
            isPredictive: domain.isPredictive,
            autoRcaData: domain.autoRcaData ?? null,
            isResolved: domain.isResolved
        };
    }
}

export class LineSimulationMapper {
    static toDomain(raw: PrismaLineSimulation): LineSimulation {
        return new LineSimulation({
            id: raw.id,
            name: raw.name,
            layout: raw.layout,
            assetId: raw.assetId,
            leanScore: raw.leanScore,
            lineEff: raw.lineEff,
            dataJson: raw.dataJson,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt
        });
    }

    static toPrisma(domain: LineSimulation): Partial<PrismaLineSimulation> {
        return {
            id: domain.id,
            name: domain.name,
            layout: domain.layout,
            assetId: domain.assetId,
            leanScore: domain.leanScore,
            lineEff: domain.lineEff,
            dataJson: domain.dataJson,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        };
    }
}

export class ProcessRecipeMapper {
    static toDomain(raw: PrismaProcessRecipe): ProcessRecipe {
        return new ProcessRecipe({
            id: raw.id,
            name: raw.name,
            assetId: raw.assetId,
            image: raw.image,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt
        });
    }

    static toPrisma(domain: ProcessRecipe): Partial<PrismaProcessRecipe> {
        return {
            id: domain.id,
            name: domain.name,
            assetId: domain.assetId,
            image: domain.image,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        };
    }
}

export class QualityReadingMapper {
    static toDomain(raw: PrismaQualityReading): QualityReading {
        return new QualityReading({
            id: raw.id,
            recipeId: raw.recipeId,
            value: raw.value,
            timestamp: raw.timestamp
        });
    }

    static toPrisma(domain: QualityReading): Partial<PrismaQualityReading> {
        return {
            id: domain.id,
            recipeId: domain.recipeId,
            value: domain.value,
            timestamp: domain.timestamp
        };
    }
}
