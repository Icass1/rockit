import { ERepeatMode } from "@/models/enums/repeatMode";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class AudioManager {
    static #instance: AudioManager;

    private _audio?: HTMLAudioElement;

    // #region: Atoms

    private _playingAtom = createAtom<boolean>(false);
    private _loadingAtom = createAtom<boolean>(false);
    private _currentTimeAtom = createAtom<number>(0);
    private _currentVolume = createAtom<number>(1);
    private _crossFadeAtom = createAtom<number>(0);

    // #endregion: Atoms

    private _mutePreviousVolume?: number;

    private _muted = false;

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;

        if (AudioManager.#instance) {
            console.warn("Returning existing instance of AudioManager");
            return AudioManager.#instance;
        }

        this._audio = new Audio();

        this._audio.onplaying = (ev: Event) => {
            this.handleAudioPlaying(ev);
        };
        this._audio.ontimeupdate = () => {
            this.handleAudioTimeUpdate();
        };
        this._audio.onloadeddata = (ev: Event) => {
            this.handleLoadedData(ev);
        };
        this._audio.onloadstart = (ev: Event) => {
            this.handleLoadStart(ev);
        };
        this._audio.onpause = (ev: Event) => {
            this.handleAudioPause(ev);
        };
        this._audio.onplay = (ev: Event) => {
            this.handleAudioPlay(ev);
        };
        this._audio.onended = () => {
            this.handleAudioEnded();
        };

        AudioManager.#instance = this;

        return AudioManager.#instance;
    }

    // #endregion: Constructor

    // #region: Methods

    togglePlayPause() {
        if (!this._audio) {
            console.warn("(togglePlayPause) Audio element not initialized");
            return;
        }
        if (this._audio.paused) {
            this._audio.play();
        } else {
            this._audio.pause();
        }
    }

    togglePlayPauseOrSetMedia() {
        if (!this._audio) {
            console.warn(
                "(togglePlayPauseOrSetSong) Audio element not initialized"
            );
            return;
        }
        this.setSong();

        if (this._audio.paused) {
            this._audio.play();
        } else {
            this._audio.pause();
        }
    }

    setSong() {
        if (!this._audio) {
            console.warn("(setSong) Audio element not initialized");
            return;
        }
        if (
            rockIt.queueManager.currentMedia &&
            rockIt.queueManager.currentMedia.audioSrc &&
            rockIt.queueManager.currentQueueMediaId != null &&
            this._audio.src != rockIt.queueManager.currentMedia.audioSrc
        ) {
            console.log(
                `(setSong) Setting audio src to ${rockIt.queueManager.currentMedia.audioSrc}`
            );
            this._audio.volume = this._currentVolume.get();
            this._audio.src = rockIt.queueManager.currentMedia.audioSrc;
            this._audio.currentTime = rockIt.userManager.user?.currentTime ?? 0;

            rockIt.webSocketManager.sendCurrentMedia({
                mediaPublicId: rockIt.queueManager.currentMedia.publicId,
                queueMediaId: rockIt.queueManager.currentQueueMediaId,
            });
        }
    }

    play() {
        if (!this._audio) {
            console.warn("(play) Audio element not initialized");
            return;
        }

        this.setSong();

        this._audio.play();
    }

    pause() {
        if (!this._audio) {
            return;
        }
        this._audio.pause();
    }

    playStream(url: string) {
        if (!this._audio) return;

        rockIt.queueManager.clearCurrentMedia?.();

        this._audio.src = url;
        this._audio.volume = this._currentVolume.get();
        this._audio.play().catch((err) => {
            console.error("AudioManager: stream play failed:", err);
        });
    }

    mute() {
        if (!this._audio) {
            console.warn("(mute) Audio element not initialized");
            return false;
        }
        this._mutePreviousVolume = this.volume;
        this.volume = 0;
        this._muted = true;
    }

    unmute() {
        if (!this._audio) {
            console.warn("(unmute) Audio element not initialized");
            return false;
        }
        if (this._mutePreviousVolume !== undefined) {
            this.volume = this._mutePreviousVolume;
            this._mutePreviousVolume = undefined;
        } else {
            console.warn("(unmute) No previous volume stored.");
        }
        this._muted = false;
    }

    toggleMute() {
        if (!this._audio) {
            console.warn("(toggleMute) Audio element not initialized");
            return false;
        }
        if (this._muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    setCurrentTime(time: number) {
        if (!this._audio) {
            console.warn("(setCurrentTime) Audio element not initialized");
            return false;
        }
        const timeFrom = this._audio.currentTime;
        this._audio.currentTime = time;

        if (!rockIt.queueManager.currentMedia?.publicId) {
            rockIt.notificationManager.notifyError(
                "Current song is not defined to send seek."
            );
            return;
        }

        rockIt.webSocketManager.sendSeek({
            mediaPublicId: rockIt.queueManager.currentMedia.publicId,
            timeFrom,
            timeTo: time,
        });
    }

    setSrc() {
        throw new Error("(setSrc) Method not implemented.");
    }

    simulateSongEnded() {
        this.handleAudioEnded();
    }

    // #endregion: Methods

    // #region: Handlers

    private handleAudioPlaying(ev: Event) {
        console.log("(handleAudioPlaying)", ev);
    }

    private handleAudioTimeUpdate() {
        if (!this._audio) {
            console.warn(
                "(handleAudioTimeUpdate) Audio element not initialized"
            );
            return false;
        }
        this._currentTimeAtom.set(this._audio.currentTime);
        rockIt.webSocketManager.sendCurrentTime({
            currentTime: this._audio.currentTime,
        });
    }

    private handleLoadedData(ev: Event) {
        console.log("(handleLoadedData)", ev);
        this._loadingAtom.set(false);
    }

    private handleLoadStart(ev: Event) {
        console.log("(handleLoadStart)", ev);
        this._loadingAtom.set(true);
    }

    private handleAudioPause(ev: Event) {
        this._playingAtom.set(false);
        console.log("(handleAudioPause)", ev);
    }

    private handleAudioPlay(ev: Event) {
        this._playingAtom.set(true);
        console.log("(handleAudioPlay)", ev);
    }

    private handleAudioEnded() {
        const currentSong = rockIt.queueManager.currentMedia;
        const repeat = rockIt.userManager.repeatModeAtom.get();
        const queue = rockIt.queueManager.queue;
        const currentQueueMediaId = rockIt.queueManager.currentQueueMediaId;

        if (currentSong) {
            rockIt.webSocketManager.sendMediaEnded({
                mediaPublicId: currentSong.publicId,
            });
        }

        if (repeat === ERepeatMode.ONE) {
            this.play();
            return;
        }

        const nextIndex =
            queue.findIndex(
                (item) => item.queueMediaId === currentQueueMediaId
            ) + 1;

        if (nextIndex < queue.length) {
            rockIt.queueManager.setQueueMediaId(queue[nextIndex].queueMediaId);
            this.play();
        } else if (repeat === ERepeatMode.ALL && queue.length > 0) {
            rockIt.queueManager.setQueueMediaId(queue[0].queueMediaId);
            this.play();
        } else {
            this.pause();
        }
    }
    // #endregion: Handlers

    // #region: Setters

    set volume(value: number) {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return;
        }
        this._audio.volume = value;
        this._currentVolume.set(value);
    }
    // #endregion: Setters

    // #region: Getters

    get volume(): number {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return 1;
        }
        return this._audio?.volume;
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

    get currentTime() {
        return this._currentTimeAtom.get();
    }

    get volumeAtom() {
        return this._currentVolume.getReadonlyAtom();
    }
    get crossFadeAtom() {
        return this._crossFadeAtom.getReadonlyAtom();
    }

    // #endregion: Getters
}
