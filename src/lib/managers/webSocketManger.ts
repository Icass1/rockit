import { getSession } from "next-auth/react";

export class WebSocketManager {
    static #instance: WebSocketManager;

    webSocket?: WebSocket;

    private _init: boolean = false;

    constructor() {
        if (typeof window === "undefined") return;
        if (WebSocketManager.#instance) {
            console.log("Returning existing instance of WebSocketManager.");
            return WebSocketManager.#instance;
        }

        WebSocketManager.#instance = this;

        return WebSocketManager.#instance;
    }

    async init(BACKEND_URL: string) {
        if (this._init) return;
        const session = await getSession();

        console.log(session);

        console.log("WebSocketManager.init");
        this.webSocket = new WebSocket(
            `${BACKEND_URL}/ws?token=${session?.user.access_token}`
        );
        console.log(this.webSocket);
        this._init = true;
    }

    send(message: object) {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify(message));
    }
}
