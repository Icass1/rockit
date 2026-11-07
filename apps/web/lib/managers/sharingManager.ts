import { SharingManager as SharedManager } from "@rockit/shared";
import type { SharingServices } from "@/models/interfaces/sharingServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export class SharingManager extends SharedManager {
    constructor(dependencies?: SharingServices) {
        super(() => ({ ...(dependencies ?? rockIt), http: Http }));
    }
    override start(): void {
        if (typeof window !== "undefined") super.start();
    }
}
