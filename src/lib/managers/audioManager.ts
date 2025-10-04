import { atom } from "nanostores";
import { rockIt } from "@/lib/rockit";

export class AudioManager {
    private _audio?: HTMLAudioElement;

    // #region: Atoms

    private _playingAtom = atom<boolean>(false);
    private _loadingAtom = atom<boolean>(false);
    private _currentTimeAtom = atom<number>(0);
    private _currentVolume = atom<number>(1);

    // #endregion: Atoms

    private _mutePreviousVolume?: number;

    private _muted = false;

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;

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
    }

    // #endregion: Constructor

    // #region: Methods

    skipBack() {
        throw new Error("(skipBack) Method not implemented.");
    }

    skipForward() {
        throw new Error("(skipForward) Method not implemented.");
    }

    togglePlayPause() {
        throw new Error("(togglePlayPause) Method not implemented.");
    }

    togglePlayPauseOrSetSong() {
        throw new Error("(togglePlayPauseOrSetSong) Method not implemented.");
    }

    play() {
        if (!this._audio) {
            console.warn("(play) Audio element not initialized");
            return;
        }

        if (
            rockIt.queueManager.currentSong?.audioUrl &&
            this._audio.src != rockIt.queueManager.currentSong.audioUrl
        ) {
            console.log(
                `(play) Setting audio src to ${rockIt.queueManager.currentSong.audioUrl}`
            );
            this._audio.volume = this._currentVolume.get();
            this._audio.src = rockIt.queueManager.currentSong.audioUrl;

            rockIt.webSocketManager.send({
                currentSong: rockIt.queueManager.currentSong.publicId,
            });
        }
        this._audio.play();
    }

    pause() {
        throw new Error("(pause) Method not implemented.");
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
        this._audio.currentTime = time;
    }

    setSrc() {
        throw new Error("(setSrc) Method not implemented.");
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
        rockIt.webSocketManager.send({
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
        this.playingAtom.set(false);
        console.log("(handleAudioPause)", ev);
    }

    private handleAudioPlay(ev: Event) {
        this.playingAtom.set(true);
        console.log("(handleAudioPlay)", ev);
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
        return this._playingAtom;
    }

    get loadingAtom() {
        return this._loadingAtom;
    }

    get currentTimeAtom() {
        return this._currentTimeAtom;
    }
    get volumeAtom() {
        return this._currentVolume;
    }

    // #endregion: Getters
}