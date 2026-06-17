import {
    getMediaAlbum,
    getMediaArtists,
    getMediaDuration,
    type TPlayableMedia,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

const SILENT_WAV =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

const ACTION_HANDLERS: MediaSessionAction[] = [
    "play",
    "pause",
    "previoustrack",
    "nexttrack",
    "seekto",
    "seekbackward",
    "seekforward",
    "stop",
];

export class MediaSessionManager {
    private _supported: boolean;
    private _keepaliveCtx?: AudioContext;
    private _keepaliveOsc?: OscillatorNode;
    private _keepaliveGain?: GainNode;
    private _unsubscribers: (() => void)[] = [];

    private static _isiOS(): boolean {
        return (
            typeof navigator !== "undefined" &&
            /iPad|iPhone|iPod/.test(navigator.userAgent ?? "")
        );
    }

    private static _needsOscillatorKeepalive(): boolean {
        return !("audioSession" in navigator);
    }

    constructor() {
        this._supported =
            typeof window !== "undefined" && "mediaSession" in navigator;
    }

    init(): void {
        if (!this._supported) return;
        this._registerActionHandlers();
        this._subscribeToChanges();
    }

    /** Call inside the FIRST user gesture (click/touchend).
     *  Unlocks audio, sets audio session, starts keepalive oscillator. */
    activateOnGesture(): void {
        if (typeof window === "undefined") return;

        this._setAudioSession();

        if (MediaSessionManager._isiOS()) {
            if (MediaSessionManager._needsOscillatorKeepalive()) {
                this._startKeepalive();
            }
            this._unlockAudioElements();
            this._unlockVideoElement();
        }
    }

    destroy(): void {
        this._unsubscribers.forEach((fn): void => fn());
        this._unsubscribers = [];
        this._stopKeepalive();

        if (this._supported) {
            for (const action of ACTION_HANDLERS) {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch {
                    /* ignore */
                }
            }
        }
    }

    // ── Audio Session API (iOS 16.4+) ───────────────────────────────────

    private _setAudioSession(): void {
        if ("audioSession" in navigator) {
            const nav = navigator as Navigator & {
                audioSession?: { type: string };
            };
            if (nav.audioSession) {
                nav.audioSession.type = "playback";
            }
        }
    }

    // ── Silent oscillator keepalive ────────────────────────────────────

    private _startKeepalive(): void {
        if (this._keepaliveCtx) return;

        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = 1;
            osc.type = "sine";
            gain.gain.value = 0.001;

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            this._keepaliveCtx = ctx;
            this._keepaliveOsc = osc;
            this._keepaliveGain = gain;

            ctx.addEventListener("statechange", (): void => {
                if (ctx.state === "suspended") {
                    ctx.resume().catch((): void => {
                        this._stopKeepalive();
                    });
                }
            });
        } catch {
            /* keepalive not available */
        }
    }

    private _stopKeepalive(): void {
        try {
            this._keepaliveOsc?.stop();
            this._keepaliveOsc?.disconnect();
            this._keepaliveGain?.disconnect();
            this._keepaliveCtx?.close();
        } catch {
            /* ignore */
        }
        this._keepaliveOsc = undefined;
        this._keepaliveGain = undefined;
        this._keepaliveCtx = undefined;
    }

    // ── Silent WAV unlock trick ────────────────────────────────────────

    private static _unlockedElements = new WeakMap<
        HTMLAudioElement | HTMLVideoElement,
        boolean
    >();
    private _needsUnlock = false;
    private _unlockPromise: Promise<void> | null = null;

    private _unlockAudioElements(): void {
        const audioEl = rockIt.mediaPlayerManager.audioElement;
        if (!audioEl) {
            this._needsUnlock = true;
            return;
        }
        if (MediaSessionManager._unlockedElements.get(audioEl)) return;
        this._unlockElement(audioEl);
    }

    private _unlockElement(el: HTMLAudioElement): void {
        if (MediaSessionManager._unlockedElements.get(el)) return;

        if (!this._unlockPromise) {
            this._unlockPromise = this._doUnlock(el);
        }
    }

    private _doUnlock(el: HTMLAudioElement): Promise<void> {
        return new Promise((resolve): void => {
            el.src = SILENT_WAV;
            el.muted = true;
            el.play()
                .then((): void => {
                    MediaSessionManager._unlockedElements.set(el, true);
                    this._needsUnlock = false;
                    if (el.src === SILENT_WAV) {
                        el.pause();
                        el.currentTime = 0;
                    }
                    el.muted = false;
                    resolve();
                })
                .catch((): void => {
                    el.muted = false;
                    this._unlockPromise = null;
                    resolve();
                });
        });
    }

    // ── Video unlock via canvas.captureStream ──────────────────────────

    private _unlockVideoElement(): void {
        const videoEl = rockIt.mediaPlayerManager.videoElement;
        if (!videoEl) return;
        if (MediaSessionManager._unlockedElements.get(videoEl)) return;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, 1, 1);

            const stream = canvas.captureStream(1);
            videoEl.muted = true;
            videoEl.srcObject = stream;
            videoEl
                .play()
                .then((): void => {
                    MediaSessionManager._unlockedElements.set(videoEl, true);
                    videoEl.pause();
                    videoEl.srcObject = null;
                    videoEl.load();
                    stream.getTracks().forEach((t): void => t.stop());
                })
                .catch((): void => {
                    videoEl.srcObject = null;
                    videoEl.load();
                    stream.getTracks().forEach((t): void => t.stop());
                });
        } catch {
            /* canvas.captureStream not supported */
        }
    }

    // ── Media Session action handlers ───────────────────────────────────

    private _registerActionHandlers(): void {
        const session = navigator.mediaSession;

        try {
            session.setActionHandler("play", (): void => {
                rockIt.mediaPlayerManager.play();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("pause", (): void => {
                rockIt.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("previoustrack", (): void => {
                rockIt.queueManager.skipBack();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("nexttrack", (): void => {
                rockIt.queueManager.skipForward();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler(
                "seekto",
                (details: MediaSessionActionDetails): void => {
                    const seekTime = details.seekTime;
                    if (seekTime !== null && seekTime !== undefined) {
                        rockIt.mediaPlayerManager.setCurrentTime(
                            seekTime,
                            true
                        );
                    }
                }
            );
        } catch {
            /* not supported */
        }

        if (MediaSessionManager._isiOS()) {
            try {
                session.setActionHandler("seekbackward", null);
            } catch {
                /* not supported */
            }

            try {
                session.setActionHandler("seekforward", null);
            } catch {
                /* not supported */
            }
        } else {
            try {
                session.setActionHandler("seekbackward", (): void => {
                    const time = rockIt.mediaPlayerManager.currentTime;
                    rockIt.mediaPlayerManager.setCurrentTime(
                        Math.max(0, time - 10),
                        true
                    );
                });
            } catch {
                /* not supported */
            }

            try {
                session.setActionHandler("seekforward", (): void => {
                    const time = rockIt.mediaPlayerManager.currentTime;
                    rockIt.mediaPlayerManager.setCurrentTime(time + 10, true);
                });
            } catch {
                /* not supported */
            }
        }

        try {
            session.setActionHandler("stop", (): void => {
                rockIt.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }
    }

    private _subscribeToChanges(): void {
        const unsubMedia = rockIt.queueManager.currentMediaAtom.subscribe(
            (media: TPlayableMedia | undefined): void => {
                this._updateMetadata(media);
                if (this._needsUnlock) {
                    this._unlockAudioElements();
                }
            }
        );
        this._unsubscribers.push(unsubMedia);

        const unsubPlaying = rockIt.mediaPlayerManager.playingAtom.subscribe(
            (playing: boolean): void => {
                navigator.mediaSession.playbackState = playing
                    ? "playing"
                    : "paused";
            }
        );
        this._unsubscribers.push(unsubPlaying);

        const unsubTime = rockIt.mediaPlayerManager.currentTimeAtom.subscribe(
            (time: number): void => {
                this._updatePositionState(time);
            }
        );
        this._unsubscribers.push(unsubTime);
    }

    private _updateMetadata(media: TPlayableMedia | undefined): void {
        if (!media) {
            navigator.mediaSession.metadata = null;
            return;
        }

        const artists = getMediaArtists(media);
        const artist = artists.map((a): string => a.name).join(", ");
        const album = getMediaAlbum(media);

        const artwork: MediaImage[] = media.imageUrl
            ? [
                  {
                      src: media.imageUrl,
                      sizes: "96x96",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "128x128",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "256x256",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "512x512",
                      type: "image/jpeg",
                  },
              ]
            : [];

        navigator.mediaSession.metadata = new MediaMetadata({
            title: media.name,
            artist,
            album: album?.name ?? "",
            artwork,
        });

        if (MediaSessionManager._isiOS()) {
            this._registeriOSActionHandlers();
        }
    }

    private _registeriOSActionHandlers(): void {
        try {
            navigator.mediaSession.setActionHandler("seekbackward", null);
        } catch {
            /* not supported */
        }

        try {
            navigator.mediaSession.setActionHandler("seekforward", null);
        } catch {
            /* not supported */
        }
    }

    private _updatePositionState(time: number): void {
        const media = rockIt.queueManager.currentMedia;
        const duration = getMediaDuration(media);

        if (!media || !duration || duration <= 0) return;

        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate: 1,
                position: time,
            });
        } catch {
            /* not supported */
        }
    }
}
