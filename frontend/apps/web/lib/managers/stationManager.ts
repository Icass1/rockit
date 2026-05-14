import { type Station } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class StationManager {
    private _currentStationAtom = createAtom<Station | undefined>();

    setAndPlayStation(station: Station): void {
        this._currentStationAtom.set(station);

        const streamUrl = station.url_resolved || station.url;
        rockIt.mediaPlayerManager.playStream(streamUrl);
    }

    clearStation(): void {
        this._currentStationAtom.set(undefined);
    }

    get currentStationAtom(): ReadonlyAtom<Station | undefined> {
        return this._currentStationAtom.getReadonlyAtom();
    }
}
