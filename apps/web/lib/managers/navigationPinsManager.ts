import type { NavigationPinResponse } from "@rockit/shared";
import type { NavigationPinsStatus } from "@/models/types/navigationPins";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom } from "@/lib/store";

/** Personal shortcuts: no collection expansion, disk cache or optimistic permission claims. */
export class NavigationPinsManager {
    private pins = createArrayAtom<NavigationPinResponse>([]);
    private status = createAtom<NavigationPinsStatus>("idle");
    private pending = createArrayAtom<string>([]);
    private initialized = false;
    private account = "";
    private epoch = 0;
    private request = 0;
    private tail: Promise<void> = Promise.resolve();
    private busy = new Set<string>();

    get pinsAtom() {
        return this.pins.getReadonlyAtom();
    }
    get statusAtom() {
        return this.status.getReadonlyAtom();
    }
    get pendingAtom() {
        return this.pending.getReadonlyAtom();
    }

    init(): void {
        if (this.initialized || typeof window === "undefined") return;
        this.initialized = true;
        rockIt.userManager.usernameAtom.listen(this.syncAccount);
        rockIt.userManager.loggedInAtom.listen(this.syncAccount);
        window.addEventListener("focus", this.refreshOnWake);
        window.addEventListener("online", this.refreshOnWake);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) this.refreshOnWake();
        });
        this.syncAccount();
    }

    private syncAccount = (): void => {
        const key = rockIt.userManager.loggedInAtom.get()
            ? (rockIt.userManager.usernameAtom.get() ?? "")
            : "";
        if (key === this.account) return;
        this.account = key;
        this.epoch++;
        this.request++;
        this.tail = Promise.resolve();
        this.busy = new Set();
        this.pins.set([]);
        this.pending.set([]);
        this.status.set("idle");
        if (key) void this.refreshAsync();
    };

    private refreshOnWake = (): void => {
        void this.refreshAsync();
    };

    async refreshAsync(): Promise<boolean> {
        if (!this.account || this.busy.size || this.status.get() === "loading")
            return false;
        const epoch = this.epoch;
        const request = ++this.request;
        this.status.set("loading");
        try {
            const result = await Http.getNavigationPinsAsync();
            if (epoch !== this.epoch || request !== this.request) return false;
            if (!result.isOk()) {
                this.status.set("error");
                return false;
            }
            this.pins.set(result.result.pins);
            this.status.set("ready");
            return true;
        } catch {
            if (epoch === this.epoch && request === this.request)
                this.status.set("error");
            return false;
        }
    }

    setPinnedAsync(publicId: string, pinned: boolean): Promise<boolean> {
        if (!this.account || this.busy.has(publicId))
            return Promise.resolve(false);
        const epoch = this.epoch;
        this.request++; // An older GET must never overwrite this mutation.
        this.busy.add(publicId);
        this.pending.set([...this.busy]);
        const operation = this.tail.then(async (): Promise<boolean> => {
            if (epoch !== this.epoch) return false;
            try {
                const result = pinned
                    ? await Http.pinNavigationMediaAsync({ publicId })
                    : await Http.unpinNavigationMediaAsync(publicId);
                if (epoch !== this.epoch) return false;
                if (!result.isOk()) {
                    this.status.set("error");
                    rockIt.notificationManager.notifyError(
                        rockIt.vocabularyManager.vocabulary
                            .NAV_PINS_UPDATE_ERROR
                    );
                    return false;
                }
                this.pins.set(result.result.pins);
                this.status.set("ready");
                rockIt.notificationManager.notifySuccess(
                    pinned
                        ? rockIt.vocabularyManager.vocabulary.NAV_PIN_ADDED
                        : rockIt.vocabularyManager.vocabulary.NAV_PIN_REMOVED
                );
                return true;
            } catch {
                if (epoch === this.epoch) {
                    this.status.set("error");
                    rockIt.notificationManager.notifyError(
                        rockIt.vocabularyManager.vocabulary
                            .NAV_PINS_UPDATE_ERROR
                    );
                }
                return false;
            } finally {
                if (epoch === this.epoch) {
                    this.busy.delete(publicId);
                    this.pending.set([...this.busy]);
                }
            }
        });
        this.tail = operation.then(() => {});
        return operation;
    }
}
