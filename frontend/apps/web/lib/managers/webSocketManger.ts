import { BACKEND_URL } from "@/environment";
import {
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    EWebSocketMessage,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    QueueTypeRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    TWebSocketIncomingMessage,
    type IWebSocketMessagePayloadMap,
    type WebSocketMessageHandler,
} from "@rockit/shared";

export class WebSocketManager {
    static #instance: WebSocketManager;

    private webSocket?: WebSocket;
    private _init = false;
    private initializing = false;
    private _messageHandlers: Map<
        EWebSocketMessage,
        Set<WebSocketMessageHandler<EWebSocketMessage>>
    > = new Map();

    private _onMessageHandler = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data) as TWebSocketIncomingMessage;

            // console.log("WebSocketManager", { data });

            const type = data.type as EWebSocketMessage;
            const handlers = this._messageHandlers.get(type);
            if (handlers) {
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
        // console.log("WebSocketManager.#instance", WebSocketManager.#instance);
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

        // console.debug("WebSocketManager.init", this.webSocket);

        await this.attemptReconnect();
    }

    private async attemptReconnect() {
        const maxRetries = 5;
        let retries = 0;
        // console.debug("WebSocketManager.attemptReconnect", this.initializing);
        if (this.initializing) return;
        this.initializing = true;

        while (retries < maxRetries) {
            await new Promise((resolve) =>
                setTimeout(resolve, Math.max(2000 * retries, 2000))
            );
            if (this.webSocket?.readyState === WebSocket.OPEN) break;

            try {
                this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);

                this.webSocket.onopen = () => {
                    this.initializing = false;
                    this._init = true;
                };

                this.webSocket.onmessage = this._onMessageHandler;

                this.webSocket.onclose = () => {
                    this.initializing = false;
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
            // console.log("WebSocketManager.init() 2", message);
            await this.init();
        }

        if (this.webSocket?.readyState === WebSocket.CLOSED) {
            // console.log("WebSocketManager.init() 3");
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

        try {
            this.webSocket?.send(JSON.stringify(message));
        } catch (e) {
            console.error(
                `Error sending web socket message ${e}. Sending message ${message}`
            );
        }
    }

    sendMediaEnded(data: MediaEndedMessageRequest) {
        this.send({
            type: "media_ended",
            ...data,
        });
    }

    sendCurrentMedia(data: CurrentMediaMessageRequest) {
        this.send({
            type: "current_media",
            ...data,
        });
    }

    sendCurrentQueue(data: CurrentQueueMessageRequest) {
        this.send({
            type: "current_queue",
            ...data,
        });
    }

    sendQueueType(data: QueueTypeRequest) {
        this.send({
            type: "queue_type",
            ...data,
        });
    }

    sendCurrentTime(data: CurrentTimeMessageRequest) {
        this.send({
            type: "current_time",
            ...data,
        });
    }

    sendMediaClicked(data: MediaClickedMessageRequest) {
        this.send({
            type: "media_clicked",
            ...data,
        });
    }

    sendSkipClicked(data: SkipClickedMessageRequest) {
        this.send({
            type: "skip_clicked",
            ...data,
        });
    }

    sendSeek(data: SeekMessageRequest) {
        this.send({
            type: "seek",
            ...data,
        });
    }
}
