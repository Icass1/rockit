import { getSession } from "next-auth/react";

export class WebSocketManager {
    static #instance: WebSocketManager;

    private webSocket?: WebSocket;

    private _init: boolean = false;

    private BACKEND_URL: string | undefined;

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
        this.BACKEND_URL = BACKEND_URL;
        if (this._init) return;
        const session = await getSession();

        this.webSocket = new WebSocket(
            `${BACKEND_URL}/ws?token=${session?.user.access_token}`
        );
        console.log(this.webSocket);
        this._init = true;
    }

    async reconnect() {
        if (!this.webSocket) return;

        if (this.webSocket.readyState != this.webSocket.CLOSED) {
            console.error("Trying to reconnect but websocket not closed.");
            return;
        }
        if (!this.BACKEND_URL) {
            console.error("BACKEND_URL is undefined.");
            return;
        }
        this._init = false;
        await this.init(this.BACKEND_URL);

        return await new Promise<boolean>((resolve, reject) => {
            if (!this.webSocket) {
                reject();
                return;
            }

            this.webSocket.onopen = () => {
                resolve(true);
            };
        });
    }

    async send(message: object) {
        if (!this.webSocket) return;

        if (this.webSocket.readyState == this.webSocket.CLOSED) {
            if (await this.reconnect())
                this.webSocket.send(JSON.stringify(message));
            return;
        }

        if (this.webSocket.readyState == this.webSocket.CONNECTING) {
            console.warn("Websocket is connecting.");
            return;
        }
        this.webSocket.send(JSON.stringify(message));
    }
}
