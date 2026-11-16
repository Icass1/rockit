import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import {
    deleteOfflineSong,
    getOfflineSong,
    offlineLibraryRevision,
    saveOfflineSongMetadata,
    saveSongOffline,
    updateOfflineSongPlaylist,
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

it("preserves playlist groups across repeated downloads and removes only the selected membership", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("audio"))
    );
    const song = {
        type: "song" as const,
        publicId: "membership-song",
        provider: "Fixture",
        providerUrl: "",
        name: "Song",
        artists: [],
        audioUrl: "https://fixture/audio",
        downloaded: true,
        imageUrl: "",
        dominantColor: "",
        duration_ms: 1000,
        discNumber: 1,
        trackNumber: 1,
        explicit: null,
        explicitSource: null,
    };
    await saveSongOffline(song.publicId, song.audioUrl, null);
    await saveOfflineSongMetadata(song, [
        { publicId: "first", type: "playlist", name: "First" },
    ]);
    await saveSongOffline(song.publicId, song.audioUrl, null);
    await saveOfflineSongMetadata(song, [
        { publicId: "second", type: "playlist", name: "Second" },
    ]);
    expect(
        (await getOfflineSong(song.publicId))?.savedCollections?.map(
            (item) => item.publicId
        )
    ).toEqual(["first", "second"]);
    await updateOfflineSongPlaylist(song.publicId, "first", false);
    expect(
        (await getOfflineSong(song.publicId))?.savedCollections?.map(
            (item) => item.publicId
        )
    ).toEqual(["second"]);
    expect((await getOfflineSong(song.publicId))?.audioBlob.size).toBe(5);
    await deleteOfflineSong(song.publicId);
});
