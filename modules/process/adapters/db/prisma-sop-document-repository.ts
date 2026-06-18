import { ISopDocumentRepository } from '../../domain/ports/sop-document-repository';
import { SopDocument } from '../../domain/entities/sop-document';
import { SopDocumentMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaSopDocumentRepository implements ISopDocumentRepository {
    async findById(id: string): Promise<SopDocument | null> {
        const raw = await prisma.sopDocument.findUnique({
            where: { id }
        });
        return raw ? SopDocumentMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<SopDocument[]> {
        const raws = await prisma.sopDocument.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return raws.map(SopDocumentMapper.toDomain);
    }

    async findByAssetId(assetId: string): Promise<SopDocument[]> {
        const raws = await prisma.sopDocument.findMany({
            where: { assetId, isApproved: true },
            orderBy: { createdAt: 'desc' }
        });
        return raws.map(SopDocumentMapper.toDomain);
    }

    async save(sop: SopDocument): Promise<SopDocument> {
        const prismaData = SopDocumentMapper.toPrisma(sop);
        let saved;
        if (sop.id) {
            saved = await prisma.sopDocument.update({
                where: { id: sop.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.sopDocument.create({
                data: prismaData as any
            });
        }
        return SopDocumentMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sopDocument.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting sop document ${id}:`, error);
            return false;
        }
    }
}
