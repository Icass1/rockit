import { Station } from "@/types/station";
import { atom } from "nanostores";

export class StationManager {
    // #region: Atoms

    private _currentStationAtom = atom<Station | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Getters

    get currentStationAtom() {
        return this._currentStationAtom;
    }

    // #endregion: Getters
}
