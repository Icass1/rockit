import { BACKEND_URL } from "@/environment";
import {
    CurrentMediaMessageRequest,
    CurrentMediaMessageSchema,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    CurrentTimeMessageSchema,
    EWebSocketMessage,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    MediaExpandedMessageRequest,
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
    private _latestPlaybackId = "";
    private _outgoingPlayback?: CurrentMediaMessageRequest;
    private initializing = false;
    private _connectionGeneration = 0;
    private _messageHandlers: Map<
        EWebSocketMessage,
        Set<WebSocketMessageHandler<EWebSocketMessage>>
    > = new Map();

    private _onMessageHandler = (event: MessageEvent): void => {
        try {
            let data = JSON.parse(event.data) as TWebSocketIncomingMessage;
            if (data.type === EWebSocketMessage.CurrentMedia) {
                data = CurrentMediaMessageSchema.parse(data);
                if (this._outgoingPlayback?.playbackId !== data.playbackId) {
                    this._outgoingPlayback = undefined;
                }
                this._latestPlaybackId = data.playbackId;
            } else if (data.type === EWebSocketMessage.CurrentTime) {
                data = CurrentTimeMessageSchema.parse(data);
                if (!this._latestPlaybackId)
                    this._latestPlaybackId = data.playbackId;
            }

            const type = data.type as EWebSocketMessage;
            const handlers = this._messageHandlers.get(type);
            if (handlers) {
                handlers.forEach((handler): void =>
                    handler(data as IWebSocketMessagePayloadMap[typeof type])
                );
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
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
    ): void {
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
    ): void {
        this._messageHandlers
            .get(type)
            ?.delete(handler as WebSocketMessageHandler<EWebSocketMessage>);
    }

    async init(): Promise<void> {
        if (this._init) return;

        // console.debug("WebSocketManager.init", this.webSocket);

        await this.attemptReconnect();
    }

    async reconnectAsync(): Promise<void> {
        this._connectionGeneration++;
        const previousSocket = this.webSocket;
        this.webSocket = undefined;
        this._init = false;
        this.initializing = false;
        this._latestPlaybackId = "";
        this._outgoingPlayback = undefined;
        previousSocket?.close();
        await this.init();
    }

    private async attemptReconnect(): Promise<void> {
        const maxRetries = 5;
        let retries = 0;
        // console.debug("WebSocketManager.attemptReconnect", this.initializing);
        if (this.initializing) return;
        this.initializing = true;
        const generation = this._connectionGeneration;

        while (retries < maxRetries) {
            await new Promise(
                (resolve): NodeJS.Timeout =>
                    setTimeout(resolve, Math.max(2000 * retries, 2000))
            );
            if (generation !== this._connectionGeneration) return;
            if (this.webSocket?.readyState === WebSocket.OPEN) break;

            try {
                this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);

                this.webSocket.onopen = (): void => {
                    if (generation !== this._connectionGeneration) return;
                    this.initializing = false;
                    this._init = true;
                    if (this._outgoingPlayback) {
                        this.sendCurrentMedia(this._outgoingPlayback);
                    } else {
                        this.requestPlaybackState();
                    }
                };

                this.webSocket.onmessage = (event): void => {
                    if (generation !== this._connectionGeneration) return;
                    this._onMessageHandler(event);
                };

                this.webSocket.onclose = (): void => {
                    if (generation !== this._connectionGeneration) return;
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

    get isConnected(): boolean {
        return this.webSocket?.readyState === WebSocket.OPEN;
    }

    private _isOpen(): boolean {
        return this.webSocket?.readyState === WebSocket.OPEN;
    }

    requestPlaybackState(): void {
        void this.send({ type: "playback_state" });
    }

    async send(message: object): Promise<void> {
        if (this.webSocket?.readyState !== WebSocket.OPEN) {
            await this.init();
            const deadline = Date.now() + 10000;
            while (!this._isOpen() && Date.now() < deadline) {
                await new Promise<void>((resolve) => setTimeout(resolve, 100));
            }
        }
        if (this.webSocket?.readyState !== WebSocket.OPEN) return;
        const playbackId = (message as Partial<CurrentTimeMessageRequest>)
            .playbackId;
        if (playbackId && playbackId !== this._latestPlaybackId) return;
        try {
            this.webSocket?.send(JSON.stringify(message));
        } catch (error) {
            console.error("Error sending WebSocket message", error);
        }
    }

    sendMediaEnded(data: MediaEndedMessageRequest): void {
        this.send({
            type: "media_ended",
            ...data,
        });
    }

    sendCurrentMedia(data: CurrentMediaMessageRequest): void {
        this._latestPlaybackId = data.playbackId;
        this._outgoingPlayback = { ...data };
        this.send({
            type: "current_media",
            ...data,
        });
    }

    sendCurrentQueue(data: CurrentQueueMessageRequest): void {
        this.send({
            type: "current_queue",
            ...data,
        });
    }

    sendQueueType(data: QueueTypeRequest): void {
        this.send({
            type: "queue_type",
            ...data,
        });
    }

    sendCurrentTime(data: CurrentTimeMessageRequest): void {
        if (this._outgoingPlayback?.playbackId === data.playbackId) {
            this._outgoingPlayback.currentTimeMs = data.currentTimeMs;
        }
        if (this.webSocket?.readyState !== WebSocket.OPEN) return;
        this.send({
            type: "current_time",
            ...data,
        });
    }

    sendMediaClicked(data: MediaClickedMessageRequest): void {
        this.send({
            type: "media_clicked",
            ...data,
        });
    }

    sendMediaExpanded(data: MediaExpandedMessageRequest): void {
        this.send({
            type: "media_expanded",
            ...data,
        });
    }

    sendSkipClicked(data: SkipClickedMessageRequest): void {
        this.send({
            type: "skip_clicked",
            ...data,
        });
    }

    sendSeek(data: SeekMessageRequest): void {
        this.send({
            type: "seek",
            ...data,
        });
    }
}
