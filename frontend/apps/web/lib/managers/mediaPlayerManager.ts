import {
    getMediaAudioSrc,
    getMediaVideoSrc,
    isSong,
    isVideo,
    resolveNextOnEnd,
    TPlayableMedia,
} from "@rockit/shared";
import { EQueueAction } from "@/models/enums/queueAction";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

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

    constructor() {
        if (typeof window === "undefined") return;
        if (MediaPlayerManager.#instance) return MediaPlayerManager.#instance;

        this._audio = new Audio();
        this._audio.preload = "auto";

        this._audio.onplaying = () => this._playingAtom.set(true);
        this._audio.onpause = () => this._playingAtom.set(false);
        this._audio.onplay = () => this._playingAtom.set(true);
        this._audio.onloadstart = () => this._loadingAtom.set(true);
        this._audio.onloadeddata = () => this._loadingAtom.set(false);
        this._audio.ontimeupdate = () => this._handleTimeUpdate();
        this._audio.onended = () => this._handleEnded();
        this._audio.onerror = (e) => {
            console.error("MediaPlayerManager: audio error", e);
            this._loadingAtom.set(false);
            this._playingAtom.set(false);
        };

        this._video = document.createElement("video");
        this._video.preload = "auto";

        this._video.onplaying = () => this._playingAtom.set(true);
        this._video.onpause = () => this._playingAtom.set(false);
        this._video.onplay = () => this._playingAtom.set(true);
        this._video.onloadstart = () => this._loadingAtom.set(true);
        this._video.onloadeddata = () => this._loadingAtom.set(false);
        this._video.ontimeupdate = () => this._handleTimeUpdate();
        this._video.onended = () => this._handleEnded();
        this._video.onerror = (e) => {
            console.error("MediaPlayerManager: video error", e);
            this._loadingAtom.set(false);
            this._playingAtom.set(false);
        };

        MediaPlayerManager.#instance = this;
        return MediaPlayerManager.#instance;
    }

    play() {
        console.log(
            "MediaPlayerManager.play",
            rockIt.queueManager.currentMedia
        );

        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        console.log(currentMedia.type);

        if (isVideo(currentMedia)) {
            this.playVideo();
        } else if (isSong(currentMedia)) {
            this.playAudio();
        } else if (currentMedia.type == "station") {
            console.warn("Not implemented");
        }
    }

    private playAudio() {
        console.log("MediaPlayerManager.playVideo", this._audio);
        if (!this._audio) return;
        this.setAudio();
        this._audio.play().catch((err) => {
            if (err.name !== "NotAllowedError") {
                console.warn("MediaPlayerManager: play failed", err);
            }
        });
    }

    private playVideo() {
        console.log("MediaPlayerManager.playVideo", this._video);
        if (!this._video) return;
        this.setVideo();
        this._video.play().catch((err) => {
            if (err.name !== "NotAllowedError") {
                console.warn("MediaPlayerManager: play failed", err);
            }
        });
    }

    pause() {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        this._video?.pause();
        this._audio?.pause();
    }

    togglePlayPause() {
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

    togglePlayPauseOrSetMedia() {
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

    playStream(url: string) {
        if (!this._audio) return;
        rockIt.queueManager.clearCurrentMedia();
        this._audio.src = url;
        this._audio.volume = this._volumeAtom.get();
        this._audio
            .play()
            .catch((err) =>
                console.warn("MediaPlayerManager: stream failed", err)
            );
    }

    setCurrentTime(time: number) {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            const timeFrom = this._video.currentTime;
            this._video.currentTime = time;
            this._sendSeek(currentMedia.publicId, timeFrom, time);
        } else {
            if (!this._audio) return;
            const timeFrom = this._audio.currentTime;
            this._audio.currentTime = time;
            this._sendSeek(currentMedia.publicId, timeFrom, time);
        }
    }

    private _sendSeek(publicId: string, timeFrom: number, timeTo: number) {
        rockIt.webSocketManager.sendSeek({
            mediaPublicId: publicId,
            timeFrom,
            timeTo,
        });
    }

    mute() {
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

    unmute() {
        if (this._mutePreviousVolume !== undefined) {
            this.volume = this._mutePreviousVolume;
            this._mutePreviousVolume = undefined;
        }
        this._muted = false;
    }

    toggleMute() {
        if (this._muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    setCrossFade(seconds: number) {
        this._crossFadeAtom.set(Math.max(0, Math.min(12, seconds)));
    }

    setMedia(useSavedCurrentTime: boolean = false) {
        console.log("MediaPlayerManager.setMedia");
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            this.setVideo(useSavedCurrentTime);
        } else {
            this.setAudio(useSavedCurrentTime);
        }
    }

    private setAudio(useSavedCurrentTime: boolean = false) {
        console.log("MediaPlayerManager.setAudio");

        this.clearVideo();
        console.log({
            "!this._audio": !this._audio,
        });
        if (!this._audio) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        console.log({
            "!currentMedia": !currentMedia,
            "currentMedia?.type": currentMedia?.type,
        });
        if (!currentMedia || isVideo(currentMedia)) return;

        console.log({ currentMedia });

        const audioSrc = getMediaAudioSrc(currentMedia);
        console.log({ audioSrc });
        console.log(
            "if (!currentMedia || !audioSrc) return;",
            currentMedia,
            audioSrc,
            !currentMedia || !audioSrc
        );
        if (!currentMedia || !audioSrc) return;
        console.log(
            "if (this._audio.src === audioSrc) return;",
            this._audio.src,
            audioSrc,
            this._audio.src === audioSrc
        );
        if (this._audio.src === audioSrc) return;

        this._audio.volume = this._volumeAtom.get();
        console.log(audioSrc);
        this._audio.src = audioSrc;

        if (useSavedCurrentTime) {
            const savedTimeMs = rockIt.userManager.user?.currentTimeMs ?? 0;
            if (savedTimeMs > 0) {
                this._audio.currentTime = savedTimeMs / 1000;
            }
        } else {
            this._audio.currentTime = 0;
        }

        this._sendCurrentMedia(currentMedia);
    }

    private setVideo(useSavedCurrentTime: boolean = false) {
        console.log("MediaPlayerManager.setVideo");

        this.clearAudio();
        if (!this._video) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia || currentMedia.type !== "video") return;

        const videoSrc = getMediaVideoSrc(currentMedia);
        if (!currentMedia || !videoSrc) return;
        if (this._video.src === videoSrc) return;

        this._video.volume = this._volumeAtom.get();
        this._video.src = videoSrc;

        if (useSavedCurrentTime) {
            const savedTimeMs = rockIt.userManager.user?.currentTimeMs ?? 0;
            if (savedTimeMs > 0) {
                this._video.currentTime = savedTimeMs / 1000;
            }
        } else {
            this._video.currentTime = 0;
        }

        this._sendCurrentMedia(currentMedia);
    }

    private clearVideo() {
        console.log("MediaPlayerManager.clearVideo");
        if (!this._video) return;

        this._video.pause();
        this._video.currentTime = 0;
        this._video.removeAttribute("src");
        this._video.load();
    }

    private clearAudio() {
        console.log("MediaPlayerManager.clearAudio");
        if (!this._audio) return;

        this._audio.pause();
        this._audio.currentTime = 0;
        this._audio.removeAttribute("src");
        this._audio.load();
    }

    private _sendCurrentMedia(currentMedia: TPlayableMedia) {
        const queueMediaId = rockIt.queueManager.currentQueueMediaId;
        if (queueMediaId !== null) {
            rockIt.webSocketManager.sendCurrentMedia({
                mediaPublicId: currentMedia.publicId,
                queueMediaId,
            });
        }
    }

    private _handleTimeUpdate() {
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

        const now = Date.now();
        if (now - this._lastWsSyncTime >= WS_TIME_SYNC_INTERVAL_MS) {
            this._lastWsSyncTime = now;
            rockIt.webSocketManager.sendCurrentTime({
                currentTimeMs: Math.round(time * 1000),
            });
        }
    }

    private _handleEnded() {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia) {
            rockIt.webSocketManager.sendMediaEnded({
                mediaPublicId: currentMedia.publicId,
            });
        }

        const repeat = rockIt.userManager.repeatModeAtom.get();
        const queue = rockIt.queueManager.queue;
        const currentId = rockIt.queueManager.currentQueueMediaId;

        const queueItems = queue.map((item) => ({
            publicId: item.media.publicId,
            queueMediaId: item.queueMediaId,
        }));

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

    get playingAtom() {
        return this._playingAtom.getReadonlyAtom();
    }

    get loadingAtom() {
        return this._loadingAtom.getReadonlyAtom();
    }

    get currentTimeAtom() {
        return this._currentTimeAtom.getReadonlyAtom();
    }

    get volumeAtom() {
        return this._volumeAtom.getReadonlyAtom();
    }

    get crossFadeAtom() {
        return this._crossFadeAtom.getReadonlyAtom();
    }

    get videoElement(): HTMLVideoElement | undefined {
        return this._video;
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

    attachVideoToContainer(container: HTMLElement) {
        if (!this._video) return;
        container.appendChild(this._video);
        this._video.style.width = "100%";
        this._video.style.height = "100%";
        this._video.style.objectFit = "contain";
    }
}
