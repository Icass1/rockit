import { EEvent } from "../models/enums/events";
import { IEventPayloadMap } from "../models/interfaces/eventPayloadMap";

export class EventManager {
    static #instance: EventManager;

    private listeners = new Map<EEvent, Set<(data: object) => void>>();

    static getInstance() {
        if (!EventManager.#instance) {
            EventManager.#instance = new EventManager();
        }
        return EventManager.#instance;
    }

    addEventListener<K extends EEvent>(
        event: K,
        handler: (data: IEventPayloadMap[K]) => void
    ) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler as (data: object) => void);
    }

    removeEventListener<K extends EEvent>(
        event: K,
        handler: (data: IEventPayloadMap[K]) => void
    ) {
        this.listeners.get(event)?.delete(handler as (data: object) => void);
    }

    dispatchEvent<K extends EEvent>(event: K, data: IEventPayloadMap[K]) {
        this.listeners.get(event)?.forEach((handler) => handler(data));
    }
}
