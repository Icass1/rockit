class SyncManager {
    private static _instance: SyncManager;
    private _online = false;
    private _initialized = false;

    static getInstance(): SyncManager {
        if (!SyncManager._instance) {
            SyncManager._instance = new SyncManager();
        }
        return SyncManager._instance;
    }

    async init(): Promise<void> {
        if (this._initialized) return;
        console.log("SyncManager.init");
        this._initialized = true;
    }

    setOnline(online: boolean): void {
        this._online = online;
        console.log("SyncManager.setOnline", { online });
    }

    isOnline(): boolean {
        return this._online;
    }
}

export const syncManager = SyncManager.getInstance();
