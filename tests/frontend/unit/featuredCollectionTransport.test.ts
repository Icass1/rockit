import { expect, it } from "vitest";
import { CollectionHttp } from "../../../packages/shared/src/http/collectionHttp";
import { getCollectionSongIds } from "../../../packages/shared/src/utils/collectionLikes";
import { downloadCollectionOffline } from "../../../packages/shared/src/utils/downloadCollectionOffline";

const artist = {
    type: "artist",
    provider: "Fixture",
    publicId: "artist",
    url: "/artist/artist",
    providerUrl: "",
    name: "Artist",
    imageUrl: "",
    dominantColor: "",
};
const album = {
    type: "album",
    provider: "Fixture",
    publicId: "album",
    url: "/album/album",
    providerUrl: "",
    name: "Album",
    artists: [artist],
    releaseDate: "2026-01-01",
    imageUrl: "",
    dominantColor: "",
    undownloadedCount: 0,
};
const song = {
    type: "song",
    provider: "Fixture",
    publicId: "song",
    providerUrl: "",
    name: "Song",
    artists: [artist],
    album,
    audioUrl: "https://fixture/song",
    downloaded: true,
    imageUrl: "",
    dominantColor: "",
    duration_ms: 1000,
    discNumber: 1,
    trackNumber: 1,
    explicit: false,
    explicitSource: null,
};
const playlist = {
    type: "playlist",
    provider: "RockIt!",
    publicId: "recent-mix",
    url: "/playlist/recent-mix",
    providerUrl: "",
    name: "Recent Mix",
    description: null,
    contributors: [],
    owner: artist,
    imageUrl: "",
    medias: [{ item: song, expanded: false, addedAt: "2026-11-16T00:00:00Z" }],
    total: 1,
    hasMore: false,
};
class Client extends CollectionHttp {
    protected static override async baseApiFetchAsync(
        path: string
    ): Promise<Response> {
        if (path !== "/featured/recent-mix")
            throw new Error(
                `Virtual ID queried as a database collection: ${path}`
            );
        return new Response(JSON.stringify(playlist));
    }
}
it("uses the featured endpoint for bulk likes and readonly queue resolution", async () => {
    expect(await getCollectionSongIds(Client, "recent-mix")).toEqual(["song"]);
    expect(await getCollectionSongIds(Client, "featured:recent-mix")).toEqual([
        "song",
    ]);
    const queue = await Client.resolveCollectionQueue("recent-mix");
    expect(queue.isOk()).toBe(true);
    if (queue.isOk())
        expect(queue.result.queue.map((entry) => entry.media.publicId)).toEqual(
            ["song"]
        );
});
it("downloads featured contents and searches without database UUID requests", async () => {
    const saved: string[] = [];
    expect(
        await downloadCollectionOffline(Client, "recent-mix", {
            isCurrent: () => true,
            save: async (media) => {
                saved.push(media.publicId);
            },
        })
    ).toBe(1);
    expect(saved).toEqual(["song"]);
    const page = await Client.getCollectionItems(
        "recent-mix",
        0,
        100,
        "absent"
    );
    expect(page.isOk()).toBe(true);
    if (page.isOk()) expect(page.result.items).toEqual([]);
});
