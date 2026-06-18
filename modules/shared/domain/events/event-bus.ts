export interface DomainEvent<T = any> {
    id: string;
    name: string;
    timestamp: Date;
    payload: T;
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export interface IEventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe(eventName: string, handler: EventHandler): void;
    unsubscribe(eventName: string, handler: EventHandler): void;
}

export class InMemoryEventBus implements IEventBus {
    private handlers: Map<string, EventHandler[]> = new Map();

    async publish(event: DomainEvent): Promise<void> {
        const eventHandlers = this.handlers.get(event.name) || [];
        // Run all handlers concurrently/asynchronously
        const promises = eventHandlers.map(handler => {
            try {
                return Promise.resolve(handler(event));
            } catch (error) {
                console.error(`Error in event handler for ${event.name}:`, error);
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }

    subscribe(eventName: string, handler: EventHandler): void {
        const currentHandlers = this.handlers.get(eventName) || [];
        this.handlers.set(eventName, [...currentHandlers, handler]);
    }

    unsubscribe(eventName: string, handler: EventHandler): void {
        const currentHandlers = this.handlers.get(eventName) || [];
        this.handlers.set(eventName, currentHandlers.filter(h => h !== handler));
    }
}
