import { NavigationPinsManager as SharedManager } from "@/managers/navigationPinsManager";
import type { NavigationPinsServices } from "@/models/interfaces/navigationPinsServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export class NavigationPinsManager extends SharedManager {
    constructor(dependencies?: NavigationPinsServices) {
        super(() => ({
            ...(dependencies ?? rockIt),
            http: Http,
            subscribeToResume: (listener: () => void) => {
                const visible = () => {
                    if (!document.hidden) listener();
                };
                window.addEventListener("focus", listener);
                window.addEventListener("online", listener);
                document.addEventListener("visibilitychange", visible);
                return () => {
                    window.removeEventListener("focus", listener);
                    window.removeEventListener("online", listener);
                    document.removeEventListener("visibilitychange", visible);
                };
            },
        }));
    }
    override start(): void {
        if (typeof window !== "undefined") super.start();
    }
}
