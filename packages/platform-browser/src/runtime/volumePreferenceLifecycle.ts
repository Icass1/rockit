import { Http } from "@rockit/platform-browser/http";
import type { VolumePreferenceServices } from "@rockit/platform-browser/models/playbackServices";
import { isIOS } from "@rockit/platform-browser/utils/isIOS";

/** Owns saved volume restoration and debounced writes for one playback shell. */
export class VolumePreferenceLifecycle {
    private unsubscribers: (() => void)[] = [];
    private active = false;
    private generation = 0;
    private username?: string;
    private restoredUsername?: string;
    private restoring = false;
    private restoredVolume?: number;
    private timer?: ReturnType<typeof setTimeout>;
    private pending?: number;
    private saving?: object;

    constructor(
        private readonly services: VolumePreferenceServices,
        private readonly updateVolume: typeof Http.updateVolume = (request) =>
            Http.updateVolume(request),
        private readonly hasFixedVolume: () => boolean = isIOS
    ) {}

    start(): void {
        if (this.active || typeof window === "undefined") return;
        this.active = true;
        this.unsubscribers = [
            this.services.userManager.sessionAtom.subscribe((session) => {
                const username = session?.username;
                if (username === this.username) {
                    if (session === null) this.restoredUsername = undefined;
                    return;
                }
                this.invalidate();
                this.username = username;
                if (!session) {
                    this.restoredUsername = undefined;
                    return;
                }
                // A Strict Mode restart must preserve the active player's volume.
                if (username === this.restoredUsername) return;
                this.restoredUsername = username;
                this.restoring = true;
                try {
                    const volume =
                        this.hasFixedVolume() ||
                        !Number.isFinite(session.volume)
                            ? 1
                            : session.volume;
                    this.restoredVolume = volume;
                    this.services.mediaPlayerManager.volume = volume;
                } finally {
                    this.restoring = false;
                }
            }),
            this.services.mediaPlayerManager.volumeAtom.listen((volume) => {
                // Nanostores can defer this callback until the session listener returns.
                const restoredVolume = this.restoredVolume;
                this.restoredVolume = undefined;
                if (
                    volume === restoredVolume ||
                    volume !== this.services.mediaPlayerManager.volumeAtom.get()
                )
                    return;
                if (
                    !this.active ||
                    !this.username ||
                    this.restoring ||
                    this.hasFixedVolume()
                )
                    return;
                this.pending = volume;
                this.schedule();
            }),
        ];
    }

    stop(): void {
        if (!this.active) return;
        this.active = false;
        for (const unsubscribe of this.unsubscribers) unsubscribe();
        this.unsubscribers = [];
        this.invalidate();
        this.username = undefined;
    }

    private invalidate(): void {
        this.generation++;
        clearTimeout(this.timer);
        this.timer = undefined;
        this.pending = undefined;
        this.restoredVolume = undefined;
        this.saving = undefined;
    }

    private isCurrent(generation: number): boolean {
        return this.active && !!this.username && generation === this.generation;
    }

    private schedule(): void {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.timer = undefined;
            void this.save();
        }, 300);
    }

    private async save(): Promise<void> {
        const generation = this.generation;
        if (!this.isCurrent(generation) || this.saving || this.hasFixedVolume())
            return;
        const token = (this.saving = {});
        try {
            while (this.isCurrent(generation) && this.pending !== undefined) {
                const volume = this.pending;
                this.pending = undefined;
                const result = await this.updateVolume({ volume });
                if (!this.isCurrent(generation)) return;
                if (!result.isOk())
                    console.error(
                        "Cannot save volume preference",
                        result.detail
                    );
            }
        } catch (error) {
            if (this.isCurrent(generation))
                console.error("Cannot save volume preference", error);
        } finally {
            if (this.saving === token) {
                this.saving = undefined;
                if (this.isCurrent(generation) && this.pending !== undefined)
                    this.schedule();
            }
        }
    }
}
