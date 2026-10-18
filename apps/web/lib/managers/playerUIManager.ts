import { createAtom, ReadonlyAtom } from "@/lib/store";

export class PlayerUIManager {
    // #region: Atoms

    private _visibleAtom = createAtom<boolean>(false);

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

    // #endregion

    // #region: Getters

    get visibleAtom(): ReadonlyAtom<boolean> {
        return this._visibleAtom.getReadonlyAtom();
    }

    // #endregion: Getters
}
