import {
    EWebSocketMessage,
    isQueueable,
    type WebSocketMessageHandler,
} from "@rockit/shared";
import type { ListenSession } from "@/models/interfaces";
import type { ListenTogetherServices } from "@/models/interfaces/listenTogetherServices";
import type { ListenTogetherQueueSnapshot } from "@/models/interfaces/listenTogetherState";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class ListenTogetherManager {
    private _sessionsAtom = createArrayAtom<ListenSession>([]);
    private _activeSessionAtom = createAtom<ListenSession | null>(null);
    private _loadingAtom = createAtom(false);
    private _active = false;
    private _username?: string;
    private _generation = 0;
    private _playbackRevision = 0;
    private _unsubscribers: (() => void)[] = [];
    private _timer?: ReturnType<typeof setInterval>;
    private _syncing?: object;
    private _applying?: object;
    private _joinedId: string | null = null;
    private _snapshot?: ListenTogetherQueueSnapshot;
    private _lastPublished = "";
    private _remotePlaybackState = "";
    private _lastPublishTime = 0;

    constructor(private readonly dependencies?: ListenTogetherServices) {}

    private get services(): ListenTogetherServices {
        return this.dependencies ?? rockIt;
    }

    private isCurrent(generation: number): boolean {
        return (
            this._active && !!this._username && generation === this._generation
        );
    }

    get isHost(): boolean {
        return (
            !!this._username &&
            this._activeSessionAtom.get()?.hostUsername === this._username
        );
    }

    start(): void {
        if (typeof window === "undefined" || this._active) return;
        this._active = true;
        const {
            userManager,
            webSocketManager,
            mediaPlayerManager,
            queueManager,
        } = this.services;
        webSocketManager.onMessage(
            EWebSocketMessage.ListenTogetherSync,
            this._handleSessions
        );
        this._unsubscribers = [
            userManager.sessionAtom.subscribe((session) => {
                if (session?.username !== this._username)
                    this.reset(session?.username);
            }),
            mediaPlayerManager.playingAtom.listen(() => {
                void this.publish();
            }),
            mediaPlayerManager.currentTimeAtom.listen((time, oldTime) => {
                void this.publish(Math.abs(time - oldTime) > 1.5);
            }),
            queueManager.currentMediaAtom.listen(() => {
                void this.publish();
            }),
        ];
        document.addEventListener("visibilitychange", this._handleVisibility);
        // Publish host heartbeats and stop stale guest playback without polling sessions.
        this._timer = setInterval(this._tick, 1000);
    }

    stop(): void {
        if (!this._active) return;
        this._active = false;
        for (const unsubscribe of this._unsubscribers) unsubscribe();
        this._unsubscribers = [];
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.ListenTogetherSync,
            this._handleSessions
        );
        document.removeEventListener(
            "visibilitychange",
            this._handleVisibility
        );
        clearInterval(this._timer);
        this._timer = undefined;
        this.reset();
    }

    private reset(username?: string): void {
        const wasFollowing = this._joinedId !== null;
        this._username = username;
        this._generation++;
        this._playbackRevision++;
        this._joinedId = null;
        this._snapshot = undefined;
        this._syncing = undefined;
        this._applying = undefined;
        this._lastPublished = "";
        this._lastPublishTime = 0;
        this._remotePlaybackState = "";
        this._activeSessionAtom.set(null);
        this._sessionsAtom.set([]);
        this._loadingAtom.set(false);
        // Never restore one account's queue into its replacement.
        if (wasFollowing) this.services.mediaPlayerManager.pause();
    }

    private _handleSessions: WebSocketMessageHandler<EWebSocketMessage.ListenTogetherSync> =
        (message) => {
            void this.updateSessions(message.sessions);
        };

    private _handleVisibility = (): void => {
        if (!document.hidden) void this.publish(true);
    };

    private _tick = (): void => {
        if (!this.isCurrent(this._generation)) return;
        const sessions = this._sessionsAtom.get();
        const now = Date.now();
        const unexpired = sessions.filter(
            (session) =>
                now - Date.parse(session.updatedAt) <
                (session.status === "invited" ? 86400000 : 120000)
        );
        if (unexpired.length !== sessions.length)
            void this.updateSessions(unexpired);
        const active = this._activeSessionAtom.get();
        if (
            active &&
            active.guestUsername === this._username &&
            now - Date.parse(active.updatedAt) >= 20000
        ) {
            void this.apply(active);
        }
        void this.publish();
    };

    private async updateSessions(sessions: ListenSession[]): Promise<void> {
        if (!this.isCurrent(this._generation)) return;
        this._sessionsAtom.set(
            sessions.filter(
                (session) =>
                    session.hostUsername === this._username ||
                    session.guestUsername === this._username
            )
        );
        const username = this._username;
        const selected =
            this._sessionsAtom
                .get()
                .find((s) => s.publicId === this._joinedId) ??
            this._sessionsAtom.get().find((s) => s.hostUsername === username);
        if (!selected) {
            this.stopFollowing();
            return;
        }
        const previous = this._activeSessionAtom.get();
        if (previous?.publicId !== selected.publicId) {
            this._syncing = undefined;
            this._lastPublished = "";
            this._lastPublishTime = 0;
        }
        this._activeSessionAtom.set(selected);
        if (selected.hostUsername === username) {
            if (previous?.publicId !== selected.publicId)
                void this.publish(true);
        } else if (
            selected.status === "active" &&
            this._joinedId === selected.publicId
        ) {
            await this.apply(selected);
        }
    }

    async invite(userPublicId: string): Promise<boolean> {
        return this.mutate(async (generation) => {
            const res = await Http.inviteToSession({ userPublicId });
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.publish(true);
            return this.isCurrent(generation);
        });
    }

    async join(sessionPublicId: string): Promise<boolean> {
        return this.mutate(async (generation) => {
            const res = await Http.joinSession({ sessionPublicId });
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            this._playbackRevision++;
            this._snapshot ??=
                this.services.queueManager.captureListeningQueue();
            this._joinedId = sessionPublicId;
            const sessions = this._sessionsAtom.get();
            if (
                sessions.some((session) => session.publicId === sessionPublicId)
            ) {
                await this.updateSessions(sessions);
            }
            return this.isCurrent(generation);
        });
    }

    async leave(sessionPublicId: string): Promise<boolean> {
        const revision = this._playbackRevision;
        return this.mutate(async (generation) => {
            const res = await Http.leaveSession({ sessionPublicId });
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            if (
                revision === this._playbackRevision &&
                (this._joinedId === sessionPublicId ||
                    this._activeSessionAtom.get()?.publicId === sessionPublicId)
            ) {
                this.stopFollowing();
            }
            return true;
        });
    }

    private async mutate(
        action: (generation: number) => Promise<boolean>
    ): Promise<boolean> {
        const generation = this._generation;
        if (!this.isCurrent(generation) || this._loadingAtom.get())
            return false;
        this._loadingAtom.set(true);
        try {
            return await action(generation);
        } catch (error) {
            if (this.isCurrent(generation)) this.showError(error);
            return false;
        } finally {
            if (this.isCurrent(generation)) this._loadingAtom.set(false);
        }
    }

    private async publish(force = false): Promise<void> {
        const session = this._activeSessionAtom.get();
        if (
            !this.isCurrent(this._generation) ||
            !session ||
            !this.isHost ||
            this._syncing ||
            !this.services.mediaPlayerManager.isPlaybackOwner
        )
            return;
        const player = this.services.mediaPlayerManager;
        const media = this.services.queueManager.currentMedia;
        const state = `${session.publicId}:${media?.publicId}:${player.playingAtom.get()}`;
        const now = Date.now();
        if (
            !force &&
            state === this._lastPublished &&
            now - this._lastPublishTime < 5000
        )
            return;
        const generation = this._generation;
        const token = (this._syncing = {});
        try {
            const res = await Http.syncSession({
                sessionPublicId: session.publicId,
                mediaPublicId: media?.publicId ?? null,
                currentTimeMs: Math.max(
                    0,
                    Math.round(player.currentTime * 1000)
                ),
                isPlaying: player.playingAtom.get(),
                queue: null,
            });
            if (
                !this.isCurrent(generation) ||
                this._syncing !== token ||
                this._activeSessionAtom.get()?.publicId !== session.publicId
            )
                return;
            if (res.isOk()) {
                this._lastPublished = state;
                this._lastPublishTime = now;
            } else {
                console.error("Session sync rejected", res.detail);
            }
        } catch (error) {
            if (this.isCurrent(generation) && this._syncing === token)
                console.error("Session sync failed", error);
        } finally {
            if (this._syncing === token) this._syncing = undefined;
        }
    }

    private async apply(session: ListenSession): Promise<void> {
        const generation = this._generation;
        const revision = this._playbackRevision;
        if (
            !this.isCurrent(generation) ||
            this._applying ||
            this._joinedId !== session.publicId
        )
            return;
        const media = session.currentMedia?.media;
        if (!media || !isQueueable(media)) {
            this.services.mediaPlayerManager.pause();
            this._remotePlaybackState = "";
            return;
        }
        const token = (this._applying = {});
        try {
            const queue = this.services.queueManager;
            const player = this.services.mediaPlayerManager;
            if (queue.currentMedia?.publicId !== media.publicId) {
                player.pause();
                queue.setMedia([media], "");
                queue.moveToMedia(media.publicId);
                await player.setMedia();
            }
            if (
                !this.isCurrent(generation) ||
                revision !== this._playbackRevision ||
                this._joinedId !== session.publicId ||
                this._activeSessionAtom.get() !== session
            )
                return;
            // Cap extrapolation when a host disappears instead of seeking indefinitely.
            const elapsed = session.isPlaying
                ? Math.min(
                      6000,
                      Math.max(0, Date.now() - Date.parse(session.updatedAt))
                  )
                : 0;
            const position = (session.currentTimeMs + elapsed) / 1000;
            if (Math.abs(player.currentTime - position) > 1.5)
                player.setCurrentTime(position);
            const shouldPlay =
                session.isPlaying &&
                Date.now() - Date.parse(session.updatedAt) < 20000;
            const remoteState = `${session.publicId}:${media.publicId}:${shouldPlay}`;
            if (remoteState !== this._remotePlaybackState) {
                if (shouldPlay) player.play();
                else player.pause();
                this._remotePlaybackState = remoteState;
            }
        } catch (error) {
            if (
                this.isCurrent(generation) &&
                revision === this._playbackRevision &&
                this._activeSessionAtom.get() === session
            )
                this.showError(error);
        } finally {
            const ownsApply = this._applying === token;
            if (ownsApply) this._applying = undefined;
            const latest = this._activeSessionAtom.get();
            if (
                ownsApply &&
                this.isCurrent(generation) &&
                latest &&
                latest !== session &&
                latest.publicId === this._joinedId &&
                latest.status === "active"
            ) {
                void this.apply(latest);
            }
        }
    }

    private stopFollowing(): void {
        if (
            !this._snapshot &&
            this._joinedId === null &&
            !this._activeSessionAtom.get()
        )
            return;
        const generation = this._generation;
        const revision = ++this._playbackRevision;
        const snapshot = this._snapshot;
        this._snapshot = undefined;
        this._joinedId = null;
        this._remotePlaybackState = "";
        this._lastPublished = "";
        this._lastPublishTime = 0;
        this._syncing = undefined;
        this._activeSessionAtom.set(null);
        if (snapshot) {
            const { mediaPlayerManager: player, queueManager: queue } =
                this.services;
            player.pause();
            queue.restoreListeningQueue(snapshot);
            if (snapshot.currentQueueMediaId !== null) {
                void player
                    .setMedia()
                    .then(() => {
                        if (
                            this.isCurrent(generation) &&
                            revision === this._playbackRevision
                        )
                            player.setCurrentTime(snapshot.time);
                    })
                    .catch((error: unknown) => {
                        if (
                            this.isCurrent(generation) &&
                            revision === this._playbackRevision
                        )
                            this.showError(error);
                    });
            }
        }
    }

    private showError(error: unknown): void {
        console.error("Listening session failed", error);
        this.services.notificationManager.notifyError(
            this.services.vocabularyManager.vocabulary.FRIENDS_SESSION_ERROR
        );
    }

    get sessionsAtom(): ReadonlyAtom<ListenSession[]> {
        return this._sessionsAtom.getReadonlyAtom();
    }
    get activeSessionAtom(): ReadonlyAtom<ListenSession | null> {
        return this._activeSessionAtom.getReadonlyAtom();
    }
    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loadingAtom.getReadonlyAtom();
    }
}
