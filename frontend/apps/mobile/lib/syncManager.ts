import {
    addPendingMessage,
    clearSyncedMessages,
    getUnsyncedMessages,
    markMessagesSynced,
} from "./database/access/pendingAccess";
import {
    addMediaListened,
    getUnsyncedMediaListened,
    markMediaListenedSynced,
} from "./database/access/statsAccess";
import { webSocketManager } from "./webSocketManager";

const MEDIA_LISTENED_THRESHOLD_MS = 30000;

class SyncManager {
    private static _instance: SyncManager;
    private _online = false;
    private _initialized = false;
    private _flushing = false;

    static getInstance(): SyncManager {
        if (!SyncManager._instance) {
            SyncManager._instance = new SyncManager();
        }
        return SyncManager._instance;
    }

    async init(): Promise<void> {
        if (this._initialized) return;
        console.log("SyncManager.init");
        this._initialized = true;
    }

    setOnline(online: boolean): void {
        const wasOffline = !this._online;
        this._online = online;
        console.log("SyncManager.setOnline", { online, wasOffline });
        if (wasOffline && online) {
            this.flushPendingMessages();
        }
    }

    isOnline(): boolean {
        return this._online;
    }

    async sendMediaEnded(
        mediaPublicId: string,
        durationMs: number
    ): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            duration_ms: durationMs,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendMediaEnded(payload as any);
        } else {
            await addPendingMessage("media_ended", payload);
        }
    }

    async sendMediaClicked(mediaPublicId: string): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendMediaClicked(payload as any);
        } else {
            await addPendingMessage("media_clicked", payload);
        }
    }

    async sendCurrentMedia(
        mediaPublicId: string | null,
        queuePublicId: string | null
    ): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            queue_public_id: queuePublicId,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendCurrentMedia(payload as any);
        } else {
            await addPendingMessage("current_media", payload);
        }
    }

    async sendCurrentQueue(mediaPublicIds: string[]): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            queue: mediaPublicIds,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendCurrentQueue(payload as any);
        } else {
            await addPendingMessage("current_queue", payload);
        }
    }

    async sendCurrentTime(
        mediaPublicId: string | null,
        currentTimeMs: number
    ): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            current_time_ms: currentTimeMs,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendCurrentTime(payload as any);
        } else {
            await addPendingMessage("current_time", payload);
        }
    }

    async sendSeek(
        mediaPublicId: string,
        currentTimeMs: number
    ): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            current_time_ms: currentTimeMs,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendSeek(payload as any);
        } else {
            await addPendingMessage("seek", payload);
        }
    }

    async sendSkipClicked(
        mediaPublicId: string,
        direction: "next" | "previous"
    ): Promise<void> {
        const timestamp = Date.now();
        const payload = {
            media_public_id: mediaPublicId,
            direction,
            timestamp_ms: timestamp,
        };

        if (this._online) {
            webSocketManager.sendSkipClicked(payload as any);
        } else {
            await addPendingMessage("skip", payload);
        }
    }

    async recordMediaListened(
        userId: number,
        mediaPublicId: string,
        durationMs: number
    ): Promise<void> {
        const timestamp = Date.now();

        if (durationMs < MEDIA_LISTENED_THRESHOLD_MS) {
            return;
        }

        if (this._online) {
            webSocketManager.sendMediaEnded({
                media_public_id: mediaPublicId,
                duration_ms: durationMs,
            } as any);
        } else {
            await addMediaListened({
                userId,
                mediaPublicId,
                durationMs,
                listenedAt: timestamp,
            });
        }
    }

    async flushPendingMessages(): Promise<void> {
        if (!this._online || this._flushing) return;
        this._flushing = true;
        console.log("SyncManager.flushPendingMessages");

        try {
            const messages = await getUnsyncedMessages();
            console.log(
                "SyncManager.flushPendingMessages messages",
                messages.length
            );

            if (messages.length === 0) {
                this._flushing = false;
                return;
            }

            const messageIds: number[] = [];
            for (const msg of messages) {
                try {
                    const payload = JSON.parse(msg.payload);

                    switch (msg.type) {
                        case "media_ended":
                            webSocketManager.sendMediaEnded(payload as any);
                            break;
                        case "media_clicked":
                            webSocketManager.sendMediaClicked(payload as any);
                            break;
                        case "current_media":
                            webSocketManager.sendCurrentMedia(payload as any);
                            break;
                        case "current_queue":
                            webSocketManager.sendCurrentQueue(payload as any);
                            break;
                        case "current_time":
                            webSocketManager.sendCurrentTime(payload as any);
                            break;
                        case "seek":
                            webSocketManager.sendSeek(payload as any);
                            break;
                        case "skip":
                            webSocketManager.sendSkipClicked(payload as any);
                            break;
                    }
                    messageIds.push(msg.id);
                } catch (e) {
                    console.warn("SyncManager.flushPendingMessages error", e);
                }
            }

            if (messageIds.length > 0) {
                await markMessagesSynced(messageIds);
                const dayAgo = Math.floor(Date.now() / 1000) - 86400;
                await clearSyncedMessages(dayAgo);
            }
        } catch (e) {
            console.warn("SyncManager.flushPendingMessages failed", e);
        } finally {
            this._flushing = false;
        }
    }

    async flushMediaListened(userId: number): Promise<void> {
        if (!this._online) return;

        try {
            const listened = await getUnsyncedMediaListened(userId);
            console.log("SyncManager.flushMediaListened", listened.length);

            for (const item of listened) {
                webSocketManager.sendMediaEnded({
                    media_public_id: item.mediaPublicId,
                    duration_ms: item.durationMs,
                } as any);
            }

            if (listened.length > 0) {
                await markMediaListenedSynced(listened.map((l) => l.id));
            }
        } catch (e) {
            console.warn("SyncManager.flushMediaListened failed", e);
        }
    }
}

export const syncManager = SyncManager.getInstance();
