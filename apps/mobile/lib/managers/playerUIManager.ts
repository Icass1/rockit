import { createAtom, type ReadonlyAtom } from "@rockit/shared";
import type { PlayerArtworkPreferenceStore } from "@/models/types/playerArtwork";

/** Owns overlay visibility and the device artwork preference independently of audio. */
export class PlayerUIManager {
    private _visibleAtom = createAtom<boolean>(false);
    private _vinylModeAtom = createAtom(false);
    private _artworkInitialized = false;
    private _artworkRevision = 0;
    private _artworkWrites = Promise.resolve();

    constructor(private artworkPreference?: PlayerArtworkPreferenceStore) {}

    initializeArtworkMode(): void {
        if (this._artworkInitialized) return;
        this._artworkInitialized = true;
        const revision = this._artworkRevision;
        void this.artworkPreference
            ?.read()
            .then((vinyl) => {
                if (revision === this._artworkRevision)
                    this._vinylModeAtom.set(vinyl);
            })
            .catch(() => {
                // Appearance stays usable when device storage is unavailable.
            });
    }

    toggleVinylMode(): void {
        this._artworkRevision++;
        const vinyl = !this._vinylModeAtom.get();
        this._vinylModeAtom.set(vinyl);
        this._artworkWrites = this._artworkWrites
            .then(() => this.artworkPreference?.write(vinyl))
            .catch(() => {
                // Keep the current in-memory choice even if persistence fails.
            });
    }

    get vinylModeAtom(): ReadonlyAtom<boolean> {
        return this._vinylModeAtom.getReadonlyAtom();
    }

    show(): void {
        this._visibleAtom.set(true);
    }

    hide(): void {
        this._visibleAtom.set(false);
    }

    toggle(): void {
        this._visibleAtom.set(!this._visibleAtom.get());
    }

    get visibleAtom(): ReadonlyAtom<boolean> {
        return this._visibleAtom.getReadonlyAtom();
    }
}
