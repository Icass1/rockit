import {
    BACKEND_URL,
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    DownloadProgressMessageSchema,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    TestWebSocketMessageSchema,
} from "@rockit/shared";
import { TWebSocketMessages } from "@/models/types/webSocketMessages";
import { rockIt } from "@/lib/rockit/rockIt";

export class WebSocketManager {
    static #instance: WebSocketManager;

    private webSocket?: WebSocket;
    private _init = false;
    private _messageHandlers: Map<
        string,
        ((message: TWebSocketMessages) => void)[]
    > = new Map();

    private _onMessageHandler = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data) as TWebSocketMessages;

            let parsed: TWebSocketMessages | undefined = undefined;

            switch (data.type) {
                case "download_progress":
                    parsed = DownloadProgressMessageSchema.parse(data);
                    break;
                case "test_web_socket_message":
                    parsed = TestWebSocketMessageSchema.parse(data);
                    break;
                default:
                    console.warn(
                        `Received unkown type '${data}' from web socket.`
                    );
                    return;
            }
            if (!parsed) {
                console.warn(`Parsed message is undefined ${parsed}`);
                return;
            }

            const handlers = this._messageHandlers.get(parsed.type);
            if (handlers) {
                handlers.map((handler) => handler(parsed));
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

    onMessage(type: string, handler: (message: TWebSocketMessages) => void) {
        console.log(
            "WebSocketManager.onMessage",
            type,
            handler,
            this._messageHandlers
        );
        const typeHandlers = this._messageHandlers.get(type);
        if (typeHandlers) typeHandlers.push(handler);
        else this._messageHandlers.set(type, [handler]);
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
