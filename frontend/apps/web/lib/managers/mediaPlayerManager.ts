import {
    ERepeatMode,
    EWebSocketMessage,
    getMediaAudioSrc,
    getMediaVideoSrc,
    isSong,
    isStation,
    isVideo,
    resolveNextOnEnd,
    resolveOnMediaError,
    TPlayableMedia,
} from "@rockit/shared";
import { EQueueAction } from "@/models/enums/queueAction";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    createArrayAtom,
    createAtom,
    ReadonlyArrayAtom,
    ReadonlyAtom,
} from "@/lib/store";

const WS_TIME_SYNC_INTERVAL_MS = 1000;

export class MediaPlayerManager {
    static #instance: MediaPlayerManager;

    private _audio?: HTMLAudioElement;
    private _video?: HTMLVideoElement;
    private _videoContainer?: HTMLDivElement;

    private _playingAtom = createAtom<boolean>(false);
    private _loadingAtom = createAtom<boolean>(false);
    private _currentTimeAtom = createAtom<number>(0);
    private _volumeAtom = createAtom<number>(1);
    private _crossFadeAtom = createAtom<number>(0);

    private _muted = false;
    private _mutePreviousVolume?: number;
    private _lastWsSyncTime = 0;
    private _isSeeking = false;
    private _seekFrom: number = 0;
    private _lastTime = 0;
    private _triggeredBookmarkPublicIdsAtom = createArrayAtom<string>([]);

    constructor() {
        if (typeof window === "undefined") return;
        if (MediaPlayerManager.#instance) return MediaPlayerManager.#instance;

        this._audio = new Audio();
        this._audio.preload = "auto";

        this._audio.onplaying = (): void => this._playingAtom.set(true);
        this._audio.onpause = (): void => this._playingAtom.set(false);
        this._audio.onplay = (): void => this._playingAtom.set(true);
        this._audio.onloadstart = (): void => this._loadingAtom.set(true);
        this._audio.onloadeddata = (): void => this._loadingAtom.set(false);
        this._audio.ontimeupdate = (): void => this._handleTimeUpdate();
        this._audio.onended = (): void => this._handleEnded();
        this._audio.onerror = (e): void => {
            console.error("MediaPlayerManager: audio error", e);
            this._handleMediaError();
        };

        this._video = document.createElement("video");
        this._video.preload = "auto";
        this._video.setAttribute("playsInline", "");
        this._video.setAttribute("webkit-playsinline", "");

        this._video.onplaying = (): void => this._playingAtom.set(true);
        this._video.onpause = (): void => this._playingAtom.set(false);
        this._video.onplay = (): void => this._playingAtom.set(true);
        this._video.onloadstart = (): void => this._loadingAtom.set(true);
        this._video.onloadeddata = (): void => this._loadingAtom.set(false);
        this._video.ontimeupdate = (): void => this._handleTimeUpdate();
        this._video.onended = (): void => this._handleEnded();
        this._video.onerror = (e): void => {
            console.error("MediaPlayerManager: video error", e);
            this._handleMediaError();
        };

        MediaPlayerManager.#instance = this;

        return MediaPlayerManager.#instance;
    }

    init(): void {
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.CurrentTime,
            (data): void => {
                this._currentTimeAtom.set(data.currentTimeMs / 1000);
            }
        );
    }

