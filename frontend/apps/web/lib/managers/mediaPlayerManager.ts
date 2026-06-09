import {
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
import { audioBufferLoader } from "@/lib/audio/AudioBufferLoader";
import { audioEngine } from "@/lib/audio/AudioEngine";
import { Deck, EDeckState } from "@/lib/audio/Deck";
import {
    ETransitionProfile,
    TransitionEngine,
} from "@/lib/audio/TransitionEngine";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

const WS_TIME_SYNC_INTERVAL_MS = 1000;

export class MediaPlayerManager {
    static #instance: MediaPlayerManager;

    private _audioElement?: HTMLAudioElement;
    private _video?: HTMLVideoElement;
    private _videoContainer?: HTMLDivElement;

    private _deckA!: Deck;
    private _deckB!: Deck;
    private _transition!: TransitionEngine;

    private _playingAtom = createAtom<boolean>(false);
    private _loadingAtom = createAtom<boolean>(false);
    private _currentTimeAtom = createAtom<number>(0);
    private _volumeAtom = createAtom<number>(1);
    private _crossFadeAtom = createAtom<number>(3);
    private _transitionProfileAtom = createAtom<ETransitionProfile>(
        ETransitionProfile.CROSSFADE
    );

    private _muted = false;
    private _mutePreviousVolume?: number;
    private _lastWsSyncTime = 0;
    private _isSeeking = false;
    private _seekFrom: number = 0;
    private _currentMediaId: string | null = null;
    // Token to invalidate stale async song loads
    private _songLoadToken: number = 0;

    constructor() {
        if (typeof window === "undefined") return;
        if (MediaPlayerManager.#instance) return MediaPlayerManager.#instance;

        this._audioElement = new Audio();
        this._audioElement.preload = "auto";

        this._audioElement.onplaying = (): void => this._playingAtom.set(true);
        this._audioElement.onpause = (): void => this._playingAtom.set(false);
        this._audioElement.onplay = (): void => this._playingAtom.set(true);
        this._audioElement.onloadstart = (): void =>
            this._loadingAtom.set(true);
        this._audioElement.onloadeddata = (): void =>
            this._loadingAtom.set(false);
        this._audioElement.ontimeupdate = (): void => this._handleTimeUpdate();
        this._audioElement.onended = (): void => {
            this._handleEnded().catch((): void => {});
        };
        this._audioElement.onerror = (e): void => {
            console.error("MediaPlayerManager: audio error", e);
            this._handleMediaError();
        };

        this._video = document.createElement("video");
        this._video.preload = "auto";

        this._video.onplaying = (): void => this._playingAtom.set(true);
        this._video.onpause = (): void => this._playingAtom.set(false);
        this._video.onplay = (): void => this._playingAtom.set(true);
        this._video.onloadstart = (): void => this._loadingAtom.set(true);
        this._video.onloadeddata = (): void => this._loadingAtom.set(false);
        this._video.ontimeupdate = (): void => this._handleTimeUpdate();
        this._video.onended = (): void => {
            this._handleEnded().catch((): void => {});
        };
        this._video.onerror = (e): void => {
            console.error("MediaPlayerManager: video error", e);
            this._handleMediaError();
        };

        this._deckA = new Deck();
        this._deckB = new Deck();
        this._deckA.setOnEnded(() => {
            if (this._activeDeck === this._deckA) {
                this._handleEnded().catch(() => {});
            }
        });
        this._deckB.setOnEnded(() => {
            if (this._activeDeck === this._deckB) {
                this._handleEnded().catch(() => {});
            }
        });
        this._transition = new TransitionEngine();

        MediaPlayerManager.#instance = this;
        return MediaPlayerManager.#instance;
    }

    async play(): Promise<void> {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isStation(currentMedia)) {
            this.playStream(getMediaAudioSrc(currentMedia) ?? "");
            return;
        }

        if (isVideo(currentMedia)) {
            this.playVideo();
            return;
        }

        if (isSong(currentMedia)) {
            await this.playAudio();
        }
    }

    private async playAudio(): Promise<void> {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia || !isSong(currentMedia)) return;

        const url = getMediaAudioSrc(currentMedia);
        if (!url) return;
        // Ensure any playing video or audio stream is paused when switching to a song
        if (this._video) {
            this._video.pause();
            this._video.currentTime = 0;
            this._video.src = "";
        }
        if (this._audioElement) {
            this._audioElement.pause();
            this._audioElement.currentTime = 0;
            this._audioElement.src = "";
        }

        const activeDeck = this._activeDeck;
        const inactiveDeck = this._inactiveDeck;

        if (activeDeck.state === EDeckState.LOADED || activeDeck.state === EDeckState.PAUSED) {
            await audioEngine.ensureResumed();
            activeDeck.setVolumeImmediate(this._volumeAtom.get());
            activeDeck.play();
            this._playingAtom.set(true);
            this._isSeeking = false;
            this._currentMediaId = currentMedia.publicId;
            this._sendCurrentMedia(currentMedia);
            this._preloadNext();
            return;
        }

        if (
            inactiveDeck.state === EDeckState.LOADED &&
            rockIt.queueManager.isNextMedia(currentMedia.publicId)
        ) {
            await audioEngine.ensureResumed();
            const durationMs = this._crossFadeAtom.get() * 1000;
            await this._transition.execute({
                profile: this._transitionProfileAtom.get(),
                durationMs,
                from: activeDeck,
                to: inactiveDeck,
            });
            this._swapDecks();
            this._playingAtom.set(true);
            this._currentMediaId = currentMedia.publicId;
            this._sendCurrentMedia(currentMedia);
            this._preloadNext();
            return;
        }

        try {
            this._loadingAtom.set(true);
            await audioEngine.ensureResumed();

            const buffer = await audioBufferLoader.load(url);
            activeDeck.load(buffer);
            activeDeck.setVolumeImmediate(this._volumeAtom.get());
            activeDeck.play();

            this._playingAtom.set(true);
            this._loadingAtom.set(false);
            this._currentMediaId = currentMedia.publicId;
            this._sendCurrentMedia(currentMedia);
            this._preloadNext();
        } catch (err) {
            console.error("MediaPlayerManager: playAudio failed", err);
            this._loadingAtom.set(false);
            this._playingAtom.set(false);
        }
    }

    private playVideo(): void {
        if (!this._video) return;
        this._setVideoSource();
        this._video.play().catch((err): void => {
            if (err.name !== "NotAllowedError") {
                console.warn("MediaPlayerManager: video play failed", err);
            }
        });
    }

    private playStream(url: string): void {
        if (!this._audioElement) return;
        this._stopAllPlayback();
        this._audioElement.src = url;
        this._audioElement.currentTime = 0;
        this._audioElement.volume = this._volumeAtom.get();
        this._audioElement
            .play()
            .catch((err): void =>
                console.warn("MediaPlayerManager: stream failed", err)
            );

        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia) {
            this._sendCurrentMedia(currentMedia);
        }
    }

    pause(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            this._video?.pause();
            return;
        }

        if (isStation(currentMedia)) {
            this._audioElement?.pause();
            return;
        }

        const activeDeck = this._activeDeck;
        if (activeDeck.state === EDeckState.PLAYING) {
            activeDeck.pause();
            this._playingAtom.set(false);
        }
    }

    togglePlayPause(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia) || isStation(currentMedia)) {
            const el = isVideo(currentMedia) ? this._video : this._audioElement;
            if (!el) return;
            if (el.paused) {
                this.play();
            } else {
                this.pause();
            }
            return;
        }

        const activeDeck = this._activeDeck;
        if (activeDeck.state === EDeckState.PLAYING) {
            this.pause();
        } else {
            this.play();
        }
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
        } else if (isStation(currentMedia)) {
            if (!this._audioElement) return;
            if (this._audioElement.paused) {
                this.play();
            } else {
                this.pause();
            }
        } else {
            const activeDeck = this._activeDeck;
            if (activeDeck.state === EDeckState.PLAYING) {
                this.pause();
            } else {
                this.play();
            }
        }
    }

    async skipForward(): Promise<void> {
        if (this._transition.isTransitioning) return;


        const queue = rockIt.queueManager.queue;
        const currentQueueMediaId = rockIt.queueManager.currentQueueMediaId;
        if (currentQueueMediaId === null) return;

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const nextIndex = (currentIndex + 1) % queue.length;
        const nextItem = queue[nextIndex];
        if (!nextItem) return;

        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia?.publicId) {
            rockIt.webSocketManager.sendSkipClicked({
                direction: "NEXT",
                mediaPublicId: currentMedia.publicId,
            });
        }

        await this._transitionToMedia(nextItem.media, nextItem.queueMediaId, 1);
    }

    async skipBack(): Promise<void> {
        if (this._transition.isTransitioning) return;

        const queue = rockIt.queueManager.queue;
        const currentQueueMediaId = rockIt.queueManager.currentQueueMediaId;
        if (currentQueueMediaId === null) return;

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        const prevItem = queue[prevIndex];
        if (!prevItem) return;

        const currentMedia = rockIt.queueManager.currentMedia;
        if (currentMedia?.publicId) {
            rockIt.webSocketManager.sendSkipClicked({
                direction: "PREVIOUS",
                mediaPublicId: currentMedia.publicId,
            });
        }

        await this._transitionToMedia(
            prevItem.media,
            prevItem.queueMediaId,
            -1
        );
    }

    private async _transitionToMedia(
        targetMedia: TPlayableMedia,
        targetQueueMediaId: number,
        direction: 1 | -1
    ): Promise<void> {
        if (isStation(targetMedia) || isVideo(targetMedia)) {
            // Stop any existing playback (audio element, video, decks) before switching media type
            this._stopAllPlayback();
            rockIt.queueManager.setQueueMediaId(targetQueueMediaId, direction);
            this.setMedia();
            this.play();
            return;
        }

        const currentMedia = rockIt.queueManager.currentMedia;
        const fromSong = currentMedia && isSong(currentMedia);
        const toSong = isSong(targetMedia);
        const url = getMediaAudioSrc(targetMedia);
        if (!url) return;

        try {
            await audioEngine.ensureResumed();
                // Pause any playing video when transitioning to a song
                if (this._video) {
                    this._video.pause();
                }
            const inactiveDeck = this._inactiveDeck;
            const activeDeck = this._activeDeck;

            if (inactiveDeck.state !== EDeckState.LOADED) {
                this._loadingAtom.set(true);
                const buffer = await audioBufferLoader.load(url);
                inactiveDeck.load(buffer);
                this._loadingAtom.set(false);
            }

            inactiveDeck.setVolumeImmediate(0);
            inactiveDeck.setPlaybackRate(1);

            const durationMs =
                fromSong && toSong ? this._crossFadeAtom.get() * 1000 : 0;

            await this._transition.execute({
                profile: this._transitionProfileAtom.get(),
                durationMs,
                from: activeDeck,
                to: inactiveDeck,
            });

            this._swapDecks();
            rockIt.queueManager.setQueueMediaId(targetQueueMediaId, direction);

            this._playingAtom.set(true);
            this._currentMediaId = targetMedia.publicId;
            this._sendCurrentMedia(targetMedia);
            this._preloadNext();
        } catch (err) {
            console.error("MediaPlayerManager: transition failed", err);
            rockIt.queueManager.setQueueMediaId(targetQueueMediaId, direction);
            this.setMedia();
            this.play();
        }
    }

    beginSeek(): void {
        this._isSeeking = true;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            this._seekFrom = this._video?.currentTime ?? 0;
        } else if (isStation(currentMedia)) {
            this._seekFrom = this._audioElement?.currentTime ?? 0;
        } else {
            this._seekFrom = this._activeDeck.getCurrentTime();
        }
    }

    setCurrentTime(time: number, sendMessage: boolean = true): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            if (!this._video) return;
            const timeFrom = this._video.currentTime;
            this._video.currentTime = time;
            if (sendMessage)
                this._sendSeek(currentMedia.publicId, timeFrom, time);
        } else if (isStation(currentMedia)) {
            if (!this._audioElement) return;
            const timeFrom = this._audioElement.currentTime;
            this._audioElement.currentTime = time;
            if (sendMessage)
                this._sendSeek(currentMedia.publicId, timeFrom, time);
        } else {
                const timeFrom = this._activeDeck.getCurrentTime();
                this._activeDeck.stop();
                // Use existing buffer to seek without reloading
                this._activeDeck.play(undefined, time);
                if (sendMessage)
                    this._sendSeek(currentMedia.publicId, timeFrom, time);
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
        } else if (isStation(currentMedia)) {
            if (!this._audioElement) return;
            this._audioElement.currentTime = time;
        } else {
            this._activeDeck.stop();
            // Use existing buffer to seek without reloading
            this._activeDeck.play(undefined, time);
        }
        this._currentTimeAtom.set(time);
        this._sendSeek(currentMedia.publicId, this._seekFrom, time);
    }

    mute(): void {
        const currentMedia = rockIt.queueManager.currentMedia;
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

    setTransitionProfile(profile: ETransitionProfile): void {
        this._transitionProfileAtom.set(profile);
    }

    setMedia(useSavedCurrentTime: boolean = false): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia) return;

        if (isVideo(currentMedia)) {
            // Stop any audio decks and stream playback when switching to video
            this._deckA.reset();
            this._deckB.reset();
            if (this._audioElement) {
                this._audioElement.pause();
                this._audioElement.currentTime = 0;
                this._audioElement.src = "";
            }
            this._setVideoSource(useSavedCurrentTime);
        } else if (isSong(currentMedia)) {
            // Stop video and any streaming audio when switching to a song
            if (this._video) {
                this._video.pause();
                this._video.currentTime = 0;
                this._video.src = "";
            }
            if (this._audioElement) {
                this._audioElement.pause();
                this._audioElement.currentTime = 0;
                this._audioElement.src = "";
            }
            this._loadSongToDeck(useSavedCurrentTime);
        }
    }

