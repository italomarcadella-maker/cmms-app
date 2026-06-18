import { IProcessRecipeRepository } from '../../domain/ports/process-recipe-repository';
import { ProcessRecipe } from '../../domain/entities/process-recipe';
import { ProcessRecipeMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaProcessRecipeRepository implements IProcessRecipeRepository {
    async findById(id: string): Promise<ProcessRecipe | null> {
        const raw = await prisma.processRecipe.findUnique({
            where: { id }
        });
        return raw ? ProcessRecipeMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<ProcessRecipe[]> {
        const raws = await prisma.processRecipe.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        return raws.map(ProcessRecipeMapper.toDomain);
    }

    async save(recipe: ProcessRecipe): Promise<ProcessRecipe> {
        const prismaData = ProcessRecipeMapper.toPrisma(recipe);
        let saved;
        if (recipe.id) {
            saved = await prisma.processRecipe.update({
                where: { id: recipe.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.processRecipe.create({
                data: prismaData as any
            });
        }
        return ProcessRecipeMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.processRecipe.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting process recipe ${id}:`, error);
            return false;
        }
    }
}
