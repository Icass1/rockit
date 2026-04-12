import {
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    EEvent,
    EWebSocketMessage,
    EventManager,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    TWebSocketIncomingMessage,
    type DownloadProgressMessage,
    type IWebSocketMessagePayloadMap,
    type WebSocketMessageHandler,
} from "@rockit/shared";
import { BACKEND_URL, getSessionCookie } from "@/lib/api";

function getWsUrl(): string {
    const url = BACKEND_URL.replace(/^http:\/\//, "ws://").replace(
        /^https:\/\//,
        "wss://"
    );
    return `${url}/ws`;
}

export class WebSocketManager {
    private static _instance: WebSocketManager;

    private _webSocket?: WebSocket;
    private _init = false;
    private _connecting = false;
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
                handlers.forEach((handler) =>
                    handler(data as IWebSocketMessagePayloadMap[typeof type])
                );
            }

            if (type === EWebSocketMessage.DownloadProgress) {
                const msg = data as DownloadProgressMessage;
                const eventManager = EventManager.getInstance();
                if (msg.status === "completed") {
                    eventManager.dispatchEvent(EEvent.MediaDownloaded, {
                        publicId: msg.publicId,
                    });
                }
                eventManager.dispatchEvent(EEvent.MediaDownloadStatus, {
                    publicId: msg.publicId,
                    completed: msg.progress,
                    message: msg.message,
                });
            }
        } catch (error) {
            console.warn("Error parsing WebSocket message:", error);
        }
    };

    static getInstance(): WebSocketManager {
        if (!WebSocketManager._instance) {
            WebSocketManager._instance = new WebSocketManager();
        }
        return WebSocketManager._instance;
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
        if (this._init || this._connecting) return;

        this._attemptReconnect();
    }

    private async _attemptReconnect() {
        if (this._connecting) return;
        this._connecting = true;
        const maxRetries = 5;
        let retries = 0;

        while (retries < maxRetries) {
            await new Promise((resolve) =>
                setTimeout(resolve, Math.max(2000 * retries, 2000))
            );

            if (this._webSocket?.readyState === WebSocket.OPEN) break;

            const cookie = await getSessionCookie();
            if (!cookie) {
                continue;
            }

            try {
                this._webSocket = new WebSocket(getWsUrl());

                this._webSocket.onopen = () => {
                    this._init = true;
                    this._connecting = false;
                };

                this._webSocket.onmessage = this._onMessageHandler;

                this._webSocket.onclose = () => {
                    this._init = false;
                    this._connecting = false;
                    this._attemptReconnect();
                };

                break;
            } catch {
                retries++;
            }
        }
        this._connecting = false;
    }

    async send(message: object) {
        if (!this._webSocket) {
            await this.init();
        }

        if (this._webSocket?.readyState === WebSocket.CLOSED) {
            await this.init();
        }

        if (this._webSocket?.readyState === WebSocket.CONNECTING) {
            await new Promise<void>((resolve) => {
                const checkConnection = setInterval(() => {
                    if (this._webSocket?.readyState === WebSocket.OPEN) {
                        clearInterval(checkConnection);
                        resolve();
                    }
                }, 100);
            });
        }

        this._webSocket?.send(JSON.stringify(message));
    }

    sendMediaEnded(data: MediaEndedMessageRequest) {
        this.send({ type: "media_ended", ...data });
    }

    sendCurrentMedia(data: CurrentMediaMessageRequest) {
        this.send({ type: "current_media", ...data });
    }

    sendCurrentQueue(data: CurrentQueueMessageRequest) {
        this.send({ type: "current_queue", ...data });
    }

    sendCurrentTime(data: CurrentTimeMessageRequest) {
        this.send({ type: "current_time", ...data });
    }

    sendMediaClicked(data: MediaClickedMessageRequest) {
        this.send({ type: "media_clicked", ...data });
    }

    sendSkipClicked(data: SkipClickedMessageRequest) {
        this.send({ type: "skip_clicked", ...data });
    }

    sendSeek(data: SeekMessageRequest) {
        this.send({ type: "seek", ...data });
    }
}

export const webSocketManager = WebSocketManager.getInstance();
