import { BACKEND_URL } from "@/environment";
import {
    CurrentMediaMessageRequest,
    CurrentMediaMessageSchema,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    CurrentTimeMessageSchema,
    EWebSocketMessage,
    FriendsPresenceChangedMessageSchema,
    ListenTogetherSyncMessageSchema,
    MediaClickedMessageRequest,
    MediaEndedMessageRequest,
    MediaExpandedMessageRequest,
    OnlineUsersMessageSchema,
    QueueTypeRequest,
    SeekMessageRequest,
    SkipClickedMessageRequest,
    TWebSocketIncomingMessage,
    type IWebSocketMessagePayloadMap,
    type WebSocketMessageHandler,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

export class WebSocketManager {
    private _onlineUsers = createAtom<number | undefined>();

    get onlineUsersAtom(): ReadonlyAtom<number | undefined> {
        return this._onlineUsers.getReadonlyAtom();
    }

    private webSocket?: WebSocket;
    private active = false;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private retryCount = 0;
    private connectionWaiters = new Set<() => void>();
    private _latestPlaybackId = "";
    private _outgoingPlayback?: CurrentMediaMessageRequest;
    private _supersededPlaybackIds = new Set<string>();
    private _connectionGeneration = 0;
    private _messageHandlers: Map<
        EWebSocketMessage,
        Set<WebSocketMessageHandler<EWebSocketMessage>>
    > = new Map();

    private _onMessageHandler = (event: MessageEvent): void => {
        try {
            let data = JSON.parse(event.data) as TWebSocketIncomingMessage;
            if (data.type === EWebSocketMessage.OnlineUsers) {
                data = OnlineUsersMessageSchema.parse(data);
                if (!Number.isInteger(data.count) || data.count < 0)
                    throw new Error("Invalid online user count");
                this._onlineUsers.set(data.count);
            } else if (data.type === EWebSocketMessage.FriendsPresenceChanged) {
                data = FriendsPresenceChangedMessageSchema.parse(data);
            } else if (data.type === EWebSocketMessage.ListenTogetherSync) {
                data = ListenTogetherSyncMessageSchema.parse(data);
            } else if (data.type === EWebSocketMessage.CurrentMedia) {
                data = CurrentMediaMessageSchema.parse(data);
                // An earlier local selection may be acknowledged after another skip.
                // Drop it before either the queue or the player sees it.
                if (this._supersededPlaybackIds.has(data.playbackId)) return;
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

    constructor(
        private readonly isAuthenticated: () => boolean = () =>
            rockIt.userManager.loggedInAtom.get()
    ) {}

    /** Only the mounted application lifecycle may enable connections. */
    start(): void {
        if (this.active) return;
        this.active = true;
        void this.init();
    }

    stop(): void {
        this.active = false;
        this.disconnect();
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
        if (
            !this.active ||
            !this.isAuthenticated() ||
            this.webSocket ||
            this.reconnectTimer !== undefined
        )
            return;
        this.connect();
    }

    async reconnectAsync(): Promise<void> {
        this.disconnect();
        await this.init();
    }

    disconnect(): void {
        this._connectionGeneration++;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
        this.retryCount = 0;
        this._onlineUsers.set(undefined);
        const previousSocket = this.webSocket;
        this.webSocket = undefined;
        this._latestPlaybackId = "";
        this._outgoingPlayback = undefined;
        this._supersededPlaybackIds.clear();
        if (previousSocket) {
            previousSocket.onopen = null;
            previousSocket.onmessage = null;
            previousSocket.onclose = null;
            previousSocket.onerror = null;
            previousSocket.close();
        }
        this.releaseConnectionWaiters();
    }

    private connect(): void {
        const generation = this._connectionGeneration;
        try {
            const socket = new WebSocket(`${BACKEND_URL}/ws`);
            this.webSocket = socket;
            const isCurrent = (): boolean =>
                this.active &&
                this.isAuthenticated() &&
                generation === this._connectionGeneration &&
                socket === this.webSocket;

            socket.onopen = (): void => {
                if (!isCurrent()) return;
                this.retryCount = 0;
                if (this._outgoingPlayback) {
                    // Replace the pending object so its suspended send cannot
                    // duplicate this replay when connection waiters resume.
                    this.sendCurrentMedia(this._outgoingPlayback);
                } else {
                    this.requestPlaybackState();
                }
                this.releaseConnectionWaiters();
            };
            socket.onmessage = (event): void => {
                if (isCurrent()) this._onMessageHandler(event);
            };
            socket.onclose = (): void => {
                if (!isCurrent()) return;
                this.webSocket = undefined;
                this._onlineUsers.set(undefined);
                this.scheduleReconnect();
            };
        } catch {
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (!this.active || !this.isAuthenticated()) return;
        const generation = this._connectionGeneration;
        const delay = Math.min(2000 * ++this.retryCount, 10000);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (generation === this._connectionGeneration) void this.init();
        }, delay);
    }

    private releaseConnectionWaiters(): void {
        for (const finish of this.connectionWaiters) finish();
    }

    private waitForConnection(): Promise<void> {
        return new Promise((resolve) => {
            const finish = (): void => {
                clearTimeout(timer);
                this.connectionWaiters.delete(finish);
                resolve();
            };
            const timer = setTimeout(finish, 10000);
            this.connectionWaiters.add(finish);
        });
    }

    get isConnected(): boolean {
        return this.webSocket?.readyState === WebSocket.OPEN;
    }

    requestPlaybackState(): void {
        void this.send({ type: "playback_state" });
    }

    async send(message: object): Promise<void> {
        if (!this.active || !this.isAuthenticated()) return;
        const generation = this._connectionGeneration;
        if (!this.isConnected) {
            await this.init();
            if (generation !== this._connectionGeneration || !this.active)
                return;
            if (!this.isConnected) await this.waitForConnection();
        }
        if (
            generation !== this._connectionGeneration ||
            !this.active ||
            !this.isAuthenticated() ||
            !this.isConnected
        )
            return;
        // Opening sockets replay the latest selection before releasing waiters.
        if (
            (message as { type?: string }).type === "current_media" &&
            message !== this._outgoingPlayback
        )
            return;
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
        if (
            this._outgoingPlayback &&
            this._outgoingPlayback.playbackId !== data.playbackId
        ) {
            this._supersededPlaybackIds.add(this._outgoingPlayback.playbackId);
        }
        this._latestPlaybackId = data.playbackId;
        const outgoing = { ...data, type: "current_media" as const };
        this._outgoingPlayback = outgoing;
        void this.send(outgoing);
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
