import { StationManager as SharedStationManager } from "@/managers/stationManager";
import { rockIt } from "@/lib/rockit/rockIt";

export class StationManager extends SharedStationManager {
    constructor() {
        super(() => rockIt);
    }
}
