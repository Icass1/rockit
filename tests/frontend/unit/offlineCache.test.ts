import "fake-indexeddb/auto";
import { BaseHttp } from "@rockit/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearSessionOffline,
    loadSessionOffline,
} from "../../../packages/platform-browser/src/offline/db";
import { createOfflineMetadataCache } from "../../../packages/platform-browser/src/offline/httpCache";

const session = {
    username: "alice",
    image: "",
    admin: false,
    queueType: "SORTED",
    repeatMode: "OFF",
    currentTimeMs: null,
};
let cache: ReturnType<typeof createOfflineMetadataCache>;
const transport = vi.fn<() => Promise<Response>>();
class Client extends BaseHttp {
    protected static override baseApiFetchAsync() {
        return transport();
    }
}
const stores = new Map<string, Map<string, Response>>();
beforeEach(async () => {
    await clearSessionOffline();
    stores.clear();
    transport.mockReset();
    cache = createOfflineMetadataCache();
    Client.middlewares = [cache.middleware];
    vi.stubGlobal("caches", {
        keys: async () => [...stores.keys()],
        delete: async (name: string) => stores.delete(name),
        open: async (name: string) => {
            if (!stores.has(name)) stores.set(name, new Map());
            const store = stores.get(name)!;
            return {
                put: async (key: string, response: Response) => {
                    store.set(key, response.clone());
                },
                match: async (key: string) => store.get(key)?.clone(),
                keys: async () => [...store.keys()],
                delete: async (key: string) => store.delete(key),
            };
        },
    });
});
const online = (value: unknown) =>
    transport.mockResolvedValue(new Response(JSON.stringify(value)));
const offline = () => transport.mockRejectedValue(new TypeError("offline"));
describe("optional browser metadata cache", () => {
    it("restores a validated session only on a network failure", async () => {
        online(session);
        expect((await Client.getSession()).isOk()).toBe(true);
        offline();
        const restored = await Client.getSession();
        if (!restored.isOk()) throw new Error(restored.message);
        expect(restored.result.username).toBe("alice");
        transport.mockResolvedValue(
            new Response('{"detail":"outage"}', { status: 503 })
        );
        expect((await Client.getSession()).code).toBe(503);
    });
    it("caches authenticated library pages but never masks a 401", async () => {
        online(session);
        await Client.getSession();
        online({
            albums: [],
            playlists: [],
            songs: [],
            videos: [],
            stations: [],
            shared: [],
        });
        expect((await Client.getUserLibraryMedias()).isOk()).toBe(true);
        await vi.waitFor(() => expect([...stores.values()][0]?.size).toBe(1));
        offline();
        expect((await Client.getUserLibraryMedias()).isOk()).toBe(true);
        transport.mockResolvedValue(
            new Response('{"detail":"expired"}', { status: 401 })
        );
        expect((await Client.getUserLibraryMedias()).code).toBe(401);
        expect(await loadSessionOffline()).toBeNull();
        expect(stores.size).toBe(0);
        offline();
        expect((await Client.getSession()).isOk()).toBe(false);
    });
    it("does not resurrect a session after logout overtakes its response", async () => {
        let release!: (response: Response) => void;
        transport.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                })
        );
        const pending = Client.getSession();
        await cache.invalidate();
        release(new Response(JSON.stringify(session)));
        await pending;
        expect(await loadSessionOffline()).toBeNull();
    });
    it("keeps successful online requests usable when CacheStorage is denied", async () => {
        online(session);
        await Client.getSession();
        vi.stubGlobal("caches", {
            open: async () => {
                throw new Error("quota");
            },
            keys: async () => {
                throw new Error("denied");
            },
        });
        online({
            albums: [],
            playlists: [],
            songs: [],
            videos: [],
            stations: [],
            shared: [],
        });
        expect((await Client.getUserLibraryMedias()).isOk()).toBe(true);
        await expect(cache.invalidate()).resolves.toBeUndefined();
    });
});
