import { IProjectRepository } from '../../domain/ports/project-repository';
import { Project } from '../../domain/entities/project';
import { ProjectMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaProjectRepository implements IProjectRepository {
    async findById(id: string): Promise<Project | null> {
        const raw = await prisma.project.findUnique({
            where: { id }
        });
        return raw ? ProjectMapper.toDomain(raw) : null;
    }

    async findAll(showArchived: boolean = false): Promise<Project[]> {
        const raws = await prisma.project.findMany({
            where: {
                status: showArchived ? 'COMPLETED' : { not: 'COMPLETED' }
            },
            orderBy: { createdAt: 'desc' }
        });
        return raws.map(ProjectMapper.toDomain);
    }

    async save(project: Project): Promise<Project> {
        const prismaData = ProjectMapper.toPrisma(project);
        let saved;
        if (project.id) {
            saved = await prisma.project.update({
                where: { id: project.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.project.create({
                data: prismaData as any
            });
        }
        return ProjectMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.project.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting project ${id}:`, error);
            return false;
        }
    }
}
