export interface IUnitOfWork {
    start(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    execute<T>(work: () => Promise<T>): Promise<T>;
}
