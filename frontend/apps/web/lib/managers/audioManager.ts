import { resolveNextOnEnd } from "@rockit/shared";
import { getMediaAudioSrc } from "@/types/media";
import type { RepeatMode } from "@/lib/managers/userManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

const WS_TIME_SYNC_INTERVAL_MS = 5000;

export class AudioManager {
    static #instance: AudioManager;

    private _audio?: HTMLAudioElement;

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
        if (AudioManager.#instance) return AudioManager.#instance;

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
            console.warn("AudioManager: audio error", e);
            this._loadingAtom.set(false);
            this._playingAtom.set(false);
        };

        AudioManager.#instance = this;
        return AudioManager.#instance;
    }

    play() {
        if (!this._audio) return;
        this._setSong();
        this._audio.play().catch((err) => {
            if (err.name !== "NotAllowedError") {
                console.warn("AudioManager: play failed", err);
            }
        });
    }

    pause() {
        this._audio?.pause();
    }

    togglePlayPause() {
        if (!this._audio) return;
        if (this._audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    togglePlayPauseOrSetMedia() {
        if (!this._audio) return;
        this.setSong();
        if (this._audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    playStream(url: string) {
        if (!this._audio) return;
        rockIt.queueManager.clearCurrentMedia();
        this._audio.src = url;
        this._audio.volume = this._volumeAtom.get();
        this._audio
            .play()
            .catch((err) => console.warn("AudioManager: stream failed", err));
    }

    setCurrentTime(time: number) {
        if (!this._audio) return;
        const timeFrom = this._audio.currentTime;
        this._audio.currentTime = time;

        const publicId = rockIt.queueManager.currentMedia?.publicId;
        if (publicId) {
            rockIt.webSocketManager.sendSeek({
                mediaPublicId: publicId,
                timeFrom,
                timeTo: time,
            });
        }
    }

    mute() {
        if (!this._audio) return;
        this._mutePreviousVolume = this.volume;
        this.volume = 0;
        this._muted = true;
    }

    unmute() {
        if (!this._audio) return;
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

    setSong() {
        this._setSong();
    }

    private _setSong() {
        if (!this._audio) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        const audioSrc = getMediaAudioSrc(currentMedia);

        if (!currentMedia || !audioSrc) return;
        if (this._audio.src === audioSrc) return;

        this._audio.volume = this._volumeAtom.get();
        this._audio.src = audioSrc;

        const savedTimeMs = rockIt.userManager.user?.currentTimeMs ?? 0;
        if (savedTimeMs > 0) {
            this._audio.currentTime = savedTimeMs / 1000;
        }

        const queueMediaId = rockIt.queueManager.currentQueueMediaId;
        if (queueMediaId !== null) {
            rockIt.webSocketManager.sendCurrentMedia({
                mediaPublicId: currentMedia.publicId,
                queueMediaId,
            });
        }
    }

    private _handleTimeUpdate() {
        if (!this._audio) return;
        const time = this._audio.currentTime;
        this._currentTimeAtom.set(time);

        const now = Date.now();
        if (now - this._lastWsSyncTime >= WS_TIME_SYNC_INTERVAL_MS) {
            this._lastWsSyncTime = now;
            rockIt.webSocketManager.sendCurrentTime({ currentTime: time });
        }
    }

    private _handleEnded() {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia) {
            rockIt.webSocketManager.sendMediaEnded({
                mediaPublicId: currentMedia.publicId,
            });
        }

        const repeat = rockIt.userManager.repeatModeAtom.get() as RepeatMode;
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

        if (action === "replay") {
            this.play();
        } else if (action === "play" && nextId !== null) {
            rockIt.queueManager.setQueueMediaId(nextId);
            this.play();
        } else {
            this._playingAtom.set(false);
        }
    }

    set volume(value: number) {
        if (!this._audio) return;
        const clamped = Math.max(0, Math.min(1, value));
        this._audio.volume = clamped;
        this._volumeAtom.set(clamped);
    }

    get volume(): number {
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
}
