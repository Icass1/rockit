import type { BaseHttp } from "@rockit/shared";
import { expect, it, vi } from "vitest";
import { downloadCollectionOffline } from "../../../packages/shared/src/utils/downloadCollectionOffline";

const song = (id: string) => ({
    type: "song",
    publicId: id,
    audioUrl: `https://fixture/${id}`,
});
function fixture(pages: Record<string, unknown[]>) {
    const http = {
        getCollectionItems: vi.fn(async (id: string, offset: number) => ({
            isOk: () => true,
            result: {
                items: pages[id]
                    .slice(offset, offset + 2)
                    .map((item) => ({ item })),
                offset,
                limit: 2,
                hasMore: offset + 2 < pages[id].length,
            },
        })),
    };
    return {
        http,
        client: http as unknown as typeof BaseHttp,
        save: vi.fn(async () => {}),
    };
}
it("saves paged nested playlists once per song and breaks collection cycles", async () => {
    const f = fixture({
        root: [song("a"), { type: "album", publicId: "nested" }, song("b")],
        nested: [song("a"), { type: "playlist", publicId: "root" }, song("c")],
    });
    expect(
        await downloadCollectionOffline(f.client, "root", {
            isCurrent: () => true,
            save: f.save,
        })
    ).toBe(3);
    expect(f.save.mock.calls).toHaveLength(3);
    expect(f.http.getCollectionItems).toHaveBeenCalledTimes(4);
});
it("stops after a save fails and does not claim a complete collection", async () => {
    const f = fixture({ root: [song("a"), song("b")] });
    f.save.mockRejectedValueOnce(new Error("quota"));
    await expect(
        downloadCollectionOffline(f.client, "root", {
            isCurrent: () => true,
            save: f.save,
        })
    ).rejects.toThrow("quota");
    expect(f.save).toHaveBeenCalledTimes(1);
});
it("discards listing responses after the account changes", async () => {
    const f = fixture({ root: [song("a")] });
    let active = true;
    f.http.getCollectionItems.mockImplementationOnce(async () => {
        active = false;
        return {
            isOk: () => true,
            result: {
                items: [{ item: song("a") }],
                offset: 0,
                limit: 2,
                hasMore: false,
            },
        };
    });
    await expect(
        downloadCollectionOffline(f.client, "root", {
            isCurrent: () => active,
            save: f.save,
        })
    ).rejects.toThrow("Obsolete");
    expect(f.save).not.toHaveBeenCalled();
});
it("rejects non-advancing pages and skips unavailable songs and streams", async () => {
    const f = fixture({
        root: [
            { type: "station", publicId: "radio" },
            { type: "song", publicId: "missing" },
        ],
    });
    expect(
        await downloadCollectionOffline(f.client, "root", {
            isCurrent: () => true,
            save: f.save,
        })
    ).toBe(0);
    f.http.getCollectionItems.mockResolvedValueOnce({
        isOk: () => true,
        result: { items: [], offset: 0, limit: 0, hasMore: true },
    });
    await expect(
        downloadCollectionOffline(f.client, "root", {
            isCurrent: () => true,
            save: f.save,
        })
    ).rejects.toThrow("pagination");
});
