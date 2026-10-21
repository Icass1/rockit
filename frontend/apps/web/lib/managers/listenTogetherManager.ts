import { EWebSocketMessage, isQueueable } from "@rockit/shared";
import type { ListenSession } from "@/models/interfaces";
import type { ListenTogetherQueueSnapshot } from "@/models/interfaces/listenTogetherState";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class ListenTogetherManager {
    private _sessionsAtom = createArrayAtom<ListenSession>([]);
    private _activeSessionAtom = createAtom<ListenSession | null>(null);
    private _loadingAtom = createAtom(false);
    private _initialized = false;
    private _fetching = false;
    private _fetchAgain = false;
    private _syncing = false;
    private _applying = false;
    private _joinedId: string | null = null;
    private _snapshot?: ListenTogetherQueueSnapshot;
    private _lastPublished = "";
    private _remotePlaybackState = "";
    private _lastPublishTime = 0;
    private _lastFetchTime = 0;

    get isHost(): boolean {
        return (
            this._activeSessionAtom.get()?.hostUsername ===
            rockIt.userManager.usernameAtom.get()
        );
    }

    async init(): Promise<void> {
        if (typeof window === "undefined" || this._initialized) return;
        this._initialized = true;
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.ListenTogetherSync,
            () => {
                void this.fetchSessions();
            }
        );
        rockIt.userManager.loggedInAtom.subscribe((loggedIn) => {
            if (loggedIn) void this.fetchSessions();
            else {
                this._joinedId = null;
                this._sessionsAtom.set([]);
                this._snapshot = undefined;
                this.stopFollowing();
            }
        });
        rockIt.mediaPlayerManager.playingAtom.listen(() => {
            void this.publish();
        });
        rockIt.mediaPlayerManager.currentTimeAtom.listen((time, oldTime) => {
            void this.publish(Math.abs(time - oldTime) > 1.5);
        });
        rockIt.queueManager.currentMediaAtom.listen(() => {
            void this.publish();
        });
        window.addEventListener("online", () => {
            void this.fetchSessions();
        });
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                void this.fetchSessions();
                void this.publish(true);
            }
        });
        // Repair missed notifications/reconnects; playback itself uses the existing native player.
        window.setInterval(() => {
            if (!rockIt.userManager.loggedInAtom.get()) return;
            if (Date.now() - this._lastFetchTime >= 15000)
                void this.fetchSessions();
            void this.publish();
        }, 1000);
    }

    async fetchSessions(): Promise<void> {
        if (!rockIt.userManager.loggedInAtom.get()) return;
        if (this._fetching) {
            this._fetchAgain = true;
            return;
        }
        this._fetching = true;
        const requestingUser = rockIt.userManager.usernameAtom.get();
        try {
            const res = await Http.getActiveSessions();
            if (
                !res.isOk() ||
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
            this._lastFetchTime = Date.now();
            this._sessionsAtom.set(res.result.sessions);
            const username = rockIt.userManager.usernameAtom.get();
            const selected =
                res.result.sessions.find(
                    (s) => s.publicId === this._joinedId
                ) ??
                res.result.sessions.find((s) => s.hostUsername === username);
            if (!selected) {
                this.stopFollowing();
                return;
            }
            this._activeSessionAtom.set(selected);
            if (
                selected.guestUsername === username &&
                selected.status === "active" &&
                this._joinedId === selected.publicId
            ) {
                await this.apply(selected);
            }
        } catch (error) {
            console.error("Unable to refresh listening session", error);
        } finally {
            this._fetching = false;
            if (this._fetchAgain) {
                this._fetchAgain = false;
                void this.fetchSessions();
            }
        }
    }

    async invite(userPublicId: string): Promise<boolean> {
        if (this._loadingAtom.get()) return false;
        this._loadingAtom.set(true);
        try {
            const res = await Http.inviteToSession({ userPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchSessions();
            await this.publish(true);
            return true;
        } catch (error) {
            this.showError(error);
            return false;
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async join(sessionPublicId: string): Promise<boolean> {
        if (this._loadingAtom.get()) return false;
        this._loadingAtom.set(true);
        try {
            const res = await Http.joinSession({ sessionPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            this._snapshot ??= rockIt.queueManager.captureListeningQueue();
            this._joinedId = sessionPublicId;
            await this.fetchSessions();
            return true;
        } catch (error) {
            this.showError(error);
            return false;
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async leave(sessionPublicId: string): Promise<boolean> {
        try {
            const res = await Http.leaveSession({ sessionPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            this.stopFollowing();
            await this.fetchSessions();
            return true;
        } catch (error) {
            this.showError(error);
            return false;
        }
    }

    private async publish(force = false): Promise<void> {
        const session = this._activeSessionAtom.get();
        if (
            !session ||
            !this.isHost ||
            this._syncing ||
            !rockIt.mediaPlayerManager.isPlaybackOwner
        )
            return;
        const player = rockIt.mediaPlayerManager;
        const media = rockIt.queueManager.currentMedia;
        const state = `${session.publicId}:${media?.publicId}:${player.playingAtom.get()}`;
        const now = Date.now();
        if (
            !force &&
            state === this._lastPublished &&
            now - this._lastPublishTime < 5000
        )
            return;
        this._syncing = true;
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
            if (res.isOk()) {
                this._lastPublished = state;
                this._lastPublishTime = now;
            } else {
                console.error("Session sync rejected", res.detail);
                await this.fetchSessions();
            }
        } catch (error) {
            console.error("Session sync failed", error);
        } finally {
            this._syncing = false;
        }
    }

    private async apply(session: ListenSession): Promise<void> {
        if (this._applying) return;
        const media = session.currentMedia?.media;
        if (!media || !isQueueable(media)) {
            rockIt.mediaPlayerManager.pause();
            this._remotePlaybackState = "";
            return;
        }
        this._applying = true;
        try {
            const queue = rockIt.queueManager;
            const player = rockIt.mediaPlayerManager;
            if (queue.currentMedia?.publicId !== media.publicId) {
                player.pause();
                queue.setMedia([media], "");
                queue.moveToMedia(media.publicId);
                await player.setMedia();
            }
            if (this._joinedId !== session.publicId) return;
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
            this.showError(error);
        } finally {
            this._applying = false;
        }
    }

    private stopFollowing(): void {
        const snapshot = this._snapshot;
        this._snapshot = undefined;
        this._joinedId = null;
        this._remotePlaybackState = "";
        this._activeSessionAtom.set(null);
        if (snapshot) {
            rockIt.mediaPlayerManager.pause();
            rockIt.queueManager.restoreListeningQueue(snapshot);
            if (snapshot.currentQueueMediaId !== null) {
                void rockIt.mediaPlayerManager
                    .setMedia()
                    .then(() =>
                        rockIt.mediaPlayerManager.setCurrentTime(snapshot.time)
                    );
            }
        }
    }

    private showError(error: unknown): void {
        console.error("Listening session failed", error);
        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.FRIENDS_SESSION_ERROR
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