    play(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            this.playVideo();
        } else if (isSong(currentMedia)) {
            this.playAudio();
        } else if (isStation(currentMedia)) {
            this.playStream(getMediaAudioSrc(currentMedia) ?? "");
        }
    }

    private playAudio(): void {
        // console.log("MediaPlayerManager.playVideo", this._audio);
        if (!this._audio) return;
        this.setAudio();
        this._audio.play().catch((err): void => {
            console.warn(
                "MediaPlayerManager: audio play failed",
                err.name,
                err.message
            );
            if (err.name === "NotAllowedError") {
                this._retryPlayOnGesture("audio");
            }
        });
    }

    private playVideo(): void {
        // console.log("MediaPlayerManager.playVideo", this._video);
        if (!this._video) return;
        this.setVideo();
        this._video.play().catch((err): void => {
            console.warn(
                "MediaPlayerManager: video play failed",
                err.name,
                err.message,
                {
                    readyState: this._video?.readyState,
                    networkState: this._video?.networkState,
                    paused: this._video?.paused,
                    muted: this._video?.muted,
                    src: this._video?.src,
                }
            );
            if (err.name === "NotAllowedError") {
                this._retryPlayOnGesture("video");
            }
        });
    }

    pause(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        this._video?.pause();
        this._audio?.pause();
    }

    togglePlayPause(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            if (this._video.paused) {
                this.play();
            } else {
                this.pause();
            }
        } else if (isSong(currentMedia)) {
            if (!this._audio) return;
            if (this._audio.paused) {
                this.play();
            } else {
                this.pause();
            }
        }
    }

    private _retryPlayOnGesture(type: "audio" | "video"): void {
        const handler = (): void => {
            document.removeEventListener("pointerup", handler);
            document.removeEventListener("keydown", handler);
            const el = type === "video" ? this._video : this._audio;
            if (el?.paused) {
                el.play().catch((err): void =>
                    console.warn("MediaPlayerManager: retry play failed", err)
                );
            }
        };
        document.addEventListener("pointerup", handler, { once: true });
        document.addEventListener("keydown", handler, { once: true });
    }

    togglePlayPauseOrSetMedia(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        this.setMedia();
        if (isVideo(currentMedia)) {
            if (!this._video) return;
            if (this._video.paused) {
                this.play();
            } else {
                this.pause();
            }
        } else {
            if (!this._audio) return;
            if (this._audio.paused) {
                this.play();
            } else {
                this.pause();
            }
        }
    }

    playStream(url: string): void {
        if (!this._audio) return;
        this._audio.src = url;
        this._audio.currentTime = 0;
        this._audio.volume = this._volumeAtom.get();
        this._audio
            .play()
            .catch((err): void =>
                console.warn("MediaPlayerManager: stream failed", err)
            );
        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia) {
            this._sendCurrentMedia(currentMedia);
        }
    }

    beginSeek(): void {
        this._isSeeking = true;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;
        this._seekFrom = isVideo(currentMedia)
            ? (this._video?.currentTime ?? 0)
            : (this._audio?.currentTime ?? 0);
    }

    setCurrentTime(time: number, sendMessage: boolean = true): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            const timeFrom = this._video.currentTime;
            this._video.currentTime = time;
            if (sendMessage) {
                this._sendSeek(currentMedia.publicId, timeFrom, time);
            }
        } else {
            if (!this._audio) return;
            const timeFrom = this._audio.currentTime;
            this._audio.currentTime = time;
            if (sendMessage) {
                this._sendSeek(currentMedia.publicId, timeFrom, time);
            }
        }
        this._currentTimeAtom.set(time);
    }

    endSeek(time: number): void {
        this._isSeeking = false;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            this._video.currentTime = time;
            this._currentTimeAtom.set(time);
        } else {
            if (!this._audio) return;
            this._audio.currentTime = time;
            this._currentTimeAtom.set(time);
        }
        this._sendSeek(currentMedia.publicId, this._seekFrom, time);
    }

    private _sendSeek(
        publicId: string,
        timeFrom: number,
        timeTo: number
    ): void {
        rockIt.webSocketManager.sendSeek({
            mediaPublicId: publicId,
            timeFrom,
            timeTo,
        });
    }

    mute(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            this._mutePreviousVolume = this.volume;
            this.volume = 0;
            this._muted = true;
        } else {
            if (!this._audio) return;
            this._mutePreviousVolume = this.volume;
            this.volume = 0;
            this._muted = true;
        }
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

    setMedia(useSavedCurrentTime: boolean = false): void {
        console.log("MediaPlayerManager.setMedia", useSavedCurrentTime);

        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        this._lastTime = 0;

        if (isVideo(currentMedia)) {
            this.setVideo(useSavedCurrentTime);
        } else {
            this.setAudio(useSavedCurrentTime);
        }
    }

    private setAudio(useSavedCurrentTime: boolean = false): void {
        console.log("MediaPlayerManager.setAudio", useSavedCurrentTime);

        this._triggeredBookmarkPublicIdsAtom.set([]);
        this.clearVideo();
        // console.log({
        //     "!this._audio": !this._audio,
        // });
        if (!this._audio) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        // console.log({
        //     "!currentMedia": !currentMedia,
        //     "currentMedia?.type": currentMedia?.type,
        // });
        if (!currentMedia || isVideo(currentMedia)) return;

        // console.log({ currentMedia });

        const audioSrc = getMediaAudioSrc(currentMedia);
        // console.log({ audioSrc });
        // console.log(
        //     "if (!currentMedia || !audioSrc) return;",
        //     currentMedia,
        //     audioSrc,
        //     !currentMedia || !audioSrc
        // );
        if (!currentMedia || !audioSrc) return;
        // console.log(
        //     "if (this._audio.src === audioSrc) return;",
        //     this._audio.src,
        //     audioSrc,
        //     this._audio.src === audioSrc
        // );
        if (this._audio.src === audioSrc) return;

        this._audio.volume = this._volumeAtom.get();
        // console.log(audioSrc);
        this._audio.src = audioSrc;
        this._audio.currentTime = 0;

        if (useSavedCurrentTime) {
            const savedTimeMs = rockIt.userManager.currentTimeMsAtom.get() ?? 0;
            if (savedTimeMs > 0) {
                this._audio.currentTime = savedTimeMs / 1000;
            }
        } else {
            this._audio.currentTime = 0;
        }

        this._sendCurrentMedia(currentMedia);
    }

    private setVideo(useSavedCurrentTime: boolean = false): void {
        console.log("MediaPlayerManager.setVideo", useSavedCurrentTime);

        this._triggeredBookmarkPublicIdsAtom.set([]);
        this.clearAudio();
        if (!this._video) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia || currentMedia.type !== "video") return;

        const videoSrc = getMediaVideoSrc(currentMedia);
        if (!currentMedia || !videoSrc) return;
        if (this._video.src === videoSrc) return;

        if (!this._video.isConnected) {
            const root = document.getElementById("rockit-video-root");
            if (root) {
                root.appendChild(this._video);
            } else {
                document.body.appendChild(this._video);
            }
        }

        this._video.volume = this._volumeAtom.get();
        this._video.src = videoSrc;
        this._video.currentTime = 0;

        if (useSavedCurrentTime) {
            const savedTimeMs = rockIt.userManager.currentTimeMsAtom.get() ?? 0;
            if (savedTimeMs > 0) {
                this._video.currentTime = savedTimeMs / 1000;
            }
        } else {
            this._video.currentTime = 0;
        }

        this._sendCurrentMedia(currentMedia);
    }

    private clearVideo(): void {
        // console.log("MediaPlayerManager.clearVideo");
        if (!this._video) return;

        this._video.pause();
        this._video.currentTime = 0;
        this._video.removeAttribute("src");
        this._video.load();
    }

    private clearAudio(): void {
        // console.log("MediaPlayerManager.clearAudio");
        if (!this._audio) return;

        this._audio.pause();
        this._audio.currentTime = 0;
        this._audio.removeAttribute("src");
        this._audio.load();
    }

    private _sendCurrentMedia(currentMedia: TPlayableMedia): void {
        const queueMediaId = rockIt.queueManager.currentQueueMediaId;
        const queueType = rockIt.userManager.queueTypeAtom.get();

        if (queueMediaId === null) return;
        if (queueType === undefined) return;

        rockIt.webSocketManager.sendCurrentMedia({
            mediaPublicId: currentMedia.publicId,
            queueMediaId,
            queueType: queueType,
        });
    }

    private _handleTimeUpdate(): void {
        if (this._isSeeking) return;

        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        let time = 0;
        if (isVideo(currentMedia)) {
            if (!this._video) return;
            time = this._video.currentTime;
        } else {
            if (!this._audio) return;
            time = this._audio.currentTime;
        }

        this._currentTimeAtom.set(time);

        // Check bookmarks we've crossed since last update.
        this._checkBookmarks(this._lastTime, time);

        this._lastTime = time;

        const now = Date.now();
        if (now - this._lastWsSyncTime >= WS_TIME_SYNC_INTERVAL_MS) {
            this._lastWsSyncTime = now;
            rockIt.webSocketManager.sendCurrentTime({
                currentTimeMs: Math.round(time * 1000),
                mediaPublicId: currentMedia.publicId,
            });
        }
    }

    private _checkBookmarks(lastTime: number, currentTime: number): void {
        const repeatMode = rockIt.userManager.repeatModeAtom.get();

        const isAllMode = repeatMode === ERepeatMode.ALL;
        const triggeredIds = this._triggeredBookmarkPublicIdsAtom.get();

        const bookmarks =
            rockIt.bookmarkManager.currentMediaBookmarksAtom.get();

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
                    rockIt.queueManager.skipForward();
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

    private _handleMediaError(): void {
        this._loadingAtom.set(false);

        const repeat = rockIt.userManager.repeatModeAtom.get();
        const queue = rockIt.queueManager.queue;
        const currentId = rockIt.queueManager.currentQueueMediaId;
        const direction = rockIt.queueManager.lastNavigationDirection;

        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.ERROR_LOADING_MEDIA_FILE
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
                this.setMedia();
                this.play();
            } else if (action === EQueueAction.PLAY && nextId !== null) {
                rockIt.queueManager.setQueueMediaId(nextId, direction);
                this.setMedia();
                this.play();
            } else {
                this._playingAtom.set(false);
            }
        }, 1000);
    }

    private _handleEnded(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia) {
            rockIt.webSocketManager.sendMediaEnded({
                mediaPublicId: currentMedia.publicId,
            });
        }

        const repeat = rockIt.userManager.repeatModeAtom.get();
        const queue = rockIt.queueManager.queue;
        const currentId = rockIt.queueManager.currentQueueMediaId;

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
            this.play();
        } else if (action === EQueueAction.PLAY && nextId !== null) {
            rockIt.queueManager.setQueueMediaId(nextId);
            this.play();
        } else {
            this._playingAtom.set(false);
        }
    }

    set volume(value: number) {
        const currentMedia = rockIt.queueManager.currentMedia;
        const clamped = Math.max(0, Math.min(1, value));

        if (currentMedia && isVideo(currentMedia)) {
            if (!this._video) return;
            this._video.volume = clamped;
        } else {
            if (!this._audio) return;
            this._audio.volume = clamped;
        }
        this._volumeAtom.set(clamped);
    }

    get volume(): number {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia && isVideo(currentMedia)) {
            return this._video?.volume ?? 1;
        }
        return this._audio?.volume ?? 1;
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

    get audioElement(): HTMLAudioElement | undefined {
        return this._audio;
    }

    get videoElement(): HTMLVideoElement | undefined {
        return this._video;
    }

    get triggeredBookmarkPublicIdsAtom(): ReadonlyArrayAtom<string> {
        return this._triggeredBookmarkPublicIdsAtom.getReadonlyAtom();
    }

    getVideoElementContainer(): HTMLDivElement | null {
        if (!this._videoContainer) {
            this._videoContainer = document.createElement("div");
            this._videoContainer.id = "rockit-video-container";
            this._videoContainer.className = "absolute inset-0 h-full w-full";
            this._videoContainer.style.display = "none";
        }
        return this._videoContainer;
    }

    attachVideoToContainer(container: HTMLElement): void {
        if (!this._video) return;
        container.appendChild(this._video);
        this._video.style.width = "100%";
        this._video.style.height = "100%";
        this._video.style.objectFit = "cover";
    }
}
