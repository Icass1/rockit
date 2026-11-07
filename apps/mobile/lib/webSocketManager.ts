import { createSocket } from "@/platform/socket";
import {
    BACKEND_URL,
    CurrentMediaMessageRequest,
    CurrentMediaMessageSchema,
    CurrentQueueMessageRequest,
    CurrentQueueMessageSchema,
    CurrentTimeMessageRequest,
    CurrentTimeMessageSchema,
    DownloadProgressMessageSchema,
    EEvent,
    EventManager,
    EWebSocketMessage,
    FriendActivityItemSchema,
    FriendsPresenceChangedMessageSchema,
    ListenTogetherSyncMessageSchema,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    MediaExpandedMessageRequest,
    NotificationStateMessageSchema,
    QueueTypeMessageSchema,
    QueueTypeRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    SocialSnapshotMessageSchema,
    TWebSocketIncomingMessage,
    type DownloadProgressMessage,
    type IWebSocketMessagePayloadMap,
    type MediaRemovedFromPlaylistMessage,
    type WebSocketMessageHandler,
} from "@rockit/shared";

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
    private _enabled = false;
    private _generation = 0;
    private _retryTimer?: ReturnType<typeof setTimeout>;
    private _latestPlaybackId = "";
    private _outgoingPlayback?: CurrentMediaMessageRequest;
    private _connecting = false;
    private _messageHandlers: Map<
        EWebSocketMessage,
        Set<WebSocketMessageHandler<EWebSocketMessage>>
    > = new Map();

    private _onMessageHandler = (event: MessageEvent) => {
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

            if (data.type === EWebSocketMessage.SocialChanged)
                data = SocialSnapshotMessageSchema.parse(data);
            else if (data.type === EWebSocketMessage.FriendActivity)
                data = {
                    type: "friend_activity",
                    ...FriendActivityItemSchema.parse(data),
                };
            else if (data.type === EWebSocketMessage.FriendsPresenceChanged)
                data = FriendsPresenceChangedMessageSchema.parse(data);
            else if (data.type === EWebSocketMessage.ListenTogetherSync)
                data = ListenTogetherSyncMessageSchema.parse(data);
            else if (data.type === EWebSocketMessage.CurrentQueue)
                data = CurrentQueueMessageSchema.parse(data);
            else if (data.type === EWebSocketMessage.DownloadProgress)
                data = DownloadProgressMessageSchema.parse(data);
            else if (data.type === EWebSocketMessage.QueueType)
                data = QueueTypeMessageSchema.parse(data);

            if (data.type === EWebSocketMessage.NotificationState)
                data = NotificationStateMessageSchema.parse(data);

            const type = data.type as EWebSocketMessage;
            const handlers = this._messageHandlers.get(type);
            if (handlers) {
                handlers.forEach((handler) =>
                    handler(data as IWebSocketMessagePayloadMap[typeof type])
                );
            }

            if (type === EWebSocketMessage.MediaRemovedFromPlaylist) {
                const msg = data as MediaRemovedFromPlaylistMessage;
                EventManager.getInstance().dispatchEvent(
                    EEvent.MediaRemovedFromPlaylist,
                    {
                        publicId: msg.publicId,
                        playlistPublicId: msg.playlistPublicId,
                    }
                );
            }

            if (type === EWebSocketMessage.DownloadProgress) {
                const msg = data as DownloadProgressMessage;
                const eventManager = EventManager.getInstance();
                if (msg.status === "COMPLETED") {
                    eventManager.dispatchEvent(EEvent.MediaDownloaded, {
                        publicId: msg.mediaPublicId,
                    });
                }
                eventManager.dispatchEvent(EEvent.MediaDownloadStatus, {
                    publicId: msg.mediaPublicId,
                    completed: msg.progress,
                    message: msg.status,
                });
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
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

    async init(): Promise<void> {
        this._enabled = true;
        if (!this._connecting && !this.isConnected) await this._connect();
    }

    stop(): void {
        this._enabled = false;
        this._generation++;
        this._connecting = false;
        clearTimeout(this._retryTimer);
        this._retryTimer = undefined;
        const socket = this._webSocket;
        this._webSocket = undefined;
        if (socket) {
            socket.onopen =
                socket.onclose =
                socket.onerror =
                socket.onmessage =
                    null;
            socket.close();
        }
        this._latestPlaybackId = "";
        this._outgoingPlayback = undefined;
    }

    private _retry(generation: number): void {
        if (!this._enabled || generation !== this._generation) return;
        clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(() => void this._connect(), 2000);
    }

    private async _connect(): Promise<void> {
        if (!this._enabled || this._connecting || this.isConnected) return;
        this._connecting = true;
        const generation = this._generation;
        try {
            const socket = await createSocket(getWsUrl());
            if (!this._enabled || generation !== this._generation) {
                socket?.close();
                return;
            }
            if (!socket) {
                this._connecting = false;
                this._retry(generation);
                return;
            }
            this._webSocket = socket;
            socket.onopen = () => {
                if (generation !== this._generation) return;
                this._connecting = false;
                if (this._outgoingPlayback)
                    this.sendCurrentMedia(this._outgoingPlayback);
                else this.requestPlaybackState();
            };
            socket.onmessage = this._onMessageHandler;
            socket.onclose = () => {
                if (generation !== this._generation) return;
                this._connecting = false;
                this._webSocket = undefined;
                this._retry(generation);
            };
            socket.onerror = () => socket.close();
        } catch {
            if (generation !== this._generation) return;
            this._connecting = false;
            this._retry(generation);
        }
    }

    get isConnected(): boolean {
        return this._webSocket?.readyState === WebSocket.OPEN;
    }

    private _isOpen(): boolean {
        return this._webSocket?.readyState === WebSocket.OPEN;
    }

    requestPlaybackState(): void {
        void this.send({ type: "playback_state" });
    }

    async send(message: object): Promise<void> {
        if (!this._enabled) return;
        const generation = this._generation;
        if (this._webSocket?.readyState !== WebSocket.OPEN) {
            await this._connect();
            const deadline = Date.now() + 10000;
            while (
                this._enabled &&
                generation === this._generation &&
                !this._isOpen() &&
                Date.now() < deadline
            ) {
                await new Promise<void>((resolve) => setTimeout(resolve, 100));
            }
        }
        if (
            !this._enabled ||
            generation !== this._generation ||
            !this._isOpen()
        )
            return;
        const playbackId = (message as Partial<CurrentTimeMessageRequest>)
            .playbackId;
        if (playbackId && playbackId !== this._latestPlaybackId) return;
        try {
            this._webSocket?.send(JSON.stringify(message));
        } catch (error) {
            console.error("Error sending WebSocket message", error);
        }
    }

    sendMediaEnded(data: MediaEndedMessageRequest) {
        this.send({ type: "media_ended", ...data });
    }

    sendCurrentMedia(data: CurrentMediaMessageRequest) {
        this._latestPlaybackId = data.playbackId;
        this._outgoingPlayback = { ...data };
        this.send({ type: "current_media", ...data });
    }

    sendCurrentQueue(data: CurrentQueueMessageRequest) {
        this.send({ type: "current_queue", ...data });
    }

    sendCurrentTime(data: CurrentTimeMessageRequest) {
        if (this._outgoingPlayback?.playbackId === data.playbackId) {
            this._outgoingPlayback.currentTimeMs = data.currentTimeMs;
        }
        if (this._webSocket?.readyState !== WebSocket.OPEN) return;
        this.send({ type: "current_time", ...data });
    }

    sendMediaClicked(data: MediaClickedMessageRequest) {
        this.send({ type: "media_clicked", ...data });
    }

    sendQueueType(data: QueueTypeRequest) {
        this.send({ type: "queue_type", ...data });
    }

    sendSkipClicked(data: SkipClickedMessageRequest) {
        this.send({ type: "skip_clicked", ...data });
    }

    sendSeek(data: SeekMessageRequest) {
        this.send({ type: "seek", ...data });
    }

    sendMediaExpanded(data: MediaExpandedMessageRequest) {
        this.send({ type: "media_expanded", ...data });
    }
}

export const webSocketManager = WebSocketManager.getInstance();