private _loadSongToDeck(useSavedCurrentTime: boolean): void {
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia || !isSong(currentMedia)) return;
 
        const url = getMediaAudioSrc(currentMedia);
        if (!url) return;
 
        // Increment load token to identify this specific load attempt
        this._songLoadToken = (this._songLoadToken ?? 0) + 1;
        const loadToken = this._songLoadToken;
        const expectedMediaId = currentMedia.publicId;
 
        const activeDeck = this._activeDeck;
        audioBufferLoader
            .load(url)
            .then((buffer): void => {
                // Verify that the media hasn't changed and this is the latest load
                const stillCurrent = rockIt.queueManager.currentMedia;
                if (!stillCurrent || stillCurrent.publicId !== expectedMediaId || loadToken !== this._songLoadToken) {
                    // Stale load – ignore
                    return;
                }
                activeDeck.load(buffer);
                activeDeck.setVolumeImmediate(this._volumeAtom.get());
                if (useSavedCurrentTime) {
                    const savedTimeMs =
                        rockIt.userManager.currentTimeMsAtom.get() ?? 0;
                    if (savedTimeMs > 0) {
                        activeDeck.stop();
                        activeDeck.load(buffer);
                        activeDeck.setVolumeImmediate(this._volumeAtom.get());
                    }
                }
                this._currentMediaId = currentMedia.publicId;
                this._sendCurrentMedia(currentMedia);
                this._preloadNext();
            })
            .catch((err): void => {
                console.error("MediaPlayerManager: setAudio failed", err);
            });
    }

    private _setVideoSource(useSavedCurrentTime: boolean = false): void {
        if (!this._video) return;
        const currentMedia = rockIt.queueManager.currentMedia;
        if (!currentMedia || currentMedia.type !== "video") return;

        const videoSrc = getMediaVideoSrc(currentMedia);
        if (!videoSrc) return;
        if (this._video.src === videoSrc) return;

        this._video.volume = this._volumeAtom.get();
        this._video.src = videoSrc;
        this._video.currentTime = 0;

        if (useSavedCurrentTime) {
            const savedTimeMs = rockIt.userManager.currentTimeMsAtom.get() ?? 0;
            if (savedTimeMs > 0) {
                this._video.currentTime = savedTimeMs / 1000;
            }
        }

        this._sendCurrentMedia(currentMedia);
    }

    private _preloadNext(): void {
        const nextMedia = rockIt.queueManager.nextMedia;
        if (!nextMedia || !isSong(nextMedia)) return;

        const url = getMediaAudioSrc(nextMedia);
        if (url && !audioBufferLoader.isLoaded(url)) {
            audioBufferLoader.preload(url);
        }
    }

    private get _activeDeck(): Deck {
        return this._deckA;
    }

    private get _inactiveDeck(): Deck {
        return this._deckB;
    }

    private _swapDecks(): void {
        [this._deckA, this._deckB] = [this._deckB, this._deckA];
    }

    // Stop all playback sources: HTMLAudioElement, video, and both decks.
    private _stopAllPlayback(): void {
        // Stop and clear HTMLAudioElement (stream)
        if (this._audioElement) {
            this._audioElement.pause();
            // Reset source to prevent residual playback
            this._audioElement.currentTime = 0;
            this._audioElement.src = "";
        }
        // Stop and clear video element
        if (this._video) {
            this._video.pause();
            this._video.currentTime = 0;
            this._video.src = "";
        }
        // Reset both decks to ensure no Web Audio sources are playing
        if (this._deckA) {
            this._deckA.reset();
        }
        if (this._deckB) {
            this._deckB.reset();
        }
        // Update playing state
        this._playingAtom.set(false);
    }

    private _sendCurrentMedia(currentMedia: TPlayableMedia): void {
        const queueMediaId = rockIt.queueManager.currentQueueMediaId;
        const queueType = rockIt.userManager.queueTypeAtom.get();

        if (queueMediaId === null) return;
        if (queueType === undefined) return;

        rockIt.webSocketManager.sendCurrentMedia({
            mediaPublicId: currentMedia.publicId,
            queueMediaId,
            queueType,
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
        } else if (isStation(currentMedia)) {
            if (!this._audioElement) return;
            time = this._audioElement.currentTime;
        } else if (isSong(currentMedia)) {
            time = this._activeDeck.getCurrentTime();
        }

        this._currentTimeAtom.set(time);

        const now = Date.now();
        if (now - this._lastWsSyncTime >= WS_TIME_SYNC_INTERVAL_MS) {
            this._lastWsSyncTime = now;
            rockIt.webSocketManager.sendCurrentTime({
                currentTimeMs: Math.round(time * 1000),
                mediaPublicId: currentMedia.publicId,
            });
        }
    }

    private async _handleEnded(): Promise<void> {
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
            // Reset deck to ensure playback starts from the beginning
            this._activeDeck.stop();
            this._activeDeck.setVolumeImmediate(this._volumeAtom.get());
            this._activeDeck.play();
        } else if (action === EQueueAction.PLAY && nextId !== null) {
            const nextItem = queue.find(
                (item): boolean => item.queueMediaId === nextId
            );
            if (nextItem) {
                await this._transitionToMedia(nextItem.media, nextId, 1);
            }
        } else {
            this._playingAtom.set(false);
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

        setTimeout((): void => {
            if (action === EQueueAction.REPLAY) {
                this.setMedia();
                this.play();
            } else if (action === EQueueAction.PLAY && nextId !== null) {
                const nextItem = queue.find(
                    (item): boolean => item.queueMediaId === nextId
                );
                if (nextItem) {
                    this._transitionToMedia(nextItem.media, nextId, direction);
                }
            } else {
        this._playingAtom.set(false);
        this._loadingAtom.set(false);
            }
        }, 1000);
    }

    set volume(value: number) {
        const clamped = Math.max(0, Math.min(1, value));
        this._volumeAtom.set(clamped);
        // Apply immediately to the active deck if currently playing
        const activeDeck = this._activeDeck;
        if (activeDeck.state === EDeckState.PLAYING) {
            activeDeck.setVolumeImmediate(clamped);
        }
    }

    get volume(): number {
        return this._volumeAtom.get();
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

    get transitionProfileAtom(): ReadonlyAtom<ETransitionProfile> {
        return this._transitionProfileAtom.getReadonlyAtom();
    }

    get audioElement(): HTMLAudioElement | undefined {
        return this._audioElement;
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

    attachVideoToContainer(container: HTMLElement): void {
        if (!this._video) return;
        container.appendChild(this._video);
        this._video.style.width = "100%";
        this._video.style.height = "100%";
        this._video.style.objectFit = "cover";
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
}
