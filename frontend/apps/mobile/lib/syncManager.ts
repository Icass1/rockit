import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { atom } from "nanostores";

class SyncManager {
    private static _instance: SyncManager;
    private _initialized = false;
    isOnlineAtom = atom<boolean>(false);

    static getInstance(): SyncManager {
        if (!SyncManager._instance) {
            SyncManager._instance = new SyncManager();
        }
        return SyncManager._instance;
    }

    async init(): Promise<void> {
        console.log("SyncManager.init");
        if (this._initialized) return;
        this._initialized = true;

        const state = await getNetworkStateAsync();
        console.log("sate 1", state);
        this.isOnlineAtom.set(state.isConnected ?? false);

        addNetworkStateListener((state) => {
            console.log("sate 2", state);
            this.isOnlineAtom.set(state.isConnected ?? false);
        });
    }

    isOnline(): boolean {
        return this.isOnlineAtom.get();
    }
}

export const syncManager = SyncManager.getInstance();
