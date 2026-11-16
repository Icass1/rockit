import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import {
    deleteOfflineSong,
    getOfflineSong,
    offlineLibraryRevision,
    saveSongOffline,
} from "../../../packages/platform-browser/src/offline/db";

afterEach(() => vi.unstubAllGlobals());
it("publishes saved audio before a slow optional cover and notifies later deletion", async () => {
    let release!: (response: Response) => void;
    const cover = new Promise<Response>((resolve) => {
        release = resolve;
    });
    vi.stubGlobal(
        "fetch",
        vi.fn((url: string) =>
            url.includes("cover")
                ? cover
                : Promise.resolve(new Response("audio"))
        )
    );
    const revision = offlineLibraryRevision.get();
    try {
        await saveSongOffline(
            "visibility-song",
            "https://fixture/audio",
            "https://fixture/cover"
        );
        expect((await getOfflineSong("visibility-song"))?.audioBlob.size).toBe(
            5
        );
        expect(offlineLibraryRevision.get()).toBeGreaterThan(revision);
    } finally {
        release(new Response("image"));
    }
    await vi.waitFor(async () =>
        expect((await getOfflineSong("visibility-song"))?.coverBlob?.size).toBe(
            5
        )
    );
    const beforeDelete = offlineLibraryRevision.get();
    await deleteOfflineSong("visibility-song");
    expect(await getOfflineSong("visibility-song")).toBeUndefined();
    expect(offlineLibraryRevision.get()).toBeGreaterThan(beforeDelete);
});
