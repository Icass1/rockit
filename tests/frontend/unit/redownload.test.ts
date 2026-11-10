import type { BaseHttp, TMedia } from "@rockit/shared";
import { expect, it, vi } from "vitest";
import { redownloadMedia } from "../../../packages/shared/src/utils/redownloadMedia";

const album = { type: "album", publicId: "album", name: "Album" } as TMedia;
const ok = (result: unknown = {}) => ({ isOk: () => true, result });
function fixture() {
    const calls: string[] = [];
    const http = {
        getCollectionItems: vi.fn(async (_id: string, offset: number) =>
            ok({
                items: [
                    { item: { type: "song", publicId: offset ? "b" : "a" } },
                ],
                offset,
                limit: 1,
                hasMore: offset === 0,
            })
        ),
        deleteMediaFileAsync: vi.fn(async (id: string) => {
            calls.push("delete:" + id);
            return ok();
        }),
        startDownload: vi.fn(async ({ ids }: { ids: string[] }) => {
            calls.push("start:" + ids[0]);
            return ok();
        }),
    };
    return { http, calls, client: http as unknown as typeof BaseHttp };
}
it("resolves every page before replacing each file and queues one checked job at a time", async () => {
    const f = fixture();
    expect(await redownloadMedia(f.client, album, () => true)).toBe(2);
    expect(f.http.getCollectionItems).toHaveBeenCalledTimes(2);
    expect(f.calls).toEqual(["delete:a", "start:a", "delete:b", "start:b"]);
});
it("does not delete any files after a failed listing", async () => {
    const f = fixture();
    f.http.getCollectionItems.mockRejectedValueOnce(new Error("offline"));
    await expect(redownloadMedia(f.client, album, () => true)).rejects.toThrow(
        "offline"
    );
    expect(f.calls).toEqual([]);
});
it("stops after failed enqueue rather than deleting the rest of the album", async () => {
    const f = fixture();
    f.http.startDownload.mockRejectedValueOnce(new Error("503"));
    await expect(redownloadMedia(f.client, album, () => true)).rejects.toThrow(
        "503"
    );
    expect(f.calls).toEqual(["delete:a"]);
});
it("rejects obsolete account work before making a destructive request", async () => {
    const f = fixture();
    await expect(redownloadMedia(f.client, album, () => false)).rejects.toThrow(
        "Obsolete"
    );
    expect(f.calls).toEqual([]);
});
