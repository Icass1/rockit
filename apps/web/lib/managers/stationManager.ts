import { StationManager as SharedStationManager } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export class StationManager extends SharedStationManager {
    constructor() {
        super(() => rockIt);
    }
}
