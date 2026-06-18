import { ProcessRecipe } from '../entities/process-recipe';

export interface IProcessRecipeRepository {
    findById(id: string): Promise<ProcessRecipe | null>;
    findAll(): Promise<ProcessRecipe[]>;
    save(recipe: ProcessRecipe): Promise<ProcessRecipe>;
    delete(id: string): Promise<boolean>;
}
