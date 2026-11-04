import type { PlaybackServices } from "@/models/interfaces/playbackServices";
import { MediaSessionManager } from "@/lib/managers/mediaSessionManager";

/** Owns native playback reporting and gesture listeners for one mounted shell. */
export class PlaybackLifecycle {
    private readonly mediaSession: MediaSessionManager;
    private unsubscribeSession?: () => void;
    private active = false;

    constructor(private readonly services: PlaybackServices) {
        this.mediaSession = new MediaSessionManager(services);
    }

    start(): void {
        if (this.unsubscribeSession || typeof document === "undefined") return;
        this.unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session) this.activate();
                else if (session === null) {
                    this.deactivate();
                    this.services.mediaPlayerManager.pause();
                }
            });
    }

    stop(): void {
        this.unsubscribeSession?.();
        this.unsubscribeSession = undefined;
        this.deactivate();
    }

    private activate(): void {
        if (this.active) return;
        this.active = true;
        this.services.mediaPlayerManager.initializeTransitionSettings();
        this.mediaSession.init();
        document.addEventListener("pointerup", this.onFirstGesture);
        document.addEventListener("keydown", this.onFirstGesture);
    }

    private deactivate(): void {
        if (!this.active) return;
        this.active = false;
        this.removeGestureListeners();
        this.mediaSession.destroy();
    }

    private removeGestureListeners(): void {
        document.removeEventListener("pointerup", this.onFirstGesture);
        document.removeEventListener("keydown", this.onFirstGesture);
    }

    private onFirstGesture = (): void => {
        this.removeGestureListeners();
        this.mediaSession.activateOnGesture();
        this.services.mediaPlayerManager.activateTransitionsOnGesture();
    };
}
