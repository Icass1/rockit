import { EEvent } from "@/models/enums/events";

export class EventManager {
    static #instance: EventManager;

    constructor() {
        if (EventManager.#instance) {
            return EventManager.#instance;
        }
        EventManager.#instance = this;
        return EventManager.#instance;
    }

    addEventListener(event: EEvent) {
        console.log("REST");
    }
}
