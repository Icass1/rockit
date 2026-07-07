import { resolveNextOnEnd, resolveOnMediaError } from "@/audio/queueLogic";
import { getRockIt } from "@/rockit/rockitRef";
import { EQueueAction } from "@/models/enums/queueAction";
import { ERepeatMode } from "@/models/enums/repeatMode";
import {
    getMediaAudioSrc,
    getMediaVideoSrc,
    isSong,
    isStation,
    isVideo,
    type TPlayableMedia,
} from "@/models/types/media";
import { EWebSocketMessage } from "@/models/types/webSocketMessages";
import {
    createArrayAtom,
    createAtom,
    type ReadonlyArrayAtom,
    type ReadonlyAtom,
} from "@/lib/store";

const WS_TIME_SYNC_INTERVAL_MS = 1000;

export type TMediaKind = "audio" | "video";

/**
 * Shared media-player orchestration ported from the canonical web
 * implementation. All high-level logic (play/pause, seek, bookmark autoskip,
 * end/error resolution, WebSocket sync) lives here. Platforms override only the
 * low-level `*Native*` primitives and the URI resolution seam.
 *
 * Playback status flows back into the base through the `onNative*` handlers,
 * which the subclass wires up from its element/engine listeners.
 */
export abstract class BaseMediaPlayerManager {
    protected _playingAtom = createAtom<boolean>(false);
    protected _loadingAtom = createAtom<boolean>(false);
    protected _currentTimeAtom = createAtom<number>(0);
    protected _volumeAtom = createAtom<number>(1);
    protected _crossFadeAtom = createAtom<number>(0);
    protected _triggeredBookmarkPublicIdsAtom = createArrayAtom<string>([]);

    protected _muted = false;
    protected _mutePreviousVolume?: number;
    protected _lastWsSyncTime = 0;
    protected _isSeeking = false;
    protected _seekFrom = 0;
    protected _lastTime = 0;

    // Tracks what is currently loaded per kind so we can dedup reloads without
    // reading a platform-specific `.src`.
    protected _loadedAudioUri?: string;
    protected _loadedVideoUri?: string;

    // ===== Platform primitives (subclass overrides — throw by default) =====

    protected loadNativeSource(
        _kind: TMediaKind,
        _uri: string
    ): void | Promise<void> {
        throw new Error("Not implemented: loadNativeSource");
    }
    protected clearNativeSource(_kind: TMediaKind): void {
        throw new Error("Not implemented: clearNativeSource");
    }
    protected playNative(_kind: TMediaKind): void {
        throw new Error("Not implemented: playNative");
    }
    protected pauseNative(_kind: TMediaKind): void {
        throw new Error("Not implemented: pauseNative");
    }
    protected seekNative(_kind: TMediaKind, _sec: number): void {
        throw new Error("Not implemented: seekNative");
    }
    protected getNativePosition(_kind: TMediaKind): number {
        throw new Error("Not implemented: getNativePosition");
    }
    protected setNativeVolume(_kind: TMediaKind, _vol: number): void {
        throw new Error("Not implemented: setNativeVolume");
    }
    protected getNativeVolume(_kind: TMediaKind): number {
        throw new Error("Not implemented: getNativeVolume");
    }
    protected isNativePaused(_kind: TMediaKind): boolean {
        throw new Error("Not implemented: isNativePaused");
    }

