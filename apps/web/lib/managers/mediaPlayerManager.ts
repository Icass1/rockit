import type { AudioBoundsResponse } from "@/dto";
import {
    BaseMediaPlayerManager,
    createAtom,
    getMediaAlbum,
    getMediaAudioUrl,
    getMediaVideoUrl,
    getRockIt,
    isSong,
    isVideo,
    type ReadonlyAtom,
    type TMediaKind,
    type TPlayableMedia,
} from "@rockit/shared";
import type { WebTransitionSettings } from "@/models/types/transitions";
import { fetchAudioBounds } from "@/lib/audio/bounds";
import {
    DEFAULT_TRANSITIONS,
    transitionDuration,
    TransitionMixer,
} from "@/lib/audio/transitionMixer";
import { resolveOfflineAudioUrl } from "@/lib/offline/store";
import { isIOS } from "@/lib/utils/isIOS";

let _visibilityBound = false;

/**
 * Web media player: implements the shared BaseMediaPlayerManager primitives
 * against HTML <audio>/<video> elements. All playback/queue orchestration lives
 * in the base class.
 */
export class MediaPlayerManager extends BaseMediaPlayerManager {
    static #instance: MediaPlayerManager;

    private static _isiOS(): boolean {
        return isIOS();
    }

    private _durationAtom = createAtom<number>(0);

    get durationAtom(): ReadonlyAtom<number> {
        return this._durationAtom.getReadonlyAtom();
    }

    /** The loaded resource owns duration; catalog lengths may describe another edit. */
    protected override getPlaybackDuration(
        media: TPlayableMedia
    ): number | undefined {
        const el = this._el(this._effectiveKind(media));
        return el &&
            el.readyState >= 1 &&
            Number.isFinite(el.duration) &&
            el.duration > 0
            ? el.duration
            : super.getPlaybackDuration(media);
    }

    private _publishDuration(): void {
        const el = this._el(
            this._effectiveKind(getRockIt().queueManager.currentMedia)
        );
        this._durationAtom.set(
            el &&
                el.readyState >= 1 &&
                Number.isFinite(el.duration) &&
                el.duration > 0
                ? el.duration
                : 0
        );
    }

    private _audio?: HTMLAudioElement;
    private _video?: HTMLVideoElement;
    private _videoContainer?: HTMLDivElement;
    private _preloadAudio?: HTMLAudioElement;
    private _preloadedUri?: string;
    private _preloadedForQueueMediaId?: number;
    private _endedPollTimer?: ReturnType<typeof setInterval>;
    private _lastEndedTime = 0;

    private _transitionSettings = createAtom<WebTransitionSettings>({
        ...DEFAULT_TRANSITIONS,
    });
    private _mixer = new TransitionMixer();
    private _outgoing?: HTMLAudioElement;
    private _promotionQueueId?: number;
    private _promotionUri?: string;
    private _preserveTailPause = false;
    private _blendStarted = false;
    private _transitionTimer?: ReturnType<typeof setInterval>;
    private _blendTimer?: ReturnType<typeof setTimeout>;
    private _preloadGeneration = 0;
    private _settingsInitialized = false;
    private _bounds = new Map<string, AudioBoundsResponse>();
    private _boundsPending = new Set<string>();
    private _freshAudioSource = false;
    private _outgoingEnd?: number;

    private _audioBounds(
        publicId: string,
        duration: number
    ): AudioBoundsResponse | undefined {
        const bounds = this._bounds.get(publicId);
        return bounds?.status === "ready" &&
            bounds.duration !== null &&
            bounds.end !== null &&
            Number.isFinite(bounds.start) &&
            Number.isFinite(bounds.end) &&
            bounds.start >= 0 &&
            bounds.start < bounds.end &&
            bounds.end <= duration + 0.1 &&
            Math.abs(bounds.duration - duration) < 0.25
            ? bounds
            : undefined;
    }

