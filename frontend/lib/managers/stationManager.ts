import type { Station } from "@/types/station";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class StationManager {
    // #region: Atoms

    private _currentStationAtom = createAtom<Station | undefined>();

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setAndPlayStation(station: Station): void {
        this._currentStationAtom.set(station);

        const streamUrl = station.url_resolved || station.url;
        rockIt.audioManager.playStream(streamUrl);
    }

    clearStation(): void {
        this._currentStationAtom.set(undefined);
    }

    // #endregion: Methods

    // #region: Getters

    get currentStationAtom() {
        return this._currentStationAtom.getReadonlyAtom();
    }

    // #endregion: Getters
}
