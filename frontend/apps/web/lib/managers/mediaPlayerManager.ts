import {
    BaseMediaPlayerManager,
    getMediaAudioUrl,
    getMediaVideoUrl,
    getRockIt,
    isSong,
    isVideo,
    type TMediaKind,
    type TPlayableMedia,
} from "@rockit/shared";
import { resolveOfflineAudioUrl } from "@/lib/offline/store";

let _visibilityBound = false;

/*
 * Audio URLs already sent to the service worker cache this session.
 * The warm-up is a plain full fetch (no Range header): the SW caches the
 * 200 response, so later <audio> Range requests are served from cache —
 * including when offline. See the "rockit-audio" route in app/sw.ts.
 */
const _warmedAudioUrls = new Set<string>();

/**
 * Web media player: implements the shared BaseMediaPlayerManager primitives
 * against HTML <audio>/<video> elements. All playback/queue orchestration lives
 * in the base class.
 */
export class MediaPlayerManager extends BaseMediaPlayerManager {
    static #instance: MediaPlayerManager;

    private static _isiOS(): boolean {
        return (
            typeof navigator !== "undefined" &&
            /iPad|iPhone|iPod/.test(navigator.userAgent ?? "")
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

    constructor() {
        super();

        if (typeof window === "undefined") return;
        if (MediaPlayerManager.#instance) return MediaPlayerManager.#instance;

        this._audio = new Audio();
        this._audio.preload = "auto";

        this._audio.onplaying = this.onNativePlaying;
        this._audio.onpause = this.onNativePaused;
        this._audio.onplay = this.onNativePlaying;
        this._audio.onloadstart = this.onNativeLoadStart;
        this._audio.onloadeddata = this.onNativeLoaded;
        this._audio.ontimeupdate = (): void =>
            this.onNativeTimeUpdate(this._audio?.currentTime ?? 0);
        this._audio.onended = (): void => {
            const now = Date.now();
            if (now - this._lastEndedTime < 500) return;
            this._lastEndedTime = now;
            this._stopEndedPoll();
            this.onNativeEnded();
        };
        this._audio.onerror = (e): void => this.onNativeError(e);

        this._video = document.createElement("video");
        this._video.preload = "auto";
        this._video.setAttribute("playsInline", "");
        this._video.setAttribute("webkit-playsinline", "");

        this._video.onplaying = this.onNativePlaying;
        this._video.onpause = this.onNativePaused;
        this._video.onplay = this.onNativePlaying;
        this._video.onloadstart = this.onNativeLoadStart;
        this._video.onloadeddata = this.onNativeLoaded;
        this._video.ontimeupdate = (): void =>
            this.onNativeTimeUpdate(this._video?.currentTime ?? 0);
        this._video.onended = this.onNativeEnded;
        this._video.onerror = (e): void => this.onNativeError(e);

        this._preloadAudio = new Audio();
        this._preloadAudio.preload = "auto";
        this._preloadAudio.muted = true;
        this._preloadAudio.volume = 0;

        if (typeof document !== "undefined" && !_visibilityBound) {
            _visibilityBound = true;
            document.addEventListener("visibilitychange", (): void => {
                if (!document.hidden) {
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

    // ===== Offline URI resolution =====

    /**
     * Fire-and-forget full fetch so the service worker caches the complete
     * audio file while the current one streams. Only full 200 responses are
     * cacheable, which is why the warm-up must omit the Range header.
     */
    private _warmNetworkAudioCache(uri: string | undefined): void {
        if (!uri || _warmedAudioUrls.has(uri)) return;

        _warmedAudioUrls.add(uri);
        // Media element requests carry cookies even when cross-origin;
        // the warm-up must match them so both hit the same cache entry.
        fetch(uri, { credentials: "include" })
            .then((response): void => {
                // Non-OK statuses (401/404/500...) must not count as warmed.
                if (!response.ok) throw new Error(String(response.status));
            })
            .catch((): void => {
                // Allow retrying on the next play if the warm-up failed.
                _warmedAudioUrls.delete(uri);
            });
    }

    protected override async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        if (kind === "audio" && isSong(media)) {
            const offlineUrl = await resolveOfflineAudioUrl(media.publicId);
            if (offlineUrl) return offlineUrl;

            // Do NOT warm the network cache here: the full-file fetch would
            // compete with the streaming <audio> element for bandwidth and
            // cause underruns (audible stutter) on weak connections. The
            // warm-up is deferred until playback has started (see
            // _onPlayingStarted/_scheduleCurrentWarmUp).
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
            el.src = uri;
            this._preloadedUri = undefined;
            this._preloadedForQueueMediaId = undefined;
            this._preloadAudio.removeAttribute("src");
            return;
        }

        el.src = uri;
    }

    protected override clearNativeSource(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        if (kind === "audio") this._stopEndedPoll();

        el.pause();
        el.currentTime = 0;
        const hadContent =
            el.hasAttribute("src") || el.srcObject !== null;
        el.removeAttribute("src");
        el.srcObject = null;
        if (hadContent) el.load();
    }

    protected override playNative(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        el.play()
            .then((): void => {
                if (
                    kind === "audio" &&
                    document.hidden &&
                    MediaPlayerManager._isiOS()
                ) {
                    this._startEndedPoll();
                }
            })
            .catch((err): void => {
                console.warn(
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
    }

    protected override seekNative(kind: TMediaKind, sec: number): void {
        const el = this._el(kind);
        if (!el) return;
        el.currentTime = sec;
    }

    protected override getNativePosition(kind: TMediaKind): number {
        return this._el(kind)?.currentTime ?? 0;
    }

    protected override setNativeVolume(kind: TMediaKind, vol: number): void {
        const el = this._el(kind);
        if (!el) return;
        el.volume = vol;
    }

    protected override getNativeVolume(kind: TMediaKind): number {
        return this._el(kind)?.volume ?? 1;
    }

    protected override isNativePaused(kind: TMediaKind): boolean {
        return this._el(kind)?.paused ?? true;
    }

    protected override _onPlayingStarted(): void {
        if (typeof document !== "undefined" && document.hidden) return;
        void this.preloadNextTrack();
        this._scheduleCurrentWarmUp();
    }

    /**
     * Defers the service-worker audio warm-up until after the current song is
     * actually playing. Warming the full file while the <audio> element is
     * still streaming competes for the same bandwidth and causes audible
     * underruns on weak connections, so we let the stream start first and only
     * cache the rest once playback is stable.
     */
    private _scheduleCurrentWarmUp(): void {
        const current = getRockIt().queueManager.currentMedia;
        if (!current || !isSong(current)) return;

        const uri = getMediaAudioUrl(current);
        if (!uri || _warmedAudioUrls.has(uri)) return;

        window.setTimeout((): void => {
            this._warmNetworkAudioCache(uri);
        }, 1500);
    }

    async preloadNextTrack(): Promise<void> {
        const next = getRockIt().queueManager.peekNextQueueItem();
        if (!next || !this._preloadAudio) return;
        if (!isSong(next.media) && !isVideo(next.media)) return;

        if (this._preloadedForQueueMediaId === next.queueMediaId) return;

        let uri: string | undefined;
        if (isSong(next.media)) {
            const offline = await resolveOfflineAudioUrl(next.media.publicId);
            if (offline) uri = offline;
        }
        if (!uri) uri = getMediaAudioUrl(next.media);
        if (!uri) return;

        this._preloadAudio.src = uri;
        this._preloadAudio.load();
        this._preloadedUri = uri;
        this._preloadedForQueueMediaId = next.queueMediaId;
    }

    private _retryPlayOnGesture(kind: TMediaKind): void {
        const handler = (): void => {
            document.removeEventListener("pointerup", handler);
            document.removeEventListener("keydown", handler);
            const el = this._el(kind);
            if (el?.paused) {
                el.play().catch((err): void =>
                    console.warn("MediaPlayerManager: retry play failed", err)
                );
            }
        };
        document.addEventListener("pointerup", handler, { once: true });
        document.addEventListener("keydown", handler, { once: true });
    }

    private _startEndedPoll(): void {
        if (!MediaPlayerManager._isiOS() || this._endedPollTimer) return;

        this._endedPollTimer = setInterval((): void => {
            const el = this._audio;
            if (!el || el.paused || !el.duration || isNaN(el.duration)) return;

            if (el.currentTime >= el.duration - 0.3) {
                const now = Date.now();
                if (now - this._lastEndedTime < 500) return;
                this._lastEndedTime = now;
                this._stopEndedPoll();
                this.onNativeEnded();
            }
        }, 1000);
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
        this._video.style.width = "100%";
        this._video.style.height = "100%";
        this._video.style.objectFit = "cover";
    }
}
