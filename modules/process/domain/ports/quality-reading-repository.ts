import { QualityReading } from '../entities/quality-reading';

export interface IQualityReadingRepository {
    save(reading: QualityReading): Promise<QualityReading>;
    findByRecipeId(recipeId: string): Promise<QualityReading[]>;
}
