import {
    BaseMediaPlayerManager,
    type TMediaKind,
    type TPlayableMedia,
    isSong,
    getMediaAudioUrl,
    getMediaVideoUrl,
} from "@rockit/shared";
import { resolveOfflineAudioUrl } from "@/lib/offline/store";

/**
 * Web media player: implements the shared BaseMediaPlayerManager primitives
 * against HTML <audio>/<video> elements. All playback/queue orchestration lives
 * in the base class.
 */
export class MediaPlayerManager extends BaseMediaPlayerManager {
    static #instance: MediaPlayerManager;

    private _audio?: HTMLAudioElement;
    private _video?: HTMLVideoElement;
    private _videoContainer?: HTMLDivElement;

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
        this._audio.onended = this.onNativeEnded;
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

        MediaPlayerManager.#instance = this;

        return MediaPlayerManager.#instance;
    }

    // ===== Offline URI resolution =====

    protected override async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        if (kind === "audio" && isSong(media)) {
            const offlineUrl = await resolveOfflineAudioUrl(media.publicId);
            if (offlineUrl) return offlineUrl;
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

        el.src = uri;
        el.currentTime = 0;
    }

    protected override clearNativeSource(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
    }

    protected override playNative(kind: TMediaKind): void {
        const el = this._el(kind);
        if (!el) return;

        el.play().catch((err): void => {
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
