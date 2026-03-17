import { createAtom } from "@/lib/store";

export class PlayerUIManager {
    // #region: Atoms

    private _visibleAtom = createAtom<boolean>(false);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    show() {
        this._visibleAtom.set(true);
    }
    hide() {
        this._visibleAtom.set(false);
    }
    toggle() {
        this._visibleAtom.set(!this._visibleAtom.get());
    }

    // #endregion

    // #region: Getters

    get visibleAtom() {
        return this._visibleAtom.getReadonlyAtom();
    }

    // #endregion: Getters
}
