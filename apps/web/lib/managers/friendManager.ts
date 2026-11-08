import { FriendManager as SharedManager } from "@/managers/friendManager";
import type { FriendServices } from "@/models/interfaces/friendServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export class FriendManager extends SharedManager {
    constructor(dependencies?: FriendServices) {
        super(() => ({ ...(dependencies ?? rockIt), http: Http }));
    }
    override start(): void {
        if (typeof window !== "undefined") super.start();
    }
}
