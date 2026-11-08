import { ListenTogetherManager as SharedManager } from "@/managers/listenTogetherManager";
import type { ListenTogetherServices } from "@/models/interfaces/listenTogetherServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export class ListenTogetherManager extends SharedManager {
    constructor(dependencies?: ListenTogetherServices) {
        super(() => ({
            ...(dependencies ?? rockIt),
            http: Http,
            subscribeToResume: (listener: () => void) => {
                const handle = (): void => {
                    if (!document.hidden) listener();
                };
                document.addEventListener("visibilitychange", handle);
                return () =>
                    document.removeEventListener("visibilitychange", handle);
            },
        }));
    }
    override start(): void {
        if (typeof window !== "undefined") super.start();
    }
}
