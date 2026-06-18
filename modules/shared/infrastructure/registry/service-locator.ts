export class ServiceLocator {
    private static instances: Map<string, any> = new Map();

    public static register<T>(key: string, instance: T): void {
        this.instances.set(key, instance);
    }

    public static resolve<T>(key: string): T {
        const instance = this.instances.get(key);
        if (!instance) {
            throw new Error(`Service ${key} not registered in ServiceLocator`);
        }
        return instance as T;
    }

    public static reset(): void {
        this.instances.clear();
    }
}
