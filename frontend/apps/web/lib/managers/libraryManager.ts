import { EEvent, EWebSocketMessage } from "@rockit/packages/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export class LibraryManager {
    static #instance: LibraryManager;

    private _init: boolean;

    constructor() {
        this._init = false;

        console.log("LibraryManager ", LibraryManager.#instance);

        if (LibraryManager.#instance) {
            console.log("Returning  existing instance of LibraryManager");
            return LibraryManager.#instance;
        }

        console.log("setting   instance of LibraryManager");

        LibraryManager.#instance = this;

        return LibraryManager.#instance;
    }

    init() {
        console.log("LibraryManager  init", this._init);
        if (this._init) return;
        this._init = true;

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaAdded,
            (data) => this.libraryMediaAddedHandler(data.publicId)
        );

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaRemoved,
            (data) => this.libraryMediaRemovedHandler(data.publicId)
        );
    }

    private libraryMediaAddedHandler(publicId: string) {
        rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
            publicId: publicId,
        });
    }

    private libraryMediaRemovedHandler(publicId: string) {
        rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromLibrary, {
            publicId: publicId,
        });
    }
}