    private async _prepareBounds(publicId: string): Promise<void> {
        if (!this._transitionsEnabled() || this._boundsPending.has(publicId))
            return;
        this._boundsPending.add(publicId);
        try {
            for (let attempt = 0; attempt < 6; attempt++) {
                const queue = getRockIt().queueManager;
                const next = queue.peekNextQueueItem();
                if (
                    !this._transitionsEnabled() ||
                    (queue.currentMedia?.publicId !== publicId &&
                        next?.media.publicId !== publicId)
                )
                    return;
                const bounds = await fetchAudioBounds(publicId);
                if (!bounds || bounds.status === "unavailable") return;
                if (bounds.status === "ready") {
                    // Keep only metadata for the current pair; no unbounded browser cache.
                    for (const key of this._bounds.keys()) {
                        if (
                            key !== queue.currentMedia?.publicId &&
                            key !== next?.media.publicId
                        )
                            this._bounds.delete(key);
                    }
                    this._bounds.set(publicId, bounds);
                    return;
                }
                await new Promise<void>((resolve) => setTimeout(resolve, 1000));
            }
        } catch {
            // Optional metadata, including offline: preserve ordinary playback.
        } finally {
            this._boundsPending.delete(publicId);
        }
    }

    constructor() {
        super();

        if (typeof window === "undefined") return;
        if (MediaPlayerManager.#instance) return MediaPlayerManager.#instance;

        this._audio = this._createAudio();

        this._video = document.createElement("video");
        this._video.preload = "metadata";
        this._video.setAttribute("playsInline", "");
        this._video.setAttribute("webkit-playsinline", "");

        this._video.onplaying = (): void => {
            if (
                this._video?.paused === false &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    "video"
            )
                this.onNativePlaying();
        };
        this._video.onpause = (): void => {
            if (
                this._video?.paused &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    "video"
            )
                this.onNativePaused();
        };
        this._video.onloadstart = (): void => {
            if (
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                "video"
            )
                this.onNativeLoadStart();
        };
        this._video.onloadedmetadata = this._video.ondurationchange =
            (): void => {
                if (
                    this._effectiveKind(
                        getRockIt().queueManager.currentMedia
                    ) === "video"
                )
                    this._publishDuration();
            };
        this._video.onloadeddata = (): void => {
            if (
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                "video"
            )
                this.onNativeLoaded();
        };
        this._video.ontimeupdate = (): void => {
            if (
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                "video"
            )
                return;
            this.onNativeTimeUpdate(this._video?.currentTime ?? 0);
        };
        this._video.onended = (): void => {
            if (
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                "video"
            )
                return;
            this.onNativeEnded();
        };
        this._video.onerror = (e): void => {
            // A failed picture must not skip otherwise playable background audio.
            if (!this._usesAudioForVideo()) this.onNativeError(e);
        };

        this._preloadAudio = this._createAudio();
        this._preloadAudio.preload = "metadata";
        this._preloadAudio.muted = true;
        this._preloadAudio.volume = 0;

        if (typeof document !== "undefined" && !_visibilityBound) {
            _visibilityBound = true;
            document.addEventListener("visibilitychange", (): void => {
                if (this._usesAudioForVideo()) {
                    if (document.hidden) this._switchToBackgroundAudio();
                    else this._restoreForegroundVideo();
                }
                if (!document.hidden) {
                    if (MediaPlayerManager._isiOS()) this._recoverEndedAudio();
                    this.activateTransitionsOnGesture();
                    void this.preloadNextTrack();
                    this._stopEndedPoll();
                } else if (MediaPlayerManager._isiOS()) {
                    this._startEndedPoll();
                }
            });
        }

        MediaPlayerManager.#instance = this;

        return MediaPlayerManager.#instance;
    }

    private _createAudio(): HTMLAudioElement {
        const el = new Audio();
        el.preload = "metadata";
        el.onplaying = (): void => {
            if (
                el.paused ||
                el !== this._audio ||
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                    "audio"
            )
                return;
            this.onNativePlaying();
            if (!el.paused && this._playingAtom.get()) this._startBlend();
        };
        el.onpause = (): void => {
            if (
                !el.paused ||
                el !== this._audio ||
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                    "audio"
            )
                return;
            this.onNativePaused();
            if (!this._preserveTailPause) this._cancelTransition();
            if (this._usesAudioForVideo()) this._video?.pause();
        };
        el.onloadstart = (): void => {
            if (
                el === this._audio &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    "audio"
            )
                this.onNativeLoadStart();
        };
        el.onloadedmetadata = el.ondurationchange = (): void => {
            if (
                el === this._audio &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    "audio"
            )
                this._publishDuration();
        };
        el.onloadeddata = (): void => {
            if (
                el === this._audio &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    "audio"
            )
                this.onNativeLoaded();
        };
        el.ontimeupdate = (): void => {
            if (
                el !== this._audio ||
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                    "audio"
            )
                return;
            this.onNativeTimeUpdate(el.currentTime);
            this._transitionTick();
        };
        el.onended = (): void => {
            if (el === this._outgoing) {
                this._cancelTransition();
                return;
            }
            if (
                el !== this._audio ||
                this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                    "audio"
            )
                return;
            if (!this._playRequested) return;
            const now = Date.now();
            if (now - this._lastEndedTime < 500) return;
            this._lastEndedTime = now;
            this._stopEndedPoll();
            this.onNativeEnded();
        };
        el.onerror = (error): void => {
            if (el === this._audio) {
                this._cancelTransition();
                if (this._mixer.has(el)) {
                    // A stream may support native playback but reject CORS or
                    // Web Audio routing. Retry once on a fresh native element;
                    // disconnecting a MediaElementSource cannot undo routing.
                    const uri = el.src,
                        position = el.currentTime;
                    el.pause();
                    this._mixer.reset(el, false);
                    el.removeAttribute("src");
                    el.load();
                    const native = this._createAudio();
                    const playbackId = this._playbackId;
                    this._audio = native;
                    native.volume = this._volumeAtom.get();
                    native.onloadedmetadata = (): void => {
                        if (
                            this._audio !== native ||
                            this._playbackId !== playbackId
                        )
                            return;
                        native.currentTime = position;
                        if (this._playRequested) this.play();
                    };
                    native.src = uri;
                    return;
                }
                this.onNativeError(error);
            }
        };
        el.onwaiting = (): void => {
            // An initial seek/play can emit waiting before the prepared deck
            // starts. Retain the tail until playing; abort only an audible mix.
            if (el === this._audio && this._blendStarted)
                this._cancelTransition();
        };
        return el;
    }

    initializeTransitionSettings(): void {
        if (this._settingsInitialized || typeof window === "undefined") return;
        this._settingsInitialized = true;
        try {
            const raw: unknown = JSON.parse(
                window.localStorage.getItem("rockit-web-transitions-v1") ??
                    "null"
            );
            if (raw && typeof raw === "object") {
                const value = raw as Partial<WebTransitionSettings>;
                this.configureTransitions({
                    enabled: value.enabled === true,
                    maxSeconds:
                        typeof value.maxSeconds === "number"
                            ? value.maxSeconds
                            : 3.5,
                    preserveAlbum: value.preserveAlbum !== false,
                });
            }
        } catch {
            /* Storage is optional. */
        }
    }

    configureTransitions(settings: Partial<WebTransitionSettings>): boolean {
        const current = this._transitionSettings.get();
        const next = { ...current, ...settings };
        next.maxSeconds = Number.isFinite(next.maxSeconds)
            ? Math.max(0.1, next.maxSeconds)
            : 3.5;
        this._transitionSettings.set(next);
        this._cancelTransition();
        if (next.enabled) this.activateTransitionsOnGesture();
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(
                    "rockit-web-transitions-v1",
                    JSON.stringify(next)
                );
                return true;
            } catch {
                /* Settings remain active for this session if storage is unavailable. */
            }
        }
        return false;
    }

    get supportsAdaptiveTransitions(): boolean {
        // iOS may suspend Web Audio and disallow starting the second deck while
        // locked. Retain its user-authorized native element across track changes.
        return !MediaPlayerManager._isiOS();
    }

    private _transitionsEnabled(): boolean {
        return (
            this.supportsAdaptiveTransitions &&
            this._transitionSettings.get().enabled
        );
    }

    activateTransitionsOnGesture(): void {
        if (this._transitionsEnabled()) this._mixer.activate();
    }

    get transitionSettingsAtom(): ReadonlyAtom<WebTransitionSettings> {
        return this._transitionSettings.getReadonlyAtom();
    }

    protected override pauseForMediaChange(): void {
        this._preserveTailPause =
            this._promotionQueueId !== undefined &&
            this._promotionQueueId ===
                getRockIt().queueManager.currentQueueMediaId;
        try {
            super.pauseForMediaChange();
        } finally {
            this._preserveTailPause = false;
        }
    }

    override async setMedia(
        useSavedCurrentTime = false,
        remotePlaybackId?: string,
        remoteTimeMs = 0,
        isPlaybackOwner = false
    ): Promise<void> {
        if (
            this._outgoing &&
            (this._promotionQueueId !==
                getRockIt().queueManager.currentQueueMediaId ||
                (remotePlaybackId !== undefined &&
                    remotePlaybackId !== this._playbackId))
        )
            this._cancelTransition();
        await super.setMedia(
            useSavedCurrentTime,
            remotePlaybackId,
            remoteTimeMs,
            isPlaybackOwner
        );
    }

    override pause(): void {
        if (!this._preserveTailPause) this._cancelTransition();
        super.pause();
        if (this._transitionTimer) {
            clearInterval(this._transitionTimer);
            this._transitionTimer = undefined;
        }
    }

    override beginSeek(): void {
        this._cancelTransition();
        super.beginSeek();
    }

    override setCurrentTime(time: number, sendMessage = true): void {
        this._cancelTransition();
        super.setCurrentTime(time, sendMessage);
    }

    override endSeek(time: number): void {
        this._cancelTransition();
        super.endSeek(time);
    }

    private _cancelTransition(): void {
        const old = this._outgoing;
        this._outgoing = undefined;
        this._outgoingEnd = undefined;
        this._promotionQueueId = undefined;
        this._promotionUri = undefined;
        this._blendStarted = false;
        if (this._blendTimer) clearTimeout(this._blendTimer);
        this._blendTimer = undefined;
        if (old) {
            old.pause();
            this._mixer.reset(old, false);
            old.removeAttribute("src");
            old.load();
        }
        if (this._audio) this._mixer.reset(this._audio, true);
        if (old && this._transitionsEnabled()) void this.preloadNextTrack();
    }

    private _startBlend(): void {
        const old = this._outgoing,
            current = this._audio;
        if (!old || !current || this._blendStarted) return;
        this._blendStarted = true;
        const remaining = (this._outgoingEnd ?? old.duration) - old.currentTime;
        if (!this._mixer.blend(old, current, remaining)) {
            this._cancelTransition();
            return;
        }
        this._blendTimer = setTimeout(
            (): void => {
                this._cancelTransition();
            },
            remaining * 1000 + 50
        );
    }

    private _transitionTick(): void {
        const audio = this._audio,
            settings = this._transitionSettings.get();
        if (
            !audio ||
            audio.paused ||
            !this._transitionsEnabled() ||
            !this._syncOwner ||
            !this._playRequested ||
            this._isSeeking ||
            this._loadingPlayback ||
            !this._mixer.running
        )
            return;
        const media = getRockIt().queueManager.currentMedia;
        if (!media || !isSong(media) || !this._mixer.has(audio)) return;
        const time = audio.currentTime,
            duration = audio.duration;
        if (!Number.isFinite(duration) || duration < 20) return;
        if (this._outgoing) {
            if (this._outgoing.ended) this._cancelTransition();
            return;
        }
        const bounds = this._audioBounds(media.publicId, duration);
        const audibleEnd = bounds?.end ?? duration;
        const remaining = audibleEnd - time;
        if (remaining > settings.maxSeconds || remaining < 0.15) return;
        const queue = getRockIt().queueManager;
        const next = queue.peekNextQueueItem();
        if (
            !next ||
            next.queueMediaId === queue.currentQueueMediaId ||
            !isSong(next.media) ||
            !next.media.downloaded ||
            getRockIt().userManager.repeatModeAtom.get() === "ONE"
        )
            return;
        if (settings.preserveAlbum) {
            const a = getMediaAlbum(media),
                b = getMediaAlbum(next.media);
            if (a && b && a.publicId === b.publicId) return;
        }
        const incoming = this._preloadAudio;
        if (!incoming || !Number.isFinite(incoming.duration)) return;
        const nextBounds = this._audioBounds(
            next.media.publicId,
            incoming.duration
        );
        const intro = nextBounds?.start ?? 0;
        const seconds = transitionDuration(
            audibleEnd - (bounds?.start ?? 0),
            (nextBounds?.end ?? incoming.duration) - intro,
            settings.maxSeconds
        );
        if (
            remaining > seconds ||
            this._preloadedForQueueMediaId !== next.queueMediaId ||
            !this._preloadedUri ||
            incoming.readyState < 3 ||
            !this._mixer.has(incoming)
        )
            return;
        // Do not promote an element that would immediately stall on its intro.
        let buffered = false;
        for (let i = 0; i < incoming.buffered.length; i++) {
            if (
                incoming.buffered.start(i) <= intro + 0.05 &&
                incoming.buffered.end(i) >=
                    Math.min(intro + Math.max(4, seconds), incoming.duration)
            )
                buffered = true;
        }
        if (!buffered) return;
        if (Math.abs(incoming.currentTime - intro) > 0.05) {
            incoming.currentTime = intro;
            return; // Wait for the actual seek and data before promotion.
        }
        if (incoming.seeking) return;
        this._outgoingEnd = audibleEnd;
        this._outgoing = audio;
        this._promotionQueueId = next.queueMediaId;
        this._promotionUri = this._preloadedUri;
        this._audio = incoming;
        this._preloadAudio = audio;
        incoming.muted = false;
        this._preloadedUri = undefined;
        this._preloadedForQueueMediaId = undefined;
        this._lastEndedTime = Date.now();
        // The normal base handoff owns queue identity, media-ended and the
        // server grant. Incoming remains silent/paused until that grant arrives.
        this.onNativeEnded();
    }

    // ===== Offline URI resolution =====

    private _usesAudioForVideo(
        media = getRockIt().queueManager.currentMedia
    ): boolean {
        return (
            MediaPlayerManager._isiOS() &&
            !!media &&
            isVideo(media) &&
            !!getMediaAudioUrl(media)
        );
    }

    protected override _effectiveKind(
        media: TPlayableMedia | undefined
    ): TMediaKind {
        // Use the video deck in the foreground for native A/V synchronization.
        // Switch to the audio deck before iOS backgrounds/suspends the page.
        return this._usesAudioForVideo(media) && document.hidden
            ? "audio"
            : super._effectiveKind(media);
    }

    protected override async afterMediaLoadedAsync(
        media: TPlayableMedia
    ): Promise<void> {
        if (!this._usesAudioForVideo(media) || this._audioOnlyAtom.get())
            return;
        const uri = getMediaAudioUrl(media);
        if (!uri || !this._audio) return;
        this.loadNativeSource("audio", uri);
    }

    private _syncVideoPicture(): void {
        // The video element is the foreground clock. Avoid starting it from
        // timeupdate, which is asynchronous and rejected by iOS autoplay rules.
    }

    private _connectForTransitions(
        element: HTMLAudioElement,
        audible: boolean
    ): HTMLAudioElement {
        try {
            element.crossOrigin = "use-credentials";
            this._mixer.connect(element, audible);
            return element;
        } catch (error) {
            console.error(
                "Transition routing unavailable; using native playback",
                error
            );
            element.pause();
            element.removeAttribute("src");
            element.load();
            const native = this._createAudio();
            native.muted = !audible;
            return native;
        }
    }

    private _switchToBackgroundAudio(): void {
        const video = this._video;
        const audio = this._audio;
        if (!video || !audio || video.paused || !this._playRequested) return;

        const position = video.currentTime;
        video.pause();
        audio.currentTime = position;
        this.playNative("audio");
    }

    private async _restoreForegroundVideo(): Promise<void> {
        const video = this._video;
        const audio = this._audio;
        if (!video || !audio || !this._playRequested) return;
        const media = getRockIt().queueManager.currentMedia;
        const videoUri = media ? getMediaVideoUrl(media) : undefined;
        if (videoUri && video.src !== videoUri) {
            await this.loadNativeSource("video", videoUri);
            this._loadedVideoUri = videoUri;
        }
        video.currentTime = audio.currentTime;
        audio.pause();
        video.play().catch((): void => {
            /* WebKit may require an explicit tap to resume inline video. */
        });
    }

    protected override async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        if (kind === "audio" && isSong(media)) {
            const offlineUrl = await resolveOfflineAudioUrl(media.publicId);
            if (offlineUrl) return offlineUrl;

            return getMediaAudioUrl(media);
        }

        return kind === "video"
            ? getMediaVideoUrl(media)
            : getMediaAudioUrl(media);
    }

    // ===== Platform primitives =====

    private _el(kind: TMediaKind): HTMLMediaElement | undefined {
        return kind === "video" ? this._video : this._audio;
    }

    protected override loadNativeSource(kind: TMediaKind, uri: string): void {
        if (kind === "audio") {
            const media = getRockIt().queueManager.currentMedia;
            const eligible =
                this._transitionsEnabled() && !!media && isSong(media);
            const promotion =
                this._promotionQueueId ===
                    getRockIt().queueManager.currentQueueMediaId &&
                uri === this._promotionUri;
            if (promotion) {
                this._publishDuration();
                return;
            }
            this._freshAudioSource = true;
            if (eligible && media) void this._prepareBounds(media.publicId);
            this._cancelTransition();
            if (this._audio && this._mixer.has(this._audio) && !eligible) {
                this._audio.pause();
                this._mixer.reset(this._audio, false);
                this._audio.removeAttribute("src");
                this._audio.load();
                this._audio = this._createAudio();
            }
            if (this._audio && eligible && this._mixer.running) {
                this._audio = this._connectForTransitions(this._audio, true);
            }
        }
        const el = this._el(kind);
        if (!el) return;

        if (kind === "video" && this._video && !this._video.isConnected) {
            const root = document.getElementById("rockit-video-root");
            if (root) {
                root.appendChild(this._video);
            } else {
                document.body.appendChild(this._video);
            }
        }

        if (
            kind === "audio" &&
            this._preloadAudio &&
            this._preloadedUri === uri &&
            this._preloadAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            this._durationAtom.set(0);
            el.src = uri;
            this._preloadedUri = undefined;
            this._preloadedForQueueMediaId = undefined;
            this._preloadAudio.removeAttribute("src");
            return;
        }

        this._durationAtom.set(0);
        el.src = uri;
        if (kind === "video") el.muted = false;
    }

    protected override clearNativeSource(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        if (kind === "audio") {
            this._stopEndedPoll();
            this._cancelTransition();
        }

        if (this._effectiveKind(getRockIt().queueManager.currentMedia) === kind)
            this._durationAtom.set(0);
        el.pause();
        el.currentTime = 0;
        const hadContent = el.hasAttribute("src") || el.srcObject !== null;
        el.removeAttribute("src");
        el.srcObject = null;
        if (hadContent) el.load();
    }

    protected override playNative(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        if (kind === "audio" && this._audio && this._mixer.has(this._audio))
            this._mixer.activate();

        this._publishDuration();
        const playbackId = this._playbackId;
        el.play()
            .then((): void => {
                // Safari can deliver an older pause after the incoming deck starts,
                // or omit a fresh playing event when reusing a preloaded element.
                // Reconcile only the active element and playback occurrence.
                if (
                    playbackId === this._playbackId &&
                    el === this._el(kind) &&
                    this._effectiveKind(
                        getRockIt().queueManager.currentMedia
                    ) === kind &&
                    !el.paused &&
                    !el.ended
                ) {
                    this.onNativePlaying();
                    if (kind === "audio" && this._playingAtom.get())
                        this._startBlend();
                }
                if (
                    kind === "audio" &&
                    document.hidden &&
                    MediaPlayerManager._isiOS()
                ) {
                    this._startEndedPoll();
                }
            })
            .catch((err): void => {
                console.error(
                    `MediaPlayerManager: ${kind} play failed`,
                    err.name,
                    err.message
                );
                if (err.name === "NotAllowedError") {
                    this._retryPlayOnGesture(kind);
                }
            });
    }

    protected override pauseNative(kind: TMediaKind): void {
        this._el(kind)?.pause();
        if (!this._preserveTailPause) this._cancelTransition();
        if (kind === "audio" && this._usesAudioForVideo()) this._video?.pause();
    }

    protected override seekNative(kind: TMediaKind, sec: number): void {
        const el = this._el(kind);
        if (!el) return;
        if (
            kind === "audio" &&
            this._promotionQueueId ===
                getRockIt().queueManager.currentQueueMediaId &&
            sec === 0
        )
            return;
        if (
            kind === "audio" &&
            !this._preserveTailPause &&
            this._promotionQueueId !==
                getRockIt().queueManager.currentQueueMediaId
        )
            this._cancelTransition();
        if (kind === "audio" && this._freshAudioSource) {
            this._freshAudioSource = false;
            const media = getRockIt().queueManager.currentMedia;
            if (
                sec === 0 &&
                media &&
                isSong(media) &&
                this._syncOwner &&
                this._transitionsEnabled() &&
                getRockIt().userManager.repeatModeAtom.get() !== "ONE"
            ) {
                sec =
                    this._audioBounds(media.publicId, el.duration)?.start ??
                    sec;
            }
        }
        el.currentTime = sec;
        if (kind === "audio") this._syncVideoPicture();
    }

    protected override getNativePosition(kind: TMediaKind): number {
        return this._el(kind)?.currentTime ?? 0;
    }

    protected override setNativeVolume(kind: TMediaKind, vol: number): void {
        const el = this._el(kind);
        if (!el) return;
        if (kind === "audio" && this._audio && this._mixer.has(this._audio)) {
            el.volume = 1;
            this._mixer.volume(vol);
        } else el.volume = vol;
    }

    protected override getNativeVolume(kind: TMediaKind): number {
        return kind === "audio" && this._audio && this._mixer.has(this._audio)
            ? this._volumeAtom.get()
            : (this._el(kind)?.volume ?? 1);
    }

    protected override isNativePaused(kind: TMediaKind): boolean {
        return this._el(kind)?.paused ?? true;
    }

    protected override _onPlayingStarted(): void {
        if (this._transitionsEnabled() && !this._transitionTimer) {
            this._transitionTimer = setInterval(
                (): void => this._transitionTick(),
                250
            );
        }
        if (
            typeof document !== "undefined" &&
            document.hidden &&
            !this._transitionsEnabled()
        )
            return;
        void this.preloadNextTrack();
    }

    async preloadNextTrack(): Promise<void> {
        if (this._outgoing) return;
        const generation = ++this._preloadGeneration;
        const next = getRockIt().queueManager.peekNextQueueItem();
        const playbackId = this._playbackId;
        if (!next || !this._preloadAudio) return;
        if (!isSong(next.media) && !isVideo(next.media)) return;

        let uri: string | undefined;
        if (isSong(next.media)) {
            const offline = await resolveOfflineAudioUrl(next.media.publicId);
            if (offline) uri = offline;
        }
        if (!uri) uri = getMediaAudioUrl(next.media);
        if (!uri) return;
        if (
            this._preloadedForQueueMediaId === next.queueMediaId &&
            this._preloadedUri === uri
        )
            return;

        if (
            generation !== this._preloadGeneration ||
            playbackId !== this._playbackId ||
            next.queueMediaId !==
                getRockIt().queueManager.peekNextQueueItem()?.queueMediaId ||
            this._outgoing
        )
            return;
        if (
            this._transitionsEnabled() &&
            this._mixer.running &&
            isSong(next.media)
        ) {
            this._preloadAudio = this._connectForTransitions(
                this._preloadAudio,
                false
            );
            this._preloadAudio.muted = false;
            this._preloadAudio.preload = "auto";
        } else {
            this._preloadAudio.preload = "metadata";
        }
        this._preloadAudio.src = uri;
        this._preloadAudio.load();
        this._preloadedUri = uri;
        this._preloadedForQueueMediaId = next.queueMediaId;
        if (isSong(next.media) && this._transitionsEnabled()) {
            // Refresh source identity on each preparation, including after redownload.
            this._bounds.delete(next.media.publicId);
            void this._prepareBounds(next.media.publicId);
        }
    }

    private _retryPlayOnGesture(kind: TMediaKind): void {
        const playbackId = this._playbackId;
        const handler = (): void => {
            document.removeEventListener("pointerup", handler);
            document.removeEventListener("keydown", handler);
            const el = this._el(kind);
            if (
                el?.paused &&
                this._playRequested &&
                this._syncOwner &&
                this._playbackId === playbackId &&
                this._effectiveKind(getRockIt().queueManager.currentMedia) ===
                    kind
            ) {
                el.play().catch((err): void =>
                    console.error("MediaPlayerManager: retry play failed", err)
                );
            }
        };
        document.addEventListener("pointerup", handler, { once: true });
        document.addEventListener("keydown", handler, { once: true });
    }

    private _startEndedPoll(): void {
        if (!MediaPlayerManager._isiOS() || this._endedPollTimer) return;

        this._endedPollTimer = setInterval(
            (): void => this._recoverEndedAudio(),
            1000
        );
    }

    private _recoverEndedAudio(): void {
        const el = this._audio;
        if (
            !el ||
            !this._playRequested ||
            !this._syncOwner ||
            this._loadingPlayback ||
            this._effectiveKind(getRockIt().queueManager.currentMedia) !==
                "audio"
        )
            return;
        // ended media is normally paused. Checking paused first discarded exactly
        // the state this Safari fallback needs to recover. Never skip the tail or
        // turn a manual pause near the end into a queue advance.
        const exhausted =
            !el.paused &&
            Number.isFinite(el.duration) &&
            el.duration > 0 &&
            el.currentTime >= el.duration;
        if (!el.ended && !exhausted) return;
        const now = Date.now();
        if (now - this._lastEndedTime < 500) return;
        this._lastEndedTime = now;
        this._stopEndedPoll();
        this.onNativeEnded();
    }

    private _stopEndedPoll(): void {
        if (this._endedPollTimer) {
            clearInterval(this._endedPollTimer);
            this._endedPollTimer = undefined;
        }
    }

    // ===== Web-only DOM helpers (consumed by the player UI / iOS unlock) =====

    get audioElement(): HTMLAudioElement | undefined {
        return this._audio;
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
        this._video.style.display = "block";
        this._video.style.position = "absolute";
        this._video.style.inset = "0";
        this._video.style.width = "100%";
        this._video.style.height = "100%";
        this._video.style.maxWidth = "100%";
        this._video.style.maxHeight = "100%";
        this._video.style.objectFit = "contain";
        this._syncVideoPicture();
    }

    detachVideoFromContainer(container: HTMLElement): void {
        if (this._video?.parentElement !== container) return;
        const root = document.getElementById("rockit-video-root");
        if (root) root.appendChild(this._video);
    }
}
