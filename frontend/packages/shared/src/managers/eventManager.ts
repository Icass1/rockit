import { EEvent } from "@/models/enums/events";
import { IEventPayloadMap } from "@/models/interfaces/eventPayloadMap";

export class EventManager {
    static #instance: EventManager;

    private listeners = new Map<EEvent, Set<(data: object) => void>>();

    static getInstance(): EventManager {
        if (!EventManager.#instance) {
            EventManager.#instance = new EventManager();
        }
        return EventManager.#instance;
    }

    addEventListener<K extends EEvent>(
        event: K,
        handler: (data: IEventPayloadMap[K]) => void
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler as (data: object) => void);
    }

    removeEventListener<K extends EEvent>(
        event: K,
        handler: (data: IEventPayloadMap[K]) => void
    ): void {
        this.listeners.get(event)?.delete(handler as (data: object) => void);
    }

    dispatchEvent<K extends EEvent>(event: K, data: IEventPayloadMap[K]): void {
        console.log("dipatchEvent", event, data);
        this.listeners.get(event)?.forEach((handler): void => handler(data));
    }
}
