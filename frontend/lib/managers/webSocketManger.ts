import {
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    DownloadProgressMessageSchema,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    type DownloadProgressMessage,
} from "@/dto";
import { BACKEND_URL } from "@/environment";

export type WebSocketMessageType =
    | "download_progress"
    | "media_ended"
    | "current_media"
    | "current_queue"
    | "current_time"
    | "media_clicked"
    | "skip_clicked"
    | "seek";

export type WebSocketMessage = DownloadProgressMessage;

export class WebSocketManager {
    static #instance: WebSocketManager;

    private webSocket?: WebSocket;

    private _init: boolean = false;

    private _messageHandlers: Map<string, (message: WebSocketMessage) => void> =
        new Map();

    constructor() {
        if (typeof window === "undefined") return;
        if (WebSocketManager.#instance) {
            return WebSocketManager.#instance;
        }

        WebSocketManager.#instance = this;

        return WebSocketManager.#instance;
    }

    onMessage(type: string, handler: (message: WebSocketMessage) => void) {
        this._messageHandlers.set(type, handler);
    }

    async init() {
        if (this._init) return;

        this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);

        this.webSocket.onopen = () => {
            console.log("WebSocket connected");
        };

        this.webSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const parsed = DownloadProgressMessageSchema.parse(data);
                const message: WebSocketMessage = parsed;
                console.log(message);
                const handler = this._messageHandlers.get(message.type);
                if (handler) {
                    handler(message);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        this.webSocket.onclose = (event) => {
            console.log("WebSocket closed:", event.code, event.reason);
            this._init = false;
            this.attemptReconnect();
        };

        this.webSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this._init = true;
    }

    private async attemptReconnect() {
        const maxRetries = 5;
        let retries = 0;

        while (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
            if (this.webSocket?.readyState === WebSocket.OPEN) break;

            try {
                this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);
                this.webSocket.onopen = () => {
                    console.log("WebSocket reconnected");
                    this._init = true;
                };
                this.webSocket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const parsed =
                            DownloadProgressMessageSchema.parse(data);
                        const message: WebSocketMessage = parsed;
                        const handler = this._messageHandlers.get(message.type);
                        if (handler) {
                            handler(message);
                        }
                    } catch (error) {
                        console.error(
                            "Error parsing WebSocket message:",
                            error
                        );
                    }
                };
                this.webSocket.onclose = () => {
                    this._init = false;
                    this.attemptReconnect();
                };
                break;
            } catch (error) {
                console.error("Reconnection failed:", error);
                retries++;
            }
        }
    }

    async send(message: object) {
        if (!this.webSocket) {
            console.warn("WebSocket not initialized");
            return;
        }

        if (this.webSocket.readyState === WebSocket.CLOSED) {
            await this.init();
        }

        if (this.webSocket.readyState === WebSocket.CONNECTING) {
            await new Promise<void>((resolve) => {
                const checkConnection = setInterval(() => {
                    if (this.webSocket?.readyState === WebSocket.OPEN) {
                        clearInterval(checkConnection);
                        resolve();
                    }
                }, 100);
            });
        }

        this.webSocket.send(JSON.stringify(message));
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
