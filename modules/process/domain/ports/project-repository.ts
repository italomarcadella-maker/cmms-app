import { Project } from '../entities/project';

export interface IProjectRepository {
    findById(id: string): Promise<Project | null>;
    findAll(showArchived?: boolean): Promise<Project[]>;
    save(project: Project): Promise<Project>;
    delete(id: string): Promise<boolean>;
}
