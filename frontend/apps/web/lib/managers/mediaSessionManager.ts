import {
    getMediaAlbum,
    getMediaArtists,
    getMediaDuration,
    type TPlayableMedia,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

// Strictly standards-compliant silent PCM WAV (16-byte fmt chunk, mono,
// 8 kHz, 8-bit, one silent sample). The previously used data URI declared an
// 18-byte fmt chunk, which recent WebKit versions reject with a DECODE error.
const SILENT_WAV =
    "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

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
    private _keepaliveAudio?: HTMLAudioElement;
    private _unsubscribers: (() => void)[] = [];

    private static _isiOS(): boolean {
        return (
            typeof navigator !== "undefined" &&
            /iPad|iPhone|iPod/.test(navigator.userAgent ?? "")
        );
    }

    constructor() {
        this._supported =
            typeof window !== "undefined" && "mediaSession" in navigator;
    }

    init(): void {
        if (!this._supported) return;
        this._registerActionHandlers();
        this._subscribeToChanges();

        if (typeof document !== "undefined") {
            document.addEventListener(
                "visibilitychange",
                (): void => {
                    if (document.hidden) return;
                    this._recoverKeepaliveOnVisible();
                }
            );
        }
    }

    /** Call inside the FIRST user gesture (click/touchend).
     *  Unlocks audio, sets audio session, starts keepalive oscillator. */
    activateOnGesture(): void {
        if (typeof window === "undefined") return;

        this._setAudioSession();

        if (MediaSessionManager._isiOS()) {
            this._startKeepalive();
            // The dedicated silent keepalive element below performs the page
            // audio unlock within the gesture. It must stay independent of
            // the real playback elements: reusing them for the unlock used
            // to overwrite the current song's src and wire unlock failures
            // into the player's error handler (wrong song skips on iOS).
            this._startAudioKeepalive();
            this._unlockVideoElement();
        }
    }

    destroy(): void {
        this._unsubscribers.forEach((fn): void => fn());
        this._unsubscribers = [];
        this._stopKeepalive();
        this._stopAudioKeepalive();

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

    // ── Silent audio keepalive (iOS unlock + background track transitions) ──

    /**
     * Dedicated always-silent <audio> started inside the user gesture. It
     * both unlocks page audio playback on iOS and keeps background track
     * transitions alive. Being independent of the real playback elements,
     * a failure here can never surface as a media error of the current song.
     */
    private _startAudioKeepalive(): void {
        if (this._keepaliveAudio) return;

        const el = new Audio();
        el.loop = true;
        el.muted = false;
        el.volume = 0.001;
        el.src = SILENT_WAV;
        el.play().catch((): void => {
            /* ignore */
        });
        this._keepaliveAudio = el;
    }

    private _stopAudioKeepalive(): void {
        if (!this._keepaliveAudio) return;
        this._keepaliveAudio.pause();
        this._keepaliveAudio.removeAttribute("src");
        this._keepaliveAudio.load();
        this._keepaliveAudio = undefined;
    }

    private async _recoverKeepaliveOnVisible(): Promise<void> {
        if (!this._keepaliveCtx) return;

        if (this._keepaliveCtx.state === "running") return;

        try {
            await this._keepaliveCtx.resume();
        } catch {
            this._stopKeepalive();
            this._startKeepalive();
        }
    }

    // ── Video unlock via canvas.captureStream ──────────────────────────

    private static _unlockedElements = new WeakMap<
        HTMLAudioElement | HTMLVideoElement,
        boolean
    >();

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
