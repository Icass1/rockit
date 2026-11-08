import { Http as BrowserHttp } from "@rockit/platform-browser/http";
import { createOfflineMetadataCache } from "@rockit/platform-browser/offline/httpCache";

export class Http extends BrowserHttp {
    private static readonly offlineMetadata = createOfflineMetadataCache();
    static override middlewares: typeof BrowserHttp.middlewares = [
        this.offlineMetadata.middleware,
    ];

    static discardOfflineSession(): Promise<void> {
        return this.offlineMetadata.invalidate();
    }
}
