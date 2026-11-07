import type { MediaSessionServices } from "@rockit/platform-browser/models/mediaSessionServices";
import {
    getMediaAlbum,
    getMediaArtists,
    getMediaDuration,
    type TPlayableMedia,
} from "@rockit/shared";

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
    private _initialized = false;
    private _generation = 0;
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

    constructor(private readonly services: MediaSessionServices) {}

    init(): void {
        if (
            this._initialized ||
            typeof navigator === "undefined" ||
            !("mediaSession" in navigator)
        )
            return;
        this._initialized = true;
        this._generation++;
        this._registerActionHandlers();
        this._subscribeToChanges();

        if (typeof document !== "undefined") {
            const onVisible = (): void => {
                if (document.hidden) return;
                this._recoverKeepaliveOnVisible();
                this._updatePlaybackState();
            };
            document.addEventListener("visibilitychange", onVisible);
            this._unsubscribers.push((): void =>
                document.removeEventListener("visibilitychange", onVisible)
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
        }
    }

    destroy(): void {
        this._generation++;
        this._unsubscribers.forEach((fn): void => fn());
        this._unsubscribers = [];
        this._stopKeepalive();
        this._stopAudioKeepalive();

        if (this._initialized) {
            this._initialized = false;
            navigator.mediaSession.metadata = null;
            this._updatePlaybackStateForStop();
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
                if (this._keepaliveCtx === ctx && ctx.state === "suspended") {
                    ctx.resume().catch((): void => {
                        if (this._keepaliveCtx === ctx) this._stopKeepalive();
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
        const ctx = this._keepaliveCtx;
        const generation = this._generation;
        if (!ctx || ctx.state === "running") return;

        try {
            await ctx.resume();
        } catch {
            if (generation !== this._generation || this._keepaliveCtx !== ctx)
                return;
            this._stopKeepalive();
            this._startKeepalive();
        }
    }

    // ── Media Session action handlers ───────────────────────────────────

    private _registerActionHandlers(): void {
        const session = navigator.mediaSession;

        try {
            session.setActionHandler("play", (): void => {
                this.services.mediaPlayerManager.play();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("pause", (): void => {
                this.services.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("previoustrack", (): void => {
                this.services.queueManager.skipBack();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("nexttrack", (): void => {
                this.services.queueManager.skipForward();
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
                        this.services.mediaPlayerManager.setCurrentTime(
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
                    const time = this.services.mediaPlayerManager.currentTime;
                    this.services.mediaPlayerManager.setCurrentTime(
                        Math.max(0, time - 10),
                        true
                    );
                });
            } catch {
                /* not supported */
            }

            try {
                session.setActionHandler("seekforward", (): void => {
                    const time = this.services.mediaPlayerManager.currentTime;
                    this.services.mediaPlayerManager.setCurrentTime(
                        time + 10,
                        true
                    );
                });
            } catch {
                /* not supported */
            }
        }

        try {
            session.setActionHandler("stop", (): void => {
                this.services.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }
    }

    private _subscribeToChanges(): void {
        const unsubMedia =
            this.services.queueManager.currentMediaAtom.subscribe(
                (media: TPlayableMedia | undefined): void => {
                    this._updateMetadata(media);
                }
            );
        this._unsubscribers.push(unsubMedia);

        const unsubPlaying =
            this.services.mediaPlayerManager.playingAtom.subscribe((): void =>
                this._updatePlaybackState()
            );
        this._unsubscribers.push(unsubPlaying);

        const unsubTime =
            this.services.mediaPlayerManager.currentTimeAtom.subscribe(
                (time: number): void => {
                    this._updatePositionState(time);
                    // Native now-playing controls can lose their declared state at
                    // a track handoff even while our playing atom stays unchanged.
                    this._updatePlaybackState();
                }
            );
        this._unsubscribers.push(unsubTime);
    }

    private _updatePlaybackStateForStop(): void {
        try {
            navigator.mediaSession.playbackState = "none";
        } catch {
            /* Some implementations do not support playbackState. */
        }
    }

    private _updatePlaybackState(): void {
        // Report the latest player state only. Never start, pause or seek media
        // to repair a stale lock-screen indicator, including during transitions.
        try {
            navigator.mediaSession.playbackState = !this.services.queueManager
                .currentMedia
                ? "none"
                : this.services.mediaPlayerManager.playingAtom.get()
                  ? "playing"
                  : "paused";
        } catch {
            /* Some mediaSession implementations do not support playbackState. */
        }
    }

    private _updateMetadata(media: TPlayableMedia | undefined): void {
        if (!media) {
            navigator.mediaSession.metadata = null;
            this._updatePlaybackState();
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
        // Publish after metadata/handler changes so the native controls describe
        // the incoming track even when playback continued without an atom change.
        this._updatePlaybackState();
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
        const media = this.services.queueManager.currentMedia;
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
