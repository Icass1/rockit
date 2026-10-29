import { createAtom, type ReadonlyAtom } from "@rockit/shared";

/** Controls the full-screen player overlay visibility. */
export class PlayerUIManager {
    private _visibleAtom = createAtom<boolean>(false);

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