    /**
     * Resolve the playable URI for a media. Default returns the network URL;
     * mobile overrides for local-file → cache → remote resolution.
     */
    protected async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        return kind === "video"
            ? getMediaVideoSrc(media)
            : getMediaAudioSrc(media);
    }

    /** Optional post-load hook (e.g. seed cache). No-op by default. */
    protected afterMediaLoadedAsync(
        _media: TPlayableMedia,
        _kind: TMediaKind,
        _resolvedUri: string
    ): Promise<void> {
        return Promise.resolve();
    }

    // ===== Native → base status handlers (subclass calls these) =====

    protected onNativePlaying = (): void => this._playingAtom.set(true);
    protected onNativePaused = (): void => this._playingAtom.set(false);
    protected onNativeLoadStart = (): void => this._loadingAtom.set(true);
    protected onNativeLoaded = (): void => this._loadingAtom.set(false);
    protected onNativeTimeUpdate = (sec: number): void =>
        this._handleTimeUpdate(sec);
    protected onNativeEnded = (): void => this._handleEnded();
    protected onNativeError = (err?: unknown): void => {
        console.error("MediaPlayerManager: media error", err);
        this._handleMediaError();
    };

    // ===== Public API =====

    init(): void {
        getRockIt().webSocketManager.onMessage(
            EWebSocketMessage.CurrentTime,
            (data): void => {
                this._currentTimeAtom.set(data.currentTimeMs / 1000);
            }
        );
    }

    play(): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            void this._playVideo();
        } else if (isSong(currentMedia)) {
            void this._playAudio();
        } else if (isStation(currentMedia)) {
            void this._playStream(getMediaAudioSrc(currentMedia) ?? "");
        }
    }

    protected async _playAudio(): Promise<void> {
        await this._setAudio();
        this.playNative("audio");
    }

    protected async _playVideo(): Promise<void> {
        await this._setVideo();
        this.playNative("video");
    }

    pause(): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        this.pauseNative("video");
        this.pauseNative("audio");
    }

    togglePlayPause(): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (this.isNativePaused("video")) this.play();
            else this.pause();
        } else if (isSong(currentMedia)) {
            if (this.isNativePaused("audio")) this.play();
            else this.pause();
        }
    }

    togglePlayPauseOrSetMedia(): void {
        void this._togglePlayPauseOrSetMedia();
    }

    protected async _togglePlayPauseOrSetMedia(): Promise<void> {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        await this.setMedia();
        if (isVideo(currentMedia)) {
            if (this.isNativePaused("video")) this.play();
            else this.pause();
        } else {
            if (this.isNativePaused("audio")) this.play();
            else this.pause();
        }
    }

    playStream(url: string): void {
        void this._playStream(url);
    }

    protected async _playStream(url: string): Promise<void> {
        this._loadedAudioUri = url;
        await this.loadNativeSource("audio", url);
        this.setNativeVolume("audio", this._volumeAtom.get());
        this.seekNative("audio", 0);
        this.playNative("audio");
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (currentMedia) {
            this._sendCurrentMedia(currentMedia);
        }
    }

    beginSeek(): void {
        this._isSeeking = true;
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;
        this._seekFrom = isVideo(currentMedia)
            ? this.getNativePosition("video")
            : this.getNativePosition("audio");
    }

    setCurrentTime(time: number, sendMessage: boolean = true): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        const kind: TMediaKind = isVideo(currentMedia) ? "video" : "audio";
        const timeFrom = this.getNativePosition(kind);
        this.seekNative(kind, time);
        if (sendMessage) {
            this._sendSeek(currentMedia.publicId, timeFrom, time);
        }
        this._currentTimeAtom.set(time);
    }

    endSeek(time: number): void {
        this._isSeeking = false;
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        const kind: TMediaKind = isVideo(currentMedia) ? "video" : "audio";
        this.seekNative(kind, time);
        this._currentTimeAtom.set(time);
        this._sendSeek(currentMedia.publicId, this._seekFrom, time);
    }

    protected _sendSeek(
        publicId: string,
        timeFrom: number,
        timeTo: number
    ): void {
        getRockIt().webSocketManager.sendSeek({
            mediaPublicId: publicId,
            timeFrom,
            timeTo,
        });
    }

    mute(): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        this._mutePreviousVolume = this.volume;
        this.volume = 0;
        this._muted = true;
    }

    unmute(): void {
        if (this._mutePreviousVolume !== undefined) {
            this.volume = this._mutePreviousVolume;
            this._mutePreviousVolume = undefined;
        }
        this._muted = false;
    }

    toggleMute(): void {
        if (this._muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    setCrossFade(seconds: number): void {
        this._crossFadeAtom.set(Math.max(0, Math.min(12, seconds)));
    }

    async setMedia(useSavedCurrentTime: boolean = false): Promise<void> {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        this._lastTime = 0;

        if (isVideo(currentMedia)) {
            await this._setVideo(useSavedCurrentTime);
        } else {
            await this._setAudio(useSavedCurrentTime);
        }
    }

    protected async _setAudio(
        useSavedCurrentTime: boolean = false
    ): Promise<void> {
        this._triggeredBookmarkPublicIdsAtom.set([]);
        this._clearVideo();

        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia || isVideo(currentMedia)) return;

        const audioSrc = await this.resolveMediaUriAsync(currentMedia, "audio");
        if (!audioSrc) return;
        if (this._loadedAudioUri === audioSrc) return;

        this._loadedAudioUri = audioSrc;
        await this.loadNativeSource("audio", audioSrc);
        this.setNativeVolume("audio", this._volumeAtom.get());

        const startAt = useSavedCurrentTime
            ? (getRockIt().userManager.currentTimeMsAtom.get() ?? 0) / 1000
            : 0;
        this.seekNative("audio", startAt);

        await this.afterMediaLoadedAsync(currentMedia, "audio", audioSrc);
        this._sendCurrentMedia(currentMedia);
    }

    protected async _setVideo(
        useSavedCurrentTime: boolean = false
    ): Promise<void> {
        this._triggeredBookmarkPublicIdsAtom.set([]);
        this._clearAudio();

        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia || currentMedia.type !== "video") return;

        const videoSrc = await this.resolveMediaUriAsync(currentMedia, "video");
        if (!videoSrc) return;
        if (this._loadedVideoUri === videoSrc) return;

        this._loadedVideoUri = videoSrc;
        await this.loadNativeSource("video", videoSrc);
        this.setNativeVolume("video", this._volumeAtom.get());

        const startAt = useSavedCurrentTime
            ? (getRockIt().userManager.currentTimeMsAtom.get() ?? 0) / 1000
            : 0;
        this.seekNative("video", startAt);

        await this.afterMediaLoadedAsync(currentMedia, "video", videoSrc);
        this._sendCurrentMedia(currentMedia);
    }

    protected _clearVideo(): void {
        this.clearNativeSource("video");
        this._loadedVideoUri = undefined;
    }

    protected _clearAudio(): void {
        this.clearNativeSource("audio");
        this._loadedAudioUri = undefined;
    }

    protected _sendCurrentMedia(currentMedia: TPlayableMedia): void {
        const queueMediaId = getRockIt().queueManager.currentQueueMediaId;
        const queueType = getRockIt().userManager.queueTypeAtom.get();

        if (queueMediaId === null) return;
        if (queueType === undefined) return;

        getRockIt().webSocketManager.sendCurrentMedia({
            mediaPublicId: currentMedia.publicId,
            queueMediaId,
            queueType: queueType,
        });
    }

    protected _handleTimeUpdate(time: number): void {
        if (this._isSeeking) return;

        const currentMedia = getRockIt().queueManager.currentMedia;
        if (!currentMedia) return;

        this._currentTimeAtom.set(time);

        // Check bookmarks we've crossed since last update.
        this._checkBookmarks(this._lastTime, time);

        this._lastTime = time;

        const now = Date.now();
        if (now - this._lastWsSyncTime >= WS_TIME_SYNC_INTERVAL_MS) {
            this._lastWsSyncTime = now;
            getRockIt().webSocketManager.sendCurrentTime({
                currentTimeMs: Math.round(time * 1000),
                mediaPublicId: currentMedia.publicId,
            });
        }
    }

    protected _checkBookmarks(lastTime: number, currentTime: number): void {
        const repeatMode = getRockIt().userManager.repeatModeAtom.get();

        const isAllMode = repeatMode === ERepeatMode.ALL;
        const triggeredIds = this._triggeredBookmarkPublicIdsAtom.get();

        const bookmarks =
            getRockIt().bookmarkManager.currentMediaBookmarksAtom.get();

        const sortedBookmarks = [...bookmarks].sort(
            (a, b): number => a.timestamp - b.timestamp
        );

        for (let i = 0; i < sortedBookmarks.length; i++) {
            const bookmark = sortedBookmarks[i];
            if (
                !(
                    lastTime < bookmark.timestamp &&
                    bookmark.timestamp <= currentTime &&
                    currentTime - bookmark.timestamp < 1
                )
            ) {
                continue;
            }

            if (
                repeatMode === ERepeatMode.OFF &&
                bookmark.mode === "PREVIOUS_BOOKMARK"
            ) {
                continue;
            }

            if (isAllMode && triggeredIds.includes(bookmark.publicId)) {
                continue;
            }

            if (bookmark.mode === "AUTOSKIP") {
                if (isAllMode) {
                    this._triggeredBookmarkPublicIdsAtom.push(
                        bookmark.publicId
                    );
                }
                const nextBookmark = sortedBookmarks[i + 1];
                if (nextBookmark) {
                    this.setCurrentTime(nextBookmark.timestamp, true);
                } else {
                    getRockIt().queueManager.skipForward();
                }
                return;
            }

            if (bookmark.mode === "REPEAT_FROM_BEGINNING") {
                if (isAllMode) {
                    this._triggeredBookmarkPublicIdsAtom.push(
                        bookmark.publicId
                    );
                }
                this.setCurrentTime(0, true);
                return;
            }

            if (bookmark.mode === "PREVIOUS_BOOKMARK") {
                if (isAllMode) {
                    this._triggeredBookmarkPublicIdsAtom.push(
                        bookmark.publicId
                    );
                }
                const prevBookmark = i > 0 ? sortedBookmarks[i - 1] : null;
                if (prevBookmark) {
                    this.setCurrentTime(prevBookmark.timestamp, true);
                } else {
                    this.setCurrentTime(0, true);
                }
                return;
            }
        }
    }

    protected _handleMediaError(): void {
        this._loadingAtom.set(false);

        const repeat = getRockIt().userManager.repeatModeAtom.get();
        const queue = getRockIt().queueManager.queue;
        const currentId = getRockIt().queueManager.currentQueueMediaId;
        const direction = getRockIt().queueManager.lastNavigationDirection;

        getRockIt().notificationManager.notifyError(
            getRockIt().vocabularyManager.vocabulary.ERROR_LOADING_MEDIA_FILE
        );

        const queueItems = queue.map(
            (item): { publicId: string; queueMediaId: number } => ({
                publicId: item.media.publicId,
                queueMediaId: item.queueMediaId,
            })
        );

        const { action, nextId } = resolveOnMediaError(
            queueItems,
            currentId,
            repeat,
            direction
        );

        setTimeout(() => {
            if (action === EQueueAction.REPLAY) {
                void this.setMedia().then((): void => this.play());
            } else if (action === EQueueAction.PLAY && nextId !== null) {
                getRockIt().queueManager.setQueueMediaId(nextId, direction);
                void this.setMedia().then((): void => this.play());
            } else {
                this._playingAtom.set(false);
            }
        }, 1000);
    }

    protected _handleEnded(): void {
        const currentMedia = getRockIt().queueManager.currentMedia;
        if (currentMedia) {
            getRockIt().webSocketManager.sendMediaEnded({
                mediaPublicId: currentMedia.publicId,
            });
        }

        const repeat = getRockIt().userManager.repeatModeAtom.get();
        const queue = getRockIt().queueManager.queue;
        const currentId = getRockIt().queueManager.currentQueueMediaId;

        const queueItems = queue.map(
            (item): { publicId: string; queueMediaId: number } => ({
                publicId: item.media.publicId,
                queueMediaId: item.queueMediaId,
            })
        );

        const { action, nextId } = resolveNextOnEnd(
            queueItems,
            currentId,
            repeat
        );

        if (action === EQueueAction.REPLAY) {
            this.setCurrentTime(0, false);
            this.play();
        } else if (action === EQueueAction.PLAY && nextId !== null) {
            getRockIt().queueManager.setQueueMediaId(nextId);
            this.play();
        } else {
            this._playingAtom.set(false);
        }
    }

    set volume(value: number) {
        const currentMedia = getRockIt().queueManager.currentMedia;
        const clamped = Math.max(0, Math.min(1, value));

        const kind: TMediaKind =
            currentMedia && isVideo(currentMedia) ? "video" : "audio";
        this.setNativeVolume(kind, clamped);
        this._volumeAtom.set(clamped);
    }

    get volume(): number {
        const currentMedia = getRockIt().queueManager.currentMedia;
        const kind: TMediaKind =
            currentMedia && isVideo(currentMedia) ? "video" : "audio";
        return this.getNativeVolume(kind);
    }

    get currentTime(): number {
        return this._currentTimeAtom.get();
    }

    get playingAtom(): ReadonlyAtom<boolean> {
        return this._playingAtom.getReadonlyAtom();
    }

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loadingAtom.getReadonlyAtom();
    }

    get currentTimeAtom(): ReadonlyAtom<number> {
        return this._currentTimeAtom.getReadonlyAtom();
    }

    get volumeAtom(): ReadonlyAtom<number> {
        return this._volumeAtom.getReadonlyAtom();
    }

    get crossFadeAtom(): ReadonlyAtom<number> {
        return this._crossFadeAtom.getReadonlyAtom();
    }

    get triggeredBookmarkPublicIdsAtom(): ReadonlyArrayAtom<string> {
        return this._triggeredBookmarkPublicIdsAtom.getReadonlyAtom();
    }
}
