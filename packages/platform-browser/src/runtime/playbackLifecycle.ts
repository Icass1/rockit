import { MediaSessionManager } from "@rockit/platform-browser/managers/mediaSessionManager";
import type { PlaybackServices } from "@rockit/platform-browser/models/playbackServices";
import { VolumePreferenceLifecycle } from "@rockit/platform-browser/runtime/volumePreferenceLifecycle";

/** Owns native playback reporting and gesture listeners for one mounted shell. */
export class PlaybackLifecycle {
    private readonly mediaSession: MediaSessionManager;
    private readonly volume: VolumePreferenceLifecycle;
    private unsubscribeSession?: () => void;
    private active = false;
    private username?: string;
    private sessionResolved = false;

    constructor(private readonly services: PlaybackServices) {
        this.mediaSession = new MediaSessionManager(services);
        this.volume = new VolumePreferenceLifecycle(services);
    }

    start(): void {
        if (this.unsubscribeSession || typeof document === "undefined") return;
        this.volume.start();
        this.unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session === undefined) return;
                const username = session?.username;
                if (this.sessionResolved && this.username !== username) {
                    this.deactivate();
                    this.services.mediaPlayerManager.pause();
                }
                this.sessionResolved = true;
                this.username = username;
                this.activate();
            });
    }

    stop(): void {
        this.volume.stop();
        this.unsubscribeSession?.();
        this.unsubscribeSession = undefined;
        this.username = undefined;
        this.sessionResolved = false;
        this.deactivate();
    }

    private activate(): void {
        if (this.active) return;
        this.active = true;
        this.services.mediaPlayerManager.init();
        this.services.mediaPlayerManager.startBrowserLifecycle();
        this.services.mediaPlayerManager.initializeTransitionSettings();
        this.mediaSession.init();
        document.addEventListener("pointerup", this.onFirstGesture);
        document.addEventListener("keydown", this.onFirstGesture);
    }

    private deactivate(): void {
        if (!this.active) return;
        this.active = false;
        this.services.mediaPlayerManager.stopSynchronization();
        this.services.mediaPlayerManager.stopBrowserLifecycle();
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
