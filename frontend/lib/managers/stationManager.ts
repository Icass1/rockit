import { Station } from "@/types/station";
import { createAtom } from "@/lib/store";

export class StationManager {
    // #region: Atoms

    private _currentStationAtom = createAtom<Station | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Method

    setAndPlayStation(station: Station) {
        throw `(setAndPlayStation) not implemented ${station}`;
    }
    // #endregion: Method

    // #region: Getters

    get currentStationAtom() {
        return this._currentStationAtom;
    }

    // #endregion: Getters
}
