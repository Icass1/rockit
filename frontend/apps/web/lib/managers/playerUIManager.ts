import { createAtom, ReadonlyAtom } from "@/lib/store";

export class PlayerUIManager {
    // #region: Atoms

    private _visibleAtom = createAtom<boolean>(false);
    private _vinylModeAtom = createAtom<boolean>(false);
    private _artworkModeInitialized = false;

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    show(): void {
        this._visibleAtom.set(true);
    }
    hide(): void {
        this._visibleAtom.set(false);
    }
    toggle(): void {
        this._visibleAtom.set(!this._visibleAtom.get());
    }

    toggleVinylMode(): void {
        this._vinylModeAtom.set(!this._vinylModeAtom.get());
        if (typeof window === "undefined") return;
        try {
            window.sessionStorage.setItem(
                "rockit-player-vinyl-mode",
                String(this._vinylModeAtom.get())
            );
        } catch {
            // Keep the in-memory preference when browser storage is unavailable.
        }
    }

    initializeArtworkMode(): void {
        if (this._artworkModeInitialized || typeof window === "undefined")
            return;
        this._artworkModeInitialized = true;
        try {
            this._vinylModeAtom.set(
                window.sessionStorage.getItem("rockit-player-vinyl-mode") ===
                    "true"
            );
        } catch {
            // The default cover mode also works without browser storage.
        }
    }

    // #endregion

    // #region: Getters

    get visibleAtom(): ReadonlyAtom<boolean> {
        return this._visibleAtom.getReadonlyAtom();
    }

    get vinylModeAtom(): ReadonlyAtom<boolean> {
        return this._vinylModeAtom.getReadonlyAtom();
    }

    // #endregion: Getters
}
