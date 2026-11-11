import { MediaPlayerManager as BrowserPlayer } from "@rockit/platform-browser/managers/mediaPlayerManager";
import { createAtom, type ReadonlyAtom } from "@rockit/shared";
import {
    DEFAULT_CROSSFADE,
    type CrossfadeSettings,
} from "@/lib/audio/crossfade";
import { Http } from "@/lib/http";
import { userManager } from "@/lib/managers/userManager";

/** The PWA uses the same proven transport as desktop, including iOS transitions. */
export class MediaPlayerManager extends BrowserPlayer {
    stopAndClear(): void {
        this.stopSynchronization();
        this.pause();
        this.stopBrowserLifecycle();
        this._clearAudio();
        this._clearVideo();
        this._currentTimeAtom.set(0);
        this.onNativeLoaded();
    }

    private readonly crossfadeState = createAtom<CrossfadeSettings>({
        ...DEFAULT_CROSSFADE,
    });

    override initializeTransitionSettings(): void {
        super.initializeTransitionSettings();
        const session = userManager.sessionAtom.get();
        const initial = this.transitionSettingsAtom.get();
        let hasPreference = false;
        try {
            hasPreference =
                window.localStorage.getItem("rockit-web-transitions-v1") !==
                null;
        } catch {}
        if (!hasPreference && session) {
            void Http.getUser()
                .then((response) => {
                    if (
                        userManager.sessionAtom.get() !== session ||
                        this.transitionSettingsAtom.get() !== initial ||
                        !response.isOk()
                    )
                        return;
                    const seconds = response.result.crossfade;
                    if (!Number.isFinite(seconds) || seconds <= 0) return;
                    this.updateCrossfadeSettings({
                        durationMs: seconds * 1000,
                    });
                    void this.preloadNextTrack();
                })
                .catch(() => {});
        }
        const settings = this.transitionSettingsAtom.get();
        this.crossfadeState.set({
            ...this.crossfadeState.get(),
            durationMs: settings.enabled ? settings.maxSeconds * 1000 : 0,
        });
    }

    get crossfadeSettingsAtom(): ReadonlyAtom<CrossfadeSettings> {
        return this.crossfadeState.getReadonlyAtom();
    }

    updateCrossfadeSettings(settings: Partial<CrossfadeSettings>): void {
        const next = { ...this.crossfadeState.get(), ...settings };
        this.crossfadeState.set(next);
        this.configureTransitions({
            enabled: next.durationMs > 0,
            maxSeconds: next.durationMs / 1000,
        });
    }
}
