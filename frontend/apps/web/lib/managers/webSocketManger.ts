import { BACKEND_URL } from "@/environment";
import {
    EWebSocketMessage,
    TWebSocketIncomingMessage,
    type IWebSocketMessagePayloadMap,
    type WebSocketMessageHandler,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export class WebSocketManager {
    static #instance: WebSocketManager;

    private webSocket?: WebSocket;
    private _init = false;
    private _messageHandlers: Map<
        EWebSocketMessage,
        Set<WebSocketMessageHandler<EWebSocketMessage>>
    > = new Map();

    private _onMessageHandler = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data) as TWebSocketIncomingMessage;

            console.log({ data });

            const type = data.type as EWebSocketMessage;
            const handlers = this._messageHandlers.get(type);
            if (handlers) {
                console.log({ handlers });
                handlers.forEach((handler) =>
                    handler(data as IWebSocketMessagePayloadMap[typeof type])
                );
            }
        } catch (error) {
            console.warn("Error parsing WebSocket message:", error);
        }
    };

    constructor() {
        if (typeof window === "undefined") return;
        if (WebSocketManager.#instance) {
            return WebSocketManager.#instance;
        }

        WebSocketManager.#instance = this;

        return WebSocketManager.#instance;
    }

    onMessage<K extends EWebSocketMessage>(
        type: K,
        handler: WebSocketMessageHandler<K>
    ) {
        if (!this._messageHandlers.has(type)) {
            this._messageHandlers.set(type, new Set());
        }
        this._messageHandlers
            .get(type)!
            .add(handler as WebSocketMessageHandler<EWebSocketMessage>);
    }

    offMessage<K extends EWebSocketMessage>(
        type: K,
        handler: WebSocketMessageHandler<K>
    ) {
        this._messageHandlers
            .get(type)
            ?.delete(handler as WebSocketMessageHandler<EWebSocketMessage>);
    }

    async init() {
        if (this._init) return;

        this.attemptReconnect();
    }

    private async attemptReconnect() {
        const maxRetries = 5;
        let retries = 0;

        while (retries < maxRetries) {
            await new Promise((resolve) =>
                setTimeout(resolve, Math.max(2000 * retries, 2000))
            );
            if (this.webSocket?.readyState === WebSocket.OPEN) break;

            if (!rockIt.userManager.user) {
                continue;
            }

            try {
                this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);

                this.webSocket.onopen = () => {
                    this._init = true;
                };

                this.webSocket.onmessage = this._onMessageHandler;

                this.webSocket.onclose = () => {
                    this._init = false;
                    this.attemptReconnect();
                };

                break;
            } catch {
                retries++;
            }
        }
    }

    async send(message: object) {
        if (!this.webSocket) {
            await this.init();
        }

        if (this.webSocket?.readyState === WebSocket.CLOSED) {
            await this.init();
        }

        if (this.webSocket?.readyState === WebSocket.CONNECTING) {
            await new Promise<void>((resolve) => {
                const checkConnection = setInterval(() => {
                    if (this.webSocket?.readyState === WebSocket.OPEN) {
                        clearInterval(checkConnection);
                        resolve();
                    }
                }, 100);
            });
        }

        this.webSocket?.send(JSON.stringify(message));
    }

    sendMediaEnded(data: { mediaPublicId: string; queueMediaId: number }) {
        this.send({
            type: "media_ended",
            ...data,
        });
    }

    sendCurrentMedia(data: {
        mediaPublicId: string | null;
        queueMediaId: number;
    }) {
        this.send({
            type: "current_media",
            ...data,
        });
    }

    sendCurrentQueue(data: {
        queue: { publicId: string; queueMediaId: number }[];
        queueType: string;
    }) {
        this.send({
            type: "current_queue",
            ...data,
        });
    }

    sendCurrentTime(data: { currentTime: number }) {
        this.send({
            type: "current_time",
            ...data,
        });
    }

    sendMediaClicked(data: { mediaPublicId: string }) {
        this.send({
            type: "media_clicked",
            ...data,
        });
    }

    sendSkipClicked(data: { mediaPublicId: string; direction: string }) {
        this.send({
            type: "skip_clicked",
            ...data,
        });
    }

    sendSeek(data: {
        mediaPublicId: string;
        timeFrom: number;
        timeTo: number;
    }) {
        this.send({
            type: "seek",
            ...data,
        });
    }
}
