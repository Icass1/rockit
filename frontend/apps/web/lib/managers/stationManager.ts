import { Http } from "@/lib/http";
import { BaseStationResponse } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class StationManager {
    private _currentStationAtom = createAtom<BaseStationResponse | undefined>();

    async setAndPlayStation(station: BaseStationResponse): Promise<void> {
        this._currentStationAtom.set(station);

        rockIt.queueManager.setMedia([station], station.publicId);
        rockIt.queueManager.moveToMedia(station.publicId);
        rockIt.mediaPlayerManager.play();
    }

    async playStationByPublicId(publicId: string): Promise<void> {
        const result = await Http.getStation(publicId);
        if (result.isOk()) {
            await this.setAndPlayStation(result.result);
        }
    }

    clearStation(): void {
        this._currentStationAtom.set(undefined);
    }

    get currentStationAtom(): ReadonlyAtom<BaseStationResponse | undefined> {
        return this._currentStationAtom.getReadonlyAtom();
    }
}
